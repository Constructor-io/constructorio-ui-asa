import { renderHook } from '@testing-library/react';
import type ConstructorIOClient from '@constructor-io/constructorio-client-javascript';
import useCioClient from '../../src/hooks/useCioClient';
import { DEMO_API_KEY } from '../../src/constants';

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
});
