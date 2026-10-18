import { useSyncExternalStore } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { getLang } from '../../i18n';
import { isDesktop } from '../../lib/platform';
import { CARD_INSET, LANES, LANE_HEADER, laneX, shiftDate, type BoardData, type Task } from './types';

/**
 * Görev panosu deposu. Görev başlıkları hassas değildir ve şimdilik localStorage'da tutulur;
 * hassas içerik (betik, IP, parola) Kasa'ya aittir. Bir sonraki aşamada SQLite (tauri-plugin-sql)
 * + şifreli eşitleme ile değiştirilecek tek dosya burasıdır.
 */
const KEY = 'dagcan.board.v1';

const iso = (offsetDays: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
};

const col = (status: Task['status']) => laneX(LANES.findIndex((l) => l.status === status)) + CARD_INSET;
const row = (i: number) => LANE_HEADER + 16 + i * 175;

const L = (trText: string, enText: string) => (getLang() === 'tr' ? trText : enText);

const SEED: BoardData = {
  seq: 106,
  tasks: [
    { id: 't101', key: 'DGN-101', title: L('Exchange SSL sertifikası yenileme', 'Renew Exchange SSL certificate'), status: 'todo', priority: 'high', dueDate: iso(1), assignee: 'Dağcan', description: L('mail.corp sertifikası 3 gün içinde sona eriyor.', 'The mail.corp certificate expires in 3 days.'), x: col('todo'), y: row(0) },
    { id: 't102', key: 'DGN-102', title: L('AD GPO denetimi ve temizlik', 'Audit and clean up AD GPOs'), status: 'todo', priority: 'medium', dueDate: iso(6), assignee: 'Dağcan', x: col('todo'), y: row(1) },
    { id: 't103', key: 'DGN-103', title: L('Veeam yedek geri yükleme testi', 'Veeam backup restore test'), status: 'inprogress', priority: 'high', dueDate: iso(0), assignee: 'Dağcan', timeSpentMs: 95 * 60_000, checklist: [{ id: 'c1', text: L('Test VM seç', 'Pick test VM'), done: true }, { id: 'c2', text: L('Geri yükle', 'Restore'), done: true }, { id: 'c3', text: L('Uygulamayı doğrula', 'Verify application'), done: false }], x: col('inprogress'), y: row(0) },
    { id: 't104', key: 'DGN-104', title: L('FortiGate firmware güncellemesi', 'FortiGate firmware upgrade'), status: 'blocked', priority: 'critical', assignee: 'Dağcan', description: L('Bakım penceresi onayı bekleniyor.', 'Waiting for maintenance window approval.'), x: col('blocked'), y: row(0) },
    { id: 't105', key: 'DGN-105', title: L('Intune uyumluluk politikası devreye alma', 'Roll out Intune compliance policy'), status: 'done', priority: 'medium', assignee: 'Dağcan', outcome: L('312 cihaz uyumlu hale geldi, kesinti yaşanmadı.', '312 devices became compliant with zero downtime.'), completedAt: iso(-2), x: col('done'), y: row(0) },
    { id: 't106', key: 'DGN-106', title: L('Dosya sunucusu DFS göçü', 'File server DFS migration'), status: 'done', priority: 'high', assignee: 'Dağcan', outcome: L('4 TB veri taşındı, planlı kesinti 25 dk.', '4 TB migrated with a planned 25-minute outage.'), completedAt: iso(-5), x: col('done'), y: row(1) },
  ],
  links: [{ id: 'l1', source: 't103', target: 't104' }],
};

const listeners = new Set<() => void>();
let cacheRaw: string | null = null;
let cache: BoardData = SEED;

