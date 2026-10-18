import { invoke } from '@tauri-apps/api/core';
import { confirmDialog } from './dialog';
import { t } from '../i18n';

/** Masaüstü (Tauri) içinde mi çalışıyoruz, yoksa düz tarayıcı önizlemesinde mi? */
export const isDesktop = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export function dataUrlToBytes(dataUrl: string): Uint8Array {
  const comma = dataUrl.indexOf(',');
  const meta = dataUrl.slice(0, comma);
  const payload = dataUrl.slice(comma + 1);
  if (meta.includes(';base64')) {
    return Uint8Array.from(atob(payload), (c) => c.charCodeAt(0));
  }
  return new TextEncoder().encode(decodeURIComponent(payload));
}

/**
 * Şifresiz bir dışa aktarım dosyasını kaydeder. Kullanıcıdan önce açık onay alınır; iptal edilirse
 * `null` döner. Masaüstünde Rust tarafı İndirilenler klasörüne (0600, üzerine yazmadan) yazar.
 */
export async function saveFile(fileName: string, bytes: Uint8Array, mime: string): Promise<string | null> {
  if (!(await confirmDialog(t('export.plainConfirm'), { confirmLabel: t('export.plainConfirmBtn') }))) return null;
  if (isDesktop) {
    return invoke<string>('save_export', { fileName, base64: bytesToBase64(bytes) });
  }
  const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: mime }));
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return fileName;
}

/** Yerel OS bildirimi (macOS / Windows Bildirim Merkezi). Görev içeriği gönderilmez; yalnızca anahtar. */
export async function notify(title: string, body: string): Promise<void> {
  if (isDesktop) {
    const n = await import('@tauri-apps/plugin-notification');
    let granted = await n.isPermissionGranted();
    if (!granted) granted = (await n.requestPermission()) === 'granted';
    if (granted) n.sendNotification({ title, body });
    return;
  }
  if (!('Notification' in window)) return;
  if (Notification.permission === 'default') await Notification.requestPermission();
  if (Notification.permission === 'granted') new Notification(title, { body });
}

export function timestamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
}

/** Harici bağlantıyı sistem tarayıcısında açar. */
export async function openExternal(url: string): Promise<void> {
  if (isDesktop) {
    const { openUrl } = await import('@tauri-apps/plugin-opener');
    await openUrl(url);
    return;
  }
  window.open(url, '_blank', 'noopener');
}
