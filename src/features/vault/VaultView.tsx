import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { listen } from '@tauri-apps/api/event';
import { Copy, Eye, EyeOff, KeyRound, Lock, Plus, Search, ShieldCheck, Terminal, Trash2, Server, StickyNote, Key, Wand2 } from 'lucide-react';
import { useT } from '../../i18n';
import { Button, EmptyState, Field, IconButton, Input, PageHeader, Panel, Select, Textarea } from '../../components/ui';
import { isDesktop } from '../../lib/platform';
import { errorMessage, toast } from '../../lib/toast';
import { ITEM_KINDS, copySensitive, generatePassword, kindLabel, vault, type ItemKind, type VaultItem, type VaultItemInput, type VaultStatus } from './vaultApi';
import { confirmDialog, passwordDialog } from '../../lib/dialog';

const KIND_ICON: Record<ItemKind, typeof Key> = {
  password: KeyRound,
  server: Server,
  script: Terminal,
  note: StickyNote,
  api_key: Key,
};

export function VaultView() {
  const { t } = useT();
  const [status, setStatus] = useState<VaultStatus | null>(null);

  const refresh = useCallback(async () => {
    try {
      setStatus(await vault.status());
    } catch (e) {
      toast(errorMessage(e), 'error');
    }
  }, []);

  useEffect(() => {
    if (!isDesktop) return;
    refresh();
    const unlisten = listen('vault-locked', () => {
      refresh();
      toast(t('vault.autoLocked'));
    });
    return () => {
      unlisten.then((f) => f());
    };
  }, [refresh, t]);

  if (!isDesktop) {
    return (
      <>
        <PageHeader title={t('vault.title')} subtitle={t('vault.subtitleShort')} />
        <div className="px-8">
          <Panel className="flex items-start gap-4 p-6">
            <span className="notch-sm notch-frame notch-frame-sm relative grid size-11 shrink-0 place-items-center border border-line-strong bg-cyan/[0.05] text-cyan">
              <ShieldCheck className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm leading-relaxed text-ink-muted">{t('vault.desktopOnly')}</p>
              <code className="notch-sm notch-frame notch-frame-sm relative mt-3 inline-flex items-center gap-2 border border-line-strong bg-obsidian-950/80 px-3 py-1.5 font-mono text-[13px] text-cyan">
                <Terminal className="size-3.5 text-ink-subtle" />
                npm run tauri dev
              </code>
            </div>
          </Panel>
        </div>
      </>
    );
  }

  if (!status) return null;
  if (!status.unlocked) return <LockScreen initialized={status.initialized} needsRecovery={status.needsRecovery} onDone={refresh} />;
  return <VaultBrowser autoLockMinutes={status.autoLockMinutes} onLocked={refresh} />;
}

