import { memo, useRef } from 'react';
import { Handle, Position, useNodes, type Node, type NodeProps } from '@xyflow/react';
import { CalendarClock, CheckSquare, Share2, Timer } from 'lucide-react';
import { useT } from '../../i18n';
import { errorMessage, toast } from '../../lib/toast';
import { useNow } from '../../lib/useNow';
import { shareCard } from './exportBoard';
import { CARD_WIDTH, LANE_HEIGHT, LANE_WIDTH, LANES, PRIORITY, dueInfo, formatDuration, priorityLabel, statusLabel, totalTime, type Status, type Task } from './types';

export type CardNodeType = Node<{ task: Task }, 'card'>;
export type LaneNodeType = Node<{ status: Status }, 'lane'>;

export const LaneNode = memo(function LaneNode({ data }: NodeProps<LaneNodeType>) {
  useT();
  const lane = LANES.find((l) => l.status === data.status)!;
  const count = useNodes().filter((n) => n.type === 'card' && (n as CardNodeType).data.task.status === data.status).length;
  return (
    <div className="rounded-2xl border border-line bg-navy-900/40" style={{ width: LANE_WIDTH, height: LANE_HEIGHT }}>
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full" style={{ background: lane.color }} />
          <span className="text-xs font-semibold tracking-wider text-ink-muted uppercase">{statusLabel(data.status)}</span>
        </div>
        <span className="rounded-full bg-white/5 px-2 py-0.5 text-xs text-ink-muted tabular-nums">{count}</span>
      </div>
      <div className="mx-4 h-px" style={{ background: `linear-gradient(90deg, ${lane.color}, transparent)` }} />
    </div>
  );
});

const toneClass = {
  overdue: 'bg-danger/15 text-danger',
  soon: 'bg-warning/15 text-warning',
  normal: 'bg-white/5 text-ink-muted',
};

export const CardNode = memo(function CardNode({ data, selected }: NodeProps<CardNodeType>) {
  const { t } = useT();
  const ref = useRef<HTMLDivElement>(null);
  const task = data.task;
  const running = !!task.timerStartedAt;
  const now = useNow(running ? 30_000 : 0);
  const due = dueInfo(task);
  const lane = LANES.find((l) => l.status === task.status)!;
  const prio = PRIORITY[task.priority];
  const checklist = task.checklist ?? [];
  const doneSteps = checklist.filter((c) => c.done).length;
  const spent = totalTime(task, now);

  async function share(e: React.MouseEvent) {
    e.stopPropagation();
    if (!ref.current) return;
    try {
      const { path, copied } = await shareCard(ref.current, task.key);
      toast(copied ? t('board.sharedCopied', { path }) : t('board.shared', { path }));
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  }

  return (
    <div
      ref={ref}
      className={`relative overflow-hidden rounded-xl border bg-navy-800 transition-shadow ${
        selected ? 'border-cyan/70 shadow-[0_0_0_3px_rgb(0_184_217/0.25)]' : 'border-line-strong hover:border-white/25'
      }`}
      style={{ width: CARD_WIDTH }}
    >
      <span className="absolute inset-y-0 left-0 w-1" style={{ background: lane.color }} />
      <Handle type="target" position={Position.Left} />
      <div className="py-3 pr-3 pl-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs">
            <span className="font-semibold tracking-wide text-ink-muted">{task.key}</span>
            <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-medium" style={{ color: prio.color, background: `${prio.color}1f` }}>
              {priorityLabel(task.priority)}
            </span>
          </div>
          <button className="nodrag grid size-6 place-items-center rounded-md text-ink-subtle hover:bg-white/10 hover:text-ink" title={t('board.shareCard')} onClick={share}>
            <Share2 className="size-3.5" />
          </button>
        </div>
        <p className="mt-2 text-sm leading-snug font-medium text-ink">{task.title}</p>
        {task.outcome && <p className="mt-1.5 line-clamp-2 text-xs text-success/90">{task.outcome}</p>}
        {checklist.length > 0 && (
          <div className="mt-2.5">
            <div className="h-1 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-cyan" style={{ width: `${(doneSteps / checklist.length) * 100}%` }} />
            </div>
          </div>
        )}
        <div className="mt-3 flex items-center gap-1.5">
          {due && (
            <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium ${toneClass[due.tone]}`}>
              <CalendarClock className="size-3" /> {due.label}
            </span>
          )}
          {checklist.length > 0 && (
            <span className="inline-flex items-center gap-1 rounded-md bg-white/5 px-1.5 py-0.5 text-[11px] text-ink-muted tabular-nums">
              <CheckSquare className="size-3" /> {doneSteps}/{checklist.length}
            </span>
          )}
          {spent > 0 && (
            <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] tabular-nums ${running ? 'bg-cyan/15 text-cyan' : 'bg-white/5 text-ink-muted'}`}>
              <Timer className="size-3" /> {formatDuration(spent)}
            </span>
          )}
          {task.assignee && (
            <span
              className="ml-auto grid size-6 place-items-center rounded-full bg-gradient-to-br from-brand to-cyan text-[10px] font-semibold text-white"
              title={task.assignee}
            >
              {task.assignee.slice(0, 2).toLocaleUpperCase('tr')}
            </span>
          )}
        </div>
      </div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
});

export const nodeTypes = { card: CardNode, lane: LaneNode };
