import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { FileDown, FileImage, LayoutTemplate, Link2, Pause, Play, Plus, Repeat, RotateCcw, Search, Trash2, X } from 'lucide-react';
import { Button, Field, Input, Select, Textarea } from '../../components/ui';
import { useT } from '../../i18n';
import { errorMessage, toast } from '../../lib/toast';
import { useNow } from '../../lib/useNow';
import { WIDE_LAYOUT, useMediaQuery } from '../../lib/useMediaQuery';
import { addTask, getBoard, saveBoard, useBoard } from './boardStore';
import { exportBoard, type ExportFormat } from './exportBoard';
import { TaskCard } from './TaskCard';
import { TEMPLATES, templateTitle, templateToTask } from './templates';
import {
  LANES,
  PRIORITY,
  RECURRENCES,
  formatDuration,
  priorityLabel,
  recurrenceLabel,
  statusLabel,
  totalTime,
  type Priority,
  type Recurrence,
  type Status,
  type Task,
} from './types';

const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** Tek görevi güncelleyen yardımcı. Tekrarlayan görev türerse kullanıcıya bildirir. */
function patchTask(id: string, patch: Partial<Task> | ((t: Task) => Task), onSpawn?: () => void) {
  const data = getBoard();
  const tasks = data.tasks.map((t) => (t.id !== id ? t : typeof patch === 'function' ? patch(t) : { ...t, ...patch }));
  if (saveBoard({ ...data, tasks })) onSpawn?.();
}

function withStatus(task: Task, status: Status): Task {
  return { ...task, status, completedAt: status === 'done' ? (task.completedAt ?? todayIso()) : undefined };
}

/** Sütun içi sıralama: önce öncelik (kritik üstte), sonra en yakın teslim tarihi. */
function sortTasks(a: Task, b: Task) {
  const p = PRIORITY[b.priority].rank - PRIORITY[a.priority].rank;
  if (p) return p;
  const da = a.dueDate ?? '9999';
  const db = b.dueDate ?? '9999';
  return da < db ? -1 : da > db ? 1 : 0;
}

/**
 * Sabit Kanban panosu: dört sütun mevcut alana tam sığar, kartlar sürüklenemez.
 * Her sütun kendi içinde dikey kayar; pencere boyutu değişince ızgara yeniden dağılır.
 */