function LockScreen({ initialized, needsRecovery, onDone }: { initialized: boolean; needsRecovery: boolean; onDone: () => void }) {
  const { t } = useT();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [recovery, setRecovery] = useState('');
  const [newKey, setNewKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!initialized && password !== confirm) {
      toast(t('vault.mismatch'), 'error');
      return;
    }
    setBusy(true);
    try {
      if (initialized) {
        const upgradedKey = await vault.unlock(password, needsRecovery ? recovery : undefined);
        if (upgradedKey) setNewKey(upgradedKey);
        else onDone();
      } else {
        // Kurtarma anahtarı yalnızca bir kez gösterilir; kullanıcı kaydettiğini onaylayınca devam edilir.
        setNewKey(await vault.init(password));
      }
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      // Parolayı React durumunda bekletme.
      setPassword('');
      setConfirm('');
      setRecovery('');
      setBusy(false);
    }
  }

  if (newKey) return <RecoveryKeyPanel recoveryKey={newKey} onDone={() => { setNewKey(null); onDone(); }} />;

  return (
    <div className="relative grid h-full place-items-center overflow-hidden px-6">
      {/* Arka planda soluk hedef halkaları; okunurluğu etkilemez */}
      <div aria-hidden className="pointer-events-none absolute top-1/2 left-1/2 size-[640px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan/[0.06]" />
      <div aria-hidden className="pointer-events-none absolute top-1/2 left-1/2 size-[440px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-magenta/[0.08]" />
      <Panel className="animate-pop w-full max-w-[420px] p-8">
        <div className="flex flex-col items-center text-center">
          <div className="relative mb-5 grid size-20 place-items-center">
            <span aria-hidden className="notch absolute inset-0 border border-cyan/45 [animation:ring-pulse_3.2s_ease-in-out_infinite]" />
            <span aria-hidden className="notch-sm absolute inset-[9px] bg-gradient-to-br from-magenta to-cyan shadow-[0_0_24px_rgb(0_240_255/0.35)]" />
            <Lock className="relative size-7 text-obsidian-950" />
          </div>
          <h2 className="text-[22px] leading-tight font-bold tracking-[0.08em] uppercase">{initialized ? t('vault.lockedTitle') : t('vault.createTitle')}</h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-muted">{initialized ? t('vault.lockedHint') : t('vault.createHint')}</p>
        </div>
        <div aria-hidden className="relative my-6 h-px overflow-hidden bg-line">
          <span className="absolute inset-y-0 left-0 w-1/4 bg-gradient-to-r from-transparent via-cyan to-transparent [animation:sweep_3.2s_linear_infinite]" />
        </div>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <Field label={t('vault.masterPassword')} hint={initialized ? undefined : t('vault.passwordPolicy')}>
            <Input type="password" autoFocus autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          {initialized && needsRecovery && (
            <Field label={t('vault.recoveryInput')} hint={t('vault.recoveryNeeded')}>
              <Input autoComplete="off" spellCheck={false} className="font-mono uppercase" value={recovery} onChange={(e) => setRecovery(e.target.value)} />
            </Field>
          )}
          {!initialized && (
            <Field label={t('vault.masterPasswordAgain')}>
              <Input type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            </Field>
          )}
          <Button variant="primary" type="submit" className="mt-1 h-10" disabled={busy || password.length === 0}>
            <ShieldCheck className={`size-4 ${busy ? 'animate-pulse' : ''}`} />
            {busy ? t('vault.deriving') : initialized ? t('vault.unlock') : t('vault.create')}
          </Button>
        </form>
        <p className="mt-6 text-center font-mono text-[11px] tracking-wide text-ink-subtle">{t('vault.subtitleShort')}</p>
      </Panel>
    </div>
  );
}

const EMPTY: VaultItemInput = { kind: 'password', title: '', tags: [] };

