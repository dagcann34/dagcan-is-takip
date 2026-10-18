import { useEffect, useRef, useState } from 'react';
import { Download, ExternalLink, Languages, Power, ShieldCheck, Upload } from 'lucide-react';
import { Button, PageHeader, Panel } from '../../components/ui';
import { setLang, useT, type Lang } from '../../i18n';
import { isDesktop, openExternal, saveFile, timestamp } from '../../lib/platform';
import { errorMessage, toast } from '../../lib/toast';
import { getBoard, saveBoard } from '../board/boardStore';
import type { BoardData } from '../board/types';
import { vault } from '../vault/vaultApi';

export const REPO_URL = 'https://github.com/dagcann34/dagcan-is-takip';
const isMac = navigator.platform.toLowerCase().includes('mac');

export function Settings() {
  const { t, lang } = useT();
  const fileInput = useRef<HTMLInputElement>(null);
  const [autostart, setAutostart] = useState<boolean | null>(null);

  useEffect(() => {
    if (!isDesktop) return;
    import('@tauri-apps/plugin-autostart').then((m) => m.isEnabled().then(setAutostart)).catch(() => setAutostart(false));
  }, []);

  async function toggleAutostart() {
    try {
      const m = await import('@tauri-apps/plugin-autostart');
      if (autostart) await m.disable();
      else await m.enable();
      const now = await m.isEnabled();
      setAutostart(now);
      toast(now ? t('settings.autostartOn') : t('settings.autostartOff'));
    } catch (e) {
      toast(errorMessage(e), 'error');
    }
  }

  async function exportBoardJson() {
    try {
      const bytes = new TextEncoder().encode(JSON.stringify(getBoard(), null, 2));
      const path = await saveFile(`dagcan-board-${timestamp()}.json`, bytes, 'application/json');
      toast(t('board.exported', { path }));
    } catch (e) {
      toast(errorMessage(e), 'error');
    }
  }

  async function importBoardJson(file: File) {
    try {
      const data = JSON.parse(await file.text()) as BoardData;
      if (!Array.isArray(data.tasks) || !Array.isArray(data.links) || typeof data.seq !== 'number') throw new Error();
      if (!confirm(t('settings.confirmImport'))) return;
      saveBoard(data);
      toast(t('settings.imported', { count: data.tasks.length }));
    } catch {
      toast(t('settings.importInvalid'), 'error');
    }
  }

  async function exportVault() {
    try {
      const path = await vault.exportBackup();
      toast(t('board.exported', { path }));
    } catch (e) {
      toast(errorMessage(e), 'error');
    }
  }

  const shortcuts: [string, string][] = [
    [isMac ? '⌘ ⇧ Space' : 'Ctrl ⇧ Space', t('app.quickTask')],
    [isMac ? '⌘ K' : 'Ctrl K', t('palette.placeholder')],
    ['Backspace / Delete', t('task.delete')],
  ];

  return (
    <div className="flex h-full flex-col overflow-auto">
      <PageHeader title={t('settings.title')} subtitle={t('settings.subtitle')} />
      <div className="grid max-w-5xl grid-cols-2 gap-5 px-8 pb-8">
        <Panel className="p-5">
          <h3 className="mb-1 flex items-center gap-2 font-semibold">
            <Languages className="size-4 text-cyan" /> {t('settings.language')}
          </h3>
          <p className="mb-4 text-xs text-ink-muted">{t('settings.languageHint')}</p>
          <div className="grid grid-cols-2 gap-2">
            {(['tr', 'en'] as Lang[]).map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={`h-11 notch-sm border text-sm font-medium transition-colors ${
                  lang === l ? 'border-cyan/60 bg-cyan/10 text-ink' : 'border-line text-ink-muted hover:bg-white/5'
                }`}
              >
                {l === 'tr' ? '🇹🇷 Türkçe' : '🇬🇧 English'}
              </button>
            ))}
          </div>
        </Panel>

        <Panel className="p-5">
          <h3 className="mb-4 flex items-center gap-2 font-semibold">
            <ShieldCheck className="size-4 text-cyan" /> {t('settings.backup')}
          </h3>
          <div className="flex flex-col gap-2">
            <Button onClick={exportBoardJson}>
              <Download className="size-4" /> {t('settings.exportBoard')}
            </Button>
            <Button onClick={() => fileInput.current?.click()}>
              <Upload className="size-4" /> {t('settings.importBoard')}
            </Button>
            <input
              ref={fileInput}
              type="file"
              accept="application/json,.json"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) importBoardJson(f);
                e.target.value = '';
              }}
            />
            {isDesktop && (
              <>
                <Button onClick={exportVault}>
                  <Download className="size-4" /> {t('settings.exportVault')}
                </Button>
                <p className="text-xs text-ink-subtle">{t('settings.vaultBackupHint')}</p>
              </>
            )}
          </div>
        </Panel>

        {isDesktop && (
          <Panel className="p-5">
            <h3 className="mb-4 flex items-center gap-2 font-semibold">
              <Power className="size-4 text-cyan" /> {t('settings.startup')}
            </h3>
            <label className="flex cursor-pointer items-start justify-between gap-4">
              <span>
                <span className="block text-sm">{t('settings.autostart')}</span>
                <span className="mt-1 block text-xs text-ink-subtle">{t('settings.autostartHint')}</span>
              </span>
              <button
                role="switch"
                aria-checked={!!autostart}
                disabled={autostart === null}
                onClick={toggleAutostart}
                className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${autostart ? 'bg-brand' : 'bg-white/15'}`}
              >
                <span className={`absolute top-0.5 size-5 rounded-full bg-white transition-all ${autostart ? 'left-[22px]' : 'left-0.5'}`} />
              </button>
            </label>
            <p className="mt-4 text-xs text-ink-subtle">{t('settings.dataLocation')}</p>
          </Panel>
        )}

        <Panel className="p-5">
          <h3 className="mb-4 font-semibold">{t('settings.shortcuts')}</h3>
          <dl className="flex flex-col gap-2 text-sm">
            {shortcuts.map(([keys, label]) => (
              <div key={keys} className="flex items-center justify-between">
                <dt className="text-ink-muted">{label}</dt>
                <dd className="rounded-md border border-line bg-obsidian-950/60 px-2 py-0.5 font-mono text-xs">{keys}</dd>
              </div>
            ))}
          </dl>
        </Panel>

        <Panel className="p-5">
          <h3 className="mb-4 flex items-center gap-3 font-semibold">
            <img src="/favicon.svg" alt="" className="size-7" /> Dağcan İş Takip
          </h3>
          <dl className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-ink-muted">{t('settings.version')}</dt>
              <dd className="font-mono">v{__APP_VERSION__}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-muted">{t('settings.license')}</dt>
              <dd>MIT</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-muted">{t('settings.source')}</dt>
              <dd>
                <button onClick={() => openExternal(REPO_URL)} className="inline-flex items-center gap-1 text-cyan hover:underline">
                  <ExternalLink className="size-3.5" /> GitHub
                </button>
              </dd>
            </div>
          </dl>
        </Panel>
      </div>
    </div>
  );
}
