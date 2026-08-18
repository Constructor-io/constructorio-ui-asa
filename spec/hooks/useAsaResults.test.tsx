import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import type ConstructorIOClient from '@constructor-io/constructorio-client-javascript';
import useAsaResults from '../../src/hooks/useAsaResults';
import CioAsaProvider from '../../src/components/CioAsaProvider/CioAsaProvider';
import {
  createMockCioClient,
  createPendingStream,
  StreamEvent,
} from '../local_examples/mockCioClient';

function renderUseAsaResults(cioClient: ConstructorIOClient) {
  return renderHook(() => useAsaResults(), {
    wrapper: ({ children }) => (
      <CioAsaProvider cioClient={cioClient} staticRequestConfigs={{ domain: 'chatbot' }}>
        {children}
      </CioAsaProvider>
    ),
  });
}

describe('useAsaResults', () => {
  // Silence the intentional error thrown by the "outside provider" cases.
  let errorSpy: jest.SpyInstance;
  beforeEach(() => {
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    errorSpy.mockRestore();
  });

  describe('guards', () => {
    it('throws when used outside a CioAsaProvider', () => {
      expect(() => renderHook(() => useAsaResults())).toThrow(
        /must be used within a CioAsaProvider/,
      );
    });

    it('throws when the provider has no cioClient', () => {
      expect(() =>
        renderHook(() => useAsaResults(), {
          wrapper: ({ children }) => (
            // no apiKey and no cioClient -> useCioClient throws first
            <CioAsaProvider cioClient={null}>{children}</CioAsaProvider>
          ),
        }),
      ).toThrow();
    });

    it('throws when a client is present but domain is missing', () => {
      const { client } = createMockCioClient({ events: [] });
      expect(() =>
        renderHook(() => useAsaResults(), {
          wrapper: ({ children }) => (
            // Valid client, but no domain -> useAsaResults guard fires.
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-expect-error intentionally omitting the required `domain` to hit the guard
            <CioAsaProvider cioClient={client} staticRequestConfigs={{}}>
              {children}
            </CioAsaProvider>
          ),
        }),
      ).toThrow(/requires a configured cioClient and domain/);
    });
  });

  describe('sendMessage', () => {
    it('ignores empty / whitespace-only input', () => {
      const { client, getAgentResultsStream } = createMockCioClient({ events: [] });
      const { result } = renderUseAsaResults(client);

      act(() => result.current.sendMessage('   '));
      expect(getAgentResultsStream).not.toHaveBeenCalled();
      expect(result.current.messages).toHaveLength(0);
    });

    it('appends a user and assistant message and calls the agent stream', async () => {
      const { client, getAgentResultsStream } = createMockCioClient({
        events: [{ type: 'message', data: { text: 'Hi there' } }],
      });
      const { result } = renderUseAsaResults(client);

      act(() => result.current.sendMessage('hello'));

      expect(getAgentResultsStream).toHaveBeenCalledWith('hello', { domain: 'chatbot' });
      expect(result.current.messages[0]).toMatchObject({ role: 'user', text: 'hello' });
      expect(result.current.messages[1]).toMatchObject({ role: 'assistant' });

      await waitFor(() => expect(result.current.isStreaming).toBe(false));
    });

    it('processes a full start -> group -> search_result -> message stream', async () => {
      const events: StreamEvent[] = [
        { type: 'start', data: { thread_id: 'thread-1' } },
        { type: 'group', data: { display_name: 'Shoes', value: 'shoes' } },
        { type: 'search_result', data: { response: { results: [{ value: 'Sneaker' }] } } },
        { type: 'message', data: { text: 'Here are some shoes' } },
      ];
      const { client } = createMockCioClient({ events });
      const { result } = renderUseAsaResults(client);

      act(() => result.current.sendMessage('shoes'));

      await waitFor(() => expect(result.current.isStreaming).toBe(false));

      const assistant = result.current.messages[1];
      expect(assistant.status).toBe('done');
      expect(assistant.text).toBe('Here are some shoes');
      expect(assistant.groups).toHaveLength(1);
      expect(assistant.groups![0].group).toEqual({ display_name: 'Shoes', value: 'shoes' });
      expect(assistant.groups![0].searchResults).toEqual([{ value: 'Sneaker' }]);
    });

    it('reuses the captured thread_id on the next message', async () => {
      const { client, getAgentResultsStream } = createMockCioClient({
        events: [{ type: 'start', data: { thread_id: 'thread-xyz' } }],
      });
      const { result } = renderUseAsaResults(client);

      act(() => result.current.sendMessage('first'));
      await waitFor(() => expect(result.current.isStreaming).toBe(false));

      act(() => result.current.sendMessage('second'));
      await waitFor(() => expect(result.current.isStreaming).toBe(false));

      expect(getAgentResultsStream).toHaveBeenNthCalledWith(2, 'second', {
        domain: 'chatbot',
        threadId: 'thread-xyz',
      });
    });

    it('ignores a second send while a stream is already in flight', () => {
      const { stream } = createPendingStream();
      const { client, getAgentResultsStream } = createMockCioClient({ stream });
      const { result } = renderUseAsaResults(client);

      act(() => result.current.sendMessage('first'));
      act(() => result.current.sendMessage('second'));

      expect(getAgentResultsStream).toHaveBeenCalledTimes(1);
      // Only the first user/assistant pair should exist, not four messages.
      expect(result.current.messages).toHaveLength(2);
    });

    it('sets an error state on a server_error event', async () => {
      const { client } = createMockCioClient({
        events: [{ type: 'server_error', data: {} }],
      });
      const { result } = renderUseAsaResults(client);

      act(() => result.current.sendMessage('boom'));
      await waitFor(() => expect(result.current.isStreaming).toBe(false));

      const assistant = result.current.messages[1];
      expect(assistant.status).toBe('error');
      expect(assistant.text).toBe('');
    });

    it('sets an error state when the stream throws', async () => {
      const { client } = createMockCioClient({ error: true });
      const { result } = renderUseAsaResults(client);

      act(() => result.current.sendMessage('boom'));
      await waitFor(() => expect(result.current.isStreaming).toBe(false));

      expect(result.current.messages[1].status).toBe('error');
    });
  });

  describe('tracking', () => {
    it('fires trackAssistantSubmit on send with the trimmed intent', () => {
      const { client, tracker } = createMockCioClient({ events: [] });
      const { result } = renderUseAsaResults(client);

      act(() => result.current.sendMessage('  shoes  '));

      expect(tracker.trackAssistantSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ intent: 'shoes' }),
      );
    });

    it('fires load-start once and load-finish with the group count', async () => {
      const events: StreamEvent[] = [
        { type: 'start', data: { thread_id: 'thread-1', intent_result_id: 'ir-1' } },
        { type: 'group', data: { display_name: 'Shoes', value: 'shoes' } },
        {
          type: 'search_result',
          data: { result_id: 'sr-1', response: { results: [{ value: 'Sneaker' }] } },
        },
        { type: 'message', data: { text: 'Here are some shoes' } },
      ];
      const { client, tracker } = createMockCioClient({ events });
      const { result } = renderUseAsaResults(client);

      act(() => result.current.sendMessage('shoes'));
      await waitFor(() => expect(result.current.isStreaming).toBe(false));

      expect(tracker.trackAssistantResultLoadStarted).toHaveBeenCalledTimes(1);
      expect(tracker.trackAssistantResultLoadStarted).toHaveBeenCalledWith(
        expect.objectContaining({ intent: 'shoes', intentResultId: 'ir-1' }),
      );
      expect(tracker.trackAssistantResultLoadFinished).toHaveBeenCalledWith(
        expect.objectContaining({ intent: 'shoes', searchResultCount: 1, intentResultId: 'ir-1' }),
      );
    });

    it('invokes the onAssistantSubmit callback with the submit source', () => {
      const { client } = createMockCioClient({ events: [] });
      const onAssistantSubmit = jest.fn();
      const { result } = renderHook(() => useAsaResults(), {
        wrapper: ({ children }) => (
          <CioAsaProvider
            cioClient={client}
            staticRequestConfigs={{ domain: 'chatbot' }}
            callbacks={{ onAssistantSubmit }}>
            {children}
          </CioAsaProvider>
        ),
      });

      act(() => result.current.sendMessage('shoes', 'suggestion'));

      expect(onAssistantSubmit).toHaveBeenCalledWith({ intent: 'shoes', source: 'suggestion' });
    });
  });

  describe('clearHistory', () => {
    it('resets messages and streaming state', async () => {
      const { client } = createMockCioClient({
        events: [{ type: 'message', data: { text: 'hi' } }],
      });
      const { result } = renderUseAsaResults(client);

      act(() => result.current.sendMessage('hello'));
      await waitFor(() => expect(result.current.isStreaming).toBe(false));
      expect(result.current.messages.length).toBeGreaterThan(0);

      act(() => result.current.clearHistory());
      expect(result.current.messages).toHaveLength(0);
      expect(result.current.isStreaming).toBe(false);
    });

    it('cancels the in-flight reader when cleared mid-stream', () => {
      const { stream, cancel } = createPendingStream();
      const { client } = createMockCioClient({ stream });
      const { result } = renderUseAsaResults(client);

      act(() => result.current.sendMessage('hello'));
      expect(result.current.isStreaming).toBe(true);

      act(() => result.current.clearHistory());

      expect(cancel).toHaveBeenCalledTimes(1);
      expect(result.current.messages).toHaveLength(0);
      expect(result.current.isStreaming).toBe(false);
    });
  });

  describe('cleanup', () => {
    it('cancels the in-flight reader on unmount', () => {
      const { stream, cancel } = createPendingStream();
      const { client } = createMockCioClient({ stream });
      const { result, unmount } = renderUseAsaResults(client);

      act(() => result.current.sendMessage('hello'));
      expect(result.current.isStreaming).toBe(true);

      unmount();

      expect(cancel).toHaveBeenCalledTimes(1);
    });
  });
});
