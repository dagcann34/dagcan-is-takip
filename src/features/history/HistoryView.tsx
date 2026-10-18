import { useMemo, useState } from 'react';
import { CheckCircle2, ChevronLeft, ChevronRight, Clock, Eye, PencilLine, Plus, RotateCcw, Shuffle, Trash2 } from 'lucide-react';
import { Button, Input, PageHeader, Panel } from '../../components/ui';
import { useT, type MessageKey } from '../../i18n';
import { useBoard } from '../board/boardStore';
import { LANES, PRIORITY, formatDuration, priorityLabel, statusLabel, type Task } from '../board/types';
import { boardAt, daysBetween, eventsBetween, isoDay, type HistoryEvent, type HistoryKind } from './history';

const EV_ICON: Record<HistoryKind, typeof Plus> = {
  created: Plus,
  updated: PencilLine,
  status: Shuffle,
  completed: CheckCircle2,
  reopened: RotateCcw,
  deleted: Trash2,
  time: Clock,
};

const EV_COLOR: Record<HistoryKind, string> = {
  created: '#00F0FF',
  updated: '#93A6CC',
  status: '#FCEE0A',
  completed: '#3CFFA0',
  reopened: '#FF9F1C',
  deleted: '#FF2E63',
  time: '#FF2E88',
};

// Tek renkli (cyan) sıralı ısı rampası: az → çok.
const HEAT = ['rgb(255 255 255 / 0.05)', 'rgb(0 240 255 / 0.22)', 'rgb(0 240 255 / 0.42)', 'rgb(0 240 255 / 0.65)', 'rgb(0 240 255 / 0.95)'];

function shift(iso: string, days: number) {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + days);
  return isoDay(d.getTime());
}

