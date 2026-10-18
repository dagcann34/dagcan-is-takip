import { toPng, toSvg } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { t } from '../../i18n';
import { dataUrlToBytes, saveFile, timestamp } from '../../lib/platform';

export type ExportFormat = 'png' | 'svg' | 'pdf';

const BACKGROUND = '#06070E';
const PIXEL_RATIO = 2; // Retina / yüksek çözünürlük

/**
 * Panonun tamamını (sütunlardaki kaydırılmış kartlar dahil) dışa aktarır.
 * Yakalama süresince sütun kaydırması kapatılır, böylece görünmeyen kartlar da görüntüye girer.
 */
export async function exportBoard(element: HTMLElement | null, format: ExportFormat): Promise<string> {
  if (!element) throw new Error(t('board.notFound'));
  element.classList.add('board-exporting');
  try {
    await new Promise((r) => requestAnimationFrame(() => r(null)));
    const width = element.scrollWidth;
    const height = element.scrollHeight;
    const options = { backgroundColor: BACKGROUND, width, height, pixelRatio: PIXEL_RATIO };
    const base = `dagcan-pano-${timestamp()}`;

    if (format === 'svg') {
      const url = await toSvg(element, options);
      return await saveFile(`${base}.svg`, dataUrlToBytes(url), 'image/svg+xml');
    }
    const png = await toPng(element, options);
    if (format === 'png') return await saveFile(`${base}.png`, dataUrlToBytes(png), 'image/png');

    const pdf = new jsPDF({
      orientation: width >= height ? 'landscape' : 'portrait',
      unit: 'px',
      format: [width, height],
      hotfixes: ['px_scaling'],
      compress: true,
    });
    pdf.setProperties({ title: t('board.pdfTitle'), creator: 'Dağcan İş Takip' });
    pdf.addImage(png, 'PNG', 0, 0, width, height, undefined, 'FAST');
    return await saveFile(`${base}.pdf`, new Uint8Array(pdf.output('arraybuffer')), 'application/pdf');
  } finally {
    element.classList.remove('board-exporting');
  }
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
