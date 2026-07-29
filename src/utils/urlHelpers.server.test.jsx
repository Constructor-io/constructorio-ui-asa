import { getUrl, setUrl } from './urlHelpers';

describe('urlHelpers (SSR)', () => {
  it('getUrl returns undefined when window is not defined', () => {
    expect(typeof window).toBe('undefined');
    expect(getUrl()).toBeUndefined();
  });

  it('setUrl is a no-op on the server', () => {
    expect(() => setUrl('https://example.com')).not.toThrow();
  });
});
