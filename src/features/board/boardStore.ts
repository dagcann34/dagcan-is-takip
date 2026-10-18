import { useSyncExternalStore } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { getLang } from '../../i18n';
import { isDesktop } from '../../lib/platform';
import { appendHistory, type HistoryEvent } from '../history/history';
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

// Demo geçmişi: dashboard ve "geçmişe dön" ekranları ilk açılışta da anlamlı olsun.
const DAY = 86_400_000;
const at = (offsetDays: number, hour = 10) => {
  const d = new Date();
  d.setHours(hour, 0, 0, 0);
  return d.getTime() + offsetDays * DAY;
};
const EXTRA_DONE: Task[] = [
  { id: 't095', key: 'DGN-095', title: L('VPN istemcisi güncellemesi', 'VPN client rollout'), status: 'done', priority: 'medium', assignee: 'Dağcan', outcome: L('620 cihaz güncellendi, destek talebi %40 azaldı.', '620 devices updated, support tickets down 40%.'), completedAt: iso(-24), x: 0, y: 0 },
  { id: 't096', key: 'DGN-096', title: L('Yazıcı sunucusu konsolidasyonu', 'Print server consolidation'), status: 'done', priority: 'low', assignee: 'Dağcan', outcome: L('3 sunucu 1 sunucuya indirildi.', '3 servers consolidated into 1.'), completedAt: iso(-19), x: 0, y: 0 },
  { id: 't097', key: 'DGN-097', title: L('MFA zorunluluğu (yöneticiler)', 'Enforce MFA for admins'), status: 'done', priority: 'critical', assignee: 'Dağcan', outcome: L('48 ayrıcalıklı hesapta MFA aktif.', 'MFA active on 48 privileged accounts.'), completedAt: iso(-12), x: 0, y: 0 },
  { id: 't098', key: 'DGN-098', title: L('SQL yedek saklama politikası', 'SQL backup retention policy'), status: 'done', priority: 'high', assignee: 'Dağcan', outcome: L('Depolama maliyeti aylık %18 düştü.', 'Storage cost down 18% per month.'), completedAt: iso(-9), x: 0, y: 0 },
];
SEED.tasks = [...SEED.tasks, ...EXTRA_DONE];
SEED.history = (() => {
  const ev: HistoryEvent[] = [];
  const snap = (t: Task, patch: Partial<Task> = {}) => {
    const { x: _x, y: _y, ...rest } = { ...t, ...patch };
    return rest;
  };
  const created = (t: Task, day: number) => ev.push({ at: at(day, 9), kind: 'created', taskId: t.id, key: t.key, title: t.title, to: 'todo', task: snap(t, { status: 'todo', completedAt: undefined }) });
  const move = (t: Task, day: number, from: Task['status'], to: Task['status'], hour = 14) =>
    ev.push({ at: at(day, hour), kind: to === 'done' ? 'completed' : 'status', taskId: t.id, key: t.key, title: t.title, from, to, task: snap(t, { status: to, completedAt: to === 'done' ? t.completedAt : undefined }) });
  const byId = new Map(SEED.tasks.map((t) => [t.id, t]));
  const g = (id: string) => byId.get(id)!;
  created(g('t095'), -30); move(g('t095'), -27, 'todo', 'inprogress'); move(g('t095'), -24, 'inprogress', 'done', 16);
  created(g('t096'), -26); move(g('t096'), -21, 'todo', 'inprogress'); move(g('t096'), -19, 'inprogress', 'done', 15);
  created(g('t097'), -20); move(g('t097'), -16, 'todo', 'inprogress'); move(g('t097'), -12, 'inprogress', 'done', 17);
  created(g('t098'), -15); move(g('t098'), -11, 'todo', 'inprogress'); move(g('t098'), -9, 'inprogress', 'done', 11);
  created(g('t106'), -13); move(g('t106'), -8, 'todo', 'inprogress'); move(g('t106'), -5, 'inprogress', 'done', 18);
  created(g('t105'), -10); move(g('t105'), -6, 'todo', 'inprogress'); move(g('t105'), -2, 'inprogress', 'done', 13);
  created(g('t104'), -7); move(g('t104'), -4, 'todo', 'inprogress'); move(g('t104'), -2, 'inprogress', 'blocked', 10);
  created(g('t103'), -5); move(g('t103'), -3, 'todo', 'inprogress');
  ev.push({ at: at(-3, 16), kind: 'time', taskId: 't103', key: 'DGN-103', title: g('t103').title, ms: 55 * 60_000, task: snap(g('t103'), { timeSpentMs: 55 * 60_000 }) });
  ev.push({ at: at(-1, 15), kind: 'time', taskId: 't103', key: 'DGN-103', title: g('t103').title, ms: 40 * 60_000, task: snap(g('t103')) });
  created(g('t101'), -3); created(g('t102'), -1);
  return ev.sort((a, b) => a.at - b.at);
})();

