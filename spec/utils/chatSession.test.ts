import {
  adoptStoredChat,
  createChatSession,
  nextMessageId,
  prepareSnapshot,
  resetConversation,
} from '../../src/utils/chatSession';
import type { ChatMessage, PersistedChat } from '../../src/types';

describe('chatSession', () => {
  it('seeds the server thread id from a server id only', () => {
    expect(createChatSession('srv-1').serverThreadId).toBe('srv-1');
    expect(createChatSession('local-1').serverThreadId).toBeNull();
    expect(createChatSession().serverThreadId).toBeNull();
  });

  it('mints increasing ids that differ between sessions', () => {
    const a = createChatSession();
    const b = createChatSession();
    const first = nextMessageId(a);
    const second = nextMessageId(a);
    expect(first).toMatch(/^msg-1-\d+-[a-z0-9]+$/);
    expect(second).toMatch(/^msg-2-/);
    expect(nextMessageId(b)).not.toBe(first);
  });

  it('forgets the conversation but keeps the id counter and interaction flag', () => {
    const session = createChatSession('srv-1');
    Object.assign(session, {
      storageThreadId: 'srv-1',
      orphanId: 'local-1',
      createdAt: 5,
      lastSyncedAt: 9,
      dirty: true,
      interacted: true,
      isStreaming: true,
      foreignInFlight: true,
      idCounter: 4,
    });

    expect(resetConversation(session)).toBe('srv-1');

    expect(session).toMatchObject({
      serverThreadId: null,
      storageThreadId: null,
      orphanId: null,
      createdAt: null,
      lastSyncedAt: 0,
      dirty: false,
      isStreaming: false,
      foreignInFlight: false,
      loadRequest: 1,
      interacted: true,
      idCounter: 4,
    });
  });
});

describe('adoptStoredChat', () => {
  const stored = (threadId: string): PersistedChat => ({
    version: 1,
    threadId,
    messages: [{ id: 'msg-7-1-x', role: 'user', text: 'q', status: 'done' }],
    createdAt: 10,
    updatedAt: 20,
  });

  it('continues a server thread on the server', () => {
    const session = createChatSession();
    adoptStoredChat(session, stored('srv-1'));
    expect(session).toMatchObject({
      storageThreadId: 'srv-1',
      serverThreadId: 'srv-1',
      createdAt: 10,
      lastSyncedAt: 20,
      idCounter: 7,
    });
  });

  it('never sends a local thread id to the server', () => {
    const session = createChatSession();
    adoptStoredChat(session, stored('local-1'));
    expect(session.storageThreadId).toBe('local-1');
    expect(session.serverThreadId).toBeNull();
  });
});

describe('prepareSnapshot', () => {
  const messages: ChatMessage[] = [{ id: 'msg-1-1-x', role: 'user', text: 'q', status: 'done' }];

  it('mints a local id for an unsaved conversation without a server thread', () => {
    const session = createChatSession();
    const { snapshot, staleId } = prepareSnapshot(session, messages, 1000);
    expect(snapshot.threadId).toMatch(/^local-/);
    expect(snapshot).toMatchObject({ version: 1, createdAt: 1000, updatedAt: 1000, messages });
    expect(staleId).toBeNull();
    expect(session).toMatchObject({
      storageThreadId: snapshot.threadId,
      createdAt: 1000,
      lastSyncedAt: 1000,
    });
  });

  it('keeps writing under the same local id until the server names the thread', () => {
    const session = createChatSession();
    const first = prepareSnapshot(session, messages, 1000);
    const second = prepareSnapshot(session, messages, 2000);
    expect(second.snapshot.threadId).toBe(first.snapshot.threadId);
    expect(second.staleId).toBeNull();
    expect(second.snapshot.createdAt).toBe(1000);
  });

  it('moves to the server id and reports the local record as stale', () => {
    const session = createChatSession();
    const local = prepareSnapshot(session, messages, 1000).snapshot.threadId;
    Object.assign(session, { serverThreadId: 'srv-1' });
    const { snapshot, staleId } = prepareSnapshot(session, messages, 2000);
    expect(snapshot.threadId).toBe('srv-1');
    expect(staleId).toBe(local);
    expect(session.storageThreadId).toBe('srv-1');
  });

  it('retries a deletion left over from an earlier save', () => {
    const session = createChatSession('srv-1');
    Object.assign(session, { storageThreadId: 'srv-1', orphanId: 'local-old' });
    const { staleId } = prepareSnapshot(session, messages, 1000);
    expect(staleId).toBe('local-old');
    expect(session.orphanId).toBeNull();
  });

  it('never reuses an updatedAt, even within the same millisecond', () => {
    const session = createChatSession('srv-1');
    const first = prepareSnapshot(session, messages, 1000);
    const second = prepareSnapshot(session, messages, 1000);
    expect(second.snapshot.updatedAt).toBe(first.snapshot.updatedAt + 1);
  });
});
