import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Command, Languages, Lock, Plus, Search } from 'lucide-react';
import { setLang, useT } from '../i18n';
import { isDesktop } from '../lib/platform';
import { addTask, useBoard } from '../features/board/boardStore';
import { statusLabel } from '../features/board/types';
import { vault } from '../features/vault/vaultApi';
import { EmptyState } from './ui';

export type View = 'overview' | 'board' | 'history' | 'dashboards' | 'vault' | 'ai' | 'settings' | 'about';

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
    <div className="animate-fade fixed inset-0 z-40 flex items-start justify-center bg-obsidian-950/65 pt-[14vh] backdrop-blur-sm" onClick={() => setOpen(false)}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('app.palette')}
        className="glass-strong notch notch-frame animate-pop relative w-[620px] overflow-hidden shadow-[0_0_0_1px_rgb(0_240_255/0.08),0_30px_80px_rgb(0_0_0/0.7),0_0_40px_rgb(0_240_255/0.08)] [--notch-color:rgb(0_240_255/0.45)]"
        onClick={(e) => e.stopPropagation()}
      >
        <span aria-hidden className="pointer-events-none absolute top-0 left-[10px] h-px w-16 bg-cyan/80 shadow-[0_0_8px_rgb(0_240_255/0.8)]" />
        <div className="flex items-center gap-3 border-b border-line-strong px-4">
          <Search className="size-4 shrink-0 text-cyan" />
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
            aria-label={t('palette.placeholder')}
            className="h-14 flex-1 bg-transparent text-base text-ink caret-cyan outline-none placeholder:text-ink-subtle focus-visible:shadow-none focus-visible:outline-none"
          />
          <kbd className="kbd">
            <Command className="size-3" />K
          </kbd>
        </div>
        <ul className="max-h-[50vh] overflow-auto p-2">
          {items.map((i, idx) => {
            const Icon = i.icon;
            const header = idx === 0 || items[idx - 1].group !== i.group;
            const on = idx === active;
            return (
              <li key={i.id}>
                {header && (
                  <div className={`hud-label flex items-center gap-2 px-3 pb-1.5 text-[11px]! ${idx === 0 ? 'pt-1.5' : 'pt-3'}`}>
                    {i.group === 'commands' ? t('palette.commands') : t('palette.tasks')}
                    <span aria-hidden className="h-px flex-1 bg-gradient-to-r from-line-strong to-transparent" />
                  </div>
                )}
                <button
                  aria-current={on ? 'true' : undefined}
                  onMouseEnter={() => setActive(idx)}
                  onClick={() => run(i)}
                  className={`relative flex h-10 w-full items-center gap-3 px-3 text-left text-sm transition-colors duration-100 ${
                    on ? 'notch-sm bg-gradient-to-r from-cyan/[0.14] to-cyan/[0.03] text-ink' : 'text-ink-muted'
                  }`}
                >
                  <span
                    aria-hidden
                    className={`absolute inset-y-1.5 left-0 w-[2px] ${on ? 'bg-magenta shadow-[0_0_8px_rgb(255_46_136/0.9)]' : 'bg-transparent'}`}
                  />
                  <span
                    className={`grid size-6 shrink-0 place-items-center border transition-colors ${
                      on ? 'border-cyan/50 bg-cyan/10 text-cyan' : 'border-line bg-obsidian-950/40 text-ink-subtle'
                    }`}
                  >
                    <Icon className="size-3.5" />
                  </span>
                  <span className="flex-1 truncate">{i.label}</span>
                  {i.hint && <span className="hud-chip shrink-0 text-[10px]!">{i.hint}</span>}
                  <span aria-hidden className={`kbd shrink-0 ${on ? 'opacity-100' : 'opacity-0'}`}>
                    ↵
                  </span>
                </button>
              </li>
            );
          })}
          {items.length === 0 && (
            <li>
              <EmptyState icon={<Search />} className="py-8">
                {t('common.none')}
              </EmptyState>
            </li>
          )}
        </ul>
        <div aria-hidden className="flex items-center justify-end gap-3 border-t border-line bg-obsidian-950/50 px-4 py-2 text-ink-subtle">
          <span className="flex items-center gap-1">
            <kbd className="kbd">↑</kbd>
            <kbd className="kbd">↓</kbd>
          </span>
          <kbd className="kbd">↵</kbd>
        </div>
      </div>
    </div>
  );
}
