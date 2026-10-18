import { forwardRef, useId, type CSSProperties, type ReactNode } from 'react';
import '@fontsource/caveat/600.css';
import '@fontsource/caveat/700.css';
import { useT } from '../../i18n';
import { LANES, formatDuration, priorityLabel, statusLabel, type Priority } from '../board/types';
import type { DashboardMetrics } from './metrics';
import type { DashboardTheme } from './themes';

export const CANVAS_W = 1600;
export const CANVAS_H = 1000;

const PRIORITIES: Priority[] = ['critical', 'high', 'medium', 'low'];

interface Props {
  theme: DashboardTheme;
  metrics: DashboardMetrics;
  title: string;
  from: string;
  to: string;
}

/** 1600×1000 rapor tuvali. Görünümde ölçeklenir, dışa aktarımda doğal boyutunda yakalanır. */
export const DashboardCanvas = forwardRef<HTMLDivElement, Props>(function DashboardCanvas({ theme, metrics, title, from, to }, ref) {
  const { t, locale } = useT();
  const filterId = useId().replace(/:/g, '');
  const sketch = theme.sketch ? `url(#${filterId})` : undefined;
  const fmt = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });

  const kpis = [
    { label: t('dash.kpi.completed'), value: String(metrics.completed) },
    { label: t('dash.kpi.created'), value: String(metrics.created) },
    { label: t('dash.kpi.lead'), value: metrics.avgLeadDays === null ? '—' : t('dash.kpi.leadUnit', { days: metrics.avgLeadDays }) },
    { label: t('dash.kpi.time'), value: metrics.timeMs ? formatDuration(metrics.timeMs) : '0m' },
    { label: t('dash.kpi.blocked'), value: String(metrics.blockedAtEnd) },
  ];

  const base: CSSProperties = {
    width: CANVAS_W,
    height: CANVAS_H,
    background: theme.background,
    color: theme.ink,
    fontFamily: theme.bodyFont,
    position: 'relative',
    overflow: 'hidden',
    boxSizing: 'border-box',
    ...theme.frame,
  };

  return (
    <div ref={ref} style={base} className="select-none" draggable={false}>
      {/* El çizimi filtresi (beyaz tahta / kara tahta) */}
      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden>
        <filter id={filterId}>
          <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="7" />
          <feDisplacementMap in="SourceGraphic" scale="2.6" />
        </filter>
      </svg>

      <div style={{ position: 'absolute', inset: theme.id === 'whiteboard' || theme.id === 'chalkboard' ? 30 : 44, display: 'flex', flexDirection: 'column', gap: 22 }}>
        {/* Başlık */}
        <header style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24, flexShrink: 0 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: theme.muted, fontSize: 15, fontFamily: theme.bodyFont, letterSpacing: '.08em', textTransform: 'uppercase' }} lang="en">
              <img src="/favicon.svg" alt="" width={28} height={28} /> Kanvault · Task & Security Hub
            </div>
            <h1
              style={{
                margin: '8px 0 0',
                maxWidth: 1000,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                fontFamily: theme.headingFont,
                fontSize: theme.headingFont.includes('Caveat') ? 64 : 48,
                lineHeight: 1,
                fontWeight: 700,
                letterSpacing: theme.id === 'neon' ? '.06em' : theme.id === 'blueprint' ? '.02em' : 0,
                textTransform: theme.id === 'neon' ? 'uppercase' : 'none',
                textShadow: theme.id === 'neon' ? '0 0 18px rgb(0 240 255 / .35)' : undefined,
              }}
            >
              {title}
            </h1>
            <div style={{ marginTop: 8, height: 4, width: 140, background: theme.accent, filter: sketch, borderRadius: theme.sketch ? 4 : 0 }} />
          </div>
          <div style={{ textAlign: 'right', color: theme.muted, fontSize: 18, lineHeight: 1.5 }}>
            <div style={{ color: theme.ink, fontFamily: theme.headingFont, fontSize: theme.headingFont.includes('Caveat') ? 34 : 24, fontWeight: 700 }}>
              {fmt(from)} — {fmt(to)}
            </div>
            <div style={{ fontSize: 14 }}>{t('dash.generated', { date: new Date().toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' }) })}</div>
          </div>
        </header>

        {/* Göstergeler */}
        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16, flexShrink: 0 }}>
          {kpis.map((k, i) => (
            <Card key={k.label} theme={theme} style={{ padding: '16px 20px' }}>
              <div style={{ fontSize: 14, color: theme.muted, letterSpacing: '.06em', textTransform: 'uppercase', fontWeight: 600 }}>{k.label}</div>
              <div
                style={{
                  marginTop: 6,
                  fontFamily: theme.numberFont,
                  fontSize: theme.numberFont.includes('Caveat') ? 54 : 46,
                  lineHeight: 1,
                  fontWeight: 700,
                  color: i === 0 ? theme.completed : i === 4 && metrics.blockedAtEnd > 0 ? theme.status.blocked : theme.ink,
                }}
              >
                {k.value}
              </div>
            </Card>
          ))}
        </section>

        {/* Akış + durum */}
        <section style={{ display: 'grid', gridTemplateColumns: '1fr 480px', gridTemplateRows: 'minmax(0, 1fr)', gap: 16, flex: '1 1 0', minHeight: 0 }}>
          <Card theme={theme} style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
            <CardTitle theme={theme} right={<Legend theme={theme} items={[{ c: theme.created, l: t('dash.series.created') }, { c: theme.completed, l: t('dash.series.completed') }]} />}>
              {metrics.weekly ? t('dash.chart.flowWeekly') : t('dash.chart.flow')}
            </CardTitle>
            <FlowChart theme={theme} metrics={metrics} sketch={sketch} createdLabel={t('dash.series.created')} completedLabel={t('dash.series.completed')} />
          </Card>
          <Card theme={theme} style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 12, minHeight: 0, overflow: 'hidden' }}>
            <CardTitle theme={theme}>{t('dash.chart.status')}</CardTitle>
            <StatusBar theme={theme} metrics={metrics} sketch={sketch} />
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 17 }}>
              <tbody>
                {LANES.map((l) => {
                  const total = Object.values(metrics.statusAtEnd).reduce((a, b) => a + b, 0) || 1;
                  const n = metrics.statusAtEnd[l.status];
                  return (
                    <tr key={l.status} style={{ borderTop: `1px solid ${theme.grid}` }}>
                      <td style={{ padding: '5px 0', display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ width: 12, height: 12, background: theme.status[l.status], borderRadius: 3, display: 'inline-block' }} />
                        {statusLabel(l.status)}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{n}</td>
                      <td style={{ textAlign: 'right', width: 70, color: theme.muted, fontVariantNumeric: 'tabular-nums' }}>{Math.round((n / total) * 100)}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {metrics.busiest && (
              <div style={{ marginTop: 'auto', fontSize: 16, color: theme.muted }}>
                {t('dash.busiest', { date: new Date(`${metrics.busiest.date}T12:00:00`).toLocaleDateString(locale, { day: 'numeric', month: 'long' }), count: metrics.busiest.count })}
              </div>
            )}
          </Card>
        </section>

        {/* Öncelik + tamamlananlar */}
        <section style={{ display: 'grid', gridTemplateColumns: '440px 1fr', gap: 16, height: 250, flexShrink: 0 }}>
          <Card theme={theme} style={{ padding: '18px 22px' }}>
            <CardTitle theme={theme}>{t('dash.chart.priority')}</CardTitle>
            <PriorityBars theme={theme} metrics={metrics} sketch={sketch} />
          </Card>
          <Card theme={theme} style={{ padding: '18px 22px', overflow: 'hidden' }}>
            <CardTitle theme={theme}>{t('dash.list.completed')}</CardTitle>
            {metrics.completedTasks.length === 0 && <div style={{ color: theme.muted, fontSize: 17, marginTop: 20 }}>{t('dash.list.empty')}</div>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
              {metrics.completedTasks.slice(0, 5).map((c) => (
                <div key={`${c.key}-${c.at}`} style={{ display: 'grid', gridTemplateColumns: '84px 96px 1fr', gap: 12, alignItems: 'baseline', fontSize: 16 }}>
                  <span style={{ color: theme.muted, fontVariantNumeric: 'tabular-nums' }}>
                    {new Date(c.at).toLocaleDateString(locale, { day: 'numeric', month: 'short' })}
                  </span>
                  <span style={{ fontFamily: '"JetBrains Mono Variable", monospace', fontSize: 14, color: theme.muted }}>{c.key}</span>
                  <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <b style={{ fontWeight: 600 }}>{c.title}</b>
                    {c.outcome && <span style={{ color: theme.muted }}> — {c.outcome}</span>}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </section>
      </div>

      {/* Gömülü imza: sağ alt köşe, iki dilde */}
      <div
        style={{
          position: 'absolute',
          right: theme.id === 'whiteboard' || theme.id === 'chalkboard' ? 34 : 46,
          bottom: theme.id === 'whiteboard' || theme.id === 'chalkboard' ? 8 : 16,
          fontSize: 13,
          color: theme.muted,
          letterSpacing: '.02em',
          opacity: 0.9,
        }}
      >
        <span lang="tr">{t('credit.tr')}</span> · <span lang="en">{t('credit.en')}</span>
      </div>
    </div>
  );
});

function Card({ theme, children, style }: { theme: DashboardTheme; children: ReactNode; style?: CSSProperties }) {
  return <div style={{ ...theme.panel, position: 'relative', minWidth: 0, ...style }}>{children}</div>;
}

function CardTitle({ theme, children, right }: { theme: DashboardTheme; children: ReactNode; right?: ReactNode }) {
  const hand = theme.headingFont.includes('Caveat');
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
      <h2
        style={{
          margin: 0,
          fontFamily: theme.headingFont,
          fontSize: hand ? 30 : 18,
          fontWeight: 700,
          letterSpacing: hand ? 0 : '.08em',
          textTransform: hand ? 'none' : 'uppercase',
          color: theme.ink,
        }}
      >
        {children}
      </h2>
      {right}
    </div>
  );
}

function Legend({ theme, items }: { theme: DashboardTheme; items: { c: string; l: string }[] }) {
  return (
    <div style={{ display: 'flex', gap: 18, fontSize: 15, color: theme.ink }}>
      {items.map((i) => (
        <span key={i.l} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span style={{ width: 12, height: 12, background: i.c, borderRadius: 3 }} /> {i.l}
        </span>
      ))}
    </div>
  );
}

function niceMax(n: number) {
  if (n <= 4) return Math.max(n, 1);
  const step = Math.pow(10, Math.floor(Math.log10(n)));
  const m = Math.ceil(n / step) * step;
  return m;
}

/** Yeni ve tamamlanan işler için gruplu sütun grafik. Tek eksen, sıfırdan başlar; hover ipuçları <title> ile. */
function FlowChart({
  theme,
  metrics,
  sketch,
  createdLabel,
  completedLabel,
}: {
  theme: DashboardTheme;
  metrics: DashboardMetrics;
  sketch?: string;
  createdLabel: string;
  completedLabel: string;
}) {
  const W = 1000;
  const H = 330;
  const padL = 40;
  const padB = 34;
  const padT = 14;
  const plotW = W - padL - 8;
  const plotH = H - padB - padT;
  const data = metrics.flow;
  const max = niceMax(Math.max(1, ...data.map((d) => Math.max(d.created, d.completed))));
  const ticks = Array.from(new Set([0, Math.round(max / 2), max]));
  const groupW = plotW / Math.max(1, data.length);
  const barW = Math.max(2, Math.min(22, (groupW - 6) / 2));
  const labelEvery = Math.ceil(data.length / 12);
  const y = (v: number) => padT + plotH - (v / max) * plotH;
  const bar = (x: number, v: number) => {
    const h = (v / max) * plotH;
    if (h <= 0) return '';
    const r = Math.min(4, h, barW / 2);
    const top = padT + plotH - h;
    return `M${x},${padT + plotH}V${top + r}Q${x},${top} ${x + r},${top}H${x + barW - r}Q${x + barW},${top} ${x + barW},${top + r}V${padT + plotH}Z`;
  };
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', flex: 1, minHeight: 0, marginTop: 8 }} role="img">
      {ticks.map((v) => (
        <g key={v}>
          <line x1={padL} x2={W - 8} y1={y(v)} y2={y(v)} stroke={theme.grid} strokeWidth={1} />
          <text x={padL - 8} y={y(v) + 5} textAnchor="end" fontSize={14} fill={theme.muted}>
            {v}
          </text>
        </g>
      ))}
      <g filter={sketch}>
        {data.map((d, i) => {
          const gx = padL + i * groupW + (groupW - (barW * 2 + 2)) / 2;
          return (
            <g key={d.from}>
              <path d={bar(gx, d.created)} fill={theme.created}>
                <title>{`${d.label} · ${createdLabel}: ${d.created}`}</title>
              </path>
              <path d={bar(gx + barW + 2, d.completed)} fill={theme.completed}>
                <title>{`${d.label} · ${completedLabel}: ${d.completed}`}</title>
              </path>
              {/* Geniş, görünmez isabet alanı */}
              <rect x={padL + i * groupW} y={padT} width={groupW} height={plotH} fill="transparent">
                <title>{`${d.label} — ${createdLabel}: ${d.created} · ${completedLabel}: ${d.completed}`}</title>
              </rect>
            </g>
          );
        })}
      </g>
      {data.map((d, i) =>
        i % labelEvery === 0 ? (
          <text key={d.from} x={padL + i * groupW + groupW / 2} y={H - 10} textAnchor="middle" fontSize={13} fill={theme.muted}>
            {d.label}
          </text>
        ) : null,
      )}
    </svg>
  );
}

function StatusBar({ theme, metrics, sketch }: { theme: DashboardTheme; metrics: DashboardMetrics; sketch?: string }) {
  const total = Object.values(metrics.statusAtEnd).reduce((a, b) => a + b, 0);
  if (!total) return <div style={{ height: 22, background: theme.grid, borderRadius: 4 }} />;
  return (
    <div style={{ display: 'flex', gap: 2, height: 22, filter: sketch }}>
      {LANES.map((l) => {
        const n = metrics.statusAtEnd[l.status];
        return n ? (
          <div key={l.status} title={`${statusLabel(l.status)}: ${n}`} style={{ width: `${(n / total) * 100}%`, background: theme.status[l.status], borderRadius: 4 }} />
        ) : null;
      })}
    </div>
  );
}

function PriorityBars({ theme, metrics, sketch }: { theme: DashboardTheme; metrics: DashboardMetrics; sketch?: string }) {
  const max = Math.max(1, ...PRIORITIES.map((p) => metrics.completedByPriority[p]));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 18 }}>
      {PRIORITIES.map((p) => {
        const n = metrics.completedByPriority[p];
        return (
          <div key={p} style={{ display: 'grid', gridTemplateColumns: '92px 1fr 36px', alignItems: 'center', gap: 12, fontSize: 16 }}>
            <span style={{ color: theme.muted }}>{priorityLabel(p)}</span>
            <div style={{ height: 16, background: theme.grid, borderRadius: 4, overflow: 'hidden' }}>
              <div title={`${priorityLabel(p)}: ${n}`} style={{ height: '100%', width: `${(n / max) * 100}%`, background: theme.completed, borderRadius: 4, filter: sketch }} />
            </div>
            <span style={{ textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{n}</span>
          </div>
        );
      })}
    </div>
  );
}
