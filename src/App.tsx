import { useCallback, useEffect, useState } from 'react';
import { CalendarDays, Command, KanbanSquare, LayoutDashboard, Settings2, ShieldCheck, Sparkles } from 'lucide-react';
import { CommandPalette, type View } from './components/CommandPalette';
import { Board } from './features/board/Board';
import { useBoard } from './features/board/boardStore';
import { dueInfo } from './features/board/types';
import { Overview } from './features/overview/Overview';
import { YearCalendar } from './features/calendar/YearCalendar';
import { Settings } from './features/settings/Settings';
import { VaultView } from './features/vault/VaultView';
import { AiStudio } from './features/ai/AiStudio';
import { syncNativeLanguage, useT } from './i18n';
import { useDueReminders, useIdleTouch } from './lib/useAppEffects';
import { isDesktop } from './lib/platform';
import { WIDE_LAYOUT, useMediaQuery } from './lib/useMediaQuery';
import { Toaster } from './lib/toast';

const isMac = navigator.platform.toLowerCase().includes('mac');
const VIEWS: View[] = ['overview', 'board', 'vault', 'ai', 'settings'];
// ?view=board gibi bir parametre ile doğrudan bir görünümde açılabilir (dokümantasyon ekran görüntüleri için).
const initialView = (): View => {
  const v = new URLSearchParams(location.search).get('view') as View | null;
  return v && VIEWS.includes(v) ? v : 'overview';
};

