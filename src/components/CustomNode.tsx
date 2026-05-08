import { memo, useState, useEffect, useRef, type CSSProperties } from 'react';
import { Handle, Position, NodeProps, NodeResizer } from '@xyflow/react';
import { FlowNodeData, NodeType } from '../types';
import { useFlowStore } from '../store';

const nodeConfig: Record<NodeType, { color: string; code: string; label: string }> = {
  [NodeType.START]: { color: '#22c55e', code: 'ST', label: 'Start' },
  [NodeType.SPEAK]: { color: '#3b82f6', code: 'SPK', label: 'Speak' },
  [NodeType.LISTEN]: { color: '#a855f7', code: 'LIS', label: 'Listen' },
  [NodeType.BRANCH]: { color: '#f59e0b', code: 'BRN', label: 'Branch' },
  [NodeType.API_CALL]: { color: '#14b8a6', code: 'API', label: 'API Call' },
  [NodeType.TRANSFER]: { color: '#f43f5e', code: 'TRN', label: 'Transfer' },
  [NodeType.VOICEMAIL]: { color: '#ec4899', code: 'VM', label: 'Voicemail' },
  [NodeType.HANGUP]: { color: '#64748b', code: 'END', label: 'Hang Up' },
};

export const CustomNode = memo(({ id, data, selected }: NodeProps) => {
  const nodeData = data as FlowNodeData;
  const { activeNodeId } = useFlowStore();
  const cfg = nodeConfig[nodeData.type] ?? nodeConfig[NodeType.SPEAK];
  const isSimActive = activeNodeId === id;
  const isEnd = nodeData.type === NodeType.HANGUP;
  const isStart = nodeData.type === NodeType.START;
  
  const [isResizing, setIsResizing] = useState(false);
  const [width, setWidth] = useState(240);
  const nodeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!selected) {
      setIsResizing(false);
    }
  }, [selected]);

  useEffect(() => {
    if (!nodeRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        setWidth(entry.contentRect.width);
      }
    });
    observer.observe(nodeRef.current);
    return () => observer.disconnect();
  }, []);

  const isSmall = width < 220;
  const isTiny = width < 180;
  
  const scale = width < 240 ? width / 240 : 1;

  const renderContent = () => {
    switch (nodeData.type) {
      case NodeType.SPEAK:
        return nodeData.script?.text ? (
          <div className="node-script">{nodeData.script.text}</div>
        ) : (
          <div className="node-script node-script-empty">No script added.</div>
        );
      case NodeType.LISTEN:
        return (
          <div className="node-details">
            <div className="node-detail">Input: {nodeData.inputMethod || 'speech'}</div>
            {nodeData.storeAs && <div className="node-detail">Store as: {nodeData.storeAs}</div>}
          </div>
        );
      case NodeType.BRANCH:
        return (
          <div className="node-tags" style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'stretch' }}>
            {(nodeData.routes || []).map((route) => (
              <div key={route.id} className="node-route" style={{ position: 'relative', background: 'var(--bg-panel)', border: '1px solid var(--border)', padding: '0.375em 0.5em', borderRadius: '0.25em', fontSize: '0.75em', display: 'flex', justifyContent: 'space-between', zIndex: 10 }}>
                <Handle type="source" position={Position.Left} id={`${route.id}-left`} style={{ left: '-13px', top: '50%', background: cfg.color, border: '2px solid var(--bg-panel)', width: '10px', height: '10px', zIndex: 20 }} />
                <span>{route.label}</span>
                <span style={{ color: 'var(--text-secondary)' }}>{route.condition === 'else' ? 'Else' : route.value}</span>
                <Handle type="source" position={Position.Right} id={`${route.id}-right`} style={{ right: '-13px', top: '50%', background: cfg.color, border: '2px solid var(--bg-panel)', width: '10px', height: '10px', zIndex: 20 }} />
              </div>
            ))}
          </div>
        );
      case NodeType.API_CALL:
        return (
          <div className="node-details">
            {nodeData.endpoint ? (
              <div className="node-detail truncate">{nodeData.method || 'GET'} {nodeData.endpoint}</div>
            ) : (
              <div className="node-script node-script-empty">No endpoint configured.</div>
            )}
          </div>
        );
      case NodeType.TRANSFER:
        return (
          <div className="node-details">
            {nodeData.destination ? (
              <div className="node-detail">Dest: {nodeData.destination} ({nodeData.transferType})</div>
            ) : (
              <div className="node-script node-script-empty">No destination configured.</div>
            )}
          </div>
        );
      case NodeType.VOICEMAIL:
        return (
          <div className="node-details">
             {nodeData.greeting ? (
              <div className="node-script">Greeting: {nodeData.greeting}</div>
             ) : (
               <div className="node-script node-script-empty">No greeting set.</div>
             )}
          </div>
        );
      case NodeType.HANGUP:
         return (
          <div className="node-details">
             {nodeData.goodbye && <div className="node-script">{nodeData.goodbye}</div>}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <>
      <NodeResizer 
        color={cfg.color} 
        isVisible={isResizing} 
        minWidth={120} 
        minHeight={40} 
        handleStyle={{ width: 6, height: 6, border: 'none', background: cfg.color, borderRadius: '50%' }}
        lineStyle={{ border: `1px solid ${cfg.color}` }}
      />
      <div
        ref={nodeRef}
        className={`flow-node ${selected ? 'selected' : ''} ${isSimActive ? 'simulating' : ''} ${isResizing ? 'resizing' : ''}`}
        style={{ 
          '--node-accent': cfg.color, 
          fontSize: `calc(16px * ${scale})`,
          width: '100%', 
          height: '100%' 
        } as CSSProperties}
        onDoubleClick={() => setIsResizing(true)}
      >
        {!isStart && <Handle type="target" position={Position.Top} style={{ background: cfg.color, border: '2px solid var(--bg-panel)' }} />}

        <div className="node-header">
            <div className="node-code" style={{ color: cfg.color, background: `${cfg.color}10`, border: `1px solid ${cfg.color}20` }}>
              {cfg.code}
            </div>
            <div className="node-heading">
              <div className="node-title">{nodeData.label}</div>
              <div className="node-kind">{cfg.label}</div>
            </div>
            {isSimActive && <div className="node-live-dot" />}
          </div>

          <div className="node-body">
            {renderContent()}

            {nodeData.metadata?.errors?.length ? (
              <div className="node-alert">
                {nodeData.metadata.errors.length} validation issue{nodeData.metadata.errors.length > 1 ? 's' : ''}
              </div>
            ) : null}
          </div>
        {!isEnd && nodeData.type !== NodeType.BRANCH && <Handle type="source" position={Position.Bottom} style={{ background: cfg.color, border: '2px solid var(--bg-panel)' }} />}
      </div>
    </>
  );
});

CustomNode.displayName = 'CustomNode';
