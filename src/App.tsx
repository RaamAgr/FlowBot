import { useState, useCallback, useRef, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  Node,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useFlowStore } from './store';
import { NodeType, FlowNodeData } from './types';
import { CustomNode } from './components/CustomNode';
import { Sidebar } from './components/Sidebar';
import { Inspector } from './components/Inspector';
import { ToastContainer, showToast } from './components/Toast';
import { ExportModal } from './components/ExportModal';
import { generateExportContent, ExportResult, ExportFormat } from './lib/exportUtils';

const nodeTypes = { custom: CustomNode };

interface CtxMenu {
  x: number;
  y: number;
  flowPos: { x: number; y: number };
  nodeId?: string;
}

const exportFormats = [
  { fmt: 'json' as const, icon: '{ }', label: 'JSON', desc: 'Machine readable' },
  { fmt: 'md' as const, icon: '#', label: 'Markdown', desc: 'Clean documentation' },
  { fmt: 'txt' as const, icon: 'TXT', label: 'Plain text', desc: 'Quick handoff' },
];

const contextNodes = [
  { type: NodeType.SPEAK, icon: 'SPK', label: 'Speak' },
  { type: NodeType.LISTEN, icon: 'LIS', label: 'Listen' },
  { type: NodeType.BRANCH, icon: 'BRN', label: 'Branch' },
  { type: NodeType.API_CALL, icon: 'API', label: 'API Call' },
  { type: NodeType.TRANSFER, icon: 'TRN', label: 'Transfer' },
  { type: NodeType.VOICEMAIL, icon: 'VM', label: 'Voicemail' },
  { type: NodeType.HANGUP, icon: 'END', label: 'Hang Up' },
];

