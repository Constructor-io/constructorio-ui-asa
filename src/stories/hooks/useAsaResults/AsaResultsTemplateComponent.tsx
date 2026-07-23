import React, { useState } from 'react';
import useAsaResults from '../../../hooks/useAsaResults';
import CioAsaProvider from '../../../components/CioAsaProvider/CioAsaProvider';
import { DEMO_API_KEY } from '../../../constants';

interface AsaResultsDisplayProps {
  defaultPrompt: string;
}

function JsonNode({ label, value }: { label: string; value: any }) {
  const [collapsed, setCollapsed] = useState(true);
  const isObject = value !== null && typeof value === 'object';

  if (!isObject) {
    return (
      <div style={{ marginLeft: 16 }}>
        <span style={{ color: '#6b7280' }}>{label}: </span>
        <span style={{ color: typeof value === 'string' ? '#16a34a' : '#2563eb' }}>
          {JSON.stringify(value)}
        </span>
      </div>
    );
  }

  const entries = Array.isArray(value)
    ? value.map((v, i) => [String(i), v] as const)
    : Object.entries(value);
  const bracket = Array.isArray(value) ? ['[', ']'] : ['{', '}'];

  return (
    <div style={{ marginLeft: 16 }}>
      <span
        onClick={() => setCollapsed(!collapsed)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') setCollapsed(!collapsed);
        }}
        role='button'
        tabIndex={0}
        style={{ cursor: 'pointer', userSelect: 'none' }}>
        <span style={{ color: '#9ca3af', marginRight: 4 }}>{collapsed ? '▶' : '▼'}</span>
        <span style={{ color: '#6b7280' }}>{label}: </span>
        {collapsed && (
          <span style={{ color: '#9ca3af' }}>
            {bracket[0]} {entries.length} items {bracket[1]}
          </span>
        )}
      </span>
      {!collapsed && (
        <div>
          <span style={{ color: '#9ca3af' }}>{bracket[0]}</span>
          {entries.map(([key, val]) => (
            <JsonNode key={key} label={key} value={val} />
          ))}
          <span style={{ color: '#9ca3af' }}>{bracket[1]}</span>
        </div>
      )}
    </div>
  );
}

function CollapsibleJson({ data }: { data: any }) {
  if (data === null || typeof data !== 'object') {
    return <pre>{JSON.stringify(data, null, 2)}</pre>;
  }

  const entries = Object.entries(data);

  return (
    <div
      style={{
        fontFamily: "'SF Mono', 'Fira Code', monospace",
        fontSize: 13,
        lineHeight: 1.6,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        maxWidth: '100%',
        overflow: 'hidden',
      }}>
      {entries.map(([key, val]) => (
        <JsonNode key={key} label={key} value={val} />
      ))}
    </div>
  );
}

function StatusBadge({ isStreaming }: { isStreaming: boolean }) {
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '4px 10px',
        borderRadius: 6,
        fontSize: 12,
        fontWeight: 600,
        background: isStreaming ? '#fef3c7' : '#d1fae5',
        color: isStreaming ? '#92400e' : '#065f46',
      }}>
      {isStreaming ? 'Loading...' : 'Ready'}
    </span>
  );
}

function AsaResultsDisplay({ defaultPrompt }: AsaResultsDisplayProps) {
  const { messages, sendMessage, isStreaming } = useAsaResults();
  const [inputValue, setInputValue] = useState(defaultPrompt || '');

  const handleSend = () => {
    if (inputValue.trim() && !isStreaming) {
      sendMessage(inputValue.trim());
    }
  };

  return (
    <div style={{ padding: '24px 32px', maxWidth: '100%', boxSizing: 'border-box' }}>
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: '#374151' }}>Status:</span>
        <StatusBadge isStreaming={isStreaming} />
      </div>

      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
        <input
          type='text'
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSend();
          }}
          placeholder='Type a message...'
          style={{
            flex: 1,
            padding: '8px 12px',
            fontSize: 14,
            border: '1px solid #d1d5db',
            borderRadius: 6,
            outline: 'none',
          }}
        />
        <button
          type='button'
          onClick={handleSend}
          disabled={isStreaming || !inputValue.trim()}
          style={{
            padding: '8px 16px',
            fontSize: 14,
            fontWeight: 600,
            background: isStreaming ? '#e5e7eb' : '#4f46e5',
            color: isStreaming ? '#9ca3af' : '#fff',
            border: 'none',
            borderRadius: 6,
            cursor: isStreaming ? 'not-allowed' : 'pointer',
          }}>
          Send
        </button>
      </div>

      <div
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: '#374151',
          marginBottom: 8,
        }}>
        Response:
      </div>
      <CollapsibleJson data={{ messages }} />
    </div>
  );
}

export default function AsaResultsTemplateComponent({ defaultPrompt }: AsaResultsDisplayProps) {
  return (
    <CioAsaProvider apiKey={DEMO_API_KEY}>
      <AsaResultsDisplay defaultPrompt={defaultPrompt} />
    </CioAsaProvider>
  );
}