function VaultBrowser({ autoLockMinutes, onLocked }: { autoLockMinutes: number; onLocked: () => void }) {
  const { t } = useT();
  const [items, setItems] = useState<VaultItem[]>([]);
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<VaultItemInput | null>(null);
  const [showKey, setShowKey] = useState<string | null>(null);

  // Notlar listede taşınmaz; düzenleyici açılırken yalnızca bu kayıt için istenir.
  async function openEditor(item: VaultItem) {
    let notes = '';
    try {
      notes = (item.hasNotes ? await vault.notes(item.id) : '') ?? '';
    } catch (e) {
      toast(errorMessage(e), 'error');
    }
    setEditing({ id: item.id, kind: item.kind, title: item.title, username: item.username ?? '', host: item.host ?? '', notes, tags: item.tags });
  }

  async function revealRecovery() {
    const password = await passwordDialog(t('vault.lockedHint'), { confirmLabel: t('vault.recoveryShow') });
    if (!password) return;
    try {
      setShowKey(await vault.recoveryKey(password));
    } catch (e) {
      toast(errorMessage(e), 'error');
    }
  }
  const [revealed, setRevealed] = useState<Record<string, string>>({});
  const [minutes, setMinutes] = useState(autoLockMinutes);

  const load = useCallback(async () => {
    try {
      setItems(await vault.list());
    } catch (e) {
      toast(errorMessage(e), 'error');
      onLocked();
    }
  }, [onLocked]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('tr');
    if (!q) return items;
    return items.filter((i) =>
      [i.title, i.username, i.host, ...i.tags].some((v) => v?.toLocaleLowerCase('tr').includes(q)),
    );
  }, [items, query]);

  async function copy(id: string) {
    try {
      const seconds = await vault.copy(id);
      toast(t('vault.copiedClear', { seconds }));
    } catch (e) {
      toast(errorMessage(e), 'error');
    }
  }

  async function toggleReveal(id: string) {
    if (revealed[id] !== undefined) {
      setRevealed(({ [id]: _, ...rest }) => rest);
      return;
    }
    try {
      const secret = await vault.reveal(id);
      setRevealed((r) => ({ ...r, [id]: secret }));
      // Görünen değeri 20 sn sonra yeniden gizle.
      setTimeout(() => setRevealed(({ [id]: _, ...rest }) => rest), 20_000);
    } catch (e) {
      toast(errorMessage(e), 'error');
    }
  }

  async function remove(item: VaultItem) {
    if (!(await confirmDialog(t('vault.confirmDelete', { title: item.title }), { danger: true, confirmLabel: t('common.delete') }))) return;
    await vault.remove(item.id).catch((e) => toast(errorMessage(e), 'error'));
    load();
  }

  async function save(input: VaultItemInput) {
    try {
      await vault.upsert(input);
      setEditing(null);
      toast(t('vault.saved'));
      load();
    } catch (e) {
      toast(errorMessage(e), 'error');
    }
  }

  async function lock() {
    await vault.lock();
    setRevealed({});
    onLocked();
  }

  if (showKey) return <RecoveryKeyPanel recoveryKey={showKey} onDone={() => setShowKey(null)} />;

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title={t('vault.title')}
        subtitle={t('vault.subtitle', { count: items.length, minutes })}
        actions={
          <>
            <Select
              aria-label={t('vault.autoLockOption', { minutes })}
              className="w-36"
              value={minutes}
              onChange={async (e) => {
                const m = Number(e.target.value);
                setMinutes(m);
                await vault.setAutoLock(m);
              }}
            >
              {[1, 5, 10, 15, 30].map((m) => (
                <option key={m} value={m}>
                  {t('vault.autoLockOption', { minutes: m })}
                </option>
              ))}
            </Select>
            <IconButton title={t('vault.recoveryShow')} aria-label={t('vault.recoveryShow')} onClick={revealRecovery}>
              <KeyRound />
            </IconButton>
            <Button onClick={lock}>
              <Lock className="size-4" /> {t('vault.lock')}
            </Button>
            <Button variant="primary" onClick={() => setEditing({ ...EMPTY })}>
              <Plus className="size-4" /> {t('vault.newItem')}
            </Button>
          </>
        }
      />
      <div className="flex min-h-0 flex-1 gap-5 px-8 pb-8">
        <Panel className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <label className="group/search flex h-12 shrink-0 items-center gap-3 border-b border-line px-4 transition-colors focus-within:border-cyan/45 focus-within:bg-cyan/[0.03]">
            <Search className="size-4 text-ink-subtle transition-colors group-focus-within/search:text-cyan" />
            <input
              className="h-full flex-1 bg-transparent text-sm outline-none placeholder:text-ink-subtle focus-visible:shadow-none focus-visible:outline-none"
              placeholder={t('vault.search')}
              aria-label={t('vault.search')}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <span aria-hidden className="font-mono text-[11px] text-ink-subtle tabular-nums">
              {filtered.length}/{items.length}
            </span>
          </label>
          <ul className="flex-1 divide-y divide-line overflow-auto">
            {filtered.map((item) => {
              const Icon = KIND_ICON[item.kind];
              const shown = revealed[item.id];
              return (
                <li
                  key={item.id}
                  className={`group relative flex items-start gap-4 px-4 py-3.5 transition-colors hover:bg-cyan/[0.035] ${editing?.id === item.id ? 'bg-cyan/[0.05]' : ''}`}
                >
                  <span
                    aria-hidden
                    className={`absolute inset-y-2 left-0 w-[2px] transition-colors ${
                      editing?.id === item.id ? 'bg-magenta shadow-[0_0_8px_rgb(255_46_136/0.8)]' : 'bg-transparent group-hover:bg-cyan/60'
                    }`}
                  />
                  <div className="notch-sm notch-frame notch-frame-sm relative mt-0.5 grid size-9 shrink-0 place-items-center border border-line-strong bg-navy-700/70 text-cyan transition-shadow group-hover:shadow-[0_0_12px_rgb(0_240_255/0.18)]">
                    <Icon className="size-4" />
                  </div>
                  <button className="min-w-0 flex-1 text-left" onClick={() => openEditor(item)}>
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="truncate font-medium text-ink">{item.title}</span>
                      <span className="hud-chip shrink-0">{kindLabel(item.kind)}</span>
                    </div>
                    <div className="mt-1 truncate font-mono text-xs text-ink-subtle">
                      {[item.username, item.host].filter(Boolean).join(' @ ') || item.tags.join(', ') || '—'}
                    </div>
                    {shown !== undefined && (
                      <pre className="notch-sm animate-fade mt-2.5 max-h-48 overflow-auto border border-cyan/30 bg-obsidian-950/90 p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap text-ink shadow-[inset_0_0_18px_rgb(0_240_255/0.06)]">
                        {shown || t('vault.empty')}
                      </pre>
                    )}
                  </button>
                  <div className="flex shrink-0 items-center gap-0.5 opacity-80 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                    <IconButton
                      title={t('vault.reveal')}
                      aria-label={t('vault.reveal')}
                      aria-pressed={shown !== undefined}
                      className={shown !== undefined ? 'border-cyan/40 bg-cyan/[0.07] text-cyan' : ''}
                      onClick={() => toggleReveal(item.id)}
                    >
                      {shown !== undefined ? <EyeOff /> : <Eye />}
                    </IconButton>
                    <IconButton title={t('vault.copyTitle')} aria-label={t('vault.copyTitle')} onClick={() => copy(item.id)}>
                      <Copy />
                    </IconButton>
                    <IconButton tone="danger" title={t('common.delete')} aria-label={t('common.delete')} onClick={() => remove(item)}>
                      <Trash2 />
                    </IconButton>
                  </div>
                </li>
              );
            })}
            {filtered.length === 0 && (
              <li>
                <EmptyState icon={query.trim() ? <Search /> : <ShieldCheck />}>{t('common.none')}</EmptyState>
              </li>
            )}
          </ul>
        </Panel>
        {editing && <ItemEditor key={editing.id ?? 'new'} value={editing} onCancel={() => setEditing(null)} onSave={save} />}
      </div>
    </div>
  );
}

