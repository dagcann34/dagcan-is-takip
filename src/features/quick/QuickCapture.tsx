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
    <form
      onSubmit={submit}
      className="relative flex h-full flex-col gap-3 overflow-hidden border border-cyan/45 bg-obsidian-900 p-4 shadow-[inset_0_0_30px_rgb(0_240_255/0.08)]"
      data-tauri-drag-region
    >
      <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-magenta via-cyan to-transparent" />
      <div className="font-display flex items-center gap-2 text-[13px] font-semibold tracking-[0.12em] text-ink-muted uppercase" data-tauri-drag-region>
        <Zap className="size-3.5 text-cyan drop-shadow-[0_0_6px_rgb(0_240_255/0.8)]" /> {t('app.quickTask')}
      </div>
      <input
        ref={input}
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder={t('quick.placeholder')}
        aria-label={t('quick.placeholder')}
        className="notch-sm h-12 border border-line-field bg-navy-800 px-4 text-base text-ink caret-cyan transition-[border-color,box-shadow] outline-none placeholder:text-ink-subtle focus:border-cyan/70 focus:shadow-[0_0_0_1px_rgb(0_240_255/0.3),0_0_14px_rgb(0_240_255/0.15)]"
      />
      <div className="flex items-center gap-1.5">
        {(Object.keys(PRIORITY) as Priority[]).map((p) => {
          const on = priority === p;
          return (
            <button
              type="button"
              key={p}
              aria-pressed={on}
              onClick={() => setPriority(p)}
              className={`font-display flex h-8 items-center gap-1.5 border px-2.5 text-[13px] font-semibold tracking-wide transition-colors ${
                on ? 'bg-white/[0.06] text-ink' : 'border-line text-ink-muted hover:border-line-strong hover:text-ink'
              }`}
              style={on ? { borderColor: PRIORITY[p].color, boxShadow: `0 0 10px ${PRIORITY[p].color}33` } : undefined}
            >
              <span aria-hidden className="size-1.5 rotate-45" style={{ background: PRIORITY[p].color }} />
              {priorityLabel(p)}
            </button>
          );
        })}
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="ml-auto h-8 border border-line-field bg-navy-800 px-2 font-mono text-xs text-ink-muted transition-colors outline-none hover:border-cyan/45 focus:border-cyan/70"
        />
        <button
          type="submit"
          className="notch-sm font-display flex h-8 items-center gap-1.5 bg-volt px-3 text-sm font-bold text-obsidian-950 uppercase transition-[background-color,box-shadow] hover:bg-[#fff35a] hover:shadow-[0_0_14px_rgb(252_238_10/0.45)] active:translate-y-px"
        >
          {t('common.add')} <CornerDownLeft className="size-3.5" />
        </button>
      </div>
    </form>
  );
}