export function Board({ focusTaskId, onEditingChange }: { focusTaskId?: string | null; onEditingChange?: (editing: boolean) => void }) {
  const { t } = useT();
  const board = useBoard();
  const wide = useMediaQuery(WIDE_LAYOUT);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [prioFilter, setPrioFilter] = useState<Priority | ''>('');
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);
  const templatesRef = useRef<HTMLDivElement>(null);

  const selected = board.tasks.find((x) => x.id === selectedId) ?? null;
  const editing = !!selected;
  useEffect(() => onEditingChange?.(editing), [editing, onEditingChange]);

  // Komut paletinden veya takvimden gelen "görevi aç".
  useEffect(() => {
    if (!focusTaskId) return;
    setSelectedId(focusTaskId);
    requestAnimationFrame(() =>
      document.querySelector(`[data-task-id="${focusTaskId}"]`)?.scrollIntoView({ block: 'center', behavior: 'smooth' }),
    );
  }, [focusTaskId]);

  // Şablon menüsü dışına tıklanınca kapanır.
  useEffect(() => {
    if (!templatesOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!templatesRef.current?.contains(e.target as Node)) setTemplatesOpen(false);
    };
    window.addEventListener('mousedown', onDown);
    return () => window.removeEventListener('mousedown', onDown);
  }, [templatesOpen]);

  const byId = useMemo(() => new Map(board.tasks.map((x) => [x.id, x])), [board.tasks]);
  const blockersOf = (id: string) =>
    board.links
      .filter((l) => l.target === id)
      .map((l) => byId.get(l.source))
      .filter((x): x is Task => !!x && x.status !== 'done')
      .map((x) => x.key);

  const filtering = query.trim() !== '' || prioFilter !== '';
  const q = query.trim().toLocaleLowerCase();
  const visible = board.tasks.filter((task) => {
    const text = [task.key, task.title, task.description, task.assignee, task.outcome].filter(Boolean).join(' ').toLocaleLowerCase();
    return (!q || text.includes(q)) && (!prioFilter || task.priority === prioFilter);
  });

  const spawned = () => toast(t('board.recurringCreated'));

  function move(id: string, dir: -1 | 1) {
    const task = byId.get(id);
    if (!task) return;
    const i = LANES.findIndex((l) => l.status === task.status) + dir;
    if (i < 0 || i >= LANES.length) return;
    patchTask(id, (cur) => withStatus(cur, LANES[i].status), spawned);
    toast(t('board.moved', { key: task.key, lane: statusLabel(LANES[i].status) }));
  }

  function createCard() {
    const task = addTask({ title: t('board.newTaskTitle'), assignee: 'Dağcan' });
    setSelectedId(task.id);
  }

  function createFromTemplate(id: string) {
    const tpl = TEMPLATES.find((x) => x.id === id);
    if (!tpl) return;
    const task = addTask({ ...templateToTask(tpl), assignee: 'Dağcan' });
    setTemplatesOpen(false);
    setSelectedId(task.id);
    toast(t('board.templateCreated', { title: templateTitle(tpl) }));
  }

  async function runExport(format: ExportFormat) {
    try {
      const path = await exportBoard(gridRef.current, format);
      if (path) toast(t('board.exported', { path }));
    } catch (e) {
      toast(errorMessage(e), 'error');
    }
  }

  function removeTask(id: string) {
    const data = getBoard();
    saveBoard({ ...data, tasks: data.tasks.filter((x) => x.id !== id), links: data.links.filter((l) => l.source !== id && l.target !== id) });
    setSelectedId(null);
  }

  function setDependencies(id: string, sources: string[]) {
    const data = getBoard();
    const others = data.links.filter((l) => l.target !== id);
    saveBoard({ ...data, links: [...others, ...sources.map((s) => ({ id: crypto.randomUUID(), source: s, target: id }))] });
  }

  const openCount = board.tasks.filter((x) => x.status !== 'done').length;
  const doneCount = board.tasks.length - openCount;

  return (
    <div className="flex h-full min-h-0">
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Araç çubuğu: üst satır başlık + dışa aktarma, alt satır oluşturma + filtre */}
        <div className="flex shrink-0 flex-col gap-3 px-6 pt-5 pb-4">
          <div className="flex items-end justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-[26px] leading-none font-bold tracking-[0.08em] uppercase">{t('board.title')}</h1>
              <p className="mt-1.5 font-mono text-[11px] text-ink-subtle">{t('board.subtitle', { open: openCount, done: doneCount })}</p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <Button variant="ghost" onClick={() => runExport('png')} title={t('board.exportPng')}>
                <FileImage className="size-4" /> PNG
              </Button>
              <Button variant="ghost" onClick={() => runExport('pdf')} title={t('board.exportPdf')}>
                <FileDown className="size-4" /> PDF
              </Button>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="primary" onClick={createCard}>
              <Plus className="size-4" /> {t('board.newCard')}
            </Button>
            <div className="relative" ref={templatesRef}>
              <Button onClick={() => setTemplatesOpen((o) => !o)} aria-expanded={templatesOpen}>
                <LayoutTemplate className="size-4" /> {t('board.templates')}
              </Button>
              {templatesOpen && (
                <div className="glass-strong notch absolute top-11 left-0 z-30 w-80 p-1.5">
                  {TEMPLATES.map((tpl) => (
                    <button
                      key={tpl.id}
                      onClick={() => createFromTemplate(tpl.id)}
                      className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-cyan/10 hover:text-cyan"
                    >
                      <span className="truncate">{templateTitle(tpl)}</span>
                      {tpl.recurrence && (
                        <span className="flex shrink-0 items-center gap-1 text-[11px] text-cyan/80">
                          <Repeat className="size-3" /> {recurrenceLabel(tpl.recurrence)}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <span className="mx-1 h-6 w-px bg-line-strong" />
            <div className="notch-sm flex h-9 items-center gap-2 border border-line bg-obsidian-950/70 px-3 focus-within:border-cyan/70">
              <Search className="size-4 shrink-0 text-ink-subtle" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('board.filter')}
                className="w-40 bg-transparent text-sm outline-none placeholder:text-ink-subtle xl:w-56"
              />
              {filtering && (
                <button
                  aria-label={t('common.close')}
                  onClick={() => {
                    setQuery('');
                    setPrioFilter('');
                  }}
                  className="text-ink-subtle hover:text-cyan"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>
            <Select value={prioFilter} onChange={(e) => setPrioFilter(e.target.value as Priority | '')} className="notch-sm w-auto! text-xs">
              <option value="">{t('board.filterAllPriorities')}</option>
              {(Object.keys(PRIORITY) as Priority[]).map((p) => (
                <option key={p} value={p}>
                  {priorityLabel(p)}
                </option>
              ))}
            </Select>
            {filtering && <span className="font-mono text-xs text-cyan">{t('board.filterMatches', { count: visible.length })}</span>}
          </div>
        </div>

        {/* Sütunlar: mevcut alana tam sığar */}
        <div ref={gridRef} className="grid min-h-0 flex-1 grid-cols-4 gap-4 px-6 pb-6">
          {LANES.map((lane) => {
            const items = visible.filter((x) => x.status === lane.status).sort(sortTasks);
            const total = board.tasks.filter((x) => x.status === lane.status).length;
            return (
              <section key={lane.status} className="glass notch flex min-h-0 min-w-0 flex-col" aria-label={statusLabel(lane.status)}>
                <header className="flex shrink-0 items-center gap-2 px-4 pt-3.5 pb-3">
                  <span className="size-2 rotate-45" style={{ background: lane.color, boxShadow: `0 0 10px ${lane.color}` }} />
                  <h2 className="flex-1 truncate text-[15px] font-bold tracking-[0.14em] uppercase" style={{ color: lane.color }}>
                    {statusLabel(lane.status)}
                  </h2>
                  <span className="font-mono text-xs text-ink-subtle tabular-nums">{filtering ? `${items.length}/${total}` : total}</span>
                </header>
                <div className="mx-4 h-px shrink-0" style={{ background: `linear-gradient(90deg, ${lane.color}, transparent)` }} />
                <div className="board-col-scroll flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3">
                  {items.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      selected={task.id === selectedId}
                      blockedBy={blockersOf(task.id)}
                      onOpen={setSelectedId}
                      onMove={move}
                    />
                  ))}
                  {items.length === 0 && (
                    <div className="grid flex-1 place-items-center border border-dashed border-line px-3 py-8 text-center text-xs text-ink-subtle">
                      {t('board.emptyColumn')}
                    </div>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      </div>

      {selected && !wide && <div className="fixed inset-0 z-30 bg-obsidian-950/60 backdrop-blur-[2px]" onClick={() => setSelectedId(null)} />}
      {selected && (
        <TaskEditor
          overlay={!wide}
          key={selected.id}
          task={selected}
          allTasks={board.tasks}
          dependencies={board.links.filter((l) => l.target === selected.id).map((l) => l.source)}
          onChange={(patch) => patchTask(selected.id, patch, spawned)}
          onMove={(status) => patchTask(selected.id, (cur) => withStatus(cur, status), spawned)}
          onDependencies={(sources) => setDependencies(selected.id, sources)}
          onClose={() => setSelectedId(null)}
          onDelete={() => removeTask(selected.id)}
        />
      )}
    </div>
  );
}

function TaskEditor({
  overlay,
  task,
  allTasks,
  dependencies,
  onChange,
  onMove,
  onDependencies,
  onClose,
  onDelete,
}: {
  overlay: boolean;
  task: Task;
  allTasks: Task[];
  dependencies: string[];
  onChange: (patch: Partial<Task> | ((t: Task) => Task)) => void;
  onMove: (s: Status) => void;
  onDependencies: (sources: string[]) => void;
  onClose: () => void;
  onDelete: () => void;
}) {
  const { t } = useT();
  const [step, setStep] = useState('');
  const running = !!task.timerStartedAt;
  const now = useNow(running ? 1000 : 0);
  const checklist = task.checklist ?? [];

  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  function addStep(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'Enter' || !step.trim()) return;
    onChange({ checklist: [...checklist, { id: crypto.randomUUID(), text: step.trim(), done: false }] });
    setStep('');
  }

  function toggleTimer() {
    onChange((cur) =>
      cur.timerStartedAt
        ? { ...cur, timeSpentMs: (cur.timeSpentMs ?? 0) + (Date.now() - cur.timerStartedAt), timerStartedAt: undefined }
        : { ...cur, timerStartedAt: Date.now() },
    );
  }

  const depCandidates = allTasks.filter((x) => x.id !== task.id && !dependencies.includes(x.id));

  return (
    <aside
      className={`glass-strong flex w-[380px] shrink-0 flex-col border-l border-line-strong ${
        overlay ? 'fixed inset-y-0 right-0 z-40 shadow-[-20px_0_60px_rgb(0_0_0/0.6)]' : ''
      }`}
    >
      <div className="flex shrink-0 items-center justify-between border-b border-line px-5 py-4">
        <div>
          <span className="font-mono text-xs text-cyan">{task.key}</span>
          <div className="hud-label mt-0.5">{statusLabel(task.status)}</div>
        </div>
        <button className="grid size-8 place-items-center text-ink-subtle hover:bg-cyan/10 hover:text-cyan" onClick={onClose} aria-label={t('common.close')}>
          <X className="size-4" />
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 py-4">
        <Field label={t('task.title')}>
          <Input value={task.title} onChange={(e) => onChange({ title: e.target.value })} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('task.status')}>
            <Select value={task.status} onChange={(e) => onMove(e.target.value as Status)}>
              {LANES.map((l) => (
                <option key={l.status} value={l.status}>
                  {statusLabel(l.status)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t('task.priority')}>
            <Select value={task.priority} onChange={(e) => onChange({ priority: e.target.value as Priority })}>
              {(Object.keys(PRIORITY) as Priority[]).map((k) => (
                <option key={k} value={k}>
                  {priorityLabel(k)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t('task.due')}>
            <Input type="date" value={task.dueDate ?? ''} onChange={(e) => onChange({ dueDate: e.target.value || undefined })} />
          </Field>
          <Field label={t('task.assignee')}>
            <Input value={task.assignee ?? ''} onChange={(e) => onChange({ assignee: e.target.value || undefined })} />
          </Field>
        </div>
        <Field label={t('task.recurrence')} hint={task.recurrence ? t('task.recurrenceHint') : undefined}>
          <Select
            value={task.recurrence ?? ''}
            onChange={(e) => onChange({ recurrence: (e.target.value || undefined) as Recurrence | undefined, recurrenceSpawned: false })}
          >
            <option value="">{t('recurrence.none')}</option>
            {RECURRENCES.map((r) => (
              <option key={r} value={r}>
                {recurrenceLabel(r)}
              </option>
            ))}
          </Select>
        </Field>

        <div className="flex flex-col gap-1.5">
          <span className="hud-label">{t('task.time')}</span>
          <div className="notch-sm flex items-center gap-2 border border-line bg-obsidian-950/70 p-1.5">
            <span className={`flex-1 px-2 font-mono text-xl tabular-nums ${running ? 'neon-text' : 'text-ink'}`}>{formatDuration(totalTime(task, now))}</span>
            <Button variant={running ? 'danger' : 'primary'} onClick={toggleTimer}>
              {running ? <Pause className="size-4" /> : <Play className="size-4" />} {running ? t('task.timerStop') : t('task.timerStart')}
            </Button>
            <Button variant="ghost" title={t('task.timerReset')} onClick={() => onChange({ timeSpentMs: 0, timerStartedAt: undefined })}>
              <RotateCcw className="size-4" />
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="hud-label">
            {t('task.checklist')}{' '}
            {checklist.length > 0 && (
              <span className="font-mono text-cyan">
                {checklist.filter((c) => c.done).length}/{checklist.length}
              </span>
            )}
          </span>
          <ul className="flex flex-col gap-0.5">
            {checklist.map((c) => (
              <li key={c.id} className="group flex items-center gap-2 px-1 py-1 hover:bg-cyan/5">
                <input
                  type="checkbox"
                  className="accent-[#00F0FF]"
                  checked={c.done}
                  onChange={() => onChange({ checklist: checklist.map((x) => (x.id === c.id ? { ...x, done: !x.done } : x)) })}
                />
                <span className={`flex-1 text-sm ${c.done ? 'text-ink-subtle line-through' : ''}`}>{c.text}</span>
                <button
                  className="text-ink-subtle opacity-0 group-hover:opacity-100 hover:text-danger focus-visible:opacity-100"
                  aria-label={t('common.delete')}
                  onClick={() => onChange({ checklist: checklist.filter((x) => x.id !== c.id) })}
                >
                  <X className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>
          <Input placeholder={t('task.checklistAdd')} value={step} onChange={(e) => setStep(e.target.value)} onKeyDown={addStep} />
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="hud-label">{t('board.dependsOn')}</span>
          {dependencies.map((id) => {
            const dep = allTasks.find((x) => x.id === id);
            if (!dep) return null;
            return (
              <div key={id} className="flex items-center gap-2 border border-line px-2 py-1.5 text-sm">
                <Link2 className={`size-3.5 ${dep.status === 'done' ? 'text-success' : 'text-magenta'}`} />
                <span className="font-mono text-xs text-ink-subtle">{dep.key}</span>
                <span className={`flex-1 truncate ${dep.status === 'done' ? 'text-ink-subtle line-through' : ''}`}>{dep.title}</span>
                <button
                  className="text-ink-subtle hover:text-danger"
                  aria-label={t('common.delete')}
                  onClick={() => onDependencies(dependencies.filter((d) => d !== id))}
                >
                  <X className="size-3.5" />
                </button>
              </div>
            );
          })}
          {depCandidates.length > 0 && (
            <Select value="" onChange={(e) => e.target.value && onDependencies([...dependencies, e.target.value])}>
              <option value="">{t('board.addDependency')}</option>
              {depCandidates.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.key} · {x.title}
                </option>
              ))}
            </Select>
          )}
        </div>

        <Field label={t('task.description')} hint={t('task.descriptionHint')}>
          <Textarea rows={4} value={task.description ?? ''} onChange={(e) => onChange({ description: e.target.value || undefined })} />
        </Field>
        <Field label={t('task.outcome')} hint={t('task.outcomeHint')}>
          <Textarea rows={3} value={task.outcome ?? ''} onChange={(e) => onChange({ outcome: e.target.value || undefined })} />
        </Field>
      </div>

      <div className="shrink-0 border-t border-line px-5 py-4">
        <Button variant="danger" className="w-full" onClick={onDelete}>
          <Trash2 className="size-4" /> {t('task.delete')}
        </Button>
      </div>
    </aside>
  );
}
