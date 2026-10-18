/**
 * Bağımlılıksız, tek sayfalı görsel PDF yazıcı (PDF 1.4, JPEG/DCTDecode).
 * Üçüncü taraf PDF kütüphaneleri prototip dondurma (Tauri `freezePrototype`) altında çalışmadığı ve
 * gereksiz bağımlılık zinciri getirdiği için pano ve dashboard PDF'leri bununla üretilir.
 */

const enc = new TextEncoder();

/** PDF metin dizesi: UTF-16BE onaltılık (Türkçe karakterler için). */
function pdfText(s: string): string {
  let hex = 'FEFF';
  for (const ch of s) {
    const cp = ch.codePointAt(0)!;
    if (cp > 0xffff) {
      const v = cp - 0x10000;
      hex += (0xd800 + (v >> 10)).toString(16).padStart(4, '0') + (0xdc00 + (v & 0x3ff)).toString(16).padStart(4, '0');
    } else hex += cp.toString(16).padStart(4, '0');
  }
  return `<${hex.toUpperCase()}>`;
}

export interface PdfImagePage {
  /** JPEG baytları */
  jpeg: Uint8Array;
  /** Görselin piksel boyutu */
  pixelWidth: number;
  pixelHeight: number;
  /** Sayfa boyutu (pt) */
  width: number;
  height: number;
}

export function imagePdf(page: PdfImagePage, meta: { title: string; author?: string }): Uint8Array {
  const parts: Uint8Array[] = [];
  const offsets: number[] = [];
  let length = 0;
  const push = (chunk: string | Uint8Array) => {
    const b = typeof chunk === 'string' ? enc.encode(chunk) : chunk;
    parts.push(b);
    length += b.length;
  };
  const obj = (n: number, body: () => void) => {
    offsets[n] = length;
    push(`${n} 0 obj\n`);
    body();
    push('\nendobj\n');
  };

  const W = page.width.toFixed(2);
  const H = page.height.toFixed(2);
  const content = `q ${W} 0 0 ${H} 0 0 cm /Im0 Do Q`;

  push('%PDF-1.4\n%âãÏÓ\n');
  obj(1, () => push('<< /Type /Catalog /Pages 2 0 R >>'));
  obj(2, () => push('<< /Type /Pages /Kids [3 0 R] /Count 1 >>'));
  obj(3, () => push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`));
  obj(4, () => {
    push(
      `<< /Type /XObject /Subtype /Image /Width ${page.pixelWidth} /Height ${page.pixelHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${page.jpeg.length} >>\nstream\n`,
    );
    push(page.jpeg);
    push('\nendstream');
  });
  obj(5, () => push(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`));
  obj(6, () => push(`<< /Title ${pdfText(meta.title)} /Author ${pdfText(meta.author ?? 'Dağcan Nural')} /Creator (Kanvault) /Producer (Kanvault) >>`));

  const xref = length;
  let table = 'xref\n0 7\n0000000000 65535 f \n';
  for (let i = 1; i <= 6; i++) table += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  push(table);
  push(`trailer\n<< /Size 7 /Root 1 0 R /Info 6 0 R >>\nstartxref\n${xref}\n%%EOF\n`);

  const out = new Uint8Array(length);
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

/** JPEG veri URL'sinin piksel boyutunu okur. */
export function imageSize(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = reject;
    img.src = dataUrl;
  });
}
