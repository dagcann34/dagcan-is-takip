import { useCallback, useEffect, useState } from 'react';
import { Command, KanbanSquare, LayoutDashboard, Settings2, ShieldCheck, Sparkles } from 'lucide-react';
import { CommandPalette, type View } from './components/CommandPalette';
import { Board } from './features/board/Board';
import { useBoard } from './features/board/boardStore';
import { dueInfo } from './features/board/types';
import { Overview } from './features/overview/Overview';
import { Settings } from './features/settings/Settings';
import { VaultView } from './features/vault/VaultView';
import { AiStudio } from './features/ai/AiStudio';
import { syncNativeLanguage, useT } from './i18n';
import { useDueReminders, useIdleTouch } from './lib/useAppEffects';
import { isDesktop } from './lib/platform';
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
      <nav className="flex w-[232px] shrink-0 flex-col border-r border-line bg-obsidian-950/60 px-3 py-5 backdrop-blur-xl">
        <div className="mb-7 flex items-center gap-2.5 px-2">
          <img src="/favicon.svg" alt="" className="size-8" />
          <div className="leading-tight">
            <div className="text-sm font-semibold">Dağcan İş Takip</div>
            <div className="text-[11px] text-ink-subtle">{t('app.tagline')}</div>
          </div>
        </div>
        {views.map((v) => (
          <NavItem key={v.id} active={view === v.id} onClick={() => setView(v.id)} icon={<v.icon className="size-4" />} label={v.label} badge={v.badge} />
        ))}
        <div className="mt-auto flex flex-col gap-2 rounded-xl border border-line p-3 text-[11px] leading-relaxed text-ink-subtle">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-ink-muted">{t('app.quickTask')}</span>
            <span>{isMac ? '⌘ ⇧ Space' : 'Ctrl ⇧ Space'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1 font-semibold text-ink-muted">
              <Command className="size-3" /> {t('app.palette')}
            </span>
            <span>{isMac ? '⌘ K' : 'Ctrl K'}</span>
          </div>
          {!isDesktop && !new URLSearchParams(location.search).has('shot') && <div className="text-warning/80">{t('app.browserPreview')}</div>}
          <div className="text-ink-subtle/70">v{__APP_VERSION__}</div>
        </div>
      </nav>
      <main className="min-w-0 flex-1">
        {view === 'overview' && <Overview onOpenTask={openTask} />}
        {view === 'board' && <Board focusTaskId={focusTaskId} />}
        {view === 'vault' && <VaultView />}
        {view === 'ai' && <AiStudio />}
        {view === 'settings' && <Settings />}
      </main>
      <CommandPalette views={views} onNavigate={setView} onOpenTask={openTask} />
      <Toaster />
    </div>
  );
}

function NavItem({ active, onClick, icon, label, badge }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string; badge?: number }) {
  return (
    <button
      onClick={onClick}
      className={`mb-0.5 flex h-9 items-center gap-3 rounded-lg px-3 text-sm transition-colors ${
        active ? 'bg-brand/20 text-ink shadow-[inset_2px_0_0_var(--color-cyan)]' : 'text-ink-muted hover:bg-white/5 hover:text-ink'
      }`}
    >
      {icon}
      <span className="flex-1 text-left">{label}</span>
      {!!badge && <span className="rounded-full bg-danger/20 px-1.5 text-[11px] font-semibold text-danger tabular-nums">{badge}</span>}
    </button>
  );
}
