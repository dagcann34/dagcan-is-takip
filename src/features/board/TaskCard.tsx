import { memo, useRef } from 'react';
import { CalendarClock, CheckSquare, ChevronLeft, ChevronRight, Link2, Repeat, Share2, Timer } from 'lucide-react';
import { useT } from '../../i18n';
import { errorMessage, toast } from '../../lib/toast';
import { useNow } from '../../lib/useNow';
import { shareCard } from './exportBoard';
import { LANES, PRIORITY, dueInfo, formatDuration, priorityLabel, recurrenceLabel, totalTime, type Task } from './types';

const toneClass = {
  overdue: 'border-danger/50 bg-danger/10 text-danger',
  soon: 'border-volt/40 bg-volt/10 text-volt',
  normal: 'border-line bg-white/[0.03] text-ink-muted',
};

/**
 * Sabit Kanban kartı. Sürüklenemez; durum değişikliği yalnızca ◀ ▶ düğmeleri veya düzenleyiciyle yapılır.
 */
export const TaskCard = memo(function TaskCard({
  task,
  selected,
  blockedBy,
  onOpen,
  onMove,
}: {
  task: Task;
  selected: boolean;
  blockedBy: string[];
  onOpen: (id: string) => void;
  onMove: (id: string, dir: -1 | 1) => void;
}) {
  const { t } = useT();
  const ref = useRef<HTMLElement>(null);
  const running = !!task.timerStartedAt;
  const now = useNow(running ? 30_000 : 0);
  const due = dueInfo(task);
  const laneIndex = LANES.findIndex((l) => l.status === task.status);
  const lane = LANES[laneIndex];
  const prio = PRIORITY[task.priority];
  const checklist = task.checklist ?? [];
  const doneSteps = checklist.filter((c) => c.done).length;
  const spent = totalTime(task, now);

  async function share(e: React.MouseEvent) {
    e.stopPropagation();
    if (!ref.current) return;
    try {
      const path = await shareCard(ref.current, task.key);
      if (path) toast(t('board.shared', { path }));
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  }

  const stop = (fn: () => void) => (e: React.MouseEvent) => {
    e.stopPropagation();
    fn();
  };

  return (
    <article
      ref={ref}
      data-task-id={task.id}
      role="button"
      tabIndex={0}
      draggable={false}
      onDragStart={(e) => e.preventDefault()}
      onClick={() => onOpen(task.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen(task.id);
        } else if (e.key === 'ArrowLeft' && e.altKey) onMove(task.id, -1);
        else if (e.key === 'ArrowRight' && e.altKey) onMove(task.id, 1);
      }}
      className={`group notch notch-frame relative cursor-pointer border bg-navy-800/90 transition-[background-color,border-color,box-shadow] duration-150 select-none focus-visible:border-cyan/80 focus-visible:bg-navy-700/90 focus-visible:outline-none focus-visible:[--notch-color:rgb(0_240_255/0.8)] ${
        selected
          ? 'border-cyan/80 bg-navy-700/90 shadow-[0_0_0_1px_rgb(0_240_255/0.5),0_0_24px_rgb(0_240_255/0.25)] [--notch-color:rgb(0_240_255/0.8)]'
          : 'border-line hover:border-cyan/45 hover:bg-navy-700/90 hover:shadow-[0_0_18px_rgb(0_240_255/0.12)] hover:[--notch-color:rgb(0_240_255/0.45)]'
      }`}
    >
      {/* Durum şeridi */}
      <span className="absolute inset-y-0 left-0 w-[3px]" style={{ background: lane.color, boxShadow: `0 0 10px ${lane.color}` }} />
      <div className="py-3 pr-3 pl-4">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] font-medium tracking-wide text-ink-subtle">{task.key}</span>
          <span
            className="font-display border px-1.5 text-[11px] leading-[18px] font-bold tracking-wider uppercase"
            style={{ color: prio.color, borderColor: `${prio.color}55`, background: `${prio.color}14` }}
          >
            {priorityLabel(task.priority)}
          </span>
          {task.recurrence && <Repeat className="size-3 text-cyan" aria-label={recurrenceLabel(task.recurrence)} />}
          <button
            className="ml-auto grid size-6 place-items-center border border-transparent text-ink-subtle opacity-0 transition-all group-hover:opacity-100 group-focus-visible:opacity-100 hover:border-cyan/50 hover:text-cyan focus-visible:opacity-100 active:translate-y-px"
            title={t('board.shareCard')}
            onClick={share}
          >
            <Share2 className="size-3.5" />
          </button>
        </div>

        <p className="mt-2 text-[14px] leading-snug font-medium break-words text-ink">{task.title}</p>
        {task.outcome && <p className="mt-1.5 line-clamp-2 text-xs text-success/85">{task.outcome}</p>}
        {blockedBy.length > 0 && task.status !== 'done' && (
          <p className="mt-1.5 flex items-center gap-1 text-[11px] text-magenta">
            <Link2 className="size-3" /> {t('board.blockedBy', { key: blockedBy.join(', ') })}
          </p>
        )}

        {checklist.length > 0 && (
          <div className="mt-2.5 h-[3px] overflow-hidden bg-white/10">
            <div className="h-full bg-cyan shadow-[0_0_8px_rgb(0_240_255/0.8)]" style={{ width: `${(doneSteps / checklist.length) * 100}%` }} />
          </div>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {due && (
            <span className={`inline-flex items-center gap-1 border px-1.5 py-0.5 text-[11px] font-medium ${toneClass[due.tone]}`}>
              <CalendarClock className="size-3" /> {due.label}
            </span>
          )}
          {checklist.length > 0 && (
            <span className="inline-flex items-center gap-1 border border-line bg-white/[0.03] px-1.5 py-0.5 font-mono text-[11px] text-ink-muted">
              <CheckSquare className="size-3" /> {doneSteps}/{checklist.length}
            </span>
          )}
          {spent > 0 && (
            <span
              className={`inline-flex items-center gap-1 border px-1.5 py-0.5 font-mono text-[11px] ${
                running ? 'border-cyan/50 bg-cyan/10 text-cyan' : 'border-line bg-white/[0.03] text-ink-muted'
              }`}
            >
              <Timer className="size-3" /> {formatDuration(spent)}
            </span>
          )}
          <span className="ml-auto flex items-center gap-1">
            <button
              aria-label={t('board.moveLeft')}
              title={t('board.moveLeft')}
              disabled={laneIndex === 0}
              onClick={stop(() => onMove(task.id, -1))}
              className="grid size-6 place-items-center border border-transparent text-ink-subtle opacity-0 transition-all group-hover:opacity-100 hover:border-cyan/50 hover:bg-cyan/[0.07] hover:text-cyan group-focus-visible:opacity-100 focus-visible:opacity-100 active:translate-y-px disabled:pointer-events-none disabled:opacity-0"
            >
              <ChevronLeft className="size-3.5" />
            </button>
            <button
              aria-label={t('board.moveRight')}
              title={t('board.moveRight')}
              disabled={laneIndex === LANES.length - 1}
              onClick={stop(() => onMove(task.id, 1))}
              className="grid size-6 place-items-center border border-transparent text-ink-subtle opacity-0 transition-all group-hover:opacity-100 hover:border-cyan/50 hover:bg-cyan/[0.07] hover:text-cyan group-focus-visible:opacity-100 focus-visible:opacity-100 active:translate-y-px disabled:pointer-events-none disabled:opacity-0"
            >
              <ChevronRight className="size-3.5" />
            </button>
            {task.assignee && (
              <span
                className="notch-sm font-display grid size-6 place-items-center bg-gradient-to-br from-magenta to-cyan text-[10px] font-bold text-obsidian-950"
                title={task.assignee}
              >
                {task.assignee.slice(0, 2).toLocaleUpperCase('tr')}
              </span>
            )}
          </span>
        </div>
      </div>
    </article>
  );
});
