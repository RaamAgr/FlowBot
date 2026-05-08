import { NodeType } from '../types';

interface NodePaletteProps {
  onAddNode: (type: NodeType) => void;
  nodeCount: number;
  edgeCount: number;
}

const nodeTypes = [
  { type: NodeType.SPEAK, label: 'Speak', tone: 'Bot says something', code: 'SPK' },
  { type: NodeType.LISTEN, label: 'Listen', tone: 'Wait for caller response', code: 'LIS' },
  { type: NodeType.BRANCH, label: 'Branch', tone: 'Route based on response/condition', code: 'BRN' },
  { type: NodeType.API_CALL, label: 'API Call', tone: 'Fetch data (CRM, backend)', code: 'API' },
  { type: NodeType.TRANSFER, label: 'Transfer', tone: 'Transfer to agent/queue', code: 'TRN' },
  { type: NodeType.VOICEMAIL, label: 'Voicemail', tone: 'Leave or record a message', code: 'VM' },
  { type: NodeType.HANGUP, label: 'Hang Up', tone: 'End the call', code: 'END' },
];

export function Sidebar({ onAddNode, nodeCount, edgeCount }: NodePaletteProps) {
  return (
    <div className="sidebar-inner">
      <div className="sidebar-section sidebar-grow">
        <div className="section-title-row">
          <span className="eyebrow-label">Components</span>
        </div>
        <div className="node-palette">
          {nodeTypes.map(({ type, label, tone, code }) => (
            <button key={type} className="palette-item" onClick={() => onAddNode(type)} title={tone}>
              <span className="palette-code">{code}</span>
              <span className="palette-text">
                <strong>{label}</strong>
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="sidebar-section">
        <div className="sidebar-metrics">
          <div className="metric-card">
            <span className="metric-value">{nodeCount}</span>
            <span className="metric-label">Nodes</span>
          </div>
          <div className="metric-card">
            <span className="metric-value">{edgeCount}</span>
            <span className="metric-label">Edges</span>
          </div>
        </div>
      </div>
    </div>
  );
}
