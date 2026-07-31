import { renderHookServerSide, renderHookServerSideWithCioAsa } from '../test-utils.server';
import { useCioAsaContext } from '../../src/hooks/useCioAsaContext';
import { createMockCioClient } from '../local_examples/mockCioClient';
import { DEMO_API_KEY } from '../../src/constants';

describe('useCioAsaContext (SSR)', () => {
  it('returns null when rendered outside a provider', () => {
    const { result } = renderHookServerSide(() => useCioAsaContext());

    expect(result).toBeNull();
  });

  it('returns the provider context value on the server', () => {
    const { client } = createMockCioClient();

    const { result } = renderHookServerSideWithCioAsa(() => useCioAsaContext(), {
      cioClient: client,
    });

    expect(result).toMatchObject({
      cioClient: client,
      staticRequestConfigs: { domain: 'chatbot' },
    });
    expect(typeof result.setCioClientOptions).toBe('function');
  });

  it('starts with empty cioClientOptions on the server', () => {
    const { result } = renderHookServerSideWithCioAsa(() => useCioAsaContext(), {
      apiKey: DEMO_API_KEY,
    });

    expect(result.cioClientOptions).toEqual({});
  });
});
