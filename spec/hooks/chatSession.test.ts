import { createChatSession, nextMessageId, resetConversation } from '../../src/hooks/chatSession';

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
