import { useMemo, useState } from 'react';
import { CalendarDays, CalendarPlus, ChevronLeft, ChevronRight, PanelRightClose } from 'lucide-react';
import { saveFile } from '../../lib/platform';
import { errorMessage, toast } from '../../lib/toast';
import { buildIcs } from './ics';
import { useT } from '../../i18n';
import { useBoard } from '../board/boardStore';
import { PRIORITY, type Task } from '../board/types';

/** Sabit tarihli resmi tatiller (Türkiye). Dini bayramlar her yıl değiştiği için dahil değildir. */
const HOLIDAYS: Record<string, { tr: string; en: string }> = {
  '01-01': { tr: 'Yılbaşı', en: "New Year's Day" },
  '04-23': { tr: 'Ulusal Egemenlik ve Çocuk Bayramı', en: "National Sovereignty and Children's Day" },
  '05-01': { tr: 'Emek ve Dayanışma Günü', en: 'Labour and Solidarity Day' },
  '05-19': { tr: "Atatürk'ü Anma, Gençlik ve Spor Bayramı", en: 'Commemoration of Atatürk, Youth and Sports Day' },
  '07-15': { tr: 'Demokrasi ve Milli Birlik Günü', en: 'Democracy and National Unity Day' },
  '08-30': { tr: 'Zafer Bayramı', en: 'Victory Day' },
  '10-29': { tr: 'Cumhuriyet Bayramı', en: 'Republic Day' },
};

const pad = (n: number) => String(n).padStart(2, '0');
const isoDate = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;

function todayIso() {
  const d = new Date();
  return isoDate(d.getFullYear(), d.getMonth(), d.getDate());
}

interface DayInfo {
  due: Task[];
  done: Task[];
}

/**
 * Yıllık takvim paneli. Pano tuvalinin dışında sabit bir DOM paneli olduğu için
 * sürüklenmez, yeniden boyutlanmaz ve seçildiğinde yerinden oynamaz.
 */