function ItemEditor({ value, onSave, onCancel }: { value: VaultItemInput; onSave: (v: VaultItemInput) => void; onCancel: () => void }) {
  const { t } = useT();
  const [v, setV] = useState<VaultItemInput>({ ...value, secret: '' });
  const [tags, setTags] = useState(value.tags.join(', '));
  const isNew = !value.id;
  const EditorIcon = KIND_ICON[v.kind];
  const set = <K extends keyof VaultItemInput>(k: K, val: VaultItemInput[K]) => setV((s) => ({ ...s, [k]: val }));

  function submit(e: FormEvent) {
    e.preventDefault();
    onSave({
      ...v,
      secret: isNew || v.secret ? v.secret : undefined,
      tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
    });
  }

  return (
    <Panel className="animate-pop flex w-[400px] shrink-0 flex-col overflow-hidden">
      <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
        <div className="flex shrink-0 items-center gap-3 border-b border-line px-5 py-3.5">
          <span className="notch-sm grid size-8 place-items-center bg-gradient-to-br from-magenta/25 to-cyan/20 text-cyan">
            <EditorIcon className="size-4" />
          </span>
          <h3 className="min-w-0 flex-1 truncate text-[16px] font-bold tracking-[0.08em] uppercase">{isNew ? t('vault.editorNew') : t('vault.editorEdit')}</h3>
        </div>
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto p-5">
        <Field label={t('vault.kind')}>
          <Select value={v.kind} onChange={(e) => set('kind', e.target.value as ItemKind)}>
            {ITEM_KINDS.map((k) => (
              <option key={k} value={k}>
                {kindLabel(k)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t('task.title')} hint={v.kind === 'api_key' ? t('vault.titleHintApiKey') : undefined}>
          <Input required value={v.title} onChange={(e) => set('title', e.target.value)} />
        </Field>
        {(v.kind === 'password' || v.kind === 'server') && (
          <div className="grid grid-cols-2 gap-3">
            <Field label={t('vault.username')}>
              <Input value={v.username ?? ''} onChange={(e) => set('username', e.target.value)} />
            </Field>
            <Field label={t('vault.host')}>
              <Input value={v.host ?? ''} onChange={(e) => set('host', e.target.value)} />
            </Field>
          </div>
        )}
        <Field label={v.kind === 'script' ? t('vault.script') : v.kind === 'note' ? t('vault.noteBody') : t('vault.secret')} hint={isNew ? undefined : t('vault.keepSecretHint')}>
          {v.kind === 'script' || v.kind === 'note' ? (
            <Textarea rows={10} spellCheck={false} className="font-mono text-xs" value={v.secret ?? ''} onChange={(e) => set('secret', e.target.value)} />
          ) : (
            <div className="flex gap-2">
              <Input type="password" autoComplete="off" value={v.secret ?? ''} onChange={(e) => set('secret', e.target.value)} />
              <Button
                type="button"
                className="w-9 px-0"
                title={t('vault.generate')}
                aria-label={t('vault.generate')}
                onClick={() => {
                  const pw = generatePassword(24);
                  set('secret', pw);
                  toast(t('vault.generated', { length: pw.length }));
                }}
              >
                <Wand2 className="size-4" />
              </Button>
            </div>
          )}
        </Field>
        <Field label={t('vault.notes')}>
          <Textarea rows={3} value={v.notes ?? ''} onChange={(e) => set('notes', e.target.value)} />
        </Field>
        <Field label={t('vault.tags')} hint={t('vault.tagsHint')}>
          <Input value={tags} onChange={(e) => setTags(e.target.value)} />
        </Field>
        </div>
        <div className="flex shrink-0 justify-end gap-2 border-t border-line bg-obsidian-950/40 px-5 py-3">
          <Button type="button" variant="ghost" onClick={onCancel}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" variant="primary">
            <Lock className="size-4" /> {t('vault.encryptSave')}
          </Button>
        </div>
      </form>
    </Panel>
  );
}

/** Kurtarma anahtarını gösterir; kopyalama güvenli panodan yapılır ve süreli temizlenir. */
function RecoveryKeyPanel({ recoveryKey, onDone }: { recoveryKey: string; onDone: () => void }) {
  const { t } = useT();
  return (
    <div className="relative grid h-full place-items-center overflow-hidden px-6">
      <Panel className="animate-pop w-full max-w-[560px] p-8">
        <div className="flex items-center gap-3">
          <span className="notch-sm grid size-10 place-items-center border border-volt/60 bg-volt/10 text-volt">
            <KeyRound className="size-5" />
          </span>
          <h2 className="text-[22px] font-bold tracking-[0.08em] uppercase">{t('vault.recoveryTitle')}</h2>
        </div>
        <p className="mt-4 text-sm leading-relaxed text-ink-muted">{t('vault.recoveryHint')}</p>
        <div className="notch-sm mt-5 border border-volt/50 bg-obsidian-950/80 px-4 py-3 text-center font-mono text-[15px] leading-relaxed tracking-wider break-all text-volt">
          {recoveryKey}
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button
            onClick={async () => {
              try {
                await copySensitive(recoveryKey);
                toast(t('common.copied'));
              } catch (e) {
                toast(errorMessage(e), 'error');
              }
            }}
          >
            <Copy className="size-4" /> {t('vault.copyRecovery')}
          </Button>
          <Button variant="primary" onClick={onDone}>
            {t('vault.recoverySaved')}
          </Button>
        </div>
      </Panel>
    </div>
  );
}