const listeners = new Set<() => void>();
let cacheRaw: string | null = null;
let cache: BoardData = SEED;

// Masaüstünde pano yalnızca bellekte ve şifreli board.json dosyasında tutulur; düz metin
// tarayıcı depolamasına (localStorage) yazılmaz. Tarayıcı önizlemesinde localStorage kullanılır.
let memoryRaw: string | null = null;

function read(): string | null {
  if (isDesktop) return memoryRaw;
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

function write(raw: string) {
  if (isDesktop) {
    memoryRaw = raw;
    return;
  }
  try {
    localStorage.setItem(KEY, raw);
  } catch {
    /* depolama dolu/erişilemez: bellekte devam */
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
  const merged = derived ?? input;
  const data: BoardData = { ...merged, history: appendHistory(getBoard(), merged) };
  const raw = JSON.stringify(data);
  if (raw === cacheRaw) return false;
  cacheRaw = raw;
  cache = data;
  write(raw);
  persistToFile(raw);
  listeners.forEach((l) => l());
  return derived !== null;
}

/**
 * Masaüstünde açılışta panoyu şifreli board.json dosyasından yükler. Eski sürümlerin bıraktığı
 * düz metin önbellek varsa şifreli dosyaya taşınır ve tarayıcı depolamasından silinir.
 * Diğer pencereler panoyu değiştirdiğinde (Hızlı Görev) güncel hali yeniden okunur.
 */
export async function hydrateBoard(): Promise<void> {
  if (!isDesktop) return;
  let legacy: string | null = null;
  try {
    legacy = localStorage.getItem(KEY);
  } catch {
    legacy = null;
  }
  try {
    const fromFile = await invoke<string | null>('board_load');
    if (fromFile) {
      JSON.parse(fromFile);
      memoryRaw = fromFile;
    } else if (legacy) {
      JSON.parse(legacy);
      memoryRaw = legacy;
      await invoke('board_save', { data: legacy });
    }
  } catch {
    /* okunamazsa örnek panoyla başla */
  }
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* yoksay */
  }

  const { listen } = await import('@tauri-apps/api/event');
  const { getCurrentWindow } = await import('@tauri-apps/api/window');
  const self = getCurrentWindow().label;

  // Eski sürümlerin WebView veritabanında silinmiş ama diskte kalmış düz metin sayfaları bir kez
  // tamamen temizlenir; dil gibi zararsız tercihler korunur.
  if (self === 'main') {
    const keep = ['dagcan.lang', 'dagcan.calendar', 'dagcan.notified.v1'];
    const saved = keep.map((k) => [k, localStorage.getItem(k)] as const);
    try {
      if (await invoke<boolean>('wipe_legacy_web_data')) {
        for (const [k, v] of saved) if (v !== null) localStorage.setItem(k, v);
      }
    } catch {
      /* yoksay */
    }
  }
  await listen<string>('board-changed', async (e) => {
    if (e.payload === self) return;
    try {
      const raw = await invoke<string | null>('board_load');
      if (raw && raw !== cacheRaw) {
        memoryRaw = raw;
        listeners.forEach((l) => l());
      }
    } catch {
      /* yoksay */
    }
  });
}

export function subscribeBoard(cb: () => void) {
  listeners.add(cb);
  // Tarayıcı önizlemesi: diğer sekmelerden gelen değişiklikler.
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

const STATUSES = new Set(['todo', 'inprogress', 'blocked', 'done']);
const PRIORITIES = new Set(['low', 'medium', 'high', 'critical']);

/** İçe aktarılan pano verisini sıkı doğrular; bozuk veri arayüzü kalıcı olarak çökertmesin. */
export function validateBoard(input: unknown): BoardData | null {
  const d = input as BoardData;
  if (!d || typeof d !== 'object' || typeof d.seq !== 'number' || !Array.isArray(d.tasks) || !Array.isArray(d.links)) return null;
  if (d.tasks.length > 20_000) return null;
  const ok = d.tasks.every(
    (t) =>
      t &&
      typeof t.id === 'string' &&
      typeof t.key === 'string' &&
      typeof t.title === 'string' &&
      t.title.length <= 500 &&
      STATUSES.has(t.status) &&
      PRIORITIES.has(t.priority) &&
      Number.isFinite(t.x) &&
      Number.isFinite(t.y) &&
      (t.dueDate === undefined || /^\d{4}-\d{2}-\d{2}$/.test(t.dueDate)),
  );
  const linksOk = d.links.every((l) => l && typeof l.id === 'string' && typeof l.source === 'string' && typeof l.target === 'string');
  if (!ok || !linksOk) return null;
  if (d.history !== undefined && !Array.isArray(d.history)) return null;
  return d;
}
