import { Node } from '@xyflow/react';
import { FlowNodeData, NodeType, InputMethod, BranchCondition, BranchRoute } from '../types';
import { useFlowStore } from '../store';
import { v4 as uuidv4 } from 'uuid';

interface InspectorProps {
  selectedNode: Node<FlowNodeData> | null;
}

const nodeTypeOptions = Object.values(NodeType);
const inputMethodOptions = Object.values(InputMethod);
const branchConditionOptions = Object.values(BranchCondition);

export function Inspector({ selectedNode }: InspectorProps) {
  const { updateNodeData, deleteNode } = useFlowStore();

  if (!selectedNode) {
    return (
      <div className="inspector-inner">
        <div className="inspector-header">
          <span className="eyebrow-label">Inspector</span>
          <h3>Nothing selected</h3>
        </div>
        <div className="inspector-empty">
          <div className="empty-orb" />
          <p>Select a node to edit its properties.</p>
        </div>
      </div>
    );
  }

  const data = selectedNode.data;
  const update = (patch: Partial<FlowNodeData>) => updateNodeData(selectedNode.id, patch);

  const handleDelete = () => {
    if (data.type === NodeType.START) {
      alert("Cannot delete the Start node.");
      return;
    }
    deleteNode(selectedNode.id);
  };

  const renderSpecificFields = () => {
    switch (data.type) {
      case NodeType.SPEAK:
        return (
          <div className="inspector-section">
            <div className="inspector-section-title">Speak Settings</div>
            <div className="field">
              <label className="field-label">Message Text</label>
              <textarea
                className="field-input field-textarea"
                value={data.script?.text || ''}
                onChange={(e) => update({ script: { ...data.script, text: e.target.value, language: data.script?.language || 'en' } })}
                placeholder="What should the bot say?"
                rows={4}
              />
            </div>
            <div className="field">
              <label className="field-label">Language</label>
              <select
                className="field-input field-select"
                value={data.script?.language || 'en'}
                onChange={(e) => update({ script: { ...data.script, text: data.script?.text || '', language: e.target.value } })}
              >
                {['en', 'es', 'fr', 'de'].map((lang) => (
                  <option key={lang} value={lang}>{lang.toUpperCase()}</option>
                ))}
              </select>
            </div>
          </div>
        );
      
      case NodeType.LISTEN:
        return (
          <div className="inspector-section">
            <div className="inspector-section-title">Listen Settings</div>
            <div className="field">
              <label className="field-label">Input Method</label>
              <select
                className="field-input field-select"
                value={data.inputMethod || InputMethod.SPEECH}
                onChange={(e) => update({ inputMethod: e.target.value as InputMethod })}
              >
                {inputMethodOptions.map((method) => (
                  <option key={method} value={method}>{method.toUpperCase()}</option>
                ))}
              </select>
            </div>
            <div className="split-fields">
              <div className="field">
                <label className="field-label">Max Wait (s)</label>
                <input
                  type="number"
                  className="field-input"
                  value={data.maxWait || 5}
                  onChange={(e) => update({ maxWait: parseInt(e.target.value) || 5 })}
                />
              </div>
              <div className="field">
                <label className="field-label">Max Retries</label>
                <input
                  type="number"
                  className="field-input"
                  value={data.maxRetries || 0}
                  onChange={(e) => update({ maxRetries: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div className="field">
              <label className="field-label">Store Response As (Variable)</label>
              <input
                className="field-input"
                value={data.storeAs || ''}
                onChange={(e) => update({ storeAs: e.target.value })}
                placeholder="e.g. user_intent"
              />
            </div>
          </div>
        );

      case NodeType.BRANCH:
        return (
          <div className="inspector-section">
            <div className="inspector-section-title">Routing Conditions</div>
            {(data.routes || []).map((route, idx) => (
              <div key={route.id} className="editor-card">
                <div className="editor-card-header">
                  <span>Route {idx + 1}</span>
                  <button className="text-btn danger" onClick={() => {
                    const newRoutes = [...(data.routes || [])];
                    newRoutes.splice(idx, 1);
                    update({ routes: newRoutes });
                  }}>
                    Remove
                  </button>
                </div>
                <div className="field">
                  <label className="field-label">Label</label>
                  <input
                    className="field-input"
                    value={route.label}
                    onChange={(e) => {
                      const newRoutes = [...(data.routes || [])];
                      newRoutes[idx].label = e.target.value;
                      update({ routes: newRoutes });
                    }}
                    placeholder="e.g. Yes"
                  />
                </div>
                <div className="split-fields">
                  <div className="field">
                    <label className="field-label">Condition</label>
                    <select
                      className="field-input field-select"
                      value={route.condition}
                      onChange={(e) => {
                        const newRoutes = [...(data.routes || [])];
                        newRoutes[idx].condition = e.target.value as BranchCondition;
                        update({ routes: newRoutes });
                      }}
                    >
                      {branchConditionOptions.map((cond) => (
                        <option key={cond} value={cond}>{cond.replace('_', ' ')}</option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label className="field-label">Match Value</label>
                    <input
                      className="field-input"
                      value={route.value}
                      onChange={(e) => {
                        const newRoutes = [...(data.routes || [])];
                        newRoutes[idx].value = e.target.value;
                        update({ routes: newRoutes });
                      }}
                      placeholder="e.g. true"
                    />
                  </div>
                </div>
              </div>
            ))}
            <button className="add-btn" onClick={() => {
              const newRoute: BranchRoute = { id: uuidv4(), label: 'New Route', condition: BranchCondition.INTENT, value: '' };
              update({ routes: [...(data.routes || []), newRoute] });
            }}>
              Add Route
            </button>
          </div>
        );

      case NodeType.API_CALL:
        return (
          <div className="inspector-section">
            <div className="inspector-section-title">API Settings</div>
            <div className="split-fields">
              <div className="field" style={{ flex: '0 0 80px' }}>
                <label className="field-label">Method</label>
                <select
                  className="field-input field-select"
                  value={data.method || 'GET'}
                  onChange={(e) => update({ method: e.target.value as any })}
                >
                  {['GET', 'POST', 'PUT'].map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label className="field-label">Endpoint URL</label>
                <input
                  className="field-input"
                  value={data.endpoint || ''}
                  onChange={(e) => update({ endpoint: e.target.value })}
                  placeholder="https://api.example.com/data"
                />
              </div>
            </div>
            <div className="field">
              <label className="field-label">Store Response As (Variable)</label>
              <input
                className="field-input"
                value={data.storeResponseAs || ''}
                onChange={(e) => update({ storeResponseAs: e.target.value })}
                placeholder="e.g. customer_data"
              />
            </div>
          </div>
        );
      
      case NodeType.TRANSFER:
        return (
          <div className="inspector-section">
            <div className="inspector-section-title">Transfer Settings</div>
            <div className="field">
              <label className="field-label">Transfer Type</label>
              <select
                className="field-input field-select"
                value={data.transferType || 'queue'}
                onChange={(e) => update({ transferType: e.target.value as any })}
              >
                {['queue', 'agent', 'number'].map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label className="field-label">Destination</label>
              <input
                className="field-input"
                value={data.destination || ''}
                onChange={(e) => update({ destination: e.target.value })}
                placeholder={data.transferType === 'number' ? '+1234567890' : 'queue_name'}
              />
            </div>
          </div>
        );

      case NodeType.VOICEMAIL:
        return (
          <div className="inspector-section">
            <div className="inspector-section-title">Voicemail Settings</div>
            <div className="field">
              <label className="field-label">Greeting</label>
              <textarea
                className="field-input field-textarea"
                value={data.greeting || ''}
                onChange={(e) => update({ greeting: e.target.value })}
                placeholder="Please leave a message after the beep."
                rows={3}
              />
            </div>
            <div className="field">
              <label className="field-label">Max Duration (s)</label>
              <input
                type="number"
                className="field-input"
                value={data.maxDuration || 60}
                onChange={(e) => update({ maxDuration: parseInt(e.target.value) || 60 })}
              />
            </div>
          </div>
        );

      case NodeType.HANGUP:
        return (
          <div className="inspector-section">
            <div className="inspector-section-title">Hangup Settings</div>
            <div className="field">
              <label className="field-label">Goodbye Message</label>
              <input
                className="field-input"
                value={data.goodbye || ''}
                onChange={(e) => update({ goodbye: e.target.value })}
                placeholder="Thanks for calling, goodbye!"
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="inspector-inner">
      <div className="inspector-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <span className="eyebrow-label">Inspector</span>
          <h3>{data.label}</h3>
          <div className="inspector-meta-row">
            <span className="badge badge-accent">{data.type.replace('_', ' ')}</span>
            <span className="badge badge-muted">ID {selectedNode.id.slice(0, 6)}</span>
          </div>
        </div>
        {data.type !== NodeType.START && (
          <button className="topbar-btn danger" onClick={handleDelete} title="Delete Node" style={{ padding: '4px 8px' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
            </svg>
          </button>
        )}
      </div>

      <div className="inspector-body">
        <div className="inspector-section">
          <div className="inspector-section-title">Identity</div>
          <div className="field">
            <label className="field-label">Node Label</label>
            <input className="field-input" value={data.label} onChange={(e) => update({ label: e.target.value })} />
          </div>
          <div className="field">
            <label className="field-label">Node Type</label>
            <select
              className="field-input field-select"
              value={data.type}
              onChange={(e) => update({ type: e.target.value as NodeType })}
            >
              {nodeTypeOptions.map((type) => (
                <option key={type} value={type}>
                  {type.replace('_', ' ')}
                </option>
              ))}
            </select>
          </div>
        </div>

        {renderSpecificFields()}
      </div>
    </div>
  );
}
