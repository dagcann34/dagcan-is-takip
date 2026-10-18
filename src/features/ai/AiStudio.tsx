import { useMemo, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { BriefcaseBusiness, ClipboardList, Copy, ListChecks, Mail, ShieldCheck, Siren, Sparkles } from 'lucide-react';
import { Button, EmptyState, Field, Input, PageHeader, Panel, SectionTitle, Select, Textarea } from '../../components/ui';
import { useT, type MessageKey } from '../../i18n';
import { isDesktop } from '../../lib/platform';
import { errorMessage, toast } from '../../lib/toast';
import { useBoard } from '../board/boardStore';
import { copySensitive } from '../vault/vaultApi';
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
  const ModeIcon = MODES.find((m) => m.id === mode)!.icon;

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
        <Panel className="flex flex-col gap-5 overflow-auto p-5">
          <div role="tablist" className="notch-sm grid grid-cols-2 gap-1 border border-line bg-obsidian-950/60 p-1">
            {MODES.map(({ id, icon: Icon }) => {
              const on = mode === id;
              return (
                <button
                  key={id}
                  role="tab"
                  aria-selected={on}
                  onClick={() => setMode(id)}
                  className={`font-display relative flex h-10 items-center justify-center gap-2 text-[14px] font-semibold tracking-[0.04em] transition-[background-color,color,box-shadow] duration-150 ${
                    on
                      ? 'notch-sm bg-gradient-to-b from-cyan/[0.16] to-cyan/[0.06] text-cyan shadow-[inset_0_0_0_1px_rgb(0_240_255/0.45)] [text-shadow:0_0_10px_rgb(0_240_255/0.4)]'
                      : 'text-ink-muted hover:bg-cyan/[0.05] hover:text-ink'
                  }`}
                >
                  {on && <span aria-hidden className="absolute inset-x-6 bottom-0 h-px bg-magenta shadow-[0_0_8px_rgb(255_46_136/0.9)]" />}
                  <Icon className="size-4 shrink-0" /> <span className="truncate">{t(`ai.mode.${id}` as MessageKey)}</span>
                </button>
              );
            })}
          </div>

          <div>
            <SectionTitle
              className="mb-2"
              icon={<ListChecks />}
              actions={
                mode !== 'change' && (
                  <label className="flex cursor-pointer items-center gap-2 text-xs text-ink-muted hover:text-ink">
                    <input type="checkbox" checked={onlyDone} onChange={(e) => setOnlyDone(e.target.checked)} /> {t('ai.onlyDone')}
                  </label>
                )
              }
            >
              {t('ai.tasks', { count: selectedTasks.length })}
            </SectionTitle>
            <ul className="notch-sm max-h-52 space-y-px overflow-auto border border-line-strong bg-obsidian-950/40 p-1">
              {candidates.map((x) => {
                const on = picked.has(x.id);
                return (
                  <li key={x.id}>
                    <label
                      className={`flex cursor-pointer items-start gap-3 px-2.5 py-2 transition-colors ${on ? 'bg-cyan/[0.06] hover:bg-cyan/10' : 'hover:bg-cyan/[0.04]'}`}
                    >
                      <input type="checkbox" className="mt-0.5" checked={on} onChange={() => toggle(x.id)} />
                      <span className="min-w-0">
                        <span className="block truncate text-sm">
                          <span className="font-mono text-xs text-ink-subtle">{x.key}</span> {x.title}
                        </span>
                        <span className={`mt-0.5 block truncate text-xs ${x.outcome ? 'text-success/85' : 'text-warning/85'}`}>{x.outcome || t('ai.noOutcome')}</span>
                      </span>
                    </label>
                  </li>
                );
              })}
              {candidates.length === 0 && (
                <li>
                  <EmptyState icon={<ListChecks />} className="py-6">
                    {t('common.none')}
                  </EmptyState>
                </li>
              )}
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

          <label
            className={`notch-sm flex cursor-pointer items-start gap-3 border p-3 text-xs leading-relaxed transition-colors ${
              redact ? 'border-success/35 bg-success/[0.05] text-ink-muted' : 'border-warning/40 bg-warning/[0.05] text-ink-muted'
            }`}
          >
            <input type="checkbox" className="mt-0.5" checked={redact} onChange={(e) => setRedact(e.target.checked)} />
            <ShieldCheck className={`mt-px size-4 shrink-0 ${redact ? 'text-success' : 'text-warning'}`} />
            <span>{t('ai.redact')}</span>
          </label>

          <Button variant="primary" className="mt-auto h-10 shrink-0" onClick={generate} disabled={busy}>
            <Sparkles className={`size-4 ${busy ? 'animate-pulse' : ''}`} /> {busy ? t('ai.writing') : isDesktop ? t('ai.generate') : t('ai.preview')}
          </Button>
        </Panel>

        <Panel className="flex min-h-0 flex-col overflow-hidden">
          <div className="relative flex h-12 shrink-0 items-center justify-between gap-3 border-b border-line px-5">
            <SectionTitle className="min-w-0 flex-1" icon={<ModeIcon />}>
              {t(`ai.output.${mode}` as MessageKey)}
            </SectionTitle>
            {busy && (
              <span aria-hidden className="absolute inset-x-0 -bottom-px h-px overflow-hidden">
                <span className="absolute inset-y-0 left-0 w-1/4 bg-gradient-to-r from-transparent via-cyan to-transparent [animation:sweep_1.6s_linear_infinite]" />
              </span>
            )}
            <Button
              variant="ghost"
              className="h-8 px-2.5 text-[14px]"
              disabled={!output}
              onClick={async () => {
                await copySensitive(output);
                toast(t('common.copied'));
              }}
            >
              <Copy className="size-4" /> {t('common.copy')}
            </Button>
          </div>
          <div className="relative flex min-h-0 flex-1 flex-col">
            <Textarea
              className="min-h-0 flex-1 resize-none rounded-none border-0 bg-transparent px-5 py-4 text-sm leading-relaxed hover:border-0 focus:bg-cyan/[0.015] focus:shadow-none"
              aria-label={t(`ai.output.${mode}` as MessageKey)}
              placeholder={busy || output ? undefined : t('ai.outputPh')}
              value={output}
              onChange={(e) => setOutput(e.target.value)}
            />
            {!output && (
              <EmptyState icon={<Sparkles className={busy ? 'animate-pulse text-cyan' : ''} />} className="pointer-events-none absolute inset-0 top-14">
                {busy ? t('ai.writing') : null}
              </EmptyState>
            )}
          </div>
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
