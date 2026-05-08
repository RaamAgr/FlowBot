import { create } from 'zustand';
import {
  Connection,
  Edge,
  EdgeChange,
  Node,
  NodeChange,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
} from '@xyflow/react';
import { v4 as uuidv4 } from 'uuid';
import { NodeType, FlowNodeData } from './types';

interface FlowState {
  nodes: Node<FlowNodeData>[];
  edges: Edge[];
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  setNodes: (nodes: Node<FlowNodeData>[]) => void;
  setEdges: (edges: Edge[]) => void;
  addNode: (type: NodeType, position: { x: number; y: number }) => void;
  updateNodeData: (nodeId: string, data: Partial<FlowNodeData>) => void;
  deleteNode: (nodeId: string) => void;

  // Undo / Redo
  past: { nodes: Node<FlowNodeData>[]; edges: Edge[] }[];
  future: { nodes: Node<FlowNodeData>[]; edges: Edge[] }[];
  saveToHistory: () => void;
  undo: () => void;
  redo: () => void;

  // Simulation
  isSimulating: boolean;
  activeNodeId: string | null;
  startSimulation: () => void;
  stopSimulation: () => void;
}

const initialNodes: Node<FlowNodeData>[] = [
  {
    id: 'start-node',
    type: 'custom',
    position: { x: 320, y: 60 },
    style: { width: 240, height: 150 },
    data: {
      label: 'Call Start',
      type: NodeType.START,
      metadata: {},
    },
  },
  {
    id: 'greet-node',
    type: 'custom',
    position: { x: 320, y: 260 },
    style: { width: 240, height: 150 },
    data: {
      label: 'Greeting',
      type: NodeType.SPEAK,
      script: {
        text: 'Hello! Thank you for calling. How can I help you today?',
        language: 'en',
      },
      metadata: {},
    },
  },
  {
    id: 'listen-node',
    type: 'custom',
    position: { x: 320, y: 460 },
    style: { width: 240, height: 150 },
    data: {
      label: 'Get Intent',
      type: NodeType.LISTEN,
      inputMethod: 'speech' as any,
      maxWait: 5,
      maxRetries: 2,
      storeAs: 'user_intent',
      metadata: {},
    },
  },
];

const initialEdges: Edge[] = [
  { id: 'e1', source: 'start-node', target: 'greet-node', animated: false },
  { id: 'e2', source: 'greet-node', target: 'listen-node', animated: false },
];

const defaultNodeData = (type: NodeType): Partial<FlowNodeData> => {
  switch (type) {
    case NodeType.SPEAK:
      return { script: { text: '', language: 'en' } };
    case NodeType.LISTEN:
      return { inputMethod: 'speech' as any, maxWait: 5, maxRetries: 2, storeAs: '' };
    case NodeType.BRANCH:
      return { routes: [{ id: uuidv4(), label: 'Yes', condition: 'intent' as any, value: 'yes' }, { id: uuidv4(), label: 'Else', condition: 'else' as any, value: '' }] };
    case NodeType.API_CALL:
      return { endpoint: '', method: 'GET', storeResponseAs: '' };
    case NodeType.TRANSFER:
      return { transferType: 'queue', destination: '' };
    case NodeType.VOICEMAIL:
      return { greeting: '', maxDuration: 60 };
    case NodeType.HANGUP:
      return { goodbye: 'Thank you for calling. Goodbye!' };
    default:
      return {};
  }
};

export const useFlowStore = create<FlowState>((set, get) => ({
  nodes: initialNodes,
  edges: initialEdges,
  onNodesChange: (changes) => set({ nodes: applyNodeChanges(changes, get().nodes) }),
  onEdgesChange: (changes) => set({ edges: applyEdgeChanges(changes, get().edges) }),
  onConnect: (connection) => {
    get().saveToHistory();
    set({
      edges: addEdge({ ...connection, id: uuidv4() }, get().edges),
    });
  },
  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),
  addNode: (type, position) => {
    const labels: Record<NodeType, string> = {
      [NodeType.START]: 'Call Start',
      [NodeType.SPEAK]: 'Speak',
      [NodeType.LISTEN]: 'Listen',
      [NodeType.BRANCH]: 'Branch',
      [NodeType.API_CALL]: 'API Call',
      [NodeType.TRANSFER]: 'Transfer',
      [NodeType.VOICEMAIL]: 'Voicemail',
      [NodeType.HANGUP]: 'Hang Up',
    };
    const newNode: Node<FlowNodeData> = {
      id: uuidv4(),
      type: 'custom',
      position,
      style: { width: 240, height: 150 },
      data: {
        label: labels[type] || type,
        type,
        metadata: {},
        ...defaultNodeData(type),
      },
    };
    get().saveToHistory();
    set({ nodes: [...get().nodes, newNode] });
  },
  updateNodeData: (nodeId, data) => {
    set({
      nodes: get().nodes.map((node) =>
        node.id === nodeId ? { ...node, data: { ...node.data, ...data } } : node
      ),
    });
  },
  deleteNode: (nodeId) => {
    get().saveToHistory();
    set({
      nodes: get().nodes.filter((node) => node.id !== nodeId),
      edges: get().edges.filter((edge) => edge.source !== nodeId && edge.target !== nodeId),
      activeNodeId: get().activeNodeId === nodeId ? null : get().activeNodeId,
    });
  },

  past: [],
  future: [],
  saveToHistory: () => {
    const { nodes, edges, past } = get();
    set({ past: [...past, { nodes, edges }].slice(-50), future: [] });
  },
  undo: () => {
    const { past, future, nodes, edges } = get();
    if (past.length === 0) return;
    const previous = past[past.length - 1];
    set({
      nodes: previous.nodes,
      edges: previous.edges,
      past: past.slice(0, -1),
      future: [{ nodes, edges }, ...future]
    });
  },
  redo: () => {
    const { past, future, nodes, edges } = get();
    if (future.length === 0) return;
    const next = future[0];
    set({
      nodes: next.nodes,
      edges: next.edges,
      past: [...past, { nodes, edges }],
      future: future.slice(1)
    });
  },

  isSimulating: false,
  activeNodeId: null,
  startSimulation: () => {
    const startNode = get().nodes.find((n) => n.data.type === NodeType.START);
    set({ isSimulating: true, activeNodeId: startNode?.id || null });
  },
  stopSimulation: () => set({ isSimulating: false, activeNodeId: null }),
}));
