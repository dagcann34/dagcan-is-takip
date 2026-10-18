import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { listen } from '@tauri-apps/api/event';
import { Copy, Eye, EyeOff, KeyRound, Lock, Plus, Search, ShieldCheck, Terminal, Trash2, Server, StickyNote, Key, Wand2 } from 'lucide-react';
import { useT } from '../../i18n';
import { Button, Field, Input, PageHeader, Panel, Select, Textarea } from '../../components/ui';
import { isDesktop } from '../../lib/platform';
import { errorMessage, toast } from '../../lib/toast';
import { ITEM_KINDS, generatePassword, kindLabel, vault, type ItemKind, type VaultItem, type VaultItemInput, type VaultStatus } from './vaultApi';

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
          <Panel className="p-6 text-sm text-ink-muted">
            {t('vault.desktopOnly')}
            <code className="mt-3 block font-mono text-cyan">npm run tauri dev</code>
          </Panel>
        </div>
      </>
    );
  }

  if (!status) return null;
  if (!status.unlocked) return <LockScreen initialized={status.initialized} onDone={refresh} />;
  return <VaultBrowser autoLockMinutes={status.autoLockMinutes} onLocked={refresh} />;
}

function LockScreen({ initialized, onDone }: { initialized: boolean; onDone: () => void }) {
  const { t } = useT();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!initialized && password !== confirm) {
      toast(t('vault.mismatch'), 'error');
      return;
    }
    setBusy(true);
    try {
      if (initialized) await vault.unlock(password);
      else await vault.init(password);
      onDone();
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      // Parolayı React durumunda bekletme.
      setPassword('');
      setConfirm('');
      setBusy(false);
    }
  }

  return (
    <div className="grid h-full place-items-center px-6">
      <Panel className="w-full max-w-md p-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="grid size-11 place-items-center notch-sm bg-gradient-to-br from-brand to-cyan">
            <Lock className="size-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">{initialized ? t('vault.lockedTitle') : t('vault.createTitle')}</h2>
            <p className="text-sm text-ink-muted">
              {initialized ? t('vault.lockedHint') : t('vault.createHint')}
            </p>
          </div>
        </div>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <Field label={t('vault.masterPassword')} hint={initialized ? undefined : t('vault.masterPasswordHint')}>
            <Input type="password" autoFocus autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          {!initialized && (
            <Field label={t('vault.masterPasswordAgain')}>
              <Input type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            </Field>
          )}
          <Button variant="primary" type="submit" disabled={busy || password.length === 0}>
            <ShieldCheck className="size-4" />
            {busy ? t('vault.deriving') : initialized ? t('vault.unlock') : t('vault.create')}
          </Button>
        </form>
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
      [i.title, i.username, i.host, i.notes, ...i.tags].some((v) => v?.toLocaleLowerCase('tr').includes(q)),
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
    if (!confirm(t('vault.confirmDelete', { title: item.title }))) return;
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
          <div className="flex items-center gap-2 border-b border-line px-4 py-3">
            <Search className="size-4 text-ink-subtle" />
            <input
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-ink-subtle"
              placeholder={t('vault.search')}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <ul className="flex-1 divide-y divide-line overflow-auto">
            {filtered.map((item) => {
              const Icon = KIND_ICON[item.kind];
              const shown = revealed[item.id];
              return (
                <li key={item.id} className="group flex items-start gap-4 px-4 py-3.5 hover:bg-white/[0.03]">
                  <div className="mt-0.5 grid size-9 shrink-0 place-items-center bg-navy-700 text-cyan">
                    <Icon className="size-4" />
                  </div>
                  <button className="min-w-0 flex-1 text-left" onClick={() => setEditing({ ...item, username: item.username ?? '', host: item.host ?? '', notes: item.notes ?? '' })}>
                    <div className="flex items-center gap-2">
                      <span className="truncate font-medium">{item.title}</span>
                      <span className="rounded bg-white/5 px-1.5 py-0.5 text-[11px] text-ink-muted">{kindLabel(item.kind)}</span>
                    </div>
                    <div className="mt-0.5 truncate text-xs text-ink-subtle">
                      {[item.username, item.host].filter(Boolean).join(' @ ') || item.tags.join(', ') || '—'}
                    </div>
                    {shown !== undefined && (
                      <pre className="mt-2 max-h-48 overflow-auto bg-obsidian-950 p-3 font-mono text-xs whitespace-pre-wrap text-ink">{shown || t('vault.empty')}</pre>
                    )}
                  </button>
                  <div className="flex shrink-0 gap-1 opacity-70 group-hover:opacity-100">
                    <Button variant="ghost" title={t('vault.reveal')} onClick={() => toggleReveal(item.id)}>
                      {shown !== undefined ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </Button>
                    <Button variant="ghost" title={t('vault.copyTitle')} onClick={() => copy(item.id)}>
                      <Copy className="size-4" />
                    </Button>
                    <Button variant="ghost" title={t('common.delete')} onClick={() => remove(item)}>
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </li>
              );
            })}
            {filtered.length === 0 && <li className="px-4 py-10 text-center text-sm text-ink-subtle">{t('common.none')}</li>}
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
    <Panel className="w-[400px] shrink-0 overflow-auto p-5">
      <form onSubmit={submit} className="flex flex-col gap-4">
        <h3 className="font-semibold">{isNew ? t('vault.editorNew') : t('vault.editorEdit')}</h3>
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
                title={t('vault.generate')}
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
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onCancel}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" variant="primary">
            {t('vault.encryptSave')}
          </Button>
        </div>
      </form>
    </Panel>
  );
}
