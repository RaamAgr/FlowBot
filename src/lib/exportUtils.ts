import { Node, Edge } from '@xyflow/react';
import { FlowNodeData } from '../types';

export type ExportFormat = 'json' | 'md' | 'txt';

export interface ExportResult {
  content: string;
  filename: string;
  mimeType: string;
  format: ExportFormat;
}

export function generateExportContent(
  nodes: Node<FlowNodeData>[],
  edges: Edge[],
  format: ExportFormat,
): ExportResult {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

  if (format === 'json') {
    const payload = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      nodes: nodes.map(n => ({
        id: n.id,
        type: n.data.type,
        label: n.data.label,
        position: n.position,
        scripts: n.data.scripts,
        conditions: n.data.conditions,
        variables: n.data.variables,
        metadata: n.data.metadata,
      })),
      edges: edges.map(e => ({
        id: e.id,
        source: e.source,
        target: e.target,
        label: e.label ?? null,
      })),
    };
    return {
      content: JSON.stringify(payload, null, 2),
      filename: `flow-${timestamp}.json`,
      mimeType: 'application/json',
      format,
    };
  }

  if (format === 'md') {
    const lines: string[] = [
      `# Flow Export`,
      `> Exported: ${new Date().toLocaleString()}`,
      `> Nodes: ${nodes.length} | Edges: ${edges.length}`,
      '',
      '---',
      '',
      '## Nodes',
      '',
    ];
    for (const n of nodes) {
      lines.push(`### ${n.data.label} (\`${n.data.type}\`)`);
      lines.push(`- **ID:** \`${n.id}\``);
      if (n.data.scripts?.length) {
        lines.push('- **Scripts:**');
        n.data.scripts.forEach((s, i) => {
          lines.push(`  ${i + 1}. [${s.language.toUpperCase()}] ${s.text}`);
        });
      }
      if (n.data.conditions?.length) {
        lines.push('- **Conditions:**');
        n.data.conditions.forEach(c => {
          lines.push(`  - \`${c.type}\` → ${c.label} (value: \`${c.value || '—'}\`)`);
        });
      }
      if (n.data.metadata?.tone) lines.push(`- **Tone:** ${n.data.metadata.tone}`);
      if (n.data.metadata?.persona) lines.push(`- **Persona:** ${n.data.metadata.persona}`);
      lines.push('');
    }
    lines.push('---', '', '## Connections', '');
    for (const e of edges) {
      const src = nodes.find(n => n.id === e.source)?.data.label ?? e.source;
      const tgt = nodes.find(n => n.id === e.target)?.data.label ?? e.target;
      lines.push(`- **${src}** → **${tgt}**${e.label ? ` *(${e.label})*` : ''}`);
    }
    return {
      content: lines.join('\n'),
      filename: `flow-${timestamp}.md`,
      mimeType: 'text/markdown',
      format,
    };
  }

  // Plain text
  const lines: string[] = [
    `FLOW EXPORT — ${new Date().toLocaleString()}`,
    `Nodes: ${nodes.length}  |  Edges: ${edges.length}`,
    '═'.repeat(50),
    '',
  ];
  for (const n of nodes) {
    lines.push(`[${n.data.type.toUpperCase()}] ${n.data.label}`);
    lines.push(`  ID: ${n.id}`);
    if (n.data.scripts?.length) {
      n.data.scripts.forEach(s => lines.push(`  Script (${s.language}): "${s.text}"`));
    }
    if (n.data.conditions?.length) {
      n.data.conditions.forEach(c => lines.push(`  Condition: ${c.type} → ${c.label}`));
    }
    lines.push('');
  }
  lines.push('─'.repeat(50), 'CONNECTIONS', '');
  for (const e of edges) {
    const src = nodes.find(n => n.id === e.source)?.data.label ?? e.source;
    const tgt = nodes.find(n => n.id === e.target)?.data.label ?? e.target;
    lines.push(`  ${src}  →  ${tgt}`);
  }
  return {
    content: lines.join('\n'),
    filename: `flow-${timestamp}.txt`,
    mimeType: 'text/plain',
    format,
  };
}

export function triggerDownload({ content, filename, mimeType }: ExportResult) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
