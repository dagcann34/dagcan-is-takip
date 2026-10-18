import type { BoardData, Status, Task } from '../board/types';

/**
 * Etkinlik geçmişi. Panodaki her değişiklik, görevin değişiklik sonrası tam hâliyle kaydedilir;
 * böylece herhangi bir günün panosu yeniden kurulabilir ve tarih aralığı raporları üretilebilir.
 * Geçmiş, pano ile aynı şifreli dosyada (board.json, AES-256-GCM) saklanır.
 */
export type HistoryKind = 'created' | 'updated' | 'status' | 'completed' | 'reopened' | 'deleted' | 'time';

export interface HistoryEvent {
  /** epoch ms */
  at: number;
  kind: HistoryKind;
  taskId: string;
  key: string;
  title: string;
  from?: Status;
  to?: Status;
  /** 'time' olayında eklenen süre (ms) */
  ms?: number;
  /** Değişiklik sonrası görev (silmede yok). Konum alanları saklanmaz. */
  task?: Omit<Task, 'x' | 'y'>;
}

/** Aynı görevdeki ardışık metin düzenlemeleri bu süre içinde tek kayıtta birleşir. */
const COALESCE_MS = 2 * 60_000;
/** Dosya boyutunu sınırlı tutmak için en fazla bu kadar olay saklanır (en eskiler düşer). */
const MAX_EVENTS = 20_000;

const strip = ({ x: _x, y: _y, ...rest }: Task) => rest;
const sameContent = (a: Task, b: Task) => JSON.stringify(strip(a)) === JSON.stringify(strip(b));

/** Önceki ve yeni pano arasındaki farktan geçmiş olayları üretir ve listeye ekler. */
export function appendHistory(prev: BoardData | null, next: BoardData, now = Date.now()): HistoryEvent[] {
  const history = [...(prev?.history ?? next.history ?? [])];
  if (!prev) return history;
  const before = new Map(prev.tasks.map((t) => [t.id, t]));
  const after = new Map(next.tasks.map((t) => [t.id, t]));

  const push = (e: HistoryEvent) => {
    const last = history[history.length - 1];
    if (e.kind === 'updated' && last && last.kind === 'updated' && last.taskId === e.taskId && e.at - last.at < COALESCE_MS) {
      history[history.length - 1] = e;
      return;
    }
    history.push(e);
  };

  for (const [id, task] of after) {
    const old = before.get(id);
    const base = { at: now, taskId: id, key: task.key, title: task.title, task: strip(task) };
    if (!old) {
      push({ ...base, kind: 'created', to: task.status });
      continue;
    }
    if (old.status !== task.status) {
      const kind: HistoryKind = task.status === 'done' ? 'completed' : old.status === 'done' ? 'reopened' : 'status';
      push({ ...base, kind, from: old.status, to: task.status });
    } else if (!sameContent(old, task)) {
      const spentBefore = old.timeSpentMs ?? 0;
      const spentAfter = task.timeSpentMs ?? 0;
      if (spentAfter > spentBefore) push({ ...base, kind: 'time', ms: spentAfter - spentBefore });
      else push({ ...base, kind: 'updated' });
    }
  }
  for (const [id, old] of before) {
    if (!after.has(id)) push({ at: now, kind: 'deleted', taskId: id, key: old.key, title: old.title, from: old.status });
  }
  return history.length > MAX_EVENTS ? history.slice(history.length - MAX_EVENTS) : history;
}

export const dayStart = (iso: string) => new Date(`${iso}T00:00:00`).getTime();
export const dayEnd = (iso: string) => new Date(`${iso}T23:59:59.999`).getTime();

export function isoDay(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Verilen günün sonundaki pano durumunu yeniden kurar. Hiç kaydı olmayan (eski sürümlerden gelen)
 * görevler bugünkü hâlleriyle varsayılır.
 */
export function boardAt(data: BoardData, iso: string): Task[] {
  const end = dayEnd(iso);
  const history = data.history ?? [];
  const lastBefore = new Map<string, HistoryEvent>();
  const firstEvent = new Map<string, HistoryEvent>();
  for (const e of history) {
    if (!firstEvent.has(e.taskId)) firstEvent.set(e.taskId, e);
    if (e.at <= end) lastBefore.set(e.taskId, e);
  }
  const current = new Map(data.tasks.map((t) => [t.id, t]));
  const ids = new Set([...current.keys(), ...firstEvent.keys()]);
  const out: Task[] = [];
  for (const id of ids) {
    const last = lastBefore.get(id);
    if (last) {
      if (last.kind === 'deleted' || !last.task) continue;
      const pos = current.get(id);
      out.push({ ...last.task, x: pos?.x ?? 0, y: pos?.y ?? 0 } as Task);
      continue;
    }
    const first = firstEvent.get(id);
    if (first && first.kind === 'created') continue; // o tarihte henüz yoktu
    const cur = current.get(id);
    if (cur) out.push(cur);
  }
  return out;
}

export function eventsBetween(data: BoardData, fromIso: string, toIso: string): HistoryEvent[] {
  const a = dayStart(fromIso);
  const b = dayEnd(toIso);
  return (data.history ?? []).filter((e) => e.at >= a && e.at <= b);
}

/** Tarih aralığındaki günleri (dahil) döner. */
export function daysBetween(fromIso: string, toIso: string): string[] {
  const out: string[] = [];
  const d = new Date(`${fromIso}T12:00:00`);
  const end = new Date(`${toIso}T12:00:00`);
  while (d <= end && out.length < 3700) {
    out.push(isoDay(d.getTime()));
    d.setDate(d.getDate() + 1);
  }
  return out;
}
