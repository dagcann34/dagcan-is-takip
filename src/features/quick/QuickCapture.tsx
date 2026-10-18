import { useEffect, useRef, useState, type FormEvent } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { CornerDownLeft, Zap } from 'lucide-react';
import { addTask } from '../board/boardStore';
import { PRIORITY, priorityLabel, type Priority } from '../board/types';
import { useT } from '../../i18n';

/** Sistem tepsisi / ⌘⇧Space ile açılan çerçevesiz Hızlı Görev penceresi. */
export function QuickCapture() {
  const { t } = useT();
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [dueDate, setDueDate] = useState('');
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const win = getCurrentWindow();
    const focus = win.onFocusChanged(({ payload }) => payload && input.current?.focus());
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && win.hide();
    window.addEventListener('keydown', onKey);
    return () => {
      focus.then((f) => f());
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    addTask({ title: title.trim(), priority, dueDate: dueDate || undefined, assignee: 'Dağcan' });
    setTitle('');
    setDueDate('');
    getCurrentWindow().hide();
  }

  return (
    <form onSubmit={submit} className="flex h-full flex-col gap-3 bg-obsidian-900 p-4" data-tauri-drag-region>
      <div className="flex items-center gap-2 text-xs font-semibold tracking-wide text-ink-muted uppercase" data-tauri-drag-region>
        <Zap className="size-3.5 text-cyan" /> {t('app.quickTask')}
      </div>
      <input
        ref={input}
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder={t('quick.placeholder')}
        className="h-12 rounded-xl border border-line-strong bg-navy-800 px-4 text-base outline-none placeholder:text-ink-subtle focus:border-cyan/60"
      />
      <div className="flex items-center gap-2">
        {(Object.keys(PRIORITY) as Priority[]).map((p) => (
          <button
            type="button"
            key={p}
            onClick={() => setPriority(p)}
            className={`h-8 rounded-lg px-3 text-xs font-medium transition-colors ${priority === p ? 'bg-white/10 text-ink' : 'text-ink-muted hover:bg-white/5'}`}
            style={priority === p ? { boxShadow: `inset 0 0 0 1px ${PRIORITY[p].color}` } : undefined}
          >
            {priorityLabel(p)}
          </button>
        ))}
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="ml-auto h-8 rounded-lg border border-line bg-navy-800 px-2 text-xs text-ink-muted"
        />
        <button type="submit" className="flex h-8 items-center gap-1.5 rounded-lg bg-brand px-3 text-xs font-medium text-white hover:bg-brand-hover">
          {t('common.add')} <CornerDownLeft className="size-3.5" />
        </button>
      </div>
    </form>
  );
}