export function App() {
  const { t } = useT();
  const [view, setView] = useState<View>(initialView);
  const [focusTaskId, setFocusTaskId] = useState<string | null>(null);
  const board = useBoard();
  const [calendarOpen, setCalendarOpen] = useState(() => {
    try {
      return localStorage.getItem('dagcan.calendar') !== 'off';
    } catch {
      return true;
    }
  });
  const [boardEditing, setBoardEditing] = useState(false);
  const wide = useMediaQuery(WIDE_LAYOUT);
  // Dar pencerede takvim çekmece olarak açılır ve varsayılan olarak kapalıdır.
  const [drawerOpen, setDrawerOpen] = useState(false);
  const toggleCalendar = (open: boolean) => {
    if (!wide) {
      setDrawerOpen(open);
      return;
    }
    setCalendarOpen(open);
    try {
      localStorage.setItem('dagcan.calendar', open ? 'on' : 'off');
    } catch {
      /* yoksay */
    }
  };
  const calendarView = view === 'overview' || view === 'board';
  const panelOpen = wide ? calendarOpen : drawerOpen;
  const showCalendar = calendarView && panelOpen && !(view === 'board' && boardEditing);
  const urgent = board.tasks.filter((x) => {
    const tone = dueInfo(x)?.tone;
    return tone === 'overdue' || tone === 'soon';
  }).length;
  useIdleTouch();
  useDueReminders();
  useEffect(syncNativeLanguage, []);

  const openTask = useCallback((id: string) => {
    setView('board');
    // Aynı göreve tekrar odaklanmayı da tetiklemek için önce sıfırla.
    setFocusTaskId(null);
    setTimeout(() => setFocusTaskId(id), 60);
  }, []);

  const views: { id: View; label: string; icon: typeof KanbanSquare; badge?: number }[] = [
    { id: 'overview', label: t('nav.overview'), icon: LayoutDashboard },
    { id: 'board', label: t('nav.board'), icon: KanbanSquare, badge: urgent },
    { id: 'vault', label: t('nav.vault'), icon: ShieldCheck },
    { id: 'ai', label: t('nav.ai'), icon: Sparkles },
    { id: 'settings', label: t('nav.settings'), icon: Settings2 },
  ];

  return (
    <div className="flex h-full">
      <nav className="relative flex w-[236px] shrink-0 flex-col border-r border-line bg-obsidian-950/80 px-3 py-5 backdrop-blur-xl">
        <span aria-hidden className="pointer-events-none absolute inset-y-0 right-0 w-px bg-gradient-to-b from-cyan/0 via-cyan/40 to-magenta/0" />
        <div className="mb-8 flex items-center gap-3 px-2">
          <img src="/favicon.svg" alt="" className="size-9 drop-shadow-[0_0_10px_rgb(0_240_255/0.55)]" />
          <div className="min-w-0 leading-tight">
            <div className="font-display truncate text-[17px] font-bold tracking-[0.06em] uppercase">Dağcan İş Takip</div>
            <div lang="en" className="font-mono text-[10px] tracking-wider text-magenta/90 uppercase">{t('app.tagline')}</div>
          </div>
        </div>
        <div className="hud-label mb-2 px-3 text-[10px]! text-ink-subtle!">// NAV</div>
        {views.map((v) => (
          <NavItem key={v.id} active={view === v.id} onClick={() => setView(v.id)} icon={<v.icon className="size-4" />} label={v.label} badge={v.badge} />
        ))}
        <div className="notch mt-auto flex flex-col gap-2 border border-line bg-navy-900/70 p-3 text-[11px] leading-relaxed text-ink-subtle">
          <div className="flex items-center justify-between">
            <span className="font-display text-[13px] font-semibold tracking-wider text-ink-muted uppercase">{t('app.quickTask')}</span>
            <kbd className="font-mono text-cyan/80">{isMac ? '⌘⇧Space' : 'Ctrl⇧Space'}</kbd>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-display flex items-center gap-1 text-[13px] font-semibold tracking-wider text-ink-muted uppercase">
              <Command className="size-3" /> {t('app.palette')}
            </span>
            <kbd className="font-mono text-cyan/80">{isMac ? '⌘K' : 'Ctrl K'}</kbd>
          </div>
          {!isDesktop && !new URLSearchParams(location.search).has('shot') && <div className="text-warning/80">{t('app.browserPreview')}</div>}
          <div className="flex items-center gap-2 pt-1 font-mono text-[10px] text-ink-subtle">
            <span className="size-1.5 animate-pulse rounded-full bg-success shadow-[0_0_6px_rgb(60_255_160)]" /> v{__APP_VERSION__} · ONLINE
          </div>
        </div>
      </nav>
      <main className="relative min-w-0 flex-1">
        {view === 'overview' && <Overview onOpenTask={openTask} />}
        {view === 'board' && <Board focusTaskId={focusTaskId} onEditingChange={setBoardEditing} />}
        {view === 'vault' && <VaultView />}
        {view === 'ai' && <AiStudio />}
        {view === 'settings' && <Settings />}
        {calendarView && !panelOpen && (
          <button
            onClick={() => toggleCalendar(true)}
            title={t('calendar.show')}
            className="glass notch-sm absolute right-6 bottom-6 z-20 grid size-11 place-items-center text-ink-muted hover:text-cyan hover:shadow-[0_0_14px_rgb(0_240_255/0.35)]"
          >
            <CalendarDays className="size-4" />
          </button>
        )}
      </main>
      {showCalendar && !wide && <div className="fixed inset-0 z-30 bg-obsidian-950/60 backdrop-blur-[2px]" onClick={() => setDrawerOpen(false)} />}
      {showCalendar && (
        <div className={wide ? 'flex' : 'fixed inset-y-0 right-0 z-40 flex shadow-[-20px_0_60px_rgb(0_0_0/0.6)]'}>
          <YearCalendar
            onOpenTask={(id) => {
              setDrawerOpen(false);
              openTask(id);
            }}
            onClose={() => toggleCalendar(false)}
          />
        </div>
      )}
      <CommandPalette views={views} onNavigate={setView} onOpenTask={openTask} />
      <Toaster />
    </div>
  );
}

function NavItem({ active, onClick, icon, label, badge }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string; badge?: number }) {
  return (
    <button
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={`font-display relative mb-1 flex h-10 items-center gap-3 px-3 text-[15px] font-semibold tracking-[0.08em] uppercase transition-all ${
        active
          ? 'notch-sm bg-gradient-to-r from-cyan/15 to-transparent text-cyan [text-shadow:0_0_10px_rgb(0_240_255/0.6)]'
          : 'text-ink-muted hover:bg-cyan/5 hover:text-ink'
      }`}
    >
      {active && <span className="absolute inset-y-1 left-0 w-[3px] bg-magenta shadow-[0_0_10px_rgb(255_46_136/0.9)]" />}
      {icon}
      <span className="flex-1 truncate text-left">{label}</span>
      {!!badge && (
        <span className="notch-sm bg-danger px-1.5 font-mono text-[11px] leading-5 font-bold text-white shadow-[0_0_10px_rgb(255_46_99/0.6)]">{badge}</span>
      )}
    </button>
  );
}