export function YearCalendar({ onOpenTask, onClose }: { onOpenTask: (id: string) => void; onClose: () => void }) {
  const { t, lang, locale } = useT();
  const { tasks } = useBoard();
  const today = todayIso();
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [selected, setSelected] = useState<string | null>(today);

  const byDay = useMemo(() => {
    const map = new Map<string, DayInfo>();
    const get = (k: string) => map.get(k) ?? (map.set(k, { due: [], done: [] }), map.get(k)!);
    for (const task of tasks) {
      if (task.dueDate && task.status !== 'done') get(task.dueDate).due.push(task);
      if (task.status === 'done' && task.completedAt) get(task.completedAt.slice(0, 10)).done.push(task);
    }
    return map;
  }, [tasks]);

  const monthNames = useMemo(
    () => Array.from({ length: 12 }, (_, m) => new Date(2026, m, 1).toLocaleDateString(locale, { month: 'long' })),
    [locale],
  );
  // Pazartesi ile başlayan iki harfli gün kısaltmaları (tek harf Türkçede belirsiz: P/P, C/C).
  const weekdays = lang === 'tr' ? ['Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct', 'Pz'] : ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

  const sel = selected ? byDay.get(selected) : undefined;
  const selHoliday = selected ? HOLIDAYS[selected.slice(5)] : undefined;
  const yearDue = tasks.filter((x) => x.dueDate?.startsWith(String(year)) && x.status !== 'done').length;
  const yearDone = tasks.filter((x) => x.status === 'done' && x.completedAt?.startsWith(String(year))).length;

  return (
    <aside className="flex w-[318px] shrink-0 flex-col border-l border-line bg-obsidian-950/50 backdrop-blur-xl select-none" draggable={false}>
      <header className="flex items-center gap-2 border-b border-line px-4 py-3.5">
        <CalendarDays className="size-4 text-cyan" />
        <span className="font-display flex-1 text-[15px] font-bold tracking-[0.1em] uppercase">{t('calendar.title')}</span>
        <button
          className="grid size-7 place-items-center text-ink-subtle hover:bg-white/10 hover:text-ink"
          title={t('calendar.exportIcs')}
          onClick={async () => {
            try {
              const path = await saveFile('dagcan-is-takip.ics', new TextEncoder().encode(buildIcs(tasks)), 'text/calendar');
              toast(t('calendar.icsExported', { path }));
            } catch (e) {
              toast(errorMessage(e), 'error');
            }
          }}
        >
          <CalendarPlus className="size-4" />
        </button>
        <button className="grid size-7 place-items-center text-ink-subtle hover:bg-white/10 hover:text-ink" onClick={onClose} title={t('calendar.hide')}>
          <PanelRightClose className="size-4" />
        </button>
      </header>

      <div className="flex items-center justify-between px-4 pt-3">
        <button className="grid size-7 place-items-center text-ink-muted hover:bg-white/10" onClick={() => setYear((y) => y - 1)} aria-label="‹">
          <ChevronLeft className="size-4" />
        </button>
        <div className="text-center">
          <div className="font-display neon-text text-2xl font-bold tracking-[0.12em] tabular-nums">{year}</div>
          <div className="text-[11px] text-ink-subtle">{t('calendar.yearStats', { due: yearDue, done: yearDone })}</div>
        </div>
        <button className="grid size-7 place-items-center text-ink-muted hover:bg-white/10" onClick={() => setYear((y) => y + 1)} aria-label="›">
          <ChevronRight className="size-4" />
        </button>
      </div>
      {year !== new Date().getFullYear() && (
        <button
          className="mx-auto mt-1 rounded-full border border-line px-2.5 py-0.5 text-[11px] text-cyan hover:bg-white/5"
          onClick={() => {
            setYear(new Date().getFullYear());
            setSelected(today);
          }}
        >
          {t('calendar.today')}
        </button>
      )}

      <div className="min-h-0 flex-1 overflow-auto px-3 pt-3 pb-2">
        <div className="grid grid-cols-2 gap-x-3 gap-y-4">
          {monthNames.map((name, m) => {
            const first = new Date(year, m, 1);
            const offset = (first.getDay() + 6) % 7;
            const days = new Date(year, m + 1, 0).getDate();
            const isCurrentMonth = year === new Date().getFullYear() && m === new Date().getMonth();
            return (
              <section key={m}>
                <h4 className={`mb-1 px-0.5 text-[11px] font-semibold tracking-wide capitalize ${isCurrentMonth ? 'text-cyan' : 'text-ink-muted'}`}>{name}</h4>
                <div className="grid grid-cols-7 text-center text-[8px] font-medium text-ink-subtle/70">
                  {weekdays.map((w, i) => (
                    <span key={i} className="leading-4">
                      {w}
                    </span>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-y-px">
                  {Array.from({ length: offset }, (_, i) => (
                    <span key={`e${i}`} />
                  ))}
                  {Array.from({ length: days }, (_, i) => {
                    const d = i + 1;
                    const key = isoDate(year, m, d);
                    const info = byDay.get(key);
                    const holiday = HOLIDAYS[key.slice(5)];
                    const weekend = (offset + i) % 7 >= 5;
                    const isToday = key === today;
                    const isSel = key === selected;
                    const overdue = info?.due.length && key < today;
                    const topPriority = info?.due.reduce<Task | null>(
                      (best, x) => (!best || ['low', 'medium', 'high', 'critical'].indexOf(x.priority) > ['low', 'medium', 'high', 'critical'].indexOf(best.priority) ? x : best),
                      null,
                    );
                    const dot = overdue ? '#FF2E63' : topPriority ? PRIORITY[topPriority.priority].color : info?.done.length ? '#3CFFA0' : null;
                    return (
                      <button
                        key={key}
                        type="button"
                        draggable={false}
                        onClick={() => setSelected(isSel ? null : key)}
                        title={holiday ? holiday[lang] : undefined}
                        className={`relative mx-auto grid size-[18px] place-items-center rounded-[5px] text-[10px] leading-none tabular-nums transition-colors ${
                          isSel
                            ? 'bg-brand text-white'
                            : isToday
                              ? 'text-cyan ring-1 ring-cyan'
                              : holiday
                                ? 'bg-magenta/15 text-magenta'
                                : weekend
                                  ? 'text-ink-subtle hover:bg-white/10'
                                  : 'text-ink-muted hover:bg-white/10'
                        }`}
                      >
                        {d}
                        {dot && !isSel && <span className="absolute -bottom-px left-1/2 size-[3px] -translate-x-1/2 rounded-full" style={{ background: dot }} />}
                      </button>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap gap-x-3 gap-y-1 px-1 text-[10px] text-ink-subtle">
          <Legend color="#FCEE0A" label={t('calendar.legendDue')} />
          <Legend color="#FF2E63" label={t('calendar.legendOverdue')} />
          <Legend color="#3CFFA0" label={t('calendar.legendDone')} />
          <span className="flex items-center gap-1">
            <span className="size-2 rounded-[2px] bg-danger/30" /> {t('calendar.legendHoliday')}
          </span>
        </div>
      </div>

      {selected && (
        <div className="max-h-[38%] overflow-auto border-t border-line px-4 py-3">
          <div className="mb-2 text-xs font-semibold text-ink-muted">
            {new Date(`${selected}T00:00:00`).toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
          {selHoliday && <div className="mb-2 bg-danger/10 px-2 py-1 text-xs text-magenta">🇹🇷 {selHoliday[lang]}</div>}
          {!sel?.due.length && !sel?.done.length && <p className="text-xs text-ink-subtle">{t('calendar.noTasks')}</p>}
          <ul className="flex flex-col gap-1">
            {sel?.due.map((x) => (
              <TaskRow key={x.id} task={x} tag={t('calendar.due')} color={selected < today ? '#FF2E63' : PRIORITY[x.priority].color} onOpen={onOpenTask} />
            ))}
            {sel?.done.map((x) => (
              <TaskRow key={x.id} task={x} tag={t('calendar.done')} color="#3CFFA0" onOpen={onOpenTask} />
            ))}
          </ul>
        </div>
      )}
    </aside>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className="size-1.5 rounded-full" style={{ background: color }} /> {label}
    </span>
  );
}

function TaskRow({ task, tag, color, onOpen }: { task: Task; tag: string; color: string; onOpen: (id: string) => void }) {
  return (
    <li>
      <button onClick={() => onOpen(task.id)} className="flex w-full items-center gap-2 px-1.5 py-1 text-left hover:bg-white/5">
        <span className="h-4 w-0.5 shrink-0 rounded-full" style={{ background: color }} />
        <span className="min-w-0 flex-1 truncate text-xs">
          <span className="text-ink-subtle">{task.key}</span> {task.title}
        </span>
        <span className="shrink-0 text-[10px] text-ink-subtle">{tag}</span>
      </button>
    </li>
  );
}
