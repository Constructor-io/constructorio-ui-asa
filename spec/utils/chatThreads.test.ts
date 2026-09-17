import {
  createLocalThreadId,
  findRekeyedThread,
  foreignStreamRemainingMs,
  getTabId,
  getThreadTitle,
  IN_FLIGHT_GRACE_MS,
  isInFlight,
  isLocalThreadId,
  mergeMessages,
  nextMessageCounter,
  normalizeHydratedMessages,
  saveThreadAndRetireStale,
} from '../../src/utils/chatThreads';
import type { PersistedChat } from '../../src/types';
import { createLocalStoragePersistence } from '../../src/utils/localStoragePersistence';
import { FakeStorage, chat, msg, turns } from './chatFixtures';

describe('thread and message helpers', () => {
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
    getThread: jest.fn(async (id: string): Promise<PersistedChat | null> => chat(id, [])),
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

  it('keeps the stale record when the read-back is older than this save', async () => {
    const store = mockStore();
    const snapshot = chat('t1', []);
    store.getThread.mockResolvedValueOnce({ ...snapshot, updatedAt: snapshot.updatedAt - 1 });
    await expect(saveThreadAndRetireStale(store, snapshot, 'local-1')).resolves.toBe('local-1');
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

describe('tab id fallback', () => {
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
          require('../../src/utils/chatThreads') as typeof import('../../src/utils/chatThreads');
        const id = fresh.getTabId();
        expect(id).toEqual(expect.any(String));
        expect(fresh.getTabId()).toBe(id);
      });
    } finally {
      Object.defineProperty(window, 'sessionStorage', original);
    }
  });
});
