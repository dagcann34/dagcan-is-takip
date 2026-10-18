import { useEffect, useMemo, useRef, useState } from 'react';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { FileDown, FileImage, Table2 } from 'lucide-react';
import { Button, Field, Input, PageHeader, Panel } from '../../components/ui';
import { useT, type MessageKey } from '../../i18n';
import { dataUrlToBytes, saveFile, timestamp } from '../../lib/platform';
import { errorMessage, toast } from '../../lib/toast';
import { useBoard } from '../board/boardStore';
import { CANVAS_H, CANVAS_W, DashboardCanvas } from './DashboardCanvas';
import { computeMetrics, presetRange, type RangePreset } from './metrics';
import { DASHBOARD_THEMES, THEME_ORDER, type DashboardThemeId } from './themes';

const PRESETS: RangePreset[] = ['week', '7d', 'month', '30d', 'quarter', 'year'];

/** Dashboard Stüdyosu: tarih aralığı + tema seç, önizle, PNG/PDF olarak dışa aktar. */
export function DashboardView() {
  const { t, locale } = useT();
  const board = useBoard();
  const initial = presetRange('30d');
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [preset, setPreset] = useState<RangePreset | null>('30d');
  const [themeId, setThemeId] = useState<DashboardThemeId>(() => {
    const q = new URLSearchParams(location.search).get('theme') as DashboardThemeId | null;
    return q && THEME_ORDER.includes(q) ? q : 'neon';
  });
  const [title, setTitle] = useState(() => t('dash.defaultTitle'));
  const [showTable, setShowTable] = useState(false);
  const [scale, setScale] = useState(0.5);
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const theme = DASHBOARD_THEMES[themeId];
  const [a, b] = from <= to ? [from, to] : [to, from];
  const metrics = useMemo(() => computeMetrics(board, a, b, locale), [board, a, b, locale]);

  // Önizlemeyi mevcut alana sığdır.
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setScale(Math.max(0.2, Math.min(width / CANVAS_W, height / CANVAS_H)));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  function applyPreset(p: RangePreset) {
    const r = presetRange(p);
    setFrom(r.from);
    setTo(r.to);
    setPreset(p);
  }

  async function exportAs(kind: 'png' | 'pdf') {
    const el = canvasRef.current;
    if (!el) return;
    try {
      const png = await toPng(el, { width: CANVAS_W, height: CANVAS_H, pixelRatio: 2, style: { transform: 'none' } });
      const base = `kanvault-dashboard-${themeId}-${timestamp()}`;
      let path: string | null;
      if (kind === 'png') {
        path = await saveFile(`${base}.png`, dataUrlToBytes(png), 'image/png');
      } else {
        const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [CANVAS_W, CANVAS_H], hotfixes: ['px_scaling'], compress: true });
        pdf.setProperties({ title, creator: 'Kanvault — Dağcan Nural', author: 'Dağcan Nural' });
        pdf.addImage(png, 'PNG', 0, 0, CANVAS_W, CANVAS_H, undefined, 'FAST');
        path = await saveFile(`${base}.pdf`, new Uint8Array(pdf.output('arraybuffer')), 'application/pdf');
      }
      if (path) toast(t('dash.exported', { path }));
    } catch (e) {
      toast(errorMessage(e), 'error');
    }
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <PageHeader
        title={t('dash.title')}
        subtitle={t('dash.subtitle')}
        actions={
          <>
            <Button variant="ghost" onClick={() => setShowTable((s) => !s)} aria-pressed={showTable}>
              <Table2 className="size-4" /> {t('dash.table')}
            </Button>
            <Button onClick={() => exportAs('png')}>
              <FileImage className="size-4" /> PNG
            </Button>
            <Button variant="primary" onClick={() => exportAs('pdf')}>
              <FileDown className="size-4" /> PDF
            </Button>
          </>
        }
      />
      <div className="grid min-h-0 flex-1 grid-cols-[300px_1fr] gap-5 px-8 pb-6">
        <Panel className="flex min-h-0 flex-col gap-5 overflow-y-auto p-5">
          <Field label={t('dash.reportTitle')}>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} />
          </Field>

          <div className="flex flex-col gap-2">
            <span className="hud-label">{t('dash.range')}</span>
            <div className="grid grid-cols-2 gap-1.5">
              {PRESETS.map((p) => (
                <button
                  key={p}
                  onClick={() => applyPreset(p)}
                  className={`notch-sm font-display h-8 border text-[13px] font-semibold tracking-wide uppercase transition-colors ${
                    preset === p ? 'border-cyan/70 bg-cyan/15 text-cyan' : 'border-line text-ink-muted hover:border-cyan/40 hover:text-ink'
                  }`}
                >
                  {t(`dash.preset.${p}` as MessageKey)}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Field label={t('dash.from')}>
                <Input
                  type="date"
                  value={from}
                  max={to}
                  onChange={(e) => {
                    if (!e.target.value) return;
                    setFrom(e.target.value);
                    setPreset(null);
                  }}
                />
              </Field>
              <Field label={t('dash.to')}>
                <Input
                  type="date"
                  value={to}
                  min={from}
                  onChange={(e) => {
                    if (!e.target.value) return;
                    setTo(e.target.value);
                    setPreset(null);
                  }}
                />
              </Field>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <span className="hud-label">{t('dash.theme')}</span>
            <div className="flex flex-col gap-1.5">
              {THEME_ORDER.map((id) => {
                const th = DASHBOARD_THEMES[id];
                const active = id === themeId;
                return (
                  <button
                    key={id}
                    onClick={() => setThemeId(id)}
                    aria-pressed={active}
                    className={`notch-sm flex items-center gap-3 border px-3 py-2 text-left text-sm transition-colors ${
                      active ? 'border-magenta/70 bg-magenta/10 text-ink' : 'border-line text-ink-muted hover:border-cyan/40 hover:text-ink'
                    }`}
                  >
                    <span className="flex h-7 w-12 shrink-0 overflow-hidden border border-white/20">
                      {th.swatch.map((c, i) => (
                        <span key={i} className="flex-1" style={{ background: c }} />
                      ))}
                    </span>
                    <span className="font-display text-[15px] font-semibold tracking-wide">{t(`dash.theme.${id}` as MessageKey)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </Panel>

        <div className="flex min-h-0 min-w-0 flex-col gap-3">
          <div ref={stageRef} className="relative min-h-0 flex-1">
            <div
              className="absolute top-0 left-1/2 origin-top shadow-[0_30px_80px_rgb(0_0_0/0.55)]"
              style={{ width: CANVAS_W, height: CANVAS_H, transform: `translateX(-50%) scale(${scale})` }}
            >
              <DashboardCanvas ref={canvasRef} theme={theme} metrics={metrics} title={title} from={a} to={b} />
            </div>
          </div>
          {showTable && (
            <Panel className="max-h-56 shrink-0 overflow-auto p-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="hud-label text-left">
                    <th className="py-1">{metrics.weekly ? '≥' : ''}</th>
                    <th className="py-1 text-right">{t('dash.series.created')}</th>
                    <th className="py-1 text-right">{t('dash.series.completed')}</th>
                  </tr>
                </thead>
                <tbody className="font-mono">
                  {metrics.flow.map((f) => (
                    <tr key={f.from} className="border-t border-line">
                      <td className="py-1">{f.label}</td>
                      <td className="py-1 text-right">{f.created}</td>
                      <td className="py-1 text-right">{f.completed}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}
