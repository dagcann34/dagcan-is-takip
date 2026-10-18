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
    <div role="status" aria-live="polite" className="pointer-events-none fixed right-5 bottom-5 z-50 flex w-96 flex-col gap-2">
      {items.map((t) => {
        const ok = t.tone === 'ok';
        return (
          <div
            key={t.id}
            className={`glass-strong notch-sm notch-frame notch-frame-sm relative flex items-start gap-3 overflow-hidden py-3 pr-4 pl-4 text-sm text-ink ${
              ok
                ? 'border-success/35! shadow-[0_18px_50px_rgb(0_0_0/0.55),0_0_18px_rgb(60_255_160/0.10)]! [--notch-color:rgb(60_255_160/0.35)]'
                : 'border-danger/50! shadow-[0_18px_50px_rgb(0_0_0/0.55),0_0_18px_rgb(255_46_99/0.16)]! [--notch-color:rgb(255_46_99/0.5)]'
            }`}
            style={{ animation: 'toast-in 180ms cubic-bezier(0.2, 0.7, 0.2, 1)' }}
          >
            <span aria-hidden className={`absolute inset-y-0 left-0 w-[3px] ${ok ? 'bg-success shadow-[0_0_10px_rgb(60_255_160/0.8)]' : 'bg-danger shadow-[0_0_10px_rgb(255_46_99/0.8)]'}`} />
            <span
              className={`grid size-6 shrink-0 place-items-center border ${ok ? 'border-success/40 bg-success/10 text-success' : 'border-danger/45 bg-danger/10 text-danger'}`}
            >
              {ok ? <CheckCircle2 className="size-3.5" /> : <AlertTriangle className="size-3.5" />}
            </span>
            <span className="min-w-0 flex-1 pt-0.5 leading-snug break-words">{t.message}</span>
            {/* Kalan süre çubuğu (azaltılmış harekette durağan kalır) */}
            <span
              aria-hidden
              className={`absolute bottom-0 left-0 h-px w-full origin-left ${ok ? 'bg-success/70' : 'bg-danger/80'}`}
              style={{ animation: 'toast-timer 4200ms linear forwards' }}
            />
          </div>
        );
      })}
    </div>
  );
}
