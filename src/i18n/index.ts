import { useSyncExternalStore } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { en, tr, type MessageKey } from './dictionaries';

export type Lang = 'tr' | 'en';
export type { MessageKey };

const KEY = 'dagcan.lang';
const dicts: Record<Lang, Record<MessageKey, string>> = { tr, en };
const listeners = new Set<() => void>();

function initial(): Lang {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === 'tr' || saved === 'en') return saved;
  } catch {
    /* depolama yoksa sistem dili */
  }
  return navigator.language?.toLowerCase().startsWith('tr') ? 'tr' : 'en';
}

let current: Lang = initial();

export function getLang(): Lang {
  return current;
}

export function setLang(lang: Lang) {
  current = lang;
  try {
    localStorage.setItem(KEY, lang);
  } catch {
    /* yoksay */
  }
  document.documentElement.lang = lang;
  syncNativeLanguage();
  listeners.forEach((l) => l());
}

/** Tepsi menüsünü ve Rust tarafını aktif dile getirir. */
export function syncNativeLanguage() {
  if (!('__TAURI_INTERNALS__' in window)) return;
  const labels = { open: t('tray.open'), quick: t('tray.quick'), lock: t('tray.lock'), quit: t('tray.quit') };
  invoke('set_tray_labels', { labels }).catch(() => {});
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  // Diğer pencereler (Hızlı Görev) dili değiştirirse.
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY && (e.newValue === 'tr' || e.newValue === 'en')) {
      current = e.newValue;
      cb();
    }
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener('storage', onStorage);
  };
}

export function t(key: MessageKey, vars?: Record<string, string | number>, lang: Lang = current): string {
  let s = dicts[lang][key] ?? key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
  return s;
}

export function hasKey(key: string): key is MessageKey {
  return key in tr;
}

/** Bileşenlerde dil değişince yeniden çizim için. */
export function useLang(): Lang {
  return useSyncExternalStore(subscribe, getLang);
}

export function useT() {
  const lang = useLang();
  return {
    lang,
    t: (key: MessageKey, vars?: Record<string, string | number>) => t(key, vars, lang),
    locale: lang === 'tr' ? 'tr-TR' : 'en-US',
  };
}

document.documentElement.lang = current;
