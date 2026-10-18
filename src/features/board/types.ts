export type Status = 'todo' | 'inprogress' | 'blocked' | 'done';
export type Priority = 'low' | 'medium' | 'high' | 'critical';

import { t } from '../../i18n';
import type { MessageKey } from '../../i18n';

export interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

export interface Task {
  id: string;
  key: string;
  title: string;
  description?: string;
  /** Ölçülebilir sonuç (AI özet ve STAR dönüştürücü bunu kullanır): "Kesinti 0 dk, 450 kullanıcı". */
  outcome?: string;
  status: Status;
  priority: Priority;
  assignee?: string;
  /** YYYY-MM-DD */
  dueDate?: string;
  completedAt?: string;
  checklist?: ChecklistItem[];
  /** Toplam takip edilen süre (ms) — çalışan oturum hariç. */
  timeSpentMs?: number;
  /** Çalışan zamanlayıcının başlangıcı (epoch ms). */
  timerStartedAt?: number;
  x: number;
  y: number;
}

export interface Link {
  id: string;
  source: string;
  target: string;
}

export interface BoardData {
  seq: number;
  tasks: Task[];
  links: Link[];
}

export const LANES: { status: Status; color: string }[] = [
  { status: 'todo', color: '#8590A2' },
  { status: 'inprogress', color: '#579DFF' },
  { status: 'blocked', color: '#FF5630' },
  { status: 'done', color: '#36B37E' },
];

export const statusLabel = (s: Status) => t(`status.${s}` as MessageKey);
export const priorityLabel = (p: Priority) => t(`priority.${p}` as MessageKey);

export const LANE_WIDTH = 300;
export const LANE_GAP = 24;
export const LANE_HEIGHT = 1100;
export const CARD_WIDTH = 260;
export const CARD_INSET = (LANE_WIDTH - CARD_WIDTH) / 2;
export const LANE_HEADER = 64;

export const laneX = (i: number) => i * (LANE_WIDTH + LANE_GAP);

export function laneIndexForX(x: number): number {
  const center = x + CARD_WIDTH / 2;
  return Math.max(0, Math.min(LANES.length - 1, Math.floor(center / (LANE_WIDTH + LANE_GAP))));
}

export const PRIORITY: Record<Priority, { color: string }> = {
  low: { color: '#579DFF' },
  medium: { color: '#FFAB00' },
  high: { color: '#FF7452' },
  critical: { color: '#FF5630' },
};

export function dueInfo(task: Pick<Task, 'dueDate' | 'status'>): { label: string; tone: 'overdue' | 'soon' | 'normal' } | null {
  if (!task.dueDate || task.status === 'done') return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(`${task.dueDate}T00:00:00`);
  const days = Math.round((due.getTime() - today.getTime()) / 86_400_000);
  if (days < 0) return { label: t('due.overdue', { days: -days }), tone: 'overdue' };
  if (days === 0) return { label: t('due.today'), tone: 'soon' };
  if (days === 1) return { label: t('due.tomorrow'), tone: 'soon' };
  const locale = document.documentElement.lang === 'tr' ? 'tr-TR' : 'en-US';
  return { label: due.toLocaleDateString(locale, { day: 'numeric', month: 'short' }), tone: 'normal' };
}

/** Çalışan oturum dahil toplam süre. */
export function totalTime(task: Pick<Task, 'timeSpentMs' | 'timerStartedAt'>, now = Date.now()): number {
  return (task.timeSpentMs ?? 0) + (task.timerStartedAt ? now - task.timerStartedAt : 0);
}

export function formatDuration(ms: number): string {
  const totalMin = Math.floor(ms / 60_000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${String(m).padStart(2, '0')}m`;
}
