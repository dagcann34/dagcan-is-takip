import { AlertTriangle, CalendarClock, CheckCircle2, CircleDot, Ban, Timer } from 'lucide-react';
import { PageHeader, Panel } from '../../components/ui';
import { useT } from '../../i18n';
import { useNow } from '../../lib/useNow';
import { useBoard } from '../board/boardStore';
import { LANES, PRIORITY, dueInfo, formatDuration, priorityLabel, statusLabel, totalTime, type Task } from '../board/types';

const DAY = 86_400_000;

function daysUntil(task: Task): number {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return Math.round((new Date(`${task.dueDate}T00:00:00`).getTime() - start.getTime()) / DAY);
}

export function Overview({ onOpenTask }: { onOpenTask: (id: string) => void }) {
  const { t, locale } = useT();
  const { tasks } = useBoard();
  const anyRunning = tasks.some((x) => x.timerStartedAt);
  const now = useNow(anyRunning ? 30_000 : 60_000);

  const open = tasks.filter((x) => x.status !== 'done');
  const withDue = open.filter((x) => x.dueDate);
  const overdue = withDue.filter((x) => daysUntil(x) < 0);
  const dueWeek = withDue.filter((x) => daysUntil(x) >= 0 && daysUntil(x) <= 7);
  const doneWeek = tasks.filter((x) => x.status === 'done' && x.completedAt && now - new Date(x.completedAt).getTime() <= 7 * DAY);
  const blocked = tasks.filter((x) => x.status === 'blocked');
  const tracked = tasks.reduce((sum, x) => sum + totalTime(x, now), 0);
  const running = tasks.filter((x) => x.timerStartedAt);
  const upcoming = [...withDue].sort((a, b) => (a.dueDate! < b.dueDate! ? -1 : 1)).slice(0, 6);
  const recentDone = tasks
    .filter((x) => x.status === 'done')
    .sort((a, b) => ((a.completedAt ?? '') < (b.completedAt ?? '') ? 1 : -1))
    .slice(0, 5);

  const kpis = [
    { label: t('overview.open'), value: open.length, icon: CircleDot, color: '#579DFF' },
    { label: t('overview.overdue'), value: overdue.length, icon: AlertTriangle, color: '#FF5630' },
    { label: t('overview.dueWeek'), value: dueWeek.length, icon: CalendarClock, color: '#FFAB00' },
    { label: t('overview.doneWeek'), value: doneWeek.length, icon: CheckCircle2, color: '#36B37E' },
    { label: t('overview.blocked'), value: blocked.length, icon: Ban, color: '#FF7452' },
    { label: t('overview.timeTracked'), value: formatDuration(tracked), icon: Timer, color: '#00B8D9' },
  ];

  return (
    <div className="flex h-full flex-col overflow-auto">
      <PageHeader
        title={t('overview.title')}
        subtitle={`${new Date(now).toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' })} · ${t('overview.subtitle')}`}
      />
      <div className="flex flex-col gap-5 px-8 pb-8">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-4">
          {kpis.map(({ label, value, icon: Icon, color }) => (
            <Panel key={label} className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-ink-muted">{label}</span>
                <Icon className="size-4" style={{ color }} />
              </div>
              <div className="mt-3 text-[28px] leading-none font-semibold tracking-tight tabular-nums">{value}</div>
            </Panel>
          ))}
        </div>

        <Panel className="p-5">
          <div className="mb-3 text-sm font-medium">{t('overview.distribution')}</div>
          <div className="flex h-3 overflow-hidden rounded-full bg-white/5">
            {LANES.map((l) => {
              const n = tasks.filter((x) => x.status === l.status).length;
              return n ? <div key={l.status} style={{ width: `${(n / tasks.length) * 100}%`, background: l.color }} title={`${statusLabel(l.status)}: ${n}`} /> : null;
            })}
          </div>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-ink-muted">
            {LANES.map((l) => (
              <span key={l.status} className="flex items-center gap-1.5">
                <span className="size-2 rounded-full" style={{ background: l.color }} /> {statusLabel(l.status)}{' '}
                <span className="text-ink tabular-nums">{tasks.filter((x) => x.status === l.status).length}</span>
              </span>
            ))}
          </div>
        </Panel>

        <div className="grid grid-cols-2 gap-5">
          <Panel className="p-5">
            <div className="mb-3 text-sm font-medium">{t('overview.upcoming')}</div>
            {upcoming.length === 0 && <p className="py-6 text-center text-sm text-ink-subtle">{t('overview.noUpcoming')}</p>}
            <ul className="divide-y divide-line">
              {upcoming.map((x) => {
                const due = dueInfo(x);
                return (
                  <li key={x.id}>
                    <button onClick={() => onOpenTask(x.id)} className="flex w-full items-center gap-3 py-2.5 text-left hover:text-cyan">
                      <span className="size-2 shrink-0 rounded-full" style={{ background: PRIORITY[x.priority].color }} title={priorityLabel(x.priority)} />
                      <span className="w-16 shrink-0 text-xs text-ink-subtle">{x.key}</span>
                      <span className="min-w-0 flex-1 truncate text-sm">{x.title}</span>
                      <span className={`shrink-0 text-xs ${due?.tone === 'overdue' ? 'text-danger' : due?.tone === 'soon' ? 'text-warning' : 'text-ink-muted'}`}>{due?.label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </Panel>
          <Panel className="p-5">
            {running.length > 0 && (
              <div className="mb-4 rounded-xl border border-cyan/30 bg-cyan/10 p-3">
                <div className="text-xs font-medium text-cyan">{t('overview.running')}</div>
                {running.map((x) => (
                  <button key={x.id} onClick={() => onOpenTask(x.id)} className="mt-1 flex w-full justify-between text-sm">
                    <span className="truncate">{x.title}</span>
                    <span className="font-mono tabular-nums">{formatDuration(totalTime(x, now))}</span>
                  </button>
                ))}
              </div>
            )}
            <div className="mb-3 text-sm font-medium">{t('overview.recentDone')}</div>
            <ul className="divide-y divide-line">
              {recentDone.map((x) => (
                <li key={x.id}>
                  <button onClick={() => onOpenTask(x.id)} className="flex w-full flex-col py-2.5 text-left hover:text-cyan">
                    <span className="truncate text-sm">
                      <span className="text-ink-subtle">{x.key}</span> {x.title}
                    </span>
                    {x.outcome && <span className="truncate text-xs text-success/80">{x.outcome}</span>}
                  </button>
                </li>
              ))}
              {recentDone.length === 0 && <li className="py-6 text-center text-sm text-ink-subtle">{t('common.none')}</li>}
            </ul>
          </Panel>
        </div>
      </div>
    </div>
  );
}