function read(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function getBoard(): BoardData {
  const raw = read();
  if (raw === null) return SEED;
  if (raw !== cacheRaw) {
    try {
      cache = JSON.parse(raw) as BoardData;
      cacheRaw = raw;
    } catch {
      /* bozuk veri: son geçerli durumu koru */
    }
  }
  return cache;
}

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** Tamamlanan tekrarlayan görevler için bir sonraki kopyayı ekler. Değişiklik yaptıysa yeni veriyi döner. */
function spawnRecurrences(data: BoardData): BoardData | null {
  const due = data.tasks.filter((t) => t.status === 'done' && t.recurrence && !t.recurrenceSpawned);
  if (!due.length) return null;
  let seq = data.seq;
  const todoCount = data.tasks.filter((t) => t.status === 'todo').length;
  const spawned: Task[] = due.map((t, i) => {
    seq += 1;
    return {
      id: crypto.randomUUID(),
      key: `DGN-${seq}`,
      title: t.title,
      description: t.description,
      priority: t.priority,
      assignee: t.assignee,
      recurrence: t.recurrence,
      status: 'todo',
      dueDate: shiftDate(t.dueDate ?? today(), t.recurrence!),
      checklist: t.checklist?.map((c) => ({ ...c, id: crypto.randomUUID(), done: false })),
      x: col('todo'),
      y: row(todoCount + i),
    };
  });
  const ids = new Set(due.map((t) => t.id));
  return {
    ...data,
    seq,
    tasks: [...data.tasks.map((t) => (ids.has(t.id) ? { ...t, recurrenceSpawned: true } : t)), ...spawned],
  };
}

let fileTimer: ReturnType<typeof setTimeout> | undefined;
function persistToFile(raw: string) {
  if (!isDesktop) return;
  clearTimeout(fileTimer);
  fileTimer = setTimeout(() => invoke('board_save', { data: raw }).catch(() => {}), 400);
}

/**
 * Panoyu kaydeder. Tekrarlayan görevlerden yeni kopya türediyse `true` döner;
 * çağıran taraf (pano tuvali) o durumda görünümünü depodan yeniden kurmalıdır.
 */
export function saveBoard(input: BoardData): boolean {
  const derived = spawnRecurrences(input);
  const data = derived ?? input;
  const raw = JSON.stringify(data);
  if (raw === cacheRaw) return false;
  cacheRaw = raw;
  cache = data;
  try {
    localStorage.setItem(KEY, raw);
  } catch {
    /* depolama dolu/erişilemez: bellekte devam */
  }
  persistToFile(raw);
  listeners.forEach((l) => l());
  return derived !== null;
}

/**
 * Masaüstünde açılışta pano verisini uygulama klasöründeki board.json'dan yükler.
 * Dosya yoksa mevcut tarayıcı önbelleğini (eski sürümler) dosyaya taşır.
 */
export async function hydrateBoard(): Promise<void> {
  if (!isDesktop) return;
  try {
    const fromFile = await invoke<string | null>('board_load');
    if (fromFile) {
      JSON.parse(fromFile);
      localStorage.setItem(KEY, fromFile);
    } else {
      const existing = read();
      if (existing) await invoke('board_save', { data: existing });
    }
  } catch {
    /* dosya okunamazsa önbellekle devam */
  }
}

export function subscribeBoard(cb: () => void) {
  listeners.add(cb);
  // Hızlı Görev penceresi gibi diğer pencerelerden gelen değişiklikler.
  const onStorage = (e: StorageEvent) => e.key === KEY && cb();
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener('storage', onStorage);
  };
}

export function useBoard(): BoardData {
  return useSyncExternalStore(subscribeBoard, getBoard);
}

export function nextKey(data: BoardData): { seq: number; key: string } {
  const seq = data.seq + 1;
  return { seq, key: `DGN-${seq}` };
}

export function updateTask(id: string, patch: Partial<Task>) {
  const data = getBoard();
  saveBoard({ ...data, tasks: data.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)) });
}

export function addTask(partial: Pick<Task, 'title'> & Partial<Task>): Task {
  const data = getBoard();
  const { seq, key } = nextKey(data);
  const inTodo = data.tasks.filter((t) => t.status === 'todo').length;
  const task: Task = {
    id: crypto.randomUUID(),
    key,
    status: 'todo',
    priority: 'medium',
    x: col('todo'),
    y: row(inTodo),
    ...partial,
  };
  saveBoard({ ...data, seq, tasks: [...data.tasks, task] });
  return task;
}
