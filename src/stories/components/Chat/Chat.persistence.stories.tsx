import React, { useRef, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import Chat, { ChatHandle } from '../../../components/Chat/Chat';
import CioAsaProvider from '../../../components/CioAsaProvider/CioAsaProvider';
import { DEMO_API_KEY } from '../../../constants';
import type { ThreadSummary } from '../../../types';

const SUGGESTIONS = ['running shoes', 'a jacket for autumn', 'gift under $50'];

const buttonStyle: React.CSSProperties = {
  padding: '6px 10px',
  borderRadius: 6,
  border: '1px solid #d1d5db',
  background: '#fff',
  cursor: 'pointer',
  textAlign: 'left',
  font: 'inherit',
};

const frameStyle: React.CSSProperties = {
  width: 504,
  height: 800,
  borderRadius: 12,
  overflow: 'hidden',
};

function PersistentChat() {
  const [mountKey, setMountKey] = useState(0);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'flex-start' }}>
      <button type='button' style={buttonStyle} onClick={() => setMountKey((k) => k + 1)}>
        Simulate page reload
      </button>
      <CioAsaProvider key={mountKey} apiKey={DEMO_API_KEY} persistConversation>
        <div style={frameStyle}>
          <Chat initialSuggestions={SUGGESTIONS} aspectRatio='3:4' currency='$' />
        </div>
      </CioAsaProvider>
    </div>
  );
}

function PersistentChatWithHistory() {
  const [mountKey, setMountKey] = useState(0);
  const [threads, setThreads] = useState<ThreadSummary[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const chatRef = useRef<ChatHandle>(null);

  return (
    <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', fontFamily: 'sans-serif' }}>
      <aside style={{ width: 240, display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
        <button type='button' style={buttonStyle} onClick={() => chatRef.current?.newThread()}>
          + New chat
        </button>
        <strong>History</strong>
        {threads.length === 0 && <span style={{ color: '#6b7280' }}>No saved chats yet</span>}
        {threads.map((t) => (
          <button
            key={t.threadId}
            type='button'
            style={{
              ...buttonStyle,
              fontWeight: t.threadId === activeThreadId ? 600 : 400,
              background: t.threadId === activeThreadId ? '#eef2ff' : '#fff',
            }}
            onClick={() => chatRef.current?.switchThread(t.threadId)}>
            <div>
              {t.title || '(empty)'}
              {t.inFlight && <span style={{ color: '#6366f1', marginLeft: 6 }}>typing…</span>}
            </div>
            <div style={{ color: '#6b7280', fontSize: 11 }}>
              {new Date(t.updatedAt).toLocaleString()}
            </div>
          </button>
        ))}
        <hr style={{ width: '100%', border: 0, borderTop: '1px solid #e5e7eb' }} />
        <button type='button' style={buttonStyle} onClick={() => setMountKey((k) => k + 1)}>
          Simulate page reload
        </button>
        <button type='button' style={buttonStyle} onClick={() => chatRef.current?.clearHistory()}>
          Delete active chat
        </button>
      </aside>
      <CioAsaProvider key={mountKey} apiKey={DEMO_API_KEY} persistConversation>
        <div style={frameStyle}>
          <Chat
            ref={chatRef}
            initialSuggestions={SUGGESTIONS}
            aspectRatio='3:4'
            currency='$'
            onThreadsChange={(list, active) => {
              setThreads(list);
              setActiveThreadId(active);
            }}
          />
        </div>
      </CioAsaProvider>
    </div>
  );
}

const meta = {
  title: 'Components/Chat/Persistent Chat',
  component: Chat,
  parameters: { layout: 'centered' },
} satisfies Meta<typeof Chat>;

export default meta;
type Story = StoryObj<typeof meta>;

/** `persistConversation` on the provider is all that is needed. Send a message, then reload. */
export const Default: Story = {
  render: () => <PersistentChat />,
};

/** A history sidebar built outside `Chat` from `onThreadsChange` and the ref methods. */
export const WithHistory: Story = {
  render: () => <PersistentChatWithHistory />,
};
