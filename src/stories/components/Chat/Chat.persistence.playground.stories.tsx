import React, { useEffect, useRef, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import Chat, { ChatHandle } from '../../../components/Chat/Chat';
import CioAsaProvider from '../../../components/CioAsaProvider/CioAsaProvider';
import { DEMO_API_KEY } from '../../../constants';
import {
  clearPersistedConversations,
  persistenceNamespace,
  storageAreaFor,
} from '../../../utils/localStoragePersistence';
import { getTabId } from '../../../utils/chatThreads';
import type { ThreadSummary } from '../../../types';

type StorageName = 'localStorage' | 'sessionStorage';

interface KeySnapshot {
  area: StorageName;
  key: string;
  raw: string;
}

const AUTH_KEY = 'cio-asa-playground:user';
const CHAT_PREFIX = 'cio-asa:chat:';
const DOMAIN = 'chatbot';
const STORAGES: StorageName[] = ['localStorage', 'sessionStorage'];
const USERS = ['alice', 'bob'];
const SUGGESTIONS = ['running shoes', 'a jacket for autumn', 'gift under $50'];

const ACCENT = '#0057b8';
const MUTED = '#6b7280';
const BORDER = '#e5e7eb';

const panelStyle: React.CSSProperties = {
  display: 'grid',
  gap: 8,
  padding: 12,
  border: `1px solid ${BORDER}`,
  borderRadius: 10,
  background: '#fff',
};
const panelTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 12,
  fontWeight: 600,
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
  color: MUTED,
};
const rowStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '4px 14px',
  alignItems: 'center',
};
const mutedStyle: React.CSSProperties = { color: MUTED, fontSize: 12 };
const codeStyle: React.CSSProperties = {
  fontFamily: 'ui-monospace, Menlo, monospace',
  fontSize: 12,
  wordBreak: 'break-all',
};
const frameStyle: React.CSSProperties = {
  flex: '0 0 auto',
  width: 440,
  height: 720,
  borderRadius: 12,
  overflow: 'hidden',
  border: `1px solid ${BORDER}`,
};
const quietButtonStyle: React.CSSProperties = {
  padding: 0,
  border: 0,
  background: 'none',
  color: ACCENT,
  cursor: 'pointer',
  font: 'inherit',
  fontSize: 13,
};

function chipStyle(active: boolean): React.CSSProperties {
  return {
    padding: '5px 12px',
    borderRadius: 999,
    border: `1px solid ${active ? ACCENT : BORDER}`,
    background: active ? '#e5effa' : '#fff',
    color: active ? ACCENT : '#111',
    fontWeight: active ? 600 : 400,
    cursor: 'pointer',
    font: 'inherit',
    fontSize: 13,
  };
}

function listItemStyle(active: boolean): React.CSSProperties {
  return {
    display: 'grid',
    gap: 2,
    padding: '6px 8px',
    borderRadius: 6,
    border: `1px solid ${active ? ACCENT : 'transparent'}`,
    background: active ? '#f3f7fc' : 'transparent',
    color: '#111',
    cursor: 'pointer',
    font: 'inherit',
    fontSize: 13,
    textAlign: 'left',
  };
}

const time = (ms: number) => new Date(ms).toLocaleTimeString();
const kb = (chars: number) => `${((chars * 2) / 1024).toFixed(1)} KB`;

function readAuth(): string | null {
  try {
    return window.localStorage.getItem(AUTH_KEY);
  } catch {
    return null;
  }
}

function writeAuth(userId: string | null) {
  try {
    if (userId) window.localStorage.setItem(AUTH_KEY, userId);
    else window.localStorage.removeItem(AUTH_KEY);
  } catch {
    /* storage blocked */
  }
}

function keysWithPrefix(storage: Storage, prefix: string): string[] {
  const keys: string[] = [];
  for (let i = 0; i < storage.length; i += 1) {
    const key = storage.key(i);
    if (key?.startsWith(prefix)) keys.push(key);
  }
  return keys;
}

function readChatKeys(): KeySnapshot[] {
  const found: KeySnapshot[] = [];
  STORAGES.forEach((area) => {
    try {
      const storage = window[area];
      keysWithPrefix(storage, CHAT_PREFIX).forEach((key) => {
        found.push({ area, key, raw: storage.getItem(key) ?? '' });
      });
    } catch {
      /* storage blocked */
    }
  });
  return found.sort((a, b) => a.key.localeCompare(b.key));
}

