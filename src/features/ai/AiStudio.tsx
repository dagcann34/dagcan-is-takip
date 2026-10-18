import { useMemo, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { BriefcaseBusiness, ClipboardList, Copy, Mail, Siren, Sparkles } from 'lucide-react';
import { Button, Field, Input, PageHeader, Panel, Select, Textarea } from '../../components/ui';
import { useT, type MessageKey } from '../../i18n';
import { isDesktop } from '../../lib/platform';
import { errorMessage, toast } from '../../lib/toast';
import { useBoard } from '../board/boardStore';
import {
  AUDIENCES,
  audienceLabel,
  buildCareerStar,
  buildChangeRequest,
  buildExecutiveSummary,
  buildPostmortem,
  type Audience,
  type Language,
  type PromptPair,
} from './prompts';

type Mode = 'executive' | 'career' | 'change' | 'postmortem';

const MODES: { id: Mode; icon: typeof Mail }[] = [
  { id: 'executive', icon: Mail },
  { id: 'career', icon: BriefcaseBusiness },
  { id: 'change', icon: ClipboardList },
  { id: 'postmortem', icon: Siren },
];

interface AiResult {
  text: string;
  truncated: boolean;
}

export function AiStudio() {
  const { t, lang } = useT();
  const board = useBoard();
  const [mode, setMode] = useState<Mode>('executive');
  // Değişiklik talebi planlanan işler içindir; diğer modlar biten işleri kullanır.
  const [onlyDone, setOnlyDone] = useState(true);
  const effectiveOnlyDone = mode === 'change' ? false : onlyDone;
  const candidates = useMemo(
    () => board.tasks.filter((x) => (mode === 'change' ? x.status !== 'done' : !effectiveOnlyDone || x.status === 'done')),
    [board.tasks, effectiveOnlyDone, mode],
  );
  const [picked, setPicked] = useState<Set<string>>(() => new Set(board.tasks.filter((x) => x.status === 'done').map((x) => x.id)));
  const [audience, setAudience] = useState<Audience>('cto');
  const [language, setLanguage] = useState<Language>(lang);
  const [recipient, setRecipient] = useState('');
  const [period, setPeriod] = useState('');
  const [context, setContext] = useState('');
  const [targetRole, setTargetRole] = useState(() => t('ai.targetRoleDefault'));
  const [window_, setWindow] = useState('');
  const [incident, setIncident] = useState('');
  const [redact, setRedact] = useState(true);
  const [output, setOutput] = useState('');
  const [busy, setBusy] = useState(false);

  const selectedTasks = candidates.filter((x) => picked.has(x.id));

  function build(): PromptPair {
    switch (mode) {
      case 'executive':
        return buildExecutiveSummary({ tasks: selectedTasks, audience, language, recipientName: recipient, period, extraContext: context, redact });
      case 'career':
        return buildCareerStar({ tasks: selectedTasks, language, targetRole, redact });
      case 'change':
        return buildChangeRequest({ tasks: selectedTasks, language, window: window_, extraContext: context, redact });
      case 'postmortem':
        return buildPostmortem({ tasks: selectedTasks, language, incident, redact });
    }
  }

  async function generate() {
    if (selectedTasks.length === 0 && mode !== 'postmortem') {
      toast(t('ai.pickOne'), 'error');
      return;
    }
    const pair = build();
    if (!isDesktop) {
      setOutput(`# SYSTEM\n${pair.system}\n\n# USER\n${pair.prompt}`);
      toast(t('ai.previewNotice'));
      return;
    }
    setBusy(true);
    setOutput('');
    try {
      const res = await invoke<AiResult>('ai_generate', { req: { ...pair, effort: 'medium' } });
      setOutput(res.truncated ? `${res.text}\n\n> ⚠️ ${t('ai.truncated')}` : res.text);
    } catch (e) {
      toast(errorMessage(e), 'error');
    } finally {
      setBusy(false);
    }
  }

  function toggle(id: string) {
    setPicked((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  return (
    <div className="flex h-full flex-col">
      <PageHeader title={t('ai.title')} subtitle={t('ai.subtitle')} />
      <div className="grid min-h-0 flex-1 grid-cols-[440px_1fr] gap-5 px-8 pb-8">
        <Panel className="flex flex-col gap-4 overflow-auto p-5">
          <div className="grid grid-cols-2 gap-1 rounded-xl bg-obsidian-950/60 p-1">
            {MODES.map(({ id, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setMode(id)}
                className={`flex h-9 items-center justify-center gap-2 rounded-lg text-sm font-medium transition-colors ${
                  mode === id ? 'bg-navy-700 text-ink shadow' : 'text-ink-muted hover:text-ink'
                }`}
              >
                <Icon className="size-4" /> {t(`ai.mode.${id}` as MessageKey)}
              </button>
            ))}
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold tracking-wide text-ink-muted uppercase">{t('ai.tasks', { count: selectedTasks.length })}</span>
              {mode !== 'change' && (
                <label className="flex items-center gap-2 text-xs text-ink-muted">
                  <input type="checkbox" checked={onlyDone} onChange={(e) => setOnlyDone(e.target.checked)} /> {t('ai.onlyDone')}
                </label>
              )}
            </div>
            <ul className="max-h-52 space-y-1 overflow-auto rounded-xl border border-line p-1">
              {candidates.map((x) => (
                <li key={x.id}>
                  <label className="flex cursor-pointer items-start gap-3 rounded-lg px-2.5 py-2 hover:bg-white/5">
                    <input type="checkbox" className="mt-1" checked={picked.has(x.id)} onChange={() => toggle(x.id)} />
                    <span className="min-w-0">
                      <span className="block truncate text-sm">
                        <span className="text-ink-subtle">{x.key}</span> {x.title}
                      </span>
                      <span className={`block truncate text-xs ${x.outcome ? 'text-success/80' : 'text-warning/80'}`}>{x.outcome || t('ai.noOutcome')}</span>
                    </span>
                  </label>
                </li>
              ))}
              {candidates.length === 0 && <li className="px-3 py-4 text-center text-xs text-ink-subtle">{t('common.none')}</li>}
            </ul>
          </div>

          {mode === 'executive' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Field label={t('ai.audience')}>
                  <Select value={audience} onChange={(e) => setAudience(e.target.value as Audience)}>
                    {AUDIENCES.map((a) => (
                      <option key={a} value={a}>
                        {audienceLabel(a, lang)}
                      </option>
                    ))}
                  </Select>
                </Field>
                <LanguageField value={language} onChange={setLanguage} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label={t('ai.recipient')}>
                  <Input placeholder={t('ai.recipientPh')} value={recipient} onChange={(e) => setRecipient(e.target.value)} />
                </Field>
                <Field label={t('ai.period')}>
                  <Input placeholder={t('ai.periodPh')} value={period} onChange={(e) => setPeriod(e.target.value)} />
                </Field>
              </div>
              <ContextField value={context} onChange={setContext} />
            </>
          )}

          {mode === 'career' && (
            <div className="grid grid-cols-[1fr_130px] gap-3">
              <Field label={t('ai.targetRole')}>
                <Input value={targetRole} onChange={(e) => setTargetRole(e.target.value)} />
              </Field>
              <LanguageField value={language} onChange={setLanguage} />
            </div>
          )}

          {mode === 'change' && (
            <>
              <div className="grid grid-cols-[1fr_130px] gap-3">
                <Field label={t('ai.window')}>
                  <Input placeholder={t('ai.windowPh')} value={window_} onChange={(e) => setWindow(e.target.value)} />
                </Field>
                <LanguageField value={language} onChange={setLanguage} />
              </div>
              <ContextField value={context} onChange={setContext} />
            </>
          )}

          {mode === 'postmortem' && (
            <>
              <LanguageField value={language} onChange={setLanguage} />
              <Field label={t('ai.incident')}>
                <Textarea rows={5} placeholder={t('ai.incidentPh')} value={incident} onChange={(e) => setIncident(e.target.value)} />
              </Field>
            </>
          )}

          <label className="flex items-start gap-2 rounded-lg border border-line bg-obsidian-950/40 p-3 text-xs text-ink-muted">
            <input type="checkbox" className="mt-0.5" checked={redact} onChange={(e) => setRedact(e.target.checked)} />
            <span>{t('ai.redact')}</span>
          </label>

          <Button variant="primary" onClick={generate} disabled={busy}>
            <Sparkles className="size-4" /> {busy ? t('ai.writing') : isDesktop ? t('ai.generate') : t('ai.preview')}
          </Button>
        </Panel>

        <Panel className="flex min-h-0 flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-5 py-3">
            <span className="text-sm font-medium">{t(`ai.output.${mode}` as MessageKey)}</span>
            <Button
              variant="ghost"
              disabled={!output}
              onClick={async () => {
                await navigator.clipboard.writeText(output);
                toast(t('common.copied'));
              }}
            >
              <Copy className="size-4" /> {t('common.copy')}
            </Button>
          </div>
          <Textarea
            className="min-h-0 flex-1 resize-none rounded-none border-0 bg-transparent px-5 py-4 text-sm leading-relaxed"
            placeholder={t('ai.outputPh')}
            value={output}
            onChange={(e) => setOutput(e.target.value)}
          />
        </Panel>
      </div>
    </div>
  );
}

function LanguageField({ value, onChange }: { value: Language; onChange: (l: Language) => void }) {
  const { t } = useT();
  return (
    <Field label={t('ai.language')}>
      <Select value={value} onChange={(e) => onChange(e.target.value as Language)}>
        <option value="tr">Türkçe</option>
        <option value="en">English</option>
      </Select>
    </Field>
  );
}

function ContextField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { t } = useT();
  return (
    <Field label={t('ai.context')}>
      <Textarea rows={3} placeholder={t('ai.contextPh')} value={value} onChange={(e) => onChange(e.target.value)} />
    </Field>
  );
}
