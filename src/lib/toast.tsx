import { useEffect, useState } from 'react';
import { CheckCircle2, AlertTriangle } from 'lucide-react';
import { hasKey, t } from '../i18n';

type Tone = 'ok' | 'error';
interface ToastItem {
  id: number;
  message: string;
  tone: Tone;
}

const EVENT = 'dagcan:toast';
let seq = 0;

export function toast(message: string, tone: Tone = 'ok') {
  window.dispatchEvent(new CustomEvent<ToastItem>(EVENT, { detail: { id: ++seq, message, tone } }));
}

/** Rust'tan gelen "err.kod::ayrıntı" biçimli hataları aktif dile çevirir. */
export function errorMessage(e: unknown): string {
  const raw = typeof e === 'string' ? e : e instanceof Error ? e.message : '';
  if (!raw) return t('common.unexpected');
  const [code, ...rest] = raw.split('::');
  return hasKey(code) ? t(code, { detail: rest.join('::') }) : raw;
}

export function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    const onToast = (e: Event) => {
      const item = (e as CustomEvent<ToastItem>).detail;
      setItems((list) => [...list, item]);
      setTimeout(() => setItems((list) => list.filter((t) => t.id !== item.id)), 4200);
    };
    window.addEventListener(EVENT, onToast);
    return () => window.removeEventListener(EVENT, onToast);
  }, []);

  return (
    <div className="pointer-events-none fixed right-5 bottom-5 z-50 flex w-96 flex-col gap-2">
      {items.map((t) => (
        <div
          key={t.id}
          className="glass-strong flex items-start gap-3 rounded-xl px-4 py-3 text-sm"
          style={{ animation: 'toast-in 160ms ease-out' }}
        >
          {t.tone === 'ok' ? (
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
          ) : (
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-danger" />
          )}
          <span className="break-words">{t.message}</span>
        </div>
      ))}
    </div>
  );
}