function wipeChatStorage() {
  STORAGES.forEach((area) => {
    try {
      const storage = window[area];
      keysWithPrefix(storage, CHAT_PREFIX).forEach((key) => storage.removeItem(key));
    } catch {
      /* storage blocked */
    }
  });
}

function countEntries(raw: string): { threads: number; deleted: number } | null {
  try {
    const parsed = JSON.parse(raw) as { threads?: object; deleted?: object };
    return {
      threads: Object.keys(parsed.threads ?? {}).length,
      deleted: Object.keys(parsed.deleted ?? {}).length,
    };
  } catch {
    return null;
  }
}

function pretty(raw: string): string {
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
}

function useChatStorage(): KeySnapshot[] {
  const [keys, setKeys] = useState<KeySnapshot[]>(() => readChatKeys());
  const signatureRef = useRef('');
  useEffect(() => {
    const refresh = () => {
      const next = readChatKeys();
      const signature = JSON.stringify(next);
      if (signature === signatureRef.current) return;
      signatureRef.current = signature;
      setKeys(next);
    };
    refresh();
    const timer = window.setInterval(refresh, 700);
    return () => window.clearInterval(timer);
  }, []);
  return keys;
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={panelStyle}>
      <h3 style={panelTitleStyle}>{title}</h3>
      {children}
    </section>
  );
}

function QuietButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button type='button' style={quietButtonStyle} onClick={onClick}>
      {children}
    </button>
  );
}

function IdentityBar({
  userId,
  tabId,
  area,
  onPick,
}: {
  userId: string | null;
  tabId: string;
  area: StorageName;
  onPick: (userId: string | null) => void;
}) {
  return (
    <div style={{ ...rowStyle, gap: '8px 16px', justifyContent: 'space-between' }}>
      <div style={{ ...rowStyle, gap: 6 }}>
        <span style={mutedStyle}>Signed in as</span>
        <button type='button' style={chipStyle(userId === null)} onClick={() => onPick(null)}>
          Guest
        </button>
        {USERS.map((id) => (
          <button
            key={id}
            type='button'
            style={chipStyle(userId === id)}
            onClick={() => onPick(id)}>
            {id}
          </button>
        ))}
      </div>
      <span style={mutedStyle}>
        {area} · tab {tabId}
      </span>
    </div>
  );
}

function HistoryList({
  threads,
  activeThreadId,
  onSwitch,
}: {
  threads: ThreadSummary[];
  activeThreadId: string | null;
  onSwitch: (threadId: string) => void;
}) {
  if (threads.length === 0) return <span style={mutedStyle}>No saved conversations</span>;
  return (
    <div style={{ display: 'grid', gap: 2 }}>
      {threads.map((thread) => (
        <button
          key={thread.threadId}
          type='button'
          style={listItemStyle(thread.threadId === activeThreadId)}
          onClick={() => onSwitch(thread.threadId)}>
          <span>
            {thread.title || '(empty)'}
            {thread.inFlight && <span style={{ color: '#6366f1', marginLeft: 6 }}>typing…</span>}
          </span>
          <span style={mutedStyle}>{time(thread.updatedAt)}</span>
        </button>
      ))}
    </div>
  );
}

function StorageView({
  keys,
  currentKey,
  area,
}: {
  keys: KeySnapshot[];
  currentKey: string;
  area: StorageName;
}) {
  if (keys.length === 0) return <span style={mutedStyle}>Nothing stored yet</span>;
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      {keys.map((entry) => {
        const counts = countEntries(entry.raw);
        const isCurrent = entry.key === currentKey && entry.area === area;
        return (
          <div
            key={`${entry.area}:${entry.key}`}
            style={{
              display: 'grid',
              gap: 2,
              padding: '6px 8px',
              borderLeft: `2px solid ${isCurrent ? ACCENT : BORDER}`,
            }}>
            <span style={{ fontSize: 12 }}>
              <strong>{entry.area}</strong>
              {isCurrent && <span style={{ color: ACCENT }}> · current</span>}
            </span>
            <code style={codeStyle}>{entry.key.slice(CHAT_PREFIX.length)}</code>
            <span style={mutedStyle}>
              {counts
                ? `${counts.threads} threads · ${counts.deleted} tombstones · ${kb(entry.raw.length)}`
                : 'not JSON'}
            </span>
            <details>
              <summary style={{ cursor: 'pointer', fontSize: 12, color: MUTED }}>raw JSON</summary>
              <pre
                style={{
                  maxHeight: 240,
                  overflow: 'auto',
                  margin: '6px 0 0',
                  padding: 8,
                  background: '#f9fafb',
                  borderRadius: 6,
                  fontSize: 11,
                }}>
                {pretty(entry.raw)}
              </pre>
            </details>
          </div>
        );
      })}
    </div>
  );
}

