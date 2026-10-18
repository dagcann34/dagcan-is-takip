import { ExternalLink, Heart, ShieldCheck } from 'lucide-react';
import { Button, Panel } from '../../components/ui';
import { openExternal } from '../../lib/platform';

export const REPO_URL = 'https://github.com/dagcann34/kanvault';

/** Uygulama içine kayıtlı iki dilli ürün bilgisi. Arayüz dilinden bağımsız olarak her iki dil de gösterilir. */
const INFO = {
  tr: {
    lang: 'Türkçe',
    tagline: 'BT ekipleri için iş ve güvenlik merkezi',
    about:
      'Kanvault; iş panosunu, sıfır bilgi şifreli kasayı ve AI raporlamayı tek bir hızlı, yerel öncelikli masaüstü uygulamasında birleştirir. Windows ve macOS üzerinde çalışır.',
    free: 'Tamamen ücretsizdir ve açık kaynaklıdır (MIT lisansı). Reklam, abonelik veya veri toplama yoktur.',
    features: [
      'Ekrana tam oturan sabit Kanban pano, şablonlar, tekrarlayan görevler, kontrol listesi ve süre takibi',
      'Zaman Makinesi: geçmişteki herhangi bir günün panosu ve tüm etkinlik kaydı',
      'Dashboard Stüdyosu: tarih aralığı seç, Neon, Beyaz Tahta, Kara Tahta, Yönetici veya Blueprint temasıyla PNG/PDF rapor',
      'Yıllık takvim, resmi tatiller ve .ics takvim aktarımı',
      'AI Stüdyo: yönetici e-postası, STAR CV maddeleri, değişiklik talebi ve olay raporu',
    ],
    security: [
      'Kasa: Argon2id + AES-256-GCM, ana parola cihazdan çıkmaz',
      'Pano ve geçmiş diskte şifreli; anahtar işletim sistemi anahtar zincirinde',
      'Ekran görüntüsü koruması, kopyalama/seçme engeli, otomatik kilit, 30 sn pano temizleme',
    ],
    dev: 'Dağcan Nural tarafından geliştirilmiştir.',
    source: 'Kaynak kod',
  },
  en: {
    lang: 'English',
    tagline: 'Task & Security Hub for IT teams',
    about:
      'Kanvault brings a task board, a zero-knowledge encrypted vault and AI reporting together in one fast, local-first desktop app. Runs on Windows and macOS.',
    free: 'Completely free and open source (MIT license). No ads, no subscriptions, no data collection.',
    features: [
      'Fixed Kanban board that fits the screen, templates, recurring tasks, checklists and time tracking',
      'Time Machine: the board as it was on any past day, plus the full activity log',
      'Dashboard Studio: pick a date range and export PNG/PDF reports in Neon, Whiteboard, Chalkboard, Executive or Blueprint themes',
      'Year calendar with public holidays and .ics calendar export',
      'AI Studio: executive emails, STAR CV bullets, change requests and incident reports',
    ],
    security: [
      'Vault: Argon2id + AES-256-GCM, the master password never leaves the device',
      'Board and history encrypted on disk; key kept in the OS keychain',
      'Screenshot protection, copy/select blocking, auto-lock, 30-second clipboard clearing',
    ],
    dev: 'Developed by Dağcan Nural.',
    source: 'Source code',
  },
} as const;

export function AboutView() {
  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <header className="flex shrink-0 items-center gap-6 px-8 pt-8 pb-6">
        <img src="/favicon.svg" alt="" className="size-24 drop-shadow-[0_0_24px_rgb(0_240_255/0.45)]" />
        <div className="min-w-0">
          <h1 lang="en" className="neon-text text-[52px] leading-none font-bold tracking-[0.14em] uppercase">
            Kanvault
          </h1>
          <p className="mt-2 font-mono text-sm text-ink-muted">
            v{__APP_VERSION__} · MIT · Windows / macOS · TR / EN
          </p>
          <p className="mt-3 flex items-center gap-2 text-sm text-ink">
            <Heart className="size-4 text-magenta" />
            <span lang="tr">Dağcan Nural tarafından geliştirilmiştir</span>
            <span className="text-ink-subtle">·</span>
            <span lang="en">Developed by Dağcan Nural</span>
          </p>
        </div>
        <Button className="ml-auto" onClick={() => openExternal(REPO_URL)}>
          <ExternalLink className="size-4" /> GitHub
        </Button>
      </header>

      <div className="grid grid-cols-1 gap-5 px-8 pb-8 xl:grid-cols-2">
        {(['tr', 'en'] as const).map((l) => {
          const i = INFO[l];
          return (
            <Panel key={l} className="p-6">
              <div lang={l} className="flex h-full flex-col gap-4">
                <div className="flex items-center justify-between">
                  <span className="hud-label">{i.lang}</span>
                  <span className="notch-sm bg-volt px-2 py-0.5 font-display text-xs font-bold tracking-wider text-obsidian-950 uppercase">
                    {l === 'tr' ? 'Ücretsiz' : 'Free'}
                  </span>
                </div>
                <h2 className="text-2xl font-bold tracking-[0.04em]">{i.tagline}</h2>
                <p className="text-sm leading-relaxed text-ink-muted">{i.about}</p>
                <p className="notch-sm border border-success/40 bg-success/10 px-3 py-2 text-sm text-success">{i.free}</p>
                <ul className="flex flex-col gap-2 text-sm">
                  {i.features.map((f) => (
                    <li key={f} className="flex gap-2">
                      <span className="mt-1.5 size-1.5 shrink-0 rotate-45 bg-cyan shadow-[0_0_6px_rgb(0_240_255)]" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-1 flex flex-col gap-2 border-t border-line pt-4 text-sm text-ink-muted">
                  {i.security.map((s) => (
                    <div key={s} className="flex gap-2">
                      <ShieldCheck className="mt-0.5 size-4 shrink-0 text-cyan" />
                      <span>{s}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-auto flex items-center justify-between border-t border-line pt-4 text-sm">
                  <span className="font-semibold">{i.dev}</span>
                  <span className="font-mono text-xs text-ink-subtle">{i.source}: github.com/dagcann34/kanvault</span>
                </div>
              </div>
            </Panel>
          );
        })}
      </div>
    </div>
  );
}
