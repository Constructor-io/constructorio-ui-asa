import {
  createLocalStoragePersistence,
  createLocalThreadId,
  getThreadTitle,
  isLocalThreadId,
  isInFlight,
  normalizeHydratedMessages,
  PERSISTED_CHAT_VERSION,
} from '../../src/utils/chatPersistence';
import type { ChatMessage, PersistedChat } from '../../src/types';

class FakeStorage implements Storage {
  private map = new Map<string, string>();

  quotaBytes = Infinity;

  get length() {
    return this.map.size;
  }

  key(index: number) {
    return Array.from(this.map.keys())[index] ?? null;
  }

  getItem(key: string) {
    return this.map.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    if (value.length > this.quotaBytes) throw new DOMException('quota', 'QuotaExceededError');
    this.map.set(key, value);
  }

  removeItem(key: string) {
    this.map.delete(key);
  }

  clear() {
    this.map.clear();
  }
}

let counter = 0;
function msg(
  role: ChatMessage['role'],
  text: string,
  status: ChatMessage['status'] = 'done',
): ChatMessage {
  counter += 1;
  return { id: `m${counter}`, role, text, status };
}

function turns(n: number): ChatMessage[] {
  return Array.from({ length: n }).flatMap((_, i) => [
    msg('user', `q${i + 1}`),
    msg('assistant', `a${i + 1}`),
  ]);
}

function chat(threadId: string, messages: ChatMessage[], updatedAt = Date.now()): PersistedChat {
  return { version: PERSISTED_CHAT_VERSION, threadId, messages, createdAt: updatedAt, updatedAt };
}

