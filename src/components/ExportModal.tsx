import { useState, useEffect } from 'react';
import { ExportResult, triggerDownload } from '../lib/exportUtils';

interface ExportModalProps {
  result: ExportResult | null;
  onClose: () => void;
}

const formatLabels = { json: 'JSON', md: 'Markdown', txt: 'Plain Text' };

export function ExportModal({ result, onClose }: ExportModalProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  if (!result) return null;

  const lines = result.content.split('\n').length;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(result.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <span className="eyebrow-label">Export Preview</span>
            <h3>{formatLabels[result.format]}</h3>
          </div>
          <div className="modal-actions">
            <span className="badge badge-muted">{lines} lines</span>
            <button className="topbar-btn" onClick={handleCopy}>
              {copied ? 'Copied' : 'Copy'}
            </button>
            <button className="topbar-btn primary" onClick={() => triggerDownload(result)}>
              Download
            </button>
            <button className="icon-btn" onClick={onClose} aria-label="Close export preview">
              ×
            </button>
          </div>
        </div>

        <div className="modal-code-wrap">
          <div className="modal-line-rail">
            {result.content.split('\n').map((_, i) => (
              <div key={i}>{i + 1}</div>
            ))}
          </div>
          <pre className="modal-code">
            {result.format === 'json' ? <JsonHighlight content={result.content} /> : result.content}
          </pre>
        </div>

        <div className="modal-footer">
          <span>{result.filename}</span>
          <span>Press Esc to close</span>
        </div>
      </div>
    </div>
  );
}

function JsonHighlight({ content }: { content: string }) {
  const highlighted = content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"([^"]+)"(\s*:)/g, '<span style="color:#1d4ed8">"$1"</span>$2')
    .replace(/:\s*"([^"]*)"/g, ': <span style="color:#0f766e">"$1"</span>')
    .replace(/:\s*(\d+\.?\d*)/g, ': <span style="color:#a16207">$1</span>')
    .replace(/:\s*(true|false|null)/g, ': <span style="color:#6d28d9">$1</span>')
    .replace(/([{}[\]])/g, '<span style="color:#64748b">$1</span>');

  return <span dangerouslySetInnerHTML={{ __html: highlighted }} />;
}
