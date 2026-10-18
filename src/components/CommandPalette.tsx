import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Command, Languages, Lock, Plus, Search } from 'lucide-react';
import { setLang, useT } from '../i18n';
import { isDesktop } from '../lib/platform';
import { addTask, useBoard } from '../features/board/boardStore';
import { statusLabel } from '../features/board/types';
import { vault } from '../features/vault/vaultApi';

export type View = 'overview' | 'board' | 'vault' | 'ai' | 'settings';

interface Item {
  id: string;
  group: 'commands' | 'tasks';
  label: string;
  hint?: string;
  icon: typeof Search;
  run: () => void;
}

/** ⌘K / Ctrl+K: görünümler arası geçiş, görev arama ve hızlı komutlar. */
export function CommandPalette({
  views,
  onNavigate,
  onOpenTask,
}: {
  views: { id: View; label: string; icon: typeof Search }[];
  onNavigate: (v: View) => void;
  onOpenTask: (id: string) => void;
}) {
  const { t, lang } = useT();
  const { tasks } = useBoard();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  const items = useMemo<Item[]>(() => {
    const q = query.trim().toLocaleLowerCase(lang);
    const commands: Item[] = [
      ...views.map((v) => ({ id: `go-${v.id}`, group: 'commands' as const, label: t('palette.goto', { view: v.label }), icon: v.icon, run: () => onNavigate(v.id) })),
      {
        id: 'new-task',
        group: 'commands',
        label: t('palette.newTask'),
        icon: Plus,
        run: () => {
          const task = addTask({ title: query.trim() || t('board.newTaskTitle'), assignee: 'Dağcan' });
          onOpenTask(task.id);
        },
      },
      { id: 'lang', group: 'commands', label: t('palette.switchLang'), icon: Languages, run: () => setLang(lang === 'tr' ? 'en' : 'tr') },
      ...(isDesktop ? [{ id: 'lock', group: 'commands' as const, label: t('palette.lockVault'), icon: Lock, run: () => vault.lock() }] : []),
    ];
    const taskItems: Item[] = tasks.map((x) => ({
      id: x.id,
      group: 'tasks',
      label: `${x.key} · ${x.title}`,
      hint: statusLabel(x.status),
      icon: ArrowRight,
      run: () => onOpenTask(x.id),
    }));
    const match = (i: Item) => !q || i.label.toLocaleLowerCase(lang).includes(q);
    return [...commands.filter(match), ...taskItems.filter(match).slice(0, 8)];
  }, [query, tasks, views, t, lang, onNavigate, onOpenTask]);

  if (!open) return null;

  function run(i: Item | undefined) {
    if (!i) return;
    setOpen(false);
    i.run();
  }

  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center bg-obsidian-950/60 pt-[14vh] backdrop-blur-sm" onClick={() => setOpen(false)}>
      <div className="glass-strong w-[620px] overflow-hidden notch" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 border-b border-line px-4">
          <Search className="size-4 text-ink-subtle" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActive((a) => Math.min(a + 1, items.length - 1));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActive((a) => Math.max(a - 1, 0));
              } else if (e.key === 'Enter') {
                run(items[active]);
              }
            }}
            placeholder={t('palette.placeholder')}
            className="h-14 flex-1 bg-transparent text-base outline-none placeholder:text-ink-subtle"
          />
          <span className="flex items-center gap-1 border border-line px-1.5 py-0.5 text-[11px] text-ink-subtle">
            <Command className="size-3" />K
          </span>
        </div>
        <ul className="max-h-[50vh] overflow-auto p-2">
          {items.map((i, idx) => {
            const Icon = i.icon;
            const header = idx === 0 || items[idx - 1].group !== i.group;
            return (
              <li key={i.id}>
                {header && (
                  <div className="px-3 pt-2 pb-1 text-[11px] font-semibold tracking-wider text-ink-subtle uppercase">
                    {i.group === 'commands' ? t('palette.commands') : t('palette.tasks')}
                  </div>
                )}
                <button
                  onMouseEnter={() => setActive(idx)}
                  onClick={() => run(i)}
                  className={`flex w-full items-center gap-3 px-3 py-2 text-left text-sm ${idx === active ? 'bg-brand/25 text-ink' : 'text-ink-muted'}`}
                >
                  <Icon className="size-4 shrink-0" />
                  <span className="flex-1 truncate">{i.label}</span>
                  {i.hint && <span className="text-xs text-ink-subtle">{i.hint}</span>}
                </button>
              </li>
            );
          })}
          {items.length === 0 && <li className="px-3 py-6 text-center text-sm text-ink-subtle">{t('common.none')}</li>}
        </ul>
      </div>
    </div>
  );
}
