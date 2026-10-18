import type { CSSProperties } from 'react';
import { AlertTriangle, CalendarCheck, CalendarClock, CheckCircle2, CircleDot, Ban, Timer } from 'lucide-react';
import { EmptyState, PageHeader, Panel, SectionTitle } from '../../components/ui';
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
    { label: t('overview.open'), value: open.length, icon: CircleDot, color: '#00F0FF' },
    { label: t('overview.overdue'), value: overdue.length, icon: AlertTriangle, color: '#FF2E63' },
    { label: t('overview.dueWeek'), value: dueWeek.length, icon: CalendarClock, color: '#FCEE0A' },
    { label: t('overview.doneWeek'), value: doneWeek.length, icon: CheckCircle2, color: '#3CFFA0' },
    { label: t('overview.blocked'), value: blocked.length, icon: Ban, color: '#FF9F1C' },
    { label: t('overview.timeTracked'), value: formatDuration(tracked), icon: Timer, color: '#FF2E88' },
  ];

  return (
    <div className="flex h-full flex-col overflow-auto">
      <PageHeader
        title={t('overview.title')}
        subtitle={`${new Date(now).toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' })} · ${t('overview.subtitle')}`}
      />
      <div className="@container flex flex-col gap-5 px-8 pb-8">
        <div className="grid grid-cols-2 gap-4 @2xl:grid-cols-3 @5xl:grid-cols-6">
          {kpis.map(({ label, value, icon: Icon, color }, i) => (
            <div key={label} className="animate-rise group" style={{ '--i': i } as CSSProperties}>
              <Panel className="h-full p-4 transition-[border-color,box-shadow] duration-200 group-hover:border-line-strong! group-hover:shadow-[0_0_22px_rgb(0_240_255/0.08),var(--shadow-glass)]!">
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-x-0 bottom-0 h-px opacity-40 transition-opacity duration-200 group-hover:opacity-90"
                  style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)` }}
                />
                <div className="flex items-center justify-between gap-2">
                  <span className="hud-label truncate text-[11px]!">{label}</span>
                  <Icon className="size-4 shrink-0" style={{ color }} />
                </div>
                <div className="font-display mt-3 text-[34px] leading-none font-bold tabular-nums" style={{ color, textShadow: `0 0 14px ${color}55` }}>
                  {value}
                </div>
              </Panel>
            </div>
          ))}
        </div>

        <Panel className="p-5">
          <SectionTitle className="mb-3">{t('overview.distribution')}</SectionTitle>
          <div className="flex h-2.5 gap-0.5 overflow-hidden bg-white/5">
            {LANES.map((l) => {
              const n = tasks.filter((x) => x.status === l.status).length;
              return n ? <div key={l.status} style={{ width: `${(n / tasks.length) * 100}%`, background: l.color, boxShadow: `0 0 10px ${l.color}` }} title={`${statusLabel(l.status)}: ${n}`} /> : null;
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

        <div className="grid grid-cols-1 gap-5 @3xl:grid-cols-2">
          <Panel className="p-5">
            <SectionTitle className="mb-2" icon={<CalendarClock />}>
              {t('overview.upcoming')}
            </SectionTitle>
            {upcoming.length === 0 && (
              <EmptyState icon={<CalendarCheck />} className="py-6">
                {t('overview.noUpcoming')}
              </EmptyState>
            )}
            <ul className="-mx-2 divide-y divide-line">
              {upcoming.map((x) => {
                const due = dueInfo(x);
                return (
                  <li key={x.id}>
                    <button onClick={() => onOpenTask(x.id)} className="group/row flex w-full items-center gap-3 px-2 py-2.5 text-left transition-colors hover:bg-cyan/[0.04]">
                      <span className="size-2 shrink-0 rotate-45" style={{ background: PRIORITY[x.priority].color, boxShadow: `0 0 6px ${PRIORITY[x.priority].color}` }} title={priorityLabel(x.priority)} />
                      <span className="w-16 shrink-0 font-mono text-xs text-ink-subtle">{x.key}</span>
                      <span className="min-w-0 flex-1 truncate text-sm transition-colors group-hover/row:text-cyan">{x.title}</span>
                      <span
                        className={`shrink-0 border px-1.5 py-0.5 text-[11px] font-medium ${
                          due?.tone === 'overdue'
                            ? 'border-danger/45 bg-danger/10 text-danger'
                            : due?.tone === 'soon'
                              ? 'border-volt/40 bg-volt/10 text-volt'
                              : 'border-line bg-white/[0.03] text-ink-muted'
                        }`}
                      >
                        {due?.label}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </Panel>
          <Panel className="p-5">
            {running.length > 0 && (
              <div className="notch-sm notch-frame notch-frame-sm relative mb-4 border border-cyan/40 bg-cyan/[0.08] p-3 [--notch-color:rgb(0_240_255/0.4)]">
                <div className="flex items-center gap-2 text-xs font-semibold text-cyan">
                  <span className="size-1.5 animate-pulse rounded-full bg-cyan shadow-[0_0_6px_rgb(0_240_255)]" />
                  {t('overview.running')}
                </div>
                {running.map((x) => (
                  <button key={x.id} onClick={() => onOpenTask(x.id)} className="mt-1.5 flex w-full items-center justify-between gap-3 text-left text-sm hover:text-cyan">
                    <span className="truncate">{x.title}</span>
                    <span className="font-mono text-cyan tabular-nums">{formatDuration(totalTime(x, now))}</span>
                  </button>
                ))}
              </div>
            )}
            <SectionTitle className="mb-2" icon={<CheckCircle2 />}>
              {t('overview.recentDone')}
            </SectionTitle>
            <ul className="-mx-2 divide-y divide-line">
              {recentDone.map((x) => (
                <li key={x.id}>
                  <button onClick={() => onOpenTask(x.id)} className="group/row flex w-full flex-col gap-0.5 px-2 py-2.5 text-left transition-colors hover:bg-cyan/[0.04]">
                    <span className="truncate text-sm transition-colors group-hover/row:text-cyan">
                      <span className="font-mono text-xs text-ink-subtle">{x.key}</span> {x.title}
                    </span>
                    {x.outcome && <span className="truncate text-xs text-success/85">{x.outcome}</span>}
                  </button>
                </li>
              ))}
              {recentDone.length === 0 && (
                <li>
                  <EmptyState icon={<CheckCircle2 />} className="py-6">
                    {t('common.none')}
                  </EmptyState>
                </li>
              )}
            </ul>
          </Panel>
        </div>
      </div>
    </div>
  );
}
