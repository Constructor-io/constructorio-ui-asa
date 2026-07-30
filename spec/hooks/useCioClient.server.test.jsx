import { renderHookServerSide } from '../test-utils.server';
import useCioClient from '../../src/hooks/useCioClient';
import { DEMO_API_KEY } from '../../src/constants';

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

  it('prefers a provided client over an apiKey', () => {
    const fakeClient = { agent: {} };
    const { result } = renderHookServerSide(() =>
      useCioClient({ apiKey: DEMO_API_KEY, cioClient: fakeClient }),
    );
    expect(result).toBe(fakeClient);
  });

  it('throws when given neither an apiKey nor a client', () => {
    expect(() => renderHookServerSide(() => useCioClient({}))).toThrow(
      /Api Key or Constructor Client required/,
    );
  });

  it('renders no markup of its own', () => {
    const { html } = renderHookServerSide(() => useCioClient({ apiKey: DEMO_API_KEY }));
    expect(html).toBe('');
  });
});