/** Zaman Makinesi: geçmişteki herhangi bir günün panosu ve etkinlik akışı (salt okunur). */
export function HistoryView() {
  const { t, locale } = useT();
  const board = useBoard();
  const today = isoDay(Date.now());
  const [day, setDay] = useState(today);

  const snapshot = useMemo(() => boardAt(board, day), [board, day]);
  const events = useMemo(() => eventsBetween(board, day, day).slice().reverse(), [board, day]);

  // Son 26 hafta (Pazartesi başlangıçlı) için günlük etkinlik sayıları.
  const heat = useMemo(() => {
    const end = new Date(`${today}T12:00:00`);
    const start = new Date(end);
    start.setDate(start.getDate() - 7 * 25 - ((end.getDay() + 6) % 7));
    const days = daysBetween(isoDay(start.getTime()), today);
    const counts = new Map<string, number>();
    for (const e of board.history ?? []) {
      const k = isoDay(e.at);
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
    const max = Math.max(1, ...days.map((d) => counts.get(d) ?? 0));
    return { days, counts, max };
  }, [board.history, today]);

  const level = (n: number) => (n === 0 ? 0 : Math.min(4, Math.ceil((n / heat.max) * 4)));
  const dayDone = events.filter((e) => e.kind === 'completed').length;
  const dayNew = events.filter((e) => e.kind === 'created').length;
  const longDate = new Date(`${day}T12:00:00`).toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const describe = (e: HistoryEvent) => {
    if (e.kind === 'status') return t('history.ev.status', { from: statusLabel(e.from!), to: statusLabel(e.to!) });
    if (e.kind === 'time') return t('history.ev.time', { time: formatDuration(e.ms ?? 0) });
    return t(`history.ev.${e.kind}` as MessageKey);
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <PageHeader
        title={t('history.title')}
        subtitle={t('history.subtitle')}
        actions={
          <>
            <Button variant="ghost" aria-label={t('history.prevDay')} title={t('history.prevDay')} onClick={() => setDay((d) => shift(d, -1))}>
              <ChevronLeft className="size-4" />
            </Button>
            <Input type="date" value={day} max={today} onChange={(e) => e.target.value && setDay(e.target.value)} className="notch-sm w-40!" />
            <Button
              variant="ghost"
              aria-label={t('history.nextDay')}
              title={t('history.nextDay')}
              disabled={day >= today}
              onClick={() => setDay((d) => (d < today ? shift(d, 1) : d))}
            >
              <ChevronRight className="size-4" />
            </Button>
            <Button onClick={() => setDay(today)} disabled={day === today}>
              {t('history.today')}
            </Button>
          </>
        }
      />

      <div className="flex min-h-0 flex-1 flex-col gap-4 px-8 pb-6">
        {/* Isı haritası: güne tıklayınca o güne gider */}
        <Panel className="shrink-0 px-5 py-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="hud-label">{t('history.heatmap')}</span>
            <span className="flex items-center gap-1.5 text-[11px] text-ink-subtle">
              {t('history.heatLess')}
              {HEAT.map((c, i) => (
                <span key={i} className="size-2.5" style={{ background: c }} />
              ))}
              {t('history.heatMore')}
            </span>
          </div>
          <div className="grid auto-cols-max grid-flow-col grid-rows-7 justify-between gap-[3px] overflow-x-auto pb-1" role="grid">
            {heat.days.map((d) => {
              const n = heat.counts.get(d) ?? 0;
              const selected = d === day;
              return (
                <button
                  key={d}
                  onClick={() => setDay(d)}
                  title={`${new Date(`${d}T12:00:00`).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })} · ${n}`}
                  aria-label={`${d}: ${n}`}
                  className={`h-3.5 w-[18px] transition-transform hover:scale-125 ${selected ? 'ring-2 ring-magenta ring-offset-1 ring-offset-obsidian-900' : ''}`}
                  style={{ background: HEAT[level(n)] }}
                />
              );
            })}
          </div>
        </Panel>

        <div className="flex items-baseline justify-between gap-4">
          <h2 className="truncate text-xl font-bold tracking-[0.06em] uppercase">{longDate}</h2>
          <span className="flex shrink-0 items-center gap-2 font-mono text-xs text-ink-muted">
            <Eye className="size-3.5 text-cyan" /> {t('history.readOnly')} · {t('history.dayStats', { events: events.length, done: dayDone, created: dayNew })}
          </span>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-[1fr_340px] gap-4">
          {/* Salt okunur pano görüntüsü */}
          <div className="grid min-h-0 grid-cols-4 gap-3">
            {LANES.map((lane) => {
              const items = snapshot.filter((x) => x.status === lane.status);
              return (
                <section key={lane.status} className="glass notch flex min-h-0 min-w-0 flex-col">
                  <header className="flex shrink-0 items-center gap-2 px-3 pt-3 pb-2">
                    <span className="size-2 rotate-45" style={{ background: lane.color, boxShadow: `0 0 8px ${lane.color}` }} />
                    <h3 className="flex-1 truncate text-[13px] font-bold tracking-[0.12em] uppercase" style={{ color: lane.color }}>
                      {statusLabel(lane.status)}
                    </h3>
                    <span className="font-mono text-xs text-ink-subtle">{items.length}</span>
                  </header>
                  <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-2.5">
                    {items.map((task) => (
                      <SnapshotCard key={task.id} task={task} laneColor={lane.color} />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>

          {/* O günün etkinlik akışı */}
          <Panel className="flex min-h-0 flex-col">
            <div className="hud-label shrink-0 px-4 pt-4 pb-3">{t('history.timeline')}</div>
            <ol className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
              {events.length === 0 && <li className="py-10 text-center text-sm text-ink-subtle">{t('history.noEvents')}</li>}
              {events.map((e, i) => {
                const Icon = EV_ICON[e.kind];
                return (
                  <li key={`${e.at}-${i}`} className="relative flex gap-3 border-l border-line py-2 pl-4">
                    <span
                      className="absolute top-3 -left-[9px] grid size-[17px] place-items-center bg-obsidian-900"
                      style={{ color: EV_COLOR[e.kind] }}
                    >
                      <Icon className="size-3.5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] text-ink-subtle">
                          {new Date(e.at).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className="font-mono text-[11px] text-cyan">{e.key}</span>
                      </div>
                      <div className="truncate text-sm text-ink">{e.title}</div>
                      <div className="text-xs text-ink-muted">{describe(e)}</div>
                    </div>
                  </li>
                );
              })}
            </ol>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function SnapshotCard({ task, laneColor }: { task: Task; laneColor: string }) {
  const prio = PRIORITY[task.priority];
  return (
    <article className="notch-sm relative border border-line bg-navy-800/80 py-2 pr-2.5 pl-3.5 select-none" draggable={false}>
      <span className="absolute inset-y-0 left-0 w-[3px]" style={{ background: laneColor }} />
      <div className="flex items-center gap-1.5">
        <span className="font-mono text-[10px] text-ink-subtle">{task.key}</span>
        <span className="font-display text-[10px] font-bold tracking-wider uppercase" style={{ color: prio.color }}>
          {priorityLabel(task.priority)}
        </span>
      </div>
      <p className="mt-1 text-[13px] leading-snug text-ink">{task.title}</p>
      {task.outcome && <p className="mt-1 line-clamp-2 text-[11px] text-success/85">{task.outcome}</p>}
    </article>
  );
}
