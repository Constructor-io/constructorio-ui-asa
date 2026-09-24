import { createLocalStoragePersistence } from '../../src/utils/localStoragePersistence';

describe('createLocalStoragePersistence (SSR)', () => {
  it('is a no-op without window', async () => {
    const store = createLocalStoragePersistence();

    await expect(store.listThreads()).resolves.toEqual([]);
    await expect(store.getThread('t1')).resolves.toBeNull();
    await expect(
      store.saveThread({ version: 1, threadId: 't1', messages: [], createdAt: 1, updatedAt: 1 }),
    ).resolves.toBeUndefined();
    await expect(store.deleteThread('t1')).resolves.toBeUndefined();
    expect(() => store.subscribe(() => {})()).not.toThrow();
  });
});
