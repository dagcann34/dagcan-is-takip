export type Status = 'todo' | 'inprogress' | 'blocked' | 'done';
export type Priority = 'low' | 'medium' | 'high' | 'critical';
export type Recurrence = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
export const RECURRENCES: Recurrence[] = ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'];

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
  /** Tamamlanınca bir sonraki kopyanın oluşturulacağı periyot. */
  recurrence?: Recurrence;
  /** Bu kopyadan sonraki tekrar oluşturulduysa true (iki kez oluşmasın). */
  recurrenceSpawned?: boolean;
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
  { status: 'todo', color: '#8A97C8' },
  { status: 'inprogress', color: '#00F0FF' },
  { status: 'blocked', color: '#FF2E63' },
  { status: 'done', color: '#3CFFA0' },
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

export const PRIORITY: Record<Priority, { color: string; rank: number }> = {
  low: { color: '#00F0FF', rank: 0 },
  medium: { color: '#FCEE0A', rank: 1 },
  high: { color: '#FF9F1C', rank: 2 },
  critical: { color: '#FF2E63', rank: 3 },
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

export const recurrenceLabel = (r: Recurrence) => t(`recurrence.${r}` as MessageKey);

/** YYYY-MM-DD tarihini periyot kadar ileri taşır (ay sonu taşmalarını son güne sabitler). */
export function shiftDate(iso: string, r: Recurrence): string {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  if (r === 'daily') date.setDate(date.getDate() + 1);
  else if (r === 'weekly') date.setDate(date.getDate() + 7);
  else {
    const months = r === 'monthly' ? 1 : r === 'quarterly' ? 3 : 12;
    const target = new Date(y, m - 1 + months, 1);
    const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
    target.setDate(Math.min(d, lastDay));
    return `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, '0')}-${String(target.getDate()).padStart(2, '0')}`;
  }
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
