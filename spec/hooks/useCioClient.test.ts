import { renderHook } from '@testing-library/react';
import type ConstructorIOClient from '@constructor-io/constructorio-client-javascript';
import useCioClient from '../../src/hooks/useCioClient';
import { DEMO_API_KEY } from '../../src/constants';

type ClientWithOptions = {
  options: {
    testCells?: Record<string, string>;
    segments?: string[];
    sessionId?: number;
    clientId?: string;
  };
};
const optionsOf = (client: unknown) => (client as ClientWithOptions).options;

describe('useCioClient', () => {
  it('throws when neither apiKey nor cioClient is provided', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useCioClient({}))).toThrow(
      /Api Key or Constructor Client required/,
    );
    spy.mockRestore();
  });

  it('returns the provided cioClient as-is', () => {
    const fakeClient = { agent: {} } as unknown as ConstructorIOClient;
    const { result } = renderHook(() => useCioClient({ cioClient: fakeClient }));
    expect(result.current).toBe(fakeClient);
  });

  it('creates a client instance when only an apiKey is provided', () => {
    const { result } = renderHook(() => useCioClient({ apiKey: DEMO_API_KEY }));
    expect(result.current).not.toBeNull();
    expect(result.current).toHaveProperty('agent');
  });

  it('memoizes the client across re-renders with stable inputs', () => {
    const { result, rerender } = renderHook(() => useCioClient({ apiKey: DEMO_API_KEY }));
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
  });

  it('prefers an explicit cioClient over apiKey', () => {
    const fakeClient = { agent: {} } as unknown as ConstructorIOClient;
    const { result } = renderHook(() =>
      useCioClient({ apiKey: DEMO_API_KEY, cioClient: fakeClient }),
    );
    expect(result.current).toBe(fakeClient);
  });

  it('forwards test cells to the client it builds', () => {
    const { result } = renderHook(() =>
      useCioClient({ apiKey: DEMO_API_KEY, testCells: { constructorio: 'variant_a' } }),
    );

    expect((result.current as unknown as ClientWithOptions).options.testCells).toEqual({
      constructorio: 'variant_a',
    });
  });

  it('keeps the same client when test cells are rebuilt with equal contents', () => {
    const { result, rerender } = renderHook((props) => useCioClient(props), {
      initialProps: { apiKey: DEMO_API_KEY, testCells: { constructorio: 'variant_a' } },
    });
    const first = result.current;

    rerender({ apiKey: DEMO_API_KEY, testCells: { constructorio: 'variant_a' } });

    expect(result.current).toBe(first);
  });

  it('warns rather than silently dropping test cells passed alongside a client', () => {
    const fakeClient = { agent: {} } as unknown as ConstructorIOClient;
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});

    renderHook(() =>
      useCioClient({ cioClient: fakeClient, testCells: { constructorio: 'variant_a' } }),
    );

    expect(warn).toHaveBeenCalledWith(expect.stringContaining('testCells is ignored'));

    warn.mockRestore();
  });

  describe("matching the site beacon's session", () => {
    const expire = (name: string) => {
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:01 GMT; path=/`;
    };
    const setBeaconSession = (sessionId: number, minutesAgo: number) => {
      document.cookie = `ConstructorioID_session=${JSON.stringify({
        sessionId,
        lastTime: Date.now() - minutesAgo * 60 * 1000,
      })}; path=/`;
    };

    beforeEach(() => {
      document.cookie = 'ConstructorioID_client_id=beacon-client; path=/';
    });

    afterEach(() => {
      [
        'ConstructorioID_session',
        'ConstructorioID_session_id',
        'ConstructorioID_client_id',
      ].forEach(expire);
      localStorage.clear();
    });

    it('leaves the client as it was when there is no beacon cookie', () => {
      expire('ConstructorioID_client_id');
      localStorage.setItem(
        '_constructorio_search_session',
        JSON.stringify({ sessionId: 3, lastTime: Date.now() }),
      );

      const { result } = renderHook(() => useCioClient({ apiKey: DEMO_API_KEY }));

      expect(optionsOf(result.current).sessionId).toBe(3);
    });

    it("uses the beacon's session number and client id for a fresh session", () => {
      setBeaconSession(4, 5);

      const { result } = renderHook(() => useCioClient({ apiKey: DEMO_API_KEY }));

      expect(optionsOf(result.current).sessionId).toBe(4);
      expect(optionsOf(result.current).clientId).toBe('beacon-client');
    });

    it('moves to the next session number when the beacon session is over 30 minutes old', () => {
      setBeaconSession(4, 31);

      const { result } = renderHook(() => useCioClient({ apiKey: DEMO_API_KEY }));

      expect(optionsOf(result.current).sessionId).toBe(5);
    });

    it('leaves the client as it was when the cookie is malformed', () => {
      document.cookie = 'ConstructorioID_session=4; path=/';
      localStorage.setItem(
        '_constructorio_search_session',
        JSON.stringify({ sessionId: 2, lastTime: Date.now() }),
      );

      const { result } = renderHook(() => useCioClient({ apiKey: DEMO_API_KEY }));

      expect(optionsOf(result.current).sessionId).toBe(2);
    });

    it('writes no cookie and no session storage of its own', () => {
      setBeaconSession(4, 5);
      const before = document.cookie;

      renderHook(() => useCioClient({ apiKey: DEMO_API_KEY }));

      expect(document.cookie).toBe(before);
      expect(localStorage.getItem('_constructorio_search_session')).toBeNull();
    });

    it("leaves the caller's idOptions alone", () => {
      setBeaconSession(4, 5);
      localStorage.setItem(
        '_constructorio_search_session',
        JSON.stringify({ sessionId: 9, lastTime: Date.now() }),
      );

      const { result } = renderHook(() =>
        useCioClient({
          apiKey: DEMO_API_KEY,
          cioClientOptions: { idOptions: { session_id_storage_location: 'local' } },
        }),
      );

      expect(optionsOf(result.current).sessionId).toBe(9);
    });

    it("leaves a caller's own client alone", () => {
      setBeaconSession(4, 5);
      const fakeClient = { agent: {} } as unknown as ConstructorIOClient;

      const { result } = renderHook(() =>
        useCioClient({ apiKey: DEMO_API_KEY, cioClient: fakeClient }),
      );

      expect(result.current).toBe(fakeClient);
    });

    it('applies cioClientOptions last, so they win', () => {
      setBeaconSession(4, 5);

      const { result } = renderHook(() =>
        useCioClient({
          apiKey: DEMO_API_KEY,
          testCells: { constructorio: 'variant_a' },
          cioClientOptions: { testCells: { constructorio: 'variant_b' }, segments: ['vip'] },
        }),
      );

      expect(optionsOf(result.current).testCells).toEqual({ constructorio: 'variant_b' });
      expect(optionsOf(result.current).segments).toEqual(['vip']);
      expect(optionsOf(result.current).sessionId).toBe(4);
    });
  });
});
