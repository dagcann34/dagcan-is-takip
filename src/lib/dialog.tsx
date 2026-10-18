import { useEffect, useState, type FormEvent } from 'react';
import { AlertTriangle, KeyRound } from 'lucide-react';
import { Button, Input } from '../components/ui';
import { t } from '../i18n';

/**
 * Uygulama içi onay ve parola iletişim kutuları. Tauri WebView'inde tarayıcının yerleşik
 * confirm()/prompt() pencereleri güvenilir olmadığı için bunlar kullanılır.
 */
type Request =
  | { kind: 'confirm'; message: string; confirmLabel?: string; danger?: boolean; resolve: (ok: boolean) => void }
  | { kind: 'password'; message: string; confirmLabel?: string; minLength?: number; repeat?: boolean; resolve: (pw: string | null) => void };

let push: ((r: Request) => void) | null = null;

export function confirmDialog(message: string, opts: { confirmLabel?: string; danger?: boolean } = {}): Promise<boolean> {
  return new Promise((resolve) => (push ? push({ kind: 'confirm', message, ...opts, resolve }) : resolve(false)));
}

export function passwordDialog(message: string, opts: { confirmLabel?: string; minLength?: number; repeat?: boolean } = {}): Promise<string | null> {
  return new Promise((resolve) => (push ? push({ kind: 'password', message, ...opts, resolve }) : resolve(null)));
}

export function DialogHost() {
  const [req, setReq] = useState<Request | null>(null);
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    push = (r) => {
      setPw('');
      setPw2('');
      setErr('');
      setReq(r);
    };
    return () => {
      push = null;
    };
  }, []);

  useEffect(() => {
    if (!req) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close(false);
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [req]);

  if (!req) return null;

  function close(ok: boolean) {
    if (!req) return;
    if (req.kind === 'confirm') req.resolve(ok);
    else req.resolve(ok ? pw : null);
    setPw('');
    setPw2('');
    setReq(null);
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    if (req?.kind === 'password') {
      if (pw.length < (req.minLength ?? 1)) return setErr(t('err.vault.pw_too_short'));
      if (req.repeat && pw !== pw2) return setErr(t('vault.mismatch'));
    }
    close(true);
  }

  const Icon = req.kind === 'password' ? KeyRound : AlertTriangle;
  return (
    <div className="animate-fade fixed inset-0 z-[70] grid place-items-center bg-obsidian-950/70 backdrop-blur-sm" role="dialog" aria-modal="true">
      <form onSubmit={submit} className="glass-strong notch notch-frame animate-pop relative w-[440px] p-6">
        <div className="flex items-start gap-3">
          <span
            className={`notch-sm grid size-10 shrink-0 place-items-center border ${
              req.kind === 'confirm' && req.danger ? 'border-danger/50 bg-danger/10 text-danger' : 'border-cyan/50 bg-cyan/10 text-cyan'
            }`}
          >
            <Icon className="size-5" />
          </span>
          <p className="pt-1 text-sm leading-relaxed text-ink">{req.message}</p>
        </div>
        {req.kind === 'password' && (
          <div className="mt-4 flex flex-col gap-2">
            <Input autoFocus type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} />
            {req.repeat && <Input type="password" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} />}
            {err && <span className="text-xs text-danger">{err}</span>}
          </div>
        )}
        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => close(false)}>
            {t('common.cancel')}
          </Button>
          <Button
            autoFocus={req.kind === 'confirm'}
            type="submit"
            variant={req.kind === 'confirm' && req.danger ? 'danger' : 'primary'}
          >
            {req.confirmLabel ?? t('common.save')}
          </Button>
        </div>
      </form>
    </div>
  );
}
