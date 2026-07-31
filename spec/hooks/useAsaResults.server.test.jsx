import { renderHookServerSide, renderHookServerSideWithCioAsa } from '../test-utils.server';
import useAsaResults from '../../src/hooks/useAsaResults';
import { createMockCioClient } from '../local_examples/mockCioClient';
import { DEMO_API_KEY } from '../../src/constants';

describe('useAsaResults (SSR)', () => {
  it('throws when used outside a CioAsaProvider', () => {
    expect(() => renderHookServerSide(() => useAsaResults())).toThrow(
      /must be used within a CioAsaProvider/,
    );
  });

  it('throws on the server when the provider has no client, as an apiKey alone builds none', () => {
    expect(() =>
      renderHookServerSideWithCioAsa(() => useAsaResults(), { apiKey: DEMO_API_KEY }),
    ).toThrow(/requires a configured cioClient and domain/);
  });

  it('returns an empty, idle conversation on the server', () => {
    const { client } = createMockCioClient();

    const { result } = renderHookServerSideWithCioAsa(() => useAsaResults(), {
      cioClient: client,
    });

    expect(result.messages).toEqual([]);
    expect(result.isStreaming).toBe(false);
  });

  it('exposes the consumer API on the server', () => {
    const { client } = createMockCioClient();

    const { result } = renderHookServerSideWithCioAsa(() => useAsaResults(), {
      cioClient: client,
    });

    expect(typeof result.sendMessage).toBe('function');
    expect(typeof result.clearHistory).toBe('function');
  });

  it('does not request a stream during server rendering', () => {
    const { client, getAgentResultsStream } = createMockCioClient();

    renderHookServerSideWithCioAsa(() => useAsaResults(), { cioClient: client });

    expect(getAgentResultsStream).not.toHaveBeenCalled();
  });

  it('ignores blank messages without touching the client', () => {
    const { client, getAgentResultsStream } = createMockCioClient();

    const { result } = renderHookServerSideWithCioAsa(() => useAsaResults(), {
      cioClient: client,
    });
    result.sendMessage('   ');

    expect(getAgentResultsStream).not.toHaveBeenCalled();
  });
});