function PersistentChatPlayground() {
  const [userId, setUserId] = useState<string | null>(() => readAuth());
  const [chatKey, setChatKey] = useState(0);
  const [threads, setThreads] = useState<ThreadSummary[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const chatRef = useRef<ChatHandle>(null);
  const storageKeys = useChatStorage();
  const tabId = (getTabId() ?? '').slice(0, 6);

  const area: StorageName = storageAreaFor(userId) === 'local' ? 'localStorage' : 'sessionStorage';
  const currentKey = `${CHAT_PREFIX}v1:${persistenceNamespace({ apiKey: DEMO_API_KEY, domain: DOMAIN, userId })}`;
  const who = userId ?? 'the guest';

  const pickUser = (next: string | null) => {
    writeAuth(next);
    setUserId(next);
  };

  return (
    <div
      style={{
        display: 'grid',
        gap: 16,
        width: '100%',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: 14,
        color: '#111',
      }}>
      <IdentityBar userId={userId} tabId={tabId} area={area} onPick={pickUser} />

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-start' }}>
        <div style={frameStyle}>
          <CioAsaProvider
            apiKey={DEMO_API_KEY}
            persistConversation={{ enabled: true }}
            userId={userId}>
            <Chat
              key={chatKey}
              ref={chatRef}
              initialSuggestions={SUGGESTIONS}
              aspectRatio='3:4'
              currency='$'
              showStopButton
              onThreadsChange={(list, active) => {
                setThreads(list);
                setActiveThreadId(active);
              }}
            />
          </CioAsaProvider>
        </div>

        <div style={{ display: 'grid', gap: 12, flex: '1 1 300px', minWidth: 280 }}>
          <Panel title={`Chats of ${who}`}>
            <HistoryList
              threads={threads}
              activeThreadId={activeThreadId}
              onSwitch={(id) => chatRef.current?.switchThread(id)}
            />
            <div style={rowStyle}>
              <QuietButton onClick={() => chatRef.current?.newThread()}>New chat</QuietButton>
              <QuietButton onClick={() => chatRef.current?.clearHistory()}>
                Delete this chat
              </QuietButton>
              <QuietButton
                onClick={() =>
                  clearPersistedConversations({ apiKey: DEMO_API_KEY, domain: DOMAIN, userId })
                }>
                Clear history of {who}
              </QuietButton>
            </div>
          </Panel>

          <Panel title='Page'>
            <div style={rowStyle}>
              <QuietButton onClick={() => window.location.reload()}>Reload page</QuietButton>
              <QuietButton onClick={() => window.open(window.location.href, '_blank', 'noopener')}>
                Open in new tab
              </QuietButton>
              <QuietButton onClick={() => setChatKey((key) => key + 1)}>Remount Chat</QuietButton>
            </div>
          </Panel>

          <Panel title='Storage'>
            <StorageView keys={storageKeys} currentKey={currentKey} area={area} />
            <div style={rowStyle}>
              <QuietButton
                onClick={() => {
                  wipeChatStorage();
                  window.location.reload();
                }}>
                Wipe all chat storage and reload
              </QuietButton>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

const meta = {
  title: 'Components/Chat/Persistent Chat',
  component: Chat,
  parameters: { layout: 'padded' },
} satisfies Meta<typeof Chat>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Persistence against the live API: pick a guest or a signed-in shopper, reload, open a second
 * tab, switch between conversations, and watch what lands in storage.
 */
export const Playground: Story = {
  render: () => <PersistentChatPlayground />,
};
