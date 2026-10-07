import {
  clearPersistedConversations,
  createLocalStoragePersistence,
  persistenceNamespace,
  sharedLocalStoragePersistence,
  shopperId,
  storageAreaFor,
} from '../../src/utils/localStoragePersistence';
import { IN_FLIGHT_GRACE_MS, PERSISTED_CHAT_VERSION, getTabId } from '../../src/utils/chatThreads';
import { FakeStorage, chat, msg, turns } from './chatFixtures';
import FakeBroadcastChannel from './fakeBroadcastChannel';

describe('persistenceNamespace', () => {
  it('joins api key, domain and user id, encoding each part', () => {
    expect(persistenceNamespace({ apiKey: 'k', domain: 'chatbot', userId: 'a:b' })).toBe(
      'k:chatbot:a%3Ab',
    );
  });

  it('leaves the user id out for a guest, whether missing, null or empty', () => {
    expect(persistenceNamespace({ apiKey: 'k', domain: 'd' })).toBe('k:d');
    expect(persistenceNamespace({ apiKey: 'k', domain: 'd', userId: null })).toBe('k:d');
    expect(persistenceNamespace({ apiKey: 'k', domain: 'd', userId: '' })).toBe('k:d');
  });

  it('falls back to a default domain only', () => {
    expect(persistenceNamespace({ apiKey: 'k' })).toBe('k:default');
  });
});

describe('shopperId', () => {
  it('is undefined for a guest, whether missing, null or empty', () => {
    expect(shopperId(undefined)).toBeUndefined();
    expect(shopperId(null)).toBeUndefined();
    expect(shopperId('')).toBeUndefined();
  });

  it('is the id as a string for a shopper, a numeric 0 included', () => {
    expect(shopperId('user-1')).toBe('user-1');
    expect(shopperId(42)).toBe('42');
    expect(shopperId(0)).toBe('0');
  });
});

describe('sharedLocalStoragePersistence', () => {
  it('hands out one store per namespace and area for the page', () => {
    const store = sharedLocalStoragePersistence('k:chatbot:u1', 'local');
    expect(sharedLocalStoragePersistence('k:chatbot:u1', 'local')).toBe(store);
    expect(sharedLocalStoragePersistence('k:chatbot:u2', 'local')).not.toBe(store);
    expect(sharedLocalStoragePersistence('k:chatbot:u1', 'session')).not.toBe(store);
  });

  it('is a working store bound to the area it was asked for', async () => {
    window.localStorage.clear();
    const store = sharedLocalStoragePersistence('k:chatbot:shared', 'local');
    await store.saveThread(chat('t1', turns(1)));
    expect(window.localStorage.getItem('cio-asa:chat:v1:k:chatbot:shared')).toContain('t1');
    expect(
      (await sharedLocalStoragePersistence('k:chatbot:shared', 'local').listThreads()).map(
        (t) => t.threadId,
      ),
    ).toEqual(['t1']);
    window.localStorage.clear();
  });
});

describe('storageAreaFor', () => {
  it('puts a guest in sessionStorage and a shopper in localStorage', () => {
    expect(storageAreaFor(undefined)).toBe('session');
    expect(storageAreaFor(null)).toBe('session');
    expect(storageAreaFor('')).toBe('session');
    expect(storageAreaFor('u1')).toBe('local');
  });
});

