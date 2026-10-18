import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react';
import {
  Background,
  BackgroundVariant,
  Controls,
  MarkerType,
  MiniMap,
  Panel as FlowPanel,
  ReactFlow,
  ReactFlowProvider,
  addEdge,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Connection,
  type Edge,
  type OnNodeDrag,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { FileDown, FileImage, FileType2, Maximize2, Pause, Play, Plus, RotateCcw, Trash2, X } from 'lucide-react';
import { Button, Field, Input, Select, Textarea } from '../../components/ui';
import { useT } from '../../i18n';
import { errorMessage, toast } from '../../lib/toast';
import { useNow } from '../../lib/useNow';
import { addTask, getBoard, saveBoard, useBoard } from './boardStore';
import { exportBoard, type ExportFormat } from './exportBoard';
import { nodeTypes, type CardNodeType, type LaneNodeType } from './nodes';
import {
  CARD_INSET,
  CARD_WIDTH,
  LANES,
  LANE_HEADER,
  PRIORITY,
  formatDuration,
  laneIndexForX,
  laneX,
  priorityLabel,
  statusLabel,
  totalTime,
  type BoardData,
  type Link,
  type Priority,
  type Status,
  type Task,
} from './types';

type AnyNode = CardNodeType | LaneNodeType;

const edgeDefaults = {
  type: 'smoothstep',
  animated: true,
  markerEnd: { type: MarkerType.ArrowClosed, color: '#579DFF' },
} satisfies Partial<Edge>;

const laneNodes: LaneNodeType[] = LANES.map((l, i) => ({
  id: `lane-${l.status}`,
  type: 'lane',
  position: { x: laneX(i), y: 0 },
  data: { status: l.status },
  draggable: false,
  selectable: false,
  connectable: false,
  focusable: false,
  zIndex: 0,
}));

function toNodes(data: BoardData): AnyNode[] {
  return [
    ...laneNodes,
    ...data.tasks.map<CardNodeType>((t) => ({ id: t.id, type: 'card', position: { x: t.x, y: t.y }, data: { task: t }, zIndex: 1 })),
  ];
}

function toEdges(links: Link[]): Edge[] {
  return links.map((l) => ({ ...edgeDefaults, ...l }));
}

function serialize(nodes: AnyNode[], edges: Edge[], seq: number): BoardData {
  return {
    seq,
    tasks: nodes
      .filter((n): n is CardNodeType => n.type === 'card')
      .map((n) => ({ ...n.data.task, x: Math.round(n.position.x), y: Math.round(n.position.y) })),
    links: edges.map((e) => ({ id: e.id, source: e.source, target: e.target })),
  };
}

const today = () => new Date().toISOString().slice(0, 10);

function withStatus(task: Task, status: Status): Task {
  return { ...task, status, completedAt: status === 'done' ? (task.completedAt ?? today()) : undefined };
}

function BoardCanvas({ focusTaskId, onEditingChange }: { focusTaskId?: string | null; onEditingChange?: (editing: boolean) => void }) {
  const { t } = useT();
  const external = useBoard();
  const [nodes, setNodes, onNodesChange] = useNodesState<AnyNode>(toNodes(getBoard()));
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(toEdges(getBoard().links));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const lastSaved = useRef<BoardData>(getBoard());
  const { fitView, setCenter } = useReactFlow();

  // Kendi kaydımız dışındaki değişiklikler (Hızlı Görev penceresi, içe aktarma, palet) panoya yansır.
  useEffect(() => {
    if (external === lastSaved.current) return;
    lastSaved.current = external;
    setNodes(toNodes(external));
    setEdges(toEdges(external.links));
  }, [external, setNodes, setEdges]);

  useEffect(() => {
    const timer = setTimeout(() => {
      saveBoard(serialize(nodes, edges, getBoard().seq));
      lastSaved.current = getBoard();
    }, 250);
    return () => clearTimeout(timer);
  }, [nodes, edges]);

  // Komut paletinden gelen "görevi aç" isteği.
  useEffect(() => {
    if (!focusTaskId) return;
    const task = getBoard().tasks.find((x) => x.id === focusTaskId);
    if (!task) return;
    setSelectedId(task.id);
    setCenter(task.x + CARD_WIDTH / 2, task.y + 60, { zoom: 1.1, duration: 400 });
  }, [focusTaskId, setCenter]);

  const updateTask = useCallback(
    (id: string, patch: Partial<Task> | ((t: Task) => Task)) =>
      setNodes((ns) =>
        ns.map((n) => {
          if (n.id !== id || n.type !== 'card') return n;
          const next = typeof patch === 'function' ? patch(n.data.task) : { ...n.data.task, ...patch };
          return { ...n, data: { task: next } };
        }),
      ),
    [setNodes],
  );

  const onNodeDragStop: OnNodeDrag<AnyNode> = useCallback(
    (_e, node) => {
      if (node.type !== 'card') return;
      const laneIndex = laneIndexForX(node.position.x);
      const lane = LANES[laneIndex];
      const prev = node.data.task.status;
      setNodes((ns) =>
        ns.map((n) =>
          n.id !== node.id || n.type !== 'card'
            ? n
            : {
                ...n,
                position: { x: laneX(laneIndex) + CARD_INSET, y: Math.max(node.position.y, LANE_HEADER + 8) },
                data: { task: withStatus(n.data.task, lane.status) },
              },
        ),
      );
      if (prev !== lane.status) toast(t('board.moved', { key: node.data.task.key, lane: statusLabel(lane.status) }));
    },
    [setNodes, t],
  );

  const onConnect = useCallback(
    (c: Connection) => setEdges((eds) => addEdge({ ...c, ...edgeDefaults, id: crypto.randomUUID() }, eds)),
    [setEdges],
  );

  function createCard() {
    const task = addTask({ title: t('board.newTaskTitle'), assignee: 'Dağcan' });
    setSelectedId(task.id);
  }

  async function runExport(format: ExportFormat) {
    try {
      const hasCards = nodes.some((n) => n.type === 'card');
      const path = await exportBoard(hasCards ? nodes : laneNodes, format);
      toast(t('board.exported', { path }));
    } catch (e) {
      toast(errorMessage(e), 'error');
    }
  }

  const selected = nodes.find((n): n is CardNodeType => n.id === selectedId && n.type === 'card');
  const editing = !!selected;
  useEffect(() => onEditingChange?.(editing), [editing, onEditingChange]);

  return (
    <div className="flex h-full min-h-0">
      <div className="relative min-w-0 flex-1">
        <ReactFlow<AnyNode, Edge>
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeDragStop={onNodeDragStop}
          onNodeClick={(_e, n) => n.type === 'card' && setSelectedId(n.id)}
          onPaneClick={() => setSelectedId(null)}
          colorMode="dark"
          fitView
          fitViewOptions={{ padding: 0.12 }}
          minZoom={0.3}
          maxZoom={1.75}
          deleteKeyCode={['Backspace', 'Delete']}
        >
          <Background variant={BackgroundVariant.Dots} gap={22} size={1.2} color="rgb(255 255 255 / 0.07)" />
          <Controls showInteractive={false} position="bottom-left" />
          <MiniMap pannable zoomable position="bottom-right" nodeColor={(n) => (n.type === 'lane' ? 'rgb(9 30 66 / 0.6)' : '#579DFF')} />
          <FlowPanel position="top-left">
            <div className="glass flex items-center gap-1 rounded-xl p-1">
              <Button variant="primary" onClick={createCard}>
                <Plus className="size-4" /> {t('board.newCard')}
              </Button>
              <span className="mx-1 h-5 w-px bg-line-strong" />
              <Button variant="ghost" onClick={() => runExport('png')} title={t('board.exportPng')}>
                <FileImage className="size-4" /> PNG
              </Button>
              <Button variant="ghost" onClick={() => runExport('svg')} title={t('board.exportSvg')}>
                <FileType2 className="size-4" /> SVG
              </Button>
              <Button variant="ghost" onClick={() => runExport('pdf')} title={t('board.exportPdf')}>
                <FileDown className="size-4" /> PDF
              </Button>
              <span className="mx-1 h-5 w-px bg-line-strong" />
              <Button variant="ghost" onClick={() => fitView({ padding: 0.12, duration: 300 })} title={t('board.fit')}>
                <Maximize2 className="size-4" />
              </Button>
            </div>
          </FlowPanel>
        </ReactFlow>
      </div>
      {selected && (
        <TaskEditor
          key={selected.id}
          task={selected.data.task}
          onChange={(patch) => updateTask(selected.id, patch)}
          onClose={() => setSelectedId(null)}
          onDelete={() => {
            setNodes((ns) => ns.filter((n) => n.id !== selected.id));
            setEdges((es) => es.filter((e) => e.source !== selected.id && e.target !== selected.id));
            setSelectedId(null);
          }}
          onMove={(status) => {
            const i = LANES.findIndex((l) => l.status === status);
            setNodes((ns) =>
              ns.map((n) =>
                n.id === selected.id && n.type === 'card'
                  ? { ...n, position: { x: laneX(i) + CARD_INSET, y: n.position.y }, data: { task: withStatus(n.data.task, status) } }
                  : n,
              ),
            );
          }}
        />
      )}
    </div>
  );
}

function TaskEditor({
  task,
  onChange,
  onClose,
  onDelete,
  onMove,
}: {
  task: Task;
  onChange: (patch: Partial<Task> | ((t: Task) => Task)) => void;
  onClose: () => void;
  onDelete: () => void;
  onMove: (s: Status) => void;
}) {
  const { t } = useT();
  const [step, setStep] = useState('');
  const running = !!task.timerStartedAt;
  const now = useNow(running ? 1000 : 0);
  const checklist = task.checklist ?? [];

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

  return (
    <aside className="glass-strong flex w-[360px] shrink-0 flex-col gap-4 overflow-auto border-l border-line p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold tracking-wide text-ink-muted">{task.key}</span>
        <button className="grid size-7 place-items-center rounded-md text-ink-subtle hover:bg-white/10" onClick={onClose} aria-label={t('common.close')}>
          <X className="size-4" />
        </button>
      </div>
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

      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold tracking-wide text-ink-muted uppercase">{t('task.time')}</span>
        <div className="flex items-center gap-2 rounded-lg border border-line bg-obsidian-800/80 p-1.5">
          <span className={`flex-1 px-2 font-mono text-lg tabular-nums ${running ? 'text-cyan' : 'text-ink'}`}>{formatDuration(totalTime(task, now))}</span>
          <Button variant={running ? 'danger' : 'primary'} onClick={toggleTimer}>
            {running ? <Pause className="size-4" /> : <Play className="size-4" />} {running ? t('task.timerStop') : t('task.timerStart')}
          </Button>
          <Button variant="ghost" title={t('task.timerReset')} onClick={() => onChange({ timeSpentMs: 0, timerStartedAt: undefined })}>
            <RotateCcw className="size-4" />
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold tracking-wide text-ink-muted uppercase">
          {t('task.checklist')} {checklist.length > 0 && `(${checklist.filter((c) => c.done).length}/${checklist.length})`}
        </span>
        <ul className="flex flex-col gap-1">
          {checklist.map((c) => (
            <li key={c.id} className="group flex items-center gap-2 rounded-md px-1 py-0.5 hover:bg-white/5">
              <input
                type="checkbox"
                checked={c.done}
                onChange={() => onChange({ checklist: checklist.map((x) => (x.id === c.id ? { ...x, done: !x.done } : x)) })}
              />
              <span className={`flex-1 text-sm ${c.done ? 'text-ink-subtle line-through' : ''}`}>{c.text}</span>
              <button
                className="text-ink-subtle opacity-0 group-hover:opacity-100 hover:text-danger"
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

      <Field label={t('task.description')} hint={t('task.descriptionHint')}>
        <Textarea rows={4} value={task.description ?? ''} onChange={(e) => onChange({ description: e.target.value || undefined })} />
      </Field>
      <Field label={t('task.outcome')} hint={t('task.outcomeHint')}>
        <Textarea rows={3} value={task.outcome ?? ''} onChange={(e) => onChange({ outcome: e.target.value || undefined })} />
      </Field>
      <Button variant="danger" className="mt-auto" onClick={onDelete}>
        <Trash2 className="size-4" /> {t('task.delete')}
      </Button>
    </aside>
  );
}

export function Board({ focusTaskId, onEditingChange }: { focusTaskId?: string | null; onEditingChange?: (editing: boolean) => void }) {
  return (
    <ReactFlowProvider>
      <BoardCanvas focusTaskId={focusTaskId} onEditingChange={onEditingChange} />
    </ReactFlowProvider>
  );
}