export default function App() {
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    addNode,
    isSimulating,
    activeNodeId,
    startSimulation,
    stopSimulation,
    undo,
    redo,
    saveToHistory,
  } = useFlowStore();

  const [selectedNode, setSelectedNode] = useState<Node<FlowNodeData> | null>(null);
  const [flowName, setFlowName] = useState('Customer Qualification Flow');
  const [ctxMenu, setCtxMenu] = useState<CtxMenu | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportPreview, setExportPreview] = useState<ExportResult | null>(null);
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const savedTheme = localStorage.getItem('flowbot-theme');
    if (savedTheme === 'light' || savedTheme === 'dark') return savedTheme;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });
  const reactFlowInstance = useRef<ReturnType<typeof useReactFlow> | null>(null);
  const flowRef = useRef<HTMLDivElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!selectedNode) return;
    const updated = nodes.find((node) => node.id === selectedNode.id);
    if (updated) setSelectedNode(updated as Node<FlowNodeData>);
  }, [nodes, selectedNode]);

  useEffect(() => {
    const clickHandler = (e: MouseEvent) => {
      if (ctxMenu) setCtxMenu(null);
      if (exportOpen && exportRef.current && !exportRef.current.contains(e.target as HTMLElement)) {
        setExportOpen(false);
      }
    };

    const keyHandler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        if (e.shiftKey) redo();
        else undo();
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'y') {
        redo();
      }
    };

    document.addEventListener('click', clickHandler);
    document.addEventListener('keydown', keyHandler);
    return () => {
      document.removeEventListener('click', clickHandler);
      document.removeEventListener('keydown', keyHandler);
    };
  }, [ctxMenu, exportOpen, undo, redo]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('flowbot-theme', theme);
  }, [theme]);

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode(node as Node<FlowNodeData>);
    setCtxMenu(null);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
    setCtxMenu(null);
  }, []);

  const onContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const bounds = flowRef.current?.getBoundingClientRect();
    if (!bounds) return;

    const flowPos =
      reactFlowInstance.current?.screenToFlowPosition({ x: e.clientX, y: e.clientY }) ?? { x: 0, y: 0 };
    setCtxMenu({ x: e.clientX, y: e.clientY, flowPos });
  }, []);

  const addNodeAtPos = useCallback(
    (type: NodeType, pos?: { x: number; y: number }) => {
      const position = pos ?? { x: 320, y: 220 };
      addNode(type, position);
      setCtxMenu(null);
      showToast(`${type.replace('_', ' ')} node added`, 'success');
    },
    [addNode],
  );

  const handleExport = (format: ExportFormat) => {
    const result = generateExportContent(nodes, edges, format);
    setExportPreview(result);
    setExportOpen(false);
    showToast(`${format.toUpperCase()} preview ready`, 'success');
  };

  const handleSimToggle = () => {
    if (isSimulating) {
      stopSimulation();
      showToast('Simulation stopped', 'info');
      return;
    }

    startSimulation();
    showToast('Simulation started', 'success');
  };

  const handleClear = () => {
    if (nodes.length <= 1) return;
    if (window.confirm('Clear all nodes except Start? This cannot be undone.')) {
      useFlowStore.setState((state) => ({
        nodes: state.nodes.filter((node) => node.data.type === NodeType.START),
        edges: [],
      }));
      setSelectedNode(null);
      showToast('Canvas cleared', 'info');
    }
  };

  const handleSave = () => {
    const flow = { name: flowName, nodes, edges, savedAt: new Date().toISOString() };
    localStorage.setItem('flowbot-autosave', JSON.stringify(flow));
    showToast('Flow saved to local storage', 'success');
  };

  const handleLoad = () => {
    const saved = localStorage.getItem('flowbot-autosave');
    if (!saved) {
      showToast('No saved flow found', 'error');
      return;
    }

    try {
      const flow = JSON.parse(saved);
      useFlowStore.setState({ nodes: flow.nodes || [], edges: flow.edges || [] });
      setFlowName(flow.name || 'Untitled Flow');
      setSelectedNode(null);
      showToast('Flow loaded', 'success');
    } catch {
      showToast('Could not load saved flow', 'error');
    }
  };

  const activeNodeLabel = nodes.find((node) => node.id === activeNodeId)?.data.label;

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <div className="brand-mark">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M12 8v8M8 12h8" />
            </svg>
          </div>
          <div className="brand-title">FlowBot</div>
        </div>

        <div className="topbar-flow">
          <input
            className="topbar-flow-name"
            value={flowName}
            onChange={(e) => setFlowName(e.target.value)}
            title="Rename flow"
          />
        </div>

        <div className="topbar-actions">
          <button className="topbar-btn" onClick={() => setLeftPanelOpen((open) => !open)} title="Toggle Library">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 3h7v18H3zM14 3h7v18h-7z" />
            </svg>
          </button>
          <button className="topbar-btn" onClick={() => setRightPanelOpen((open) => !open)} title="Toggle Inspector">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 3h18v18H3z" />
              <path d="M15 3v18" />
            </svg>
          </button>
          <div className="border-v" />
          <button className="topbar-btn" onClick={() => setTheme((current) => (current === 'light' ? 'dark' : 'light'))}>
            {theme === 'light' ? 'Dark' : 'Light'}
          </button>
          <button className="topbar-btn" onClick={handleLoad}>
            Load
          </button>
          <button className="topbar-btn" onClick={handleSave}>
            Save
          </button>
          <div ref={exportRef} className="menu-anchor">
            <button className="topbar-btn" onClick={(e) => { e.stopPropagation(); setExportOpen((open) => !open); }}>
              Export
            </button>
            {exportOpen && (
              <div className="menu-panel">
                {exportFormats.map(({ fmt, icon, label, desc }) => (
                  <button
                    key={fmt}
                    className="menu-item"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleExport(fmt);
                    }}
                  >
                    <span className="menu-icon">{icon}</span>
                    <span>
                      <strong>{label}</strong>
                      <small>{desc}</small>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <button className={`topbar-btn ${isSimulating ? 'danger' : 'primary'}`} onClick={handleSimToggle}>
            {isSimulating ? 'Stop' : 'Run'}
          </button>
        </div>
      </header>

      <div className="main-container">
        <aside className="sidebar" style={{ width: leftPanelOpen ? 220 : 0, borderRight: leftPanelOpen ? '' : 'none', padding: leftPanelOpen ? '' : 0 }}>
          <Sidebar
            onAddNode={(type) => addNodeAtPos(type, { x: 180 + Math.random() * 280, y: 120 + Math.random() * 260 })}
            nodeCount={nodes.length}
            edgeCount={edges.length}
          />
        </aside>

        <div className="canvas-area" ref={flowRef}>
          <div className="canvas-stage">
            <ReactFlowWrapper
              theme={theme}
              onInit={(instance: any) => {
                reactFlowInstance.current = instance;
              }}
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodesDelete={() => saveToHistory()}
              onEdgesDelete={() => saveToHistory()}
              onNodeDragStart={() => saveToHistory()}
              onNodeClick={onNodeClick}
              onPaneClick={onPaneClick}
              onContextMenu={onContextMenu}
              nodeTypes={nodeTypes}
              selectedNodeId={selectedNode?.id}
            />
          </div>

          {isSimulating && (
            <div className="sim-bar">
              <div className="sim-status">
                <div className="sim-indicator" />
                <span>{activeNodeLabel || 'Simulating...'}</span>
              </div>
              <button className="topbar-btn danger" onClick={handleSimToggle}>
                Stop
              </button>
            </div>
          )}

          {ctxMenu && (
            <div className="ctx-menu" style={{ left: ctxMenu.x, top: ctxMenu.y }}>
              <div className="ctx-menu-label">Add Node</div>
              {contextNodes.map(({ type, icon, label }) => (
                <button key={type} className="ctx-item" onClick={() => addNodeAtPos(type, ctxMenu.flowPos)}>
                  <span className="ctx-icon">{icon}</span>
                  <span>{label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <aside className="inspector" style={{ width: rightPanelOpen ? 300 : 0, borderLeft: rightPanelOpen ? '' : 'none' }}>
          <Inspector selectedNode={selectedNode} />
        </aside>
      </div>

      <ToastContainer />
      <ExportModal result={exportPreview} onClose={() => setExportPreview(null)} />
    </div>
  );
}

function ReactFlowWrapper({
  theme,
  onInit,
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onNodesDelete,
  onEdgesDelete,
  onNodeDragStart,
  onNodeClick,
  onPaneClick,
  onContextMenu,
  nodeTypes,
  selectedNodeId,
}: any) {
  const { screenToFlowPosition } = useReactFlow();

  useEffect(() => {
    if (onInit) onInit({ screenToFlowPosition });
  }, [onInit, screenToFlowPosition]);

  return (
    <ReactFlow
      nodes={nodes.map((node: any) => ({ ...node, selected: node.id === selectedNodeId }))}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      onNodesDelete={onNodesDelete}
      onEdgesDelete={onEdgesDelete}
      onNodeDragStart={onNodeDragStart}
      onNodeClick={onNodeClick}
      onPaneClick={onPaneClick}
      onContextMenu={onContextMenu}
      nodeTypes={nodeTypes}
      fitView
      fitViewOptions={{ padding: 0.24 }}
      deleteKeyCode={['Delete', 'Backspace']}
      multiSelectionKeyCode="Shift"
      proOptions={{ hideAttribution: true }}
    >
      <Background
        variant={BackgroundVariant.Dots}
        gap={28}
        size={1.1}
        color={theme === 'dark' ? '#161616' : '#f2f2f3'}
      />
      <Controls showInteractive={false} />
      <MiniMap
        nodeColor={(node) => {
          const colors: Record<string, string> = {
            start: '#30a46c',
            speak: '#5e6ad2',
            listen: '#f1a817',
            branch: '#e5484d',
            api_call: '#30a46c',
            transfer: '#707070',
            voicemail: '#5e6ad2',
            hangup: '#111111',
          };
          return colors[(node.data as FlowNodeData)?.type] ?? '#334155';
        }}
        maskColor={theme === 'dark' ? 'rgba(10, 15, 26, 0.68)' : 'rgba(239, 242, 246, 0.72)'}
        style={{ borderRadius: 16 }}
      />
    </ReactFlow>
  );
}
