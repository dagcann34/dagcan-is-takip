import { toPng, toSvg } from 'html-to-image';
import { getNodesBounds, getViewportForBounds, type Node } from '@xyflow/react';
import { jsPDF } from 'jspdf';
import { t } from '../../i18n';
import { dataUrlToBytes, saveFile, timestamp } from '../../lib/platform';

export type ExportFormat = 'png' | 'svg' | 'pdf';

const BACKGROUND = '#0A0F1C';
const PADDING = 48;
const PIXEL_RATIO = 2; // Retina / yüksek çözünürlük

/**
 * Tüm panoyu (görünür alan değil, bütün kartları) sığdırarak dışa aktarır.
 * React Flow'un önerdiği yöntem: viewport elemanını kartların sınırlarına göre yeniden konumlayıp yakalamak.
 */
export async function exportBoard(nodes: Node[], format: ExportFormat): Promise<string> {
  const viewport = document.querySelector<HTMLElement>('.react-flow__viewport');
  if (!viewport) throw new Error(t('board.notFound'));

  const bounds = getNodesBounds(nodes);
  const width = Math.ceil(bounds.width + PADDING * 2);
  const height = Math.ceil(bounds.height + PADDING * 2);
  const vp = getViewportForBounds(bounds, width, height, 1, 1, 0);

  const options = {
    backgroundColor: BACKGROUND,
    width,
    height,
    pixelRatio: PIXEL_RATIO,
    style: {
      width: `${width}px`,
      height: `${height}px`,
      transform: `translate(${vp.x}px, ${vp.y}px) scale(${vp.zoom})`,
    },
  };
  const base = `dagcan-pano-${timestamp()}`;

  if (format === 'svg') {
    const url = await toSvg(viewport, options);
    return saveFile(`${base}.svg`, dataUrlToBytes(url), 'image/svg+xml');
  }

  const png = await toPng(viewport, options);
  if (format === 'png') {
    return saveFile(`${base}.png`, dataUrlToBytes(png), 'image/png');
  }

  const pdf = new jsPDF({
    orientation: width >= height ? 'landscape' : 'portrait',
    unit: 'px',
    format: [width, height],
    hotfixes: ['px_scaling'],
    compress: true,
  });
  pdf.setProperties({ title: t('board.pdfTitle'), creator: 'Dağcan İş Takip' });
  pdf.addImage(png, 'PNG', 0, 0, width, height, undefined, 'FAST');
  return saveFile(`${base}.pdf`, new Uint8Array(pdf.output('arraybuffer')), 'application/pdf');
}

/** Tek bir kartı paylaşılabilir PNG'ye çevirir: dosyaya kaydeder ve mümkünse panoya görsel olarak kopyalar. */
export async function shareCard(element: HTMLElement, key: string): Promise<{ path: string; copied: boolean }> {
  const png = await toPng(element, { pixelRatio: 3, backgroundColor: BACKGROUND, style: { margin: '0' } });
  const bytes = dataUrlToBytes(png);
  const path = await saveFile(`${key}-${timestamp()}.png`, bytes, 'image/png');
  let copied = false;
  try {
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': new Blob([bytes as BlobPart], { type: 'image/png' }) })]);
    copied = true;
  } catch {
    /* WebView görsel panosunu desteklemiyorsa dosya yeterli */
  }
  return { path, copied };
}