describe('clearPersistedConversations', () => {
  let storage: FakeStorage;
  const keyFor = (userId?: string) =>
    ['cio-asa:chat', `v${PERSISTED_CHAT_VERSION}`, 'k:chatbot', userId].filter(Boolean).join(':');

  beforeEach(async () => {
    storage = new FakeStorage();
    const guest = createLocalStoragePersistence({ storage, namespace: 'k:chatbot' });
    const user = createLocalStoragePersistence({ storage, namespace: 'k:chatbot:u1' });
    await guest.saveThread(chat('g', turns(1)));
    await user.saveThread(chat('u', turns(1)));
  });

  const threadsIn = (key: string) =>
    Object.keys(JSON.parse(storage.getItem(key) ?? '{"threads":{}}').threads);

  it('deletes one shopper and leaves the guest alone', async () => {
    await clearPersistedConversations({ apiKey: 'k', userId: 'u1', storage });
    expect(threadsIn(keyFor('u1'))).toEqual([]);
    expect(storage.getItem(keyFor())).toContain('g');
  });

  it('deletes the guest history without a user id and leaves shoppers alone', async () => {
    await clearPersistedConversations({ apiKey: 'k', userId: null, storage });
    expect(threadsIn(keyFor())).toEqual([]);
    expect(storage.getItem(keyFor('u1'))).toContain('u');
  });

  it('defaults the domain to the provider default', async () => {
    await clearPersistedConversations({ apiKey: 'k', domain: 'other', userId: 'u1', storage });
    expect(storage.getItem(keyFor('u1'))).toContain('u');
    await clearPersistedConversations({ apiKey: 'k', userId: 'u1', storage });
    expect(threadsIn(keyFor('u1'))).toEqual([]);
  });

  it('leaves tombstones so a copy still held by a tab cannot write the thread back', async () => {
    const user = createLocalStoragePersistence({ storage, namespace: 'k:chatbot:u1' });
    const held = (await user.getThread('u'))!;
    await clearPersistedConversations({ apiKey: 'k', userId: 'u1', storage });
    expect(await user.isThreadDeleted!('u')).toBe(true);

    await user.saveThread({ ...held, updatedAt: Date.now() + 1 });
    expect(await user.getThread('u')).toBeNull();
    expect(await user.listThreads()).toEqual([]);

    const fresh = chat('n', turns(1), Date.now() + 10);
    await user.saveThread({ ...fresh, createdAt: Date.now() + 10 });
    expect((await user.listThreads()).map((t) => t.threadId)).toEqual(['n']);
  });

  it('removes the key outright when nothing was stored under it', async () => {
    storage.removeItem(keyFor('u1'));
    storage.setItem(keyFor('u1'), JSON.stringify({ version: PERSISTED_CHAT_VERSION, threads: {} }));
    await clearPersistedConversations({ apiKey: 'k', userId: 'u1', storage });
    expect(storage.getItem(keyFor('u1'))).toBeNull();
  });

  it('takes the store lock so a save in another tab cannot interleave with the clear', async () => {
    const order: string[] = [];
    const request = jest.fn(async (_name: string, callback: () => void | Promise<void>) => {
      order.push('lock');
      await callback();
    });
    Object.defineProperty(navigator, 'locks', { value: { request }, configurable: true });
    try {
      await clearPersistedConversations({ apiKey: 'k', userId: 'u1', storage });
    } finally {
      Object.defineProperty(navigator, 'locks', { value: undefined, configurable: true });
    }
    expect(request).toHaveBeenCalledWith(keyFor('u1'), expect.any(Function));
    expect(order).toEqual(['lock']);
    expect(threadsIn(keyFor('u1'))).toEqual([]);
  });

  it('clears a shopper from localStorage and the guest from sessionStorage by default', async () => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    await createLocalStoragePersistence({ namespace: 'k:chatbot:u1' }).saveThread(
      chat('u', turns(1)),
    );
    await createLocalStoragePersistence({
      namespace: 'k:chatbot',
      storageArea: 'session',
    }).saveThread(chat('g', turns(1)));

    const threadsOf = (raw: string | null) => Object.keys(JSON.parse(raw ?? '{}').threads ?? {});
    await clearPersistedConversations({ apiKey: 'k', userId: 'u1' });
    expect(threadsOf(window.localStorage.getItem(keyFor('u1')))).toEqual([]);
    expect(window.sessionStorage.getItem(keyFor())).toContain('g');

    await clearPersistedConversations({ apiKey: 'k' });
    expect(threadsOf(window.sessionStorage.getItem(keyFor()))).toEqual([]);
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
});

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

  it('parses the stored blob once while its value is unchanged', async () => {
    const store = createLocalStoragePersistence({ storage });
    const now = Date.now();
    await store.saveThread(chat('t1', turns(1), now - 1));
    const parse = jest.spyOn(JSON, 'parse');

    await store.listThreads();
    await store.getThread('t1');
    await store.isThreadDeleted!('t1');
    expect(parse).toHaveBeenCalledTimes(1);

    await store.saveThread(chat('t2', turns(1), now));
    parse.mockClear();
    expect((await store.listThreads()).map((t) => t.threadId)).toEqual(['t2', 't1']);
    expect(parse).toHaveBeenCalledTimes(1);
    parse.mockRestore();
  });

  it('flags threads whose latest answer is still in flight', async () => {
    const store = createLocalStoragePersistence({ storage });
    await store.saveThread(chat('t1', [msg('user', 'q'), msg('assistant', '', 'loading')]));
    expect((await store.listThreads())[0].inFlight).toBe(true);

    await store.saveThread(chat('t2', [msg('user', 'q'), msg('assistant', '', 'error')]));
    expect((await store.listThreads()).find((t) => t.threadId === 't2')?.inFlight).toBe(false);
  });

  it('stops flagging a thread another tab abandoned mid-stream once the grace period passes', async () => {
    const store = createLocalStoragePersistence({ storage });
    const stalled = {
      ...chat(
        't1',
        [msg('user', 'q'), msg('assistant', '', 'streaming')],
        Date.now() - IN_FLIGHT_GRACE_MS - 1,
      ),
      owner: 'other-tab',
    };
    await store.saveThread(stalled);

    expect((await store.listThreads())[0].inFlight).toBe(false);
  });

  it('keeps flagging a thread this tab is still streaming, however long it takes', async () => {
    const store = createLocalStoragePersistence({ storage });
    const mine = {
      ...chat(
        't1',
        [msg('user', 'q'), msg('assistant', '', 'streaming')],
        Date.now() - IN_FLIGHT_GRACE_MS * 10,
      ),
      owner: getTabId(),
    };
    await store.saveThread(mine);

    expect((await store.listThreads())[0].inFlight).toBe(true);
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

  it('stores nothing when maxThreads is 0', async () => {
    const store = createLocalStoragePersistence({ storage, maxThreads: 0 });
    await store.saveThread(chat('t1', turns(1)));
    expect(await store.listThreads()).toEqual([]);
  });

  it('treats a negative maxThreads as 0 instead of dropping the oldest thread', async () => {
    const seed = createLocalStoragePersistence({ storage });
    await seed.saveThread(chat('t1', turns(1)));
    await seed.saveThread(chat('t2', turns(1)));

    const capped = createLocalStoragePersistence({ storage, maxThreads: -1 });
    await capped.saveThread(chat('t3', turns(1)));

    expect(await capped.getThread('t3')).toBeNull();
    expect((await capped.listThreads()).map((t) => t.threadId).sort()).toEqual(['t1', 't2']);
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

  it('lets the tab that owns a record drop a message from it instead of merging it back', async () => {
    const store = createLocalStoragePersistence({ storage });
    const [user, assistant] = turns(1);
    const owner = 'tab-1';
    const now = Date.now();
    await store.saveThread({ ...chat('t1', [user, assistant], now - 1000), owner });

    // The same tab, writing a later snapshot without the assistant turn: an aborted reply.
    await store.saveThread({ ...chat('t1', [user], now), owner });

    expect((await store.getThread('t1'))?.messages.map((m) => m.id)).toEqual([user.id]);
  });

  it('keeps a turn merged in from another tab when the owner saves again', async () => {
    const store = createLocalStoragePersistence({ storage });
    const [user, assistant] = turns(1);
    const [otherUser, otherAssistant] = turns(1);
    const [nextUser, nextAssistant] = turns(1);
    const now = Date.now();
    await store.saveThread({ ...chat('t1', [user], now - 3000), owner: 'tab-1' });
    await store.saveThread({
      ...chat('t1', [otherUser, otherAssistant], now - 2000),
      owner: 'tab-2',
    });

    // Tab 1 never saw tab 2's turn: neither of its later full views may drop it.
    await store.saveThread({ ...chat('t1', [user, assistant], now - 1000), owner: 'tab-1' });
    await store.saveThread({
      ...chat('t1', [user, assistant, nextUser, nextAssistant], now),
      owner: 'tab-1',
    });

    expect((await store.getThread('t1'))?.messages.map((m) => m.id)).toEqual([
      user.id,
      otherUser.id,
      otherAssistant.id,
      assistant.id,
      nextUser.id,
      nextAssistant.id,
    ]);
  });

  it('still merges a turn another tab added to the same thread', async () => {
    const store = createLocalStoragePersistence({ storage });
    const [user, assistant] = turns(1);
    const now = Date.now();
    await store.saveThread({ ...chat('t1', [user, assistant], now - 1000), owner: 'tab-1' });

    const [user2, assistant2] = turns(1);
    await store.saveThread({ ...chat('t1', [user2, assistant2], now), owner: 'tab-2' });

    expect((await store.getThread('t1'))?.messages.map((m) => m.id)).toEqual([
      user.id,
      assistant.id,
      user2.id,
      assistant2.id,
    ]);
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

  it('skips the commit rather than overwriting when the key keeps changing', async () => {
    const key = `cio-asa:chat:v${PERSISTED_CHAT_VERSION}`;
    const store = createLocalStoragePersistence({ storage });
    await store.saveThread(chat('a', turns(1)));

    let latest = JSON.parse(storage.getItem(key)!);
    let tick = 0;
    storage.beforeGetItem = () => {
      tick += 1;
      latest = {
        ...latest,
        threads: { ...latest.threads, [`other-${tick}`]: chat(`other-${tick}`, turns(1)) },
      };
      storage.poke(key, JSON.stringify(latest));
    };
    await store.saveThread(chat('a', turns(2)));
    storage.beforeGetItem = undefined;

    expect((await store.getThread('a'))?.messages).toHaveLength(2);
    expect((await store.listThreads()).length).toBeGreaterThan(1);
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

  it('evicts the least recently updated thread before the one being saved', async () => {
    const store = createLocalStoragePersistence({ storage });
    const now = Date.now();
    const oldest = chat('oldest', turns(1), now - 3000);
    const newer = chat('newer', turns(1), now - 2000);
    await store.saveThread(oldest);
    await store.saveThread(newer);

    const current = chat('current', turns(1), now - 1000);
    storage.quotaBytes =
      JSON.stringify({
        version: PERSISTED_CHAT_VERSION,
        threads: { newer, current },
        deleted: {},
      }).length + 20;
    await store.saveThread(current);

    expect((await store.listThreads()).map((t) => t.threadId)).toEqual(['current', 'newer']);
  });

  it('writes synchronously for an unloading page, retiring the re-keyed record', async () => {
    const store = createLocalStoragePersistence({ storage });
    await store.saveThread(chat('local-1', turns(1), Date.now() - 1000));

    // A lock whose callback never runs, the way a lock request behaves on an unloading document.
    const request = jest.fn(() => new Promise<void>(() => {}));
    Object.defineProperty(navigator, 'locks', { value: { request }, configurable: true });
    try {
      store.saveThreadSync!(chat('srv-1', turns(1), Date.now()), ['local-1']);
      // Written before control ever left the handler.
      expect(storage.getItem(`cio-asa:chat:v${PERSISTED_CHAT_VERSION}`)).toContain('srv-1');
      expect(request).not.toHaveBeenCalled();
    } finally {
      Object.defineProperty(navigator, 'locks', { value: undefined, configurable: true });
    }

    expect((await store.listThreads()).map((t) => t.threadId)).toEqual(['srv-1']);
    expect(await store.isThreadDeleted!('local-1')).toBe(true);
  });

  it('reports a deleted thread as deleted and an evicted one as merely gone', async () => {
    const store = createLocalStoragePersistence({ storage, maxThreads: 1 });
    await store.saveThread(chat('a', turns(1), Date.now() - 1000));
    await store.saveThread(chat('b', turns(1), Date.now()));

    expect(await store.getThread('a')).toBeNull();
    expect(await store.isThreadDeleted!('a')).toBe(false);

    await store.deleteThread('b');
    expect(await store.isThreadDeleted!('b')).toBe(true);
  });

  it('treats every thread as deleted once the store was cleared from outside', async () => {
    const store = createLocalStoragePersistence({ storage });
    await store.saveThread(chat('a', turns(1), Date.now()));
    expect(await store.isThreadDeleted!('a')).toBe(false);

    storage.clear();
    expect(await store.isThreadDeleted!('a')).toBe(true);
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

  it('never stores a turn without its product cards: the thread is dropped instead', async () => {
    const store = createLocalStoragePersistence({ storage });
    const results = [
      { group: { display_name: 'Picks' }, searchResults: [{ value: 'x'.repeat(2000), data: {} }] },
    ];
    const withResults = chat('current', [
      msg('user', 'more?'),
      { ...msg('assistant', 'Here are more.'), groups: results },
    ]);
    storage.quotaBytes = JSON.stringify(withResults).length - 100;

    await store.saveThread(withResults);

    expect(await store.getThread('current')).toBeNull();
    expect(storage.length).toBe(0);
  });

  it('drops the stored copy of a thread whose new turn does not fit at all', async () => {
    const store = createLocalStoragePersistence({ storage });
    const other = chat('other', turns(1), Date.now() - 2000);
    await store.saveThread(other);
    const question = chat('current', [msg('user', 'q'), msg('assistant', '', 'loading')]);
    await store.saveThread(question);
    storage.quotaBytes = storage.getItem(`cio-asa:chat:v${PERSISTED_CHAT_VERSION}`)!.length + 4;

    await store.saveThread(
      chat('current', [msg('user', 'q'), msg('assistant', 'a'.repeat(400))], Date.now() + 1),
    );

    expect(await store.getThread('current')).toBeNull();
    expect((await store.listThreads()).map((t) => t.threadId)).toEqual(['other']);
  });

  it('removes the key when the only thread no longer fits', async () => {
    const store = createLocalStoragePersistence({ storage });
    await store.saveThread(chat('current', [msg('user', 'q'), msg('assistant', '', 'loading')]));
    storage.quotaBytes = storage.getItem(`cio-asa:chat:v${PERSISTED_CHAT_VERSION}`)!.length + 4;

    await store.saveThread(
      chat('current', [msg('user', 'q'), msg('assistant', 'a'.repeat(400))], Date.now() + 1),
    );

    expect(storage.length).toBe(0);
  });

  it('gives up silently when even a single turn does not fit', async () => {
    const store = createLocalStoragePersistence({ storage });
    storage.quotaBytes = 10;

    await expect(store.saveThread(chat('t1', turns(1)))).resolves.toBeUndefined();
    expect(storage.length).toBe(0);
  });

  it('keeps the other threads when a delete does not fit in storage', async () => {
    const store = createLocalStoragePersistence({ storage });
    await store.saveThread(chat('a', turns(1), Date.now() - 1000));
    await store.saveThread(chat('b', turns(1)));
    storage.quotaBytes = 10;

    await expect(store.deleteThread('a')).resolves.toBeUndefined();

    expect((await store.listThreads()).map((t) => t.threadId).sort()).toEqual(['a', 'b']);
  });

  it('sheds threads before the tombstone of the delete being recorded', async () => {
    const store = createLocalStoragePersistence({ storage });
    await store.saveThread(chat('a', turns(1), Date.now() - 1000));
    await store.saveThread(chat('b', turns(1)));
    const key = `cio-asa:chat:v${PERSISTED_CHAT_VERSION}`;
    const withoutA = JSON.stringify({
      version: PERSISTED_CHAT_VERSION,
      threads: { b: JSON.parse(storage.getItem(key)!).threads.b },
      deleted: {},
    });
    storage.quotaBytes = withoutA.length;

    await store.deleteThread('a');

    // An evicted thread is written back by the tab holding it; a lost tombstone cannot be recovered.
    expect(await store.isThreadDeleted!('a')).toBe(true);
    expect(await store.isThreadDeleted!('b')).toBe(false);
  });

  it('evicts other threads before shedding any tombstone', async () => {
    const store = createLocalStoragePersistence({ storage });
    const key = `cio-asa:chat:v${PERSISTED_CHAT_VERSION}`;
    const kept = chat('c', turns(1));
    await store.saveThread(chat('a', turns(1), Date.now() - 4000));
    await store.saveThread(chat('b', turns(1), Date.now() - 3000));
    await store.saveThread(chat('old', turns(1), Date.now() - 2000));
    await store.saveThread(kept);
    await store.deleteThread('a');
    await store.deleteThread('b');

    // Room for every thread and one tombstone, or for the saved thread and both tombstones.
    const stored = JSON.parse(storage.getItem(key)!);
    storage.quotaBytes = JSON.stringify({
      version: PERSISTED_CHAT_VERSION,
      threads: stored.threads,
      deleted: { b: stored.deleted.b },
    }).length;
    await store.saveThread(kept);

    expect((await store.listThreads()).map((t) => t.threadId)).toEqual(['c']);
    expect(await store.isThreadDeleted!('a')).toBe(true);
    expect(await store.isThreadDeleted!('b')).toBe(true);
  });

  it('sheds the oldest tombstones only when the saved thread alone does not fit', async () => {
    const store = createLocalStoragePersistence({ storage });
    const key = `cio-asa:chat:v${PERSISTED_CHAT_VERSION}`;
    const kept = chat('c', turns(1));
    await store.saveThread(chat('a', turns(1), Date.now() - 2000));
    await store.saveThread(chat('b', turns(1), Date.now() - 1000));
    await store.saveThread(kept);
    await store.deleteThread('a');
    await store.deleteThread('b');

    const stored = JSON.parse(storage.getItem(key)!);
    storage.quotaBytes = JSON.stringify({
      version: PERSISTED_CHAT_VERSION,
      threads: stored.threads,
      deleted: { b: stored.deleted.b },
    }).length;
    await store.saveThread(kept);

    expect((await store.listThreads()).map((t) => t.threadId)).toEqual(['c']);
    expect(Object.keys(JSON.parse(storage.getItem(key)!).deleted)).toEqual(['b']);
  });

  it('removes the key when the last thread is deleted and the tombstone does not fit', async () => {
    const store = createLocalStoragePersistence({ storage });
    await store.saveThread(chat('a', turns(1)));
    storage.quotaBytes = 10;

    await store.deleteThread('a');

    expect(storage.length).toBe(0);
    expect(await store.listThreads()).toEqual([]);
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

  it('uses window.sessionStorage for the session area', async () => {
    window.sessionStorage.clear();
    const key = `cio-asa:chat:v${PERSISTED_CHAT_VERSION}`;
    const store = createLocalStoragePersistence({ storageArea: 'session' });
    await store.saveThread(chat('t1', turns(1)));

    expect(window.sessionStorage.getItem(key)).toContain('"t1"');
    expect(window.localStorage.getItem(key)).toBeNull();
    expect((await store.listThreads()).map((t) => t.threadId)).toEqual(['t1']);
    window.sessionStorage.clear();
  });

  it('only reacts to storage events from its own area', () => {
    const listener = jest.fn();
    const key = `cio-asa:chat:v${PERSISTED_CHAT_VERSION}:area`;
    const store = createLocalStoragePersistence({ namespace: 'area', storageArea: 'session' });
    const unsubscribe = store.subscribe!(listener);
    window.dispatchEvent(new StorageEvent('storage', { key, storageArea: window.localStorage }));
    expect(listener).not.toHaveBeenCalled();
    window.dispatchEvent(new StorageEvent('storage', { key, storageArea: window.sessionStorage }));
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
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
});

describe('expired conversations of every shopper', () => {
  const KEY = `cio-asa:chat:v${PERSISTED_CHAT_VERSION}`;
  const WEEK_AND_A_DAY_AGO = Date.now() - 8 * 24 * 60 * 60 * 1000;
  let storage: FakeStorage;

  const blob = (threads: ReturnType<typeof chat>[], deleted: Record<string, number> = {}) =>
    JSON.stringify({
      version: PERSISTED_CHAT_VERSION,
      threads: Object.fromEntries(threads.map((t) => [t.threadId, t])),
      deleted,
    });
  const storedIds = (key: string, s: Storage = storage) =>
    Object.keys(JSON.parse(s.getItem(key) ?? '{}').threads ?? {});
  const settle = () =>
    new Promise((resolve) => {
      setTimeout(resolve, 0);
    });

  beforeEach(() => {
    storage = new FakeStorage();
  });

  it('drops the expired threads of a shopper who never signs in again, keeping fresh ones', async () => {
    storage.poke(
      `${KEY}:k:d:bob`,
      blob([chat('old', turns(1), WEEK_AND_A_DAY_AGO), chat('fresh', turns(1))]),
    );
    const store = createLocalStoragePersistence({ storage, namespace: 'k:d:alice' });

    await store.listThreads();
    await settle();

    expect(storedIds(`${KEY}:k:d:bob`)).toEqual(['fresh']);
  });

  it('removes a key once nothing in it is left unexpired, tombstones included', async () => {
    storage.poke(
      `${KEY}:k:d:carol`,
      blob([chat('old', turns(1), WEEK_AND_A_DAY_AGO)], { gone: WEEK_AND_A_DAY_AGO }),
    );
    const store = createLocalStoragePersistence({ storage, namespace: 'k:d:alice' });

    await store.getThread('any');
    await settle();

    expect(storage.getItem(`${KEY}:k:d:carol`)).toBeNull();
  });

  it('does not rewrite a record with nothing expired', async () => {
    const raw = blob([chat('fresh', turns(1))], { gone: Date.now() });
    storage.poke(`${KEY}:k:d:bob`, raw);
    const setItem = jest.spyOn(storage, 'setItem');
    const store = createLocalStoragePersistence({ storage, namespace: 'k:d:alice' });

    await store.listThreads();
    await settle();

    expect(storage.getItem(`${KEY}:k:d:bob`)).toBe(raw);
    expect(setItem).not.toHaveBeenCalled();
  });

  it('leaves keys of other versions, other prefixes and unreadable values alone', async () => {
    const expired = blob([chat('old', turns(1), WEEK_AND_A_DAY_AGO)]);
    const untouched = {
      'cio-asa:chat:v2:k:d:bob': expired,
      [`${KEY}x:k:d:bob`]: expired,
      [`${KEY}:k:d:dave`]: 'not json',
      unrelated: expired,
    };
    Object.entries(untouched).forEach(([key, value]) => storage.poke(key, value));
    const store = createLocalStoragePersistence({ storage, namespace: 'k:d:alice' });

    await store.listThreads();
    await settle();

    Object.entries(untouched).forEach(([key, value]) => expect(storage.getItem(key)).toBe(value));
  });

  it('follows the store key and ttl', async () => {
    storage.poke(
      'my-chat:v1:k:d:bob',
      blob([chat('old', turns(1), Date.now() - 5000), chat('new', turns(1))]),
    );
    const store = createLocalStoragePersistence({ storage, key: 'my-chat', ttlMs: 1000 });

    await store.listThreads();
    await settle();

    expect(storedIds('my-chat:v1:k:d:bob')).toEqual(['new']);
  });

  it('cleans localStorage when the store keeps a guest in sessionStorage', async () => {
    window.localStorage.setItem(
      `${KEY}:k:d:bob`,
      blob([chat('old', turns(1), WEEK_AND_A_DAY_AGO)]),
    );
    try {
      const store = createLocalStoragePersistence({ namespace: 'k:d', storageArea: 'session' });

      await store.listThreads();
      await settle();

      expect(window.localStorage.getItem(`${KEY}:k:d:bob`)).toBeNull();
    } finally {
      window.localStorage.clear();
      window.sessionStorage.clear();
    }
  });

  it('cleans once per store', async () => {
    const store = createLocalStoragePersistence({ storage, namespace: 'k:d:alice' });
    await store.listThreads();
    await settle();

    storage.poke(`${KEY}:k:d:bob`, blob([chat('old', turns(1), WEEK_AND_A_DAY_AGO)]));
    await store.listThreads();
    await settle();

    expect(storedIds(`${KEY}:k:d:bob`)).toEqual(['old']);
  });

  it('still reads when the storage cannot list its keys', async () => {
    jest.spyOn(storage, 'key').mockImplementation(() => {
      throw new Error('blocked');
    });
    const store = createLocalStoragePersistence({ storage, namespace: 'k:d:alice' });
    await store.saveThread(chat('t1', turns(1)));

    await expect(store.listThreads()).resolves.toHaveLength(1);
  });
});

describe('abort requests across tabs', () => {
  const original = (globalThis as { BroadcastChannel?: unknown }).BroadcastChannel;

  beforeEach(() => {
    (globalThis as { BroadcastChannel?: unknown }).BroadcastChannel = FakeBroadcastChannel;
  });

  afterEach(() => {
    FakeBroadcastChannel.open.clear();
    (globalThis as { BroadcastChannel?: unknown }).BroadcastChannel = original;
  });

  it('delivers a request to the other tabs of the same store', () => {
    const storage = new FakeStorage();
    const tabA = createLocalStoragePersistence({ storage, namespace: 'k:d:alice' });
    const tabB = createLocalStoragePersistence({ storage, namespace: 'k:d:alice' });
    const listener = jest.fn();
    tabA.subscribeAbort!(listener);

    tabB.requestAbort!('t1', 'm1');

    expect(listener).toHaveBeenCalledWith({ threadId: 't1', messageId: 'm1' });
  });

  it('does not reach another shopper, or a listener that unsubscribed', () => {
    const storage = new FakeStorage();
    const alice = createLocalStoragePersistence({ storage, namespace: 'k:d:alice' });
    const bob = createLocalStoragePersistence({ storage, namespace: 'k:d:bob' });
    const otherTab = createLocalStoragePersistence({ storage, namespace: 'k:d:alice' });
    const bobListener = jest.fn();
    const aliceListener = jest.fn();
    bob.subscribeAbort!(bobListener);
    otherTab.subscribeAbort!(aliceListener)();

    alice.requestAbort!('t1', 'm1');

    expect(bobListener).not.toHaveBeenCalled();
    expect(aliceListener).not.toHaveBeenCalled();
  });

  it('ignores messages that are not abort requests', () => {
    const storage = new FakeStorage();
    const store = createLocalStoragePersistence({ storage, namespace: 'k:d:alice' });
    const listener = jest.fn();
    store.subscribeAbort!(listener);

    new FakeBroadcastChannel('cio-asa:chat:v1:k:d:alice:abort').postMessage({ messageId: 1 });

    expect(listener).not.toHaveBeenCalled();
  });

  it('offers no abort channel for sessionStorage, where no other tab can see the thread', () => {
    const store = createLocalStoragePersistence({ namespace: 'k:d', storageArea: 'session' });
    expect(store.requestAbort).toBeUndefined();
    expect(store.subscribeAbort).toBeUndefined();
  });

  it('offers no abort channel without BroadcastChannel', () => {
    (globalThis as { BroadcastChannel?: unknown }).BroadcastChannel = undefined;
    const store = createLocalStoragePersistence({ storage: new FakeStorage() });
    expect(store.requestAbort).toBeUndefined();
    expect(store.subscribeAbort).toBeUndefined();
  });
});
