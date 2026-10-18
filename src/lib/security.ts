import { invoke } from '@tauri-apps/api/core';
import { isDesktop } from './platform';

/** Yalnızca açıkça işaretlenmiş alanlardan kopyalamaya izin verilir (yapıştırma her yerde serbest). */
const allowCopy = (el: Element | null) => el instanceof HTMLElement && !!el.closest('[data-allow-copy]');

/**
 * Arayüzden veri sızmasını zorlaştıran korumalar:
 * - Arayüz metni seçilemez; giriş alanlarında bile kopyalama/kesme kapalıdır (yalnızca
 *   `data-allow-copy` ile işaretli alanlar hariç). Yapıştırma serbesttir.
 * - Sağ tık menüsü, metin/görsel sürükleme ve yazdırma (⌘/Ctrl+P) kapalıdır.
 * - Masaüstünde ekran görüntüsü / ekran kaydı koruması varsayılan olarak açıktır.
 * Gizli değerler yalnızca kasanın "Kopyala" düğmesiyle panoya alınır ve 30 sn sonra temizlenir.
 */
export function installDataGuards() {
  document.documentElement.classList.add('data-guard');

  for (const type of ['copy', 'cut'] as const) {
    document.addEventListener(type, (e) => {
      if (!allowCopy(document.activeElement)) e.preventDefault();
    });
  }
  // Metin ve görsel dışarı sürüklenemez.
  document.addEventListener('dragstart', (e) => e.preventDefault());
  // Sağ tık menüsü hiçbir yerde açılmaz (kopyala / paylaş / sözlükte ara gibi seçenekler dahil).
  document.addEventListener('contextmenu', (e) => e.preventDefault());
  window.addEventListener(
    'keydown',
    (e) => {
      const mod = e.metaKey || e.ctrlKey;
      // Yazdırma ve "kaynağı görüntüle/kaydet" kısayolları
      if (mod && ['p', 's', 'u'].includes(e.key.toLowerCase())) e.preventDefault();
      // Geliştirici araçları kısayolları (release yapılarında zaten devtools yoktur)
      if ((mod && e.altKey && e.key.toLowerCase() === 'i') || e.key === 'F12') e.preventDefault();
    },
    true,
  );
  window.addEventListener('beforeprint', () => document.documentElement.classList.add('printing-blocked'));
}

/** Ekran koruması tercihi Rust tarafında (uygulama klasöründe) saklanır; varsayılan açık. */
export async function getScreenProtection(): Promise<boolean> {
  if (!isDesktop) return true;
  return invoke<boolean>('get_content_protection').catch(() => true);
}

export async function setScreenProtection(enabled: boolean): Promise<void> {
  await invoke('set_content_protection', { enabled });
}
