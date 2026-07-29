import { renderHookServerSide } from '../../spec/test-utils.server';
import useCioClient from './useCioClient';
import { DEMO_API_KEY } from '../constants';

describe('useCioClient (SSR)', () => {
  it('returns null when rendered on the server with only an apiKey', () => {
    const { result } = renderHookServerSide(() => useCioClient({ apiKey: DEMO_API_KEY }));
    expect(result).toBeNull();
  });

  it('still returns a provided client on the server', () => {
    const fakeClient = { agent: {} };
    const { result } = renderHookServerSide(() => useCioClient({ cioClient: fakeClient }));
    expect(result).toBe(fakeClient);
  });
});