describe('createLocalStoragePersistence', () => {
  let storage: FakeStorage;

  beforeEach(() => {
    storage = new FakeStorage();
  });

  it('round-trips a thread and lists it with a title', async () => {
    const store = createLocalStoragePersistence({ storage });
    await store.saveThread(chat('t1', turns(1)));

    expect(await store.getThread('t1')).toMatchObject({ threadId: 't1', version: 1 });
    expect((await store.getThread('t1'))?.messages.map((m) => m.text)).toEqual(['q1', 'a1']);
    expect(await store.listThreads()).toEqual([
      expect.objectContaining({ threadId: 't1', title: 'q1', inFlight: false }),
    ]);
  });

  it('flags threads whose latest answer is still in flight', async () => {
    const store = createLocalStoragePersistence({ storage });
    await store.saveThread(chat('t1', [msg('user', 'q'), msg('assistant', '', 'loading')]));
    expect((await store.listThreads())[0].inFlight).toBe(true);

    await store.saveThread(chat('t2', [msg('user', 'q'), msg('assistant', '', 'error')]));
    expect((await store.listThreads()).find((t) => t.threadId === 't2')?.inFlight).toBe(false);
  });

  it('returns null for an unknown thread', async () => {
    const store = createLocalStoragePersistence({ storage });
    expect(await store.getThread('nope')).toBeNull();
  });

  it('lists the most recently updated thread first', async () => {
    const store = createLocalStoragePersistence({ storage });
    await store.saveThread(chat('old', turns(1), Date.now() - 2000));
    await store.saveThread(chat('new', turns(1), Date.now() - 1000));

    expect((await store.listThreads()).map((t) => t.threadId)).toEqual(['new', 'old']);
  });

  it('drops threads idle longer than the ttl', async () => {
    const store = createLocalStoragePersistence({ storage, ttlMs: 1000 });
    await store.saveThread(chat('stale', turns(1), Date.now() - 5000));
    await store.saveThread(chat('fresh', turns(1)));

    expect((await store.listThreads()).map((t) => t.threadId)).toEqual(['fresh']);
    expect(await store.getThread('stale')).toBeNull();
  });

  it('keeps only the most recent turns and starts on a user message', async () => {
    const store = createLocalStoragePersistence({ storage, maxTurns: 2 });
    await store.saveThread(chat('t1', turns(5)));

    const saved = await store.getThread('t1');
    expect(saved?.messages.map((m) => m.text)).toEqual(['q4', 'a4', 'q5', 'a5']);
    expect(saved?.messages[0].role).toBe('user');
  });

  it('caps the number of stored threads', async () => {
    const store = createLocalStoragePersistence({ storage, maxThreads: 2 });
    await store.saveThread(chat('a', turns(1), Date.now() - 3000));
    await store.saveThread(chat('b', turns(1), Date.now() - 2000));
    await store.saveThread(chat('c', turns(1), Date.now() - 1000));

    expect((await store.listThreads()).map((t) => t.threadId)).toEqual(['c', 'b']);
  });

  it('deletes a thread and leaves a tombstone so it cannot be resurrected', async () => {
    const store = createLocalStoragePersistence({ storage });
    const original = chat('t1', turns(1), Date.now() - 1000);
    await store.saveThread(original);
    await store.deleteThread('t1');

    expect(await store.listThreads()).toEqual([]);
    expect(await store.getThread('t1')).toBeNull();

    await store.saveThread({ ...original, messages: turns(2), updatedAt: Date.now() });
    expect(await store.getThread('t1')).toBeNull();
  });

  it('allows a thread created after its tombstone', async () => {
    const store = createLocalStoragePersistence({ storage });
    await store.saveThread(chat('t1', turns(1), Date.now() - 1000));
    await store.deleteThread('t1');

    const recreated = chat('t1', turns(1), Date.now() + 10);
    await store.saveThread(recreated);
    expect(await store.getThread('t1')).not.toBeNull();
  });

  it('expires tombstones with the ttl', async () => {
    const store = createLocalStoragePersistence({ storage, ttlMs: 1000 });
    const key = `cio-asa:chat:v${PERSISTED_CHAT_VERSION}`;
    storage.setItem(
      key,
      JSON.stringify({
        version: PERSISTED_CHAT_VERSION,
        threads: {},
        deleted: { t1: Date.now() - 5000 },
      }),
    );

    await store.saveThread({ ...chat('t1', turns(1)), createdAt: Date.now() - 6000 });
    expect(await store.getThread('t1')).not.toBeNull();
  });

  it('merges turns written by another tab instead of overwriting them', async () => {
    const store = createLocalStoragePersistence({ storage });
    const base = turns(1);
    await store.saveThread(chat('t1', base));

    const tabA = [...base, ...turns(1)];
    const tabB = [...base, ...turns(1)];
    await store.saveThread(chat('t1', tabA));
    await store.saveThread(chat('t1', tabB));

    const saved = await store.getThread('t1');
    expect(saved?.messages.map((m) => m.id)).toEqual([...tabA, ...tabB.slice(2)].map((m) => m.id));
  });

  it('prefers the incoming version of a message that already exists', async () => {
    const store = createLocalStoragePersistence({ storage });
    const [user, assistant] = turns(1);
    await store.saveThread(chat('t1', [user, { ...assistant, status: 'streaming', text: 'par' }]));
    await store.saveThread(
      chat('t1', [user, { ...assistant, status: 'done', text: 'partial done' }]),
    );

    const saved = await store.getThread('t1');
    expect(saved?.messages[1]).toMatchObject({ status: 'done', text: 'partial done' });
  });

  it('namespaces the storage key', async () => {
    const store = createLocalStoragePersistence({ storage, namespace: 'key_1:chatbot' });
    await store.saveThread(chat('t1', turns(1)));

    expect(storage.key(0)).toBe(`cio-asa:chat:v${PERSISTED_CHAT_VERSION}:key_1:chatbot`);
  });

  it('ignores corrupt or mismatched stored data', async () => {
    const key = `cio-asa:chat:v${PERSISTED_CHAT_VERSION}`;
    const store = createLocalStoragePersistence({ storage });

    storage.setItem(key, '{not json');
    expect(await store.listThreads()).toEqual([]);

    storage.setItem(key, JSON.stringify({ version: 99, threads: { t1: chat('t1', turns(1)) } }));
    expect(await store.listThreads()).toEqual([]);
  });

  it('falls back to the current thread alone, then trims it, when storage is full', async () => {
    const store = createLocalStoragePersistence({ storage });
    await store.saveThread(chat('other', turns(3), Date.now() - 2000));

    const full = chat('current', turns(6), Date.now() - 1000);
    const threeTurns = { ...full, messages: full.messages.slice(-6) };
    storage.quotaBytes =
      JSON.stringify({ version: PERSISTED_CHAT_VERSION, threads: { current: threeTurns } }).length +
      20;
    await store.saveThread(full);

    const threads = await store.listThreads();
    expect(threads.map((t) => t.threadId)).toEqual(['current']);
    const saved = await store.getThread('current');
    expect(saved?.messages.length).toBeGreaterThan(0);
    expect(saved?.messages.length).toBeLessThanOrEqual(6);
    expect(saved?.messages[0].role).toBe('user');
  });

  it('gives up silently when even a single turn does not fit', async () => {
    const store = createLocalStoragePersistence({ storage });
    storage.quotaBytes = 10;

    await expect(store.saveThread(chat('t1', turns(1)))).resolves.toBeUndefined();
    expect(storage.length).toBe(0);
  });

  it('never throws when storage access itself fails', async () => {
    const broken = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
      removeItem: () => {
        throw new Error('blocked');
      },
    } as unknown as Storage;
    const store = createLocalStoragePersistence({ storage: broken });

    await expect(store.saveThread(chat('t1', turns(1)))).resolves.toBeUndefined();
    expect(await store.listThreads()).toEqual([]);
    expect(await store.getThread('t1')).toBeNull();
  });

  it('notifies subscribers when another tab changes this key', () => {
    const listener = jest.fn();
    const store = createLocalStoragePersistence({ namespace: 'ns' });
    const unsubscribe = store.subscribe!(listener);
    const key = `cio-asa:chat:v${PERSISTED_CHAT_VERSION}:ns`;

    window.dispatchEvent(new StorageEvent('storage', { key: 'unrelated' }));
    expect(listener).not.toHaveBeenCalled();

    window.dispatchEvent(new StorageEvent('storage', { key }));
    window.dispatchEvent(new StorageEvent('storage', { key: null }));
    expect(listener).toHaveBeenCalledTimes(2);

    unsubscribe();
    window.dispatchEvent(new StorageEvent('storage', { key }));
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('ignores storage events from a different storage area', () => {
    const listener = jest.fn();
    const store = createLocalStoragePersistence({ storage: window.sessionStorage });
    const unsubscribe = store.subscribe!(listener);
    const key = `cio-asa:chat:v${PERSISTED_CHAT_VERSION}`;

    window.dispatchEvent(new StorageEvent('storage', { key, storageArea: window.localStorage }));
    expect(listener).not.toHaveBeenCalled();
    window.dispatchEvent(new StorageEvent('storage', { key, storageArea: window.sessionStorage }));
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it('uses window.localStorage by default', async () => {
    window.localStorage.clear();
    const store = createLocalStoragePersistence();
    await store.saveThread(chat('t1', turns(1)));

    expect(window.localStorage.getItem(`cio-asa:chat:v${PERSISTED_CHAT_VERSION}`)).toContain(
      '"t1"',
    );
    window.localStorage.clear();
  });
});

describe('persistence helpers', () => {
  it('creates local thread ids that are recognized as local', () => {
    const id = createLocalThreadId();
    expect(isLocalThreadId(id)).toBe(true);
    expect(isLocalThreadId('3f1c9a0e-1111-4222-8333-444455556666')).toBe(false);
    expect(isLocalThreadId(null)).toBe(false);
  });

  it('titles a thread with its first user message, truncated', () => {
    expect(getThreadTitle([msg('assistant', 'hi'), msg('user', 'shoes')])).toBe('shoes');
    expect(getThreadTitle([msg('user', 'x'.repeat(100))])).toHaveLength(80);
    expect(getThreadTitle([])).toBe('');
  });

  it('detects a thread whose last answer is still in flight', () => {
    expect(isInFlight([msg('user', 'q'), msg('assistant', '', 'loading')])).toBe(true);
    expect(isInFlight([msg('user', 'q'), msg('assistant', 'par', 'streaming')])).toBe(true);
    expect(isInFlight([msg('user', 'q'), msg('assistant', 'a')])).toBe(false);
    expect(isInFlight([])).toBe(false);
  });

  it('settles in-flight statuses on hydrate', () => {
    const [streamingWithText, loadingEmpty, done] = normalizeHydratedMessages([
      msg('assistant', 'partial', 'streaming'),
      msg('assistant', '', 'loading'),
      msg('assistant', 'ok', 'done'),
    ]);
    expect(streamingWithText.status).toBe('done');
    expect(loadingEmpty.status).toBe('error');
    expect(done.status).toBe('done');
  });
});
