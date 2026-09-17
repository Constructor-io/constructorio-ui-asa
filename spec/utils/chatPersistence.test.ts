import {
  createLocalStoragePersistence,
  createLocalThreadId,
  findRekeyedThread,
  foreignStreamRemainingMs,
  getTabId,
  IN_FLIGHT_GRACE_MS,
  getThreadTitle,
  isLocalThreadId,
  isInFlight,
  mergeMessages,
  nextMessageCounter,
  normalizeHydratedMessages,
  PERSISTED_CHAT_VERSION,
  saveThreadAndRetireStale,
} from '../../src/utils/chatPersistence';
import type { ChatMessage, PersistedChat } from '../../src/types';

class FakeStorage implements Storage {
  private map = new Map<string, string>();

  quotaBytes = Infinity;

  beforeGetItem?: () => void;

  get length() {
    return this.map.size;
  }

  key(index: number) {
    return Array.from(this.map.keys())[index] ?? null;
  }

  getItem(key: string) {
    this.beforeGetItem?.();
    return this.map.get(key) ?? null;
  }

  poke(key: string, value: string) {
    this.map.set(key, value);
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

  it('does not let an older snapshot regress a message settled by a newer one', async () => {
    const store = createLocalStoragePersistence({ storage });
    const [user, assistant] = turns(1);
    const t = Date.now();
    await store.saveThread(chat('t1', [user, { ...assistant, status: 'done', text: 'final' }], t));
    const [lateUser, lateAssistant] = turns(1);
    await store.saveThread(
      chat(
        't1',
        [user, { ...assistant, status: 'loading', text: '' }, lateUser, lateAssistant],
        t - 1000,
      ),
    );

    const saved = await store.getThread('t1');
    expect(saved?.messages.map((m) => m.id)).toEqual(
      [user, assistant, lateUser, lateAssistant].map((m) => m.id),
    );
    expect(saved?.messages[1]).toMatchObject({ status: 'done', text: 'final' });
    expect(saved?.updatedAt).toBe(t);
    expect((await store.listThreads())[0].inFlight).toBe(false);
  });

  it('redoes the merge when another tab writes between read and commit', async () => {
    const key = `cio-asa:chat:v${PERSISTED_CHAT_VERSION}`;
    const store = createLocalStoragePersistence({ storage });
    await store.saveThread(chat('a', turns(1)));

    const fromOtherTab = chat('b', turns(1));
    let reads = 0;
    storage.beforeGetItem = () => {
      reads += 1;
      if (reads === 2) {
        const current = JSON.parse(storage.getItem(key)!);
        current.threads.b = fromOtherTab;
        storage.poke(key, JSON.stringify(current));
      }
    };
    await store.saveThread(chat('a', turns(2)));
    storage.beforeGetItem = undefined;

    const ids = (await store.listThreads()).map((t) => t.threadId).sort();
    expect(ids).toEqual(['a', 'b']);
    expect((await store.getThread('a'))?.messages).toHaveLength(6);
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

  it('drops records with malformed messages or a missing createdAt', async () => {
    const key = `cio-asa:chat:v${PERSISTED_CHAT_VERSION}`;
    const store = createLocalStoragePersistence({ storage });
    const good = chat('good', turns(1));
    const { createdAt, ...noCreatedAt } = chat('no-created', turns(1));
    storage.setItem(
      key,
      JSON.stringify({
        version: PERSISTED_CHAT_VERSION,
        threads: {
          good,
          nulls: { ...chat('nulls', turns(1)), messages: [null] },
          shape: { ...chat('shape', turns(1)), messages: [{ id: 'x', role: 'ghost', text: 1 }] },
          'no-created': noCreatedAt,
        },
      }),
    );

    expect((await store.listThreads()).map((t) => t.threadId)).toEqual(['good']);
  });

  it('drops records whose result groups or refinement are malformed', async () => {
    const key = `cio-asa:chat:v${PERSISTED_CHAT_VERSION}`;
    const store = createLocalStoragePersistence({ storage });
    const good = { ...chat('good', turns(1)), owner: 'tab-1' };
    good.messages[1].groups = [
      { group: { display_name: 'Shoes', value: 'shoes' }, searchResults: [{ id: '1' }] },
    ];
    good.messages[1].refinement = { question: 'Which?', options: ['a', 'b'] };
    const nullGroup = chat('null-group', turns(1));
    (nullGroup.messages[1] as { groups: unknown }).groups = [null];
    const noResults = chat('no-results', turns(1));
    (noResults.messages[1] as { groups: unknown }).groups = [{ group: { display_name: 'x' } }];
    const badRefinement = chat('bad-refinement', turns(1));
    (badRefinement.messages[1] as { refinement: unknown }).refinement = {};
    storage.setItem(
      key,
      JSON.stringify({
        version: PERSISTED_CHAT_VERSION,
        threads: {
          good,
          'null-group': nullGroup,
          'no-results': noResults,
          'bad-refinement': badRefinement,
          'bad-owner': { ...chat('bad-owner', turns(1)), owner: 7 },
        },
      }),
    );

    expect((await store.listThreads()).map((t) => t.threadId)).toEqual(['good']);
    expect(await store.getThread('good')).toEqual(good);
  });

  it('serializes writes through navigator.locks when the browser offers it', async () => {
    const request = jest.fn((_name: string, cb: () => Promise<void>) => cb());
    Object.defineProperty(navigator, 'locks', { value: { request }, configurable: true });
    try {
      const store = createLocalStoragePersistence({ storage, namespace: 'lock' });
      await store.saveThread(chat('t1', turns(1)));
      await store.deleteThread('t1');
      expect(request).toHaveBeenCalledTimes(2);
      expect(request.mock.calls[0][0]).toBe(`cio-asa:chat:v${PERSISTED_CHAT_VERSION}:lock`);
      expect(await store.listThreads()).toEqual([]);
    } finally {
      Object.defineProperty(navigator, 'locks', { value: undefined, configurable: true });
    }
  });

  it('keeps the newest updatedAt when an older snapshot is merged in', async () => {
    const store = createLocalStoragePersistence({ storage });
    const newer = Date.now();
    await store.saveThread(chat('t1', turns(2), newer));
    await store.saveThread(chat('t1', turns(1), newer - 60_000));

    expect((await store.getThread('t1'))?.updatedAt).toBe(newer);
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

  it('keeps the other threads when a new thread does not fit even trimmed', async () => {
    const store = createLocalStoragePersistence({ storage });
    const other = chat('other', turns(1), Date.now() - 1000);
    await store.saveThread(other);
    storage.quotaBytes = storage.getItem(`cio-asa:chat:v${PERSISTED_CHAT_VERSION}`)!.length + 40;

    const huge = chat('huge', [msg('user', 'x'.repeat(500)), msg('assistant', 'y'.repeat(500))]);
    await store.saveThread(huge);

    expect((await store.listThreads()).map((t) => t.threadId)).toEqual(['other']);
    expect(await store.getThread('huge')).toBeNull();
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

  it('ignores sessionStorage events when using the default localStorage', () => {
    const listener = jest.fn();
    const store = createLocalStoragePersistence({ namespace: 'area' });
    const unsubscribe = store.subscribe!(listener);
    const key = `cio-asa:chat:v${PERSISTED_CHAT_VERSION}:area`;

    window.dispatchEvent(new StorageEvent('storage', { key, storageArea: window.sessionStorage }));
    expect(listener).not.toHaveBeenCalled();
    window.dispatchEvent(new StorageEvent('storage', { key, storageArea: window.localStorage }));
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
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
  it('keeps one tab id per tab, backed by sessionStorage', () => {
    const id = getTabId();
    expect(id).toEqual(expect.any(String));
    expect(getTabId()).toBe(id);
    expect(window.sessionStorage.getItem('cio-asa:tab')).toBe(id);
  });

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
    const [streamingWithText, loadingEmpty, done, refinementOnly] = normalizeHydratedMessages([
      msg('assistant', 'partial', 'streaming'),
      msg('assistant', '', 'loading'),
      msg('assistant', 'ok', 'done'),
      {
        ...msg('assistant', '', 'streaming'),
        refinement: { question: 'Who is it for?', options: ['Men', 'Women'] },
      },
    ]);
    expect(streamingWithText.status).toBe('done');
    expect(loadingEmpty.status).toBe('error');
    expect(done.status).toBe('done');
    expect(refinementOnly.status).toBe('done');
  });

  it('continues message counters from the highest restored id', () => {
    expect(nextMessageCounter([])).toBe(0);
    expect(nextMessageCounter([msg('user', 'a'), msg('assistant', 'b')])).toBe(2);
    expect(
      nextMessageCounter([
        { ...msg('user', 'a'), id: 'msg-41-1' },
        { ...msg('assistant', 'b'), id: 'msg-42-1' },
      ]),
    ).toBe(42);
  });
});

describe('mergeMessages', () => {
  it('appends messages only the incoming list has, after the stored ones', () => {
    const [a, b, c] = turns(2).slice(0, 3);
    const merged = mergeMessages([a, b], [b, c]);
    expect(merged.map((m) => m.id)).toEqual([a.id, b.id, c.id]);
  });

  it('takes the incoming version of a message both lists have', () => {
    const a = msg('assistant', 'a', 'streaming');
    const merged = mergeMessages([a], [{ ...a, status: 'done' }]);
    expect(merged[0].status).toBe('done');
  });

  it('keeps the stored version when asked to prefer it', () => {
    const a = msg('assistant', 'a', 'done');
    const b = msg('assistant', 'b');
    const merged = mergeMessages([a], [{ ...a, status: 'streaming' }, b], true);
    expect(merged.map((m) => [m.id, m.status])).toEqual([
      [a.id, 'done'],
      [b.id, 'done'],
    ]);
  });
});

describe('saveThreadAndRetireStale', () => {
  const mockStore = () => ({
    listThreads: jest.fn(async () => []),
    getThread: jest.fn(async (id: string) => chat(id, [])),
    saveThread: jest.fn(async () => {}),
    deleteThread: jest.fn(async () => {}),
  });

  it('saves and leaves nothing behind when there is no stale id', async () => {
    const store = mockStore();
    const snapshot = chat('t1', []);
    await expect(saveThreadAndRetireStale(store, snapshot, null)).resolves.toBeNull();
    expect(store.saveThread).toHaveBeenCalledWith(snapshot);
    expect(store.deleteThread).not.toHaveBeenCalled();
  });

  it('deletes the stale record once the new one is confirmed', async () => {
    const store = mockStore();
    await expect(saveThreadAndRetireStale(store, chat('t1', []), 'local-1')).resolves.toBeNull();
    expect(store.getThread).toHaveBeenCalledWith('t1');
    expect(store.deleteThread).toHaveBeenCalledWith('local-1');
  });

  it('keeps the stale record when the save fails', async () => {
    const store = mockStore();
    store.saveThread.mockRejectedValueOnce(new Error('boom'));
    await expect(saveThreadAndRetireStale(store, chat('t1', []), 'local-1')).resolves.toBe(
      'local-1',
    );
    expect(store.deleteThread).not.toHaveBeenCalled();
  });

  it('keeps the stale record when the new one cannot be read back', async () => {
    const store = mockStore();
    store.getThread.mockResolvedValueOnce(null);
    await expect(saveThreadAndRetireStale(store, chat('t1', []), 'local-1')).resolves.toBe(
      'local-1',
    );
    expect(store.deleteThread).not.toHaveBeenCalled();
  });

  it('swallows a failing delete', async () => {
    const store = mockStore();
    store.deleteThread.mockRejectedValueOnce(new Error('boom'));
    await expect(saveThreadAndRetireStale(store, chat('t1', []), 'local-1')).resolves.toBeNull();
  });
});

describe('findRekeyedThread', () => {
  it('finds the server thread that starts with the same message', async () => {
    const store = createLocalStoragePersistence({ storage: new FakeStorage() });
    const first = msg('user', 'q');
    await store.saveThread(chat('local-1', [first]));
    await store.saveThread(chat('srv-other', [msg('user', 'other')]));
    await store.saveThread(chat('srv-1', [first, msg('assistant', 'a')]));

    const found = await findRekeyedThread(store, first.id);
    expect(found?.threadId).toBe('srv-1');
  });

  it('returns null without a first message id or without a match', async () => {
    const store = createLocalStoragePersistence({ storage: new FakeStorage() });
    await store.saveThread(chat('srv-1', [msg('user', 'q')]));

    await expect(findRekeyedThread(store, undefined)).resolves.toBeNull();
    await expect(findRekeyedThread(store, 'nope')).resolves.toBeNull();
  });
});

describe('foreignStreamRemainingMs', () => {
  const streaming = (updatedAt: number, owner?: string): PersistedChat => ({
    ...chat('t', [msg('user', 'q'), msg('assistant', '', 'streaming')], updatedAt),
    owner,
  });

  it('is zero for a finished answer', () => {
    expect(foreignStreamRemainingMs(chat('t', turns(1)), 5000)).toBe(0);
  });

  it('counts down the grace period from the last write', () => {
    expect(foreignStreamRemainingMs(streaming(1000), 1000 + 10_000)).toBe(
      IN_FLIGHT_GRACE_MS - 10_000,
    );
  });

  it('is zero once the grace period has passed', () => {
    expect(foreignStreamRemainingMs(streaming(1000), 1000 + IN_FLIGHT_GRACE_MS)).toBe(0);
  });

  it('is zero for a record this tab wrote itself', () => {
    expect(foreignStreamRemainingMs(streaming(1000, getTabId()), 1000)).toBe(0);
  });

  it('treats a record from another tab as streaming', () => {
    expect(foreignStreamRemainingMs(streaming(1000, 'other-tab'), 1000)).toBe(IN_FLIGHT_GRACE_MS);
  });
});

describe('storage fallbacks', () => {
  it('still runs the write when the lock request rejects before running it', async () => {
    const request = jest.fn(() => Promise.reject(new Error('locks unavailable')));
    Object.defineProperty(navigator, 'locks', { value: { request }, configurable: true });
    try {
      const storage = new FakeStorage();
      const store = createLocalStoragePersistence({ storage, namespace: 'nolock' });
      await store.saveThread(chat('t1', turns(1)));
      expect((await store.listThreads()).map((t) => t.threadId)).toEqual(['t1']);
    } finally {
      Object.defineProperty(navigator, 'locks', { value: undefined, configurable: true });
    }
  });

  it('is a no-op when localStorage access itself throws', async () => {
    const original = Object.getOwnPropertyDescriptor(window, 'localStorage')!;
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get() {
        throw new Error('blocked');
      },
    });
    try {
      const store = createLocalStoragePersistence();
      await expect(store.saveThread(chat('t1', turns(1)))).resolves.toBeUndefined();
      await expect(store.listThreads()).resolves.toEqual([]);
    } finally {
      Object.defineProperty(window, 'localStorage', original);
    }
  });

  it('falls back to an in-memory tab id when sessionStorage is blocked', () => {
    const original = Object.getOwnPropertyDescriptor(window, 'sessionStorage')!;
    Object.defineProperty(window, 'sessionStorage', {
      configurable: true,
      get() {
        throw new Error('blocked');
      },
    });
    try {
      jest.isolateModules(() => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
        const fresh =
          require('../../src/utils/chatPersistence') as typeof import('../../src/utils/chatPersistence');
        const id = fresh.getTabId();
        expect(id).toEqual(expect.any(String));
        expect(fresh.getTabId()).toBe(id);
      });
    } finally {
      Object.defineProperty(window, 'sessionStorage', original);
    }
  });
});
