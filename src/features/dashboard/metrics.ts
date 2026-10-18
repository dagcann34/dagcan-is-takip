import type { BoardData, Priority, Status, Task } from '../board/types';
import { boardAt, dayStart, daysBetween, eventsBetween, isoDay } from '../history/history';

export interface FlowBucket {
  label: string;
  from: string;
  created: number;
  completed: number;
}

export interface DashboardMetrics {
  completed: number;
  created: number;
  avgLeadDays: number | null;
  timeMs: number;
  blockedAtEnd: number;
  flow: FlowBucket[];
  weekly: boolean;
  statusAtEnd: Record<Status, number>;
  completedByPriority: Record<Priority, number>;
  completedTasks: { key: string; title: string; outcome?: string; at: number; priority: Priority }[];
  busiest: { date: string; count: number } | null;
}

/** Tarih aralığı için dashboard metriklerini geçmiş kaydından hesaplar. */
export function computeMetrics(data: BoardData, from: string, to: string, locale: string): DashboardMetrics {
  const events = eventsBetween(data, from, to);
  const completedEvents = events.filter((e) => e.kind === 'completed');
  const createdEvents = events.filter((e) => e.kind === 'created');

  // Ortalama tamamlanma süresi: oluşturulma olayından tamamlanma olayına.
  const createdAt = new Map<string, number>();
  for (const e of data.history ?? []) if (e.kind === 'created' && !createdAt.has(e.taskId)) createdAt.set(e.taskId, e.at);
  const leads = completedEvents.map((e) => (createdAt.has(e.taskId) ? e.at - createdAt.get(e.taskId)! : null)).filter((x): x is number => x !== null);
  const avgLeadDays = leads.length ? Math.round((leads.reduce((a, b) => a + b, 0) / leads.length / 86_400_000) * 10) / 10 : null;

  const timeMs = events.filter((e) => e.kind === 'time').reduce((a, e) => a + (e.ms ?? 0), 0);

  const end: Task[] = boardAt(data, to);
  const statusAtEnd: Record<Status, number> = { todo: 0, inprogress: 0, blocked: 0, done: 0 };
  for (const t of end) statusAtEnd[t.status]++;

  const completedByPriority: Record<Priority, number> = { low: 0, medium: 0, high: 0, critical: 0 };
  for (const e of completedEvents) completedByPriority[e.task?.priority ?? 'medium']++;

  // Akış: 45 günden uzun aralıklar haftalık gruplanır.
  const days = daysBetween(from, to);
  const weekly = days.length > 45;
  const perDay = new Map<string, { created: number; completed: number }>();
  for (const d of days) perDay.set(d, { created: 0, completed: 0 });
  for (const e of createdEvents) perDay.get(isoDay(e.at))!.created++;
  for (const e of completedEvents) perDay.get(isoDay(e.at))!.completed++;

  let flow: FlowBucket[];
  if (!weekly) {
    flow = days.map((d) => ({
      label: new Date(`${d}T12:00:00`).toLocaleDateString(locale, { day: 'numeric', month: 'short' }),
      from: d,
      ...perDay.get(d)!,
    }));
  } else {
    flow = [];
    for (let i = 0; i < days.length; i += 7) {
      const chunk = days.slice(i, i + 7);
      flow.push({
        label: new Date(`${chunk[0]}T12:00:00`).toLocaleDateString(locale, { day: 'numeric', month: 'short' }),
        from: chunk[0],
        created: chunk.reduce((a, d) => a + perDay.get(d)!.created, 0),
        completed: chunk.reduce((a, d) => a + perDay.get(d)!.completed, 0),
      });
    }
  }

  let busiest: DashboardMetrics['busiest'] = null;
  for (const [d, v] of perDay) {
    const n = v.created + v.completed;
    if (n > 0 && (!busiest || n > busiest.count)) busiest = { date: d, count: n };
  }

  const completedTasks = completedEvents
    .slice()
    .sort((a, b) => b.at - a.at)
    .map((e) => ({ key: e.key, title: e.task?.title ?? e.title, outcome: e.task?.outcome, at: e.at, priority: e.task?.priority ?? 'medium' }));

  return {
    completed: completedEvents.length,
    created: createdEvents.length,
    avgLeadDays,
    timeMs,
    blockedAtEnd: statusAtEnd.blocked,
    flow,
    weekly,
    statusAtEnd,
    completedByPriority,
    completedTasks,
    busiest,
  };
}

export type RangePreset = 'week' | '7d' | 'month' | '30d' | 'quarter' | 'year';

export function presetRange(p: RangePreset, now = new Date()): { from: string; to: string } {
  const to = isoDay(now.getTime());
  const d = new Date(now);
  d.setHours(12, 0, 0, 0);
  switch (p) {
    case 'week':
      d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
      break;
    case '7d':
      d.setDate(d.getDate() - 6);
      break;
    case 'month':
      d.setDate(1);
      break;
    case '30d':
      d.setDate(d.getDate() - 29);
      break;
    case 'quarter':
      d.setMonth(Math.floor(d.getMonth() / 3) * 3, 1);
      break;
    case 'year':
      d.setMonth(0, 1);
      break;
  }
  return { from: isoDay(d.getTime()), to };
}

export const rangeDays = (from: string, to: string) => Math.round((dayStart(to) - dayStart(from)) / 86_400_000) + 1;
