import type { SetStateAction } from 'react';
import { readAgentStream, AgentStreamCallbacks } from '../../src/hooks/agentStream';
import {
  createErroringStream,
  createEventStream,
  StreamEvent,
} from '../local_examples/mockCioClient';
import type { ChatMessage } from '../../src/types';

function harness() {
  let messages: ChatMessage[] = [
    { id: 'a1', role: 'assistant', text: '', groups: [], status: 'loading' },
  ];
  const setMessages = (update: SetStateAction<ChatMessage[]>) => {
    messages = typeof update === 'function' ? update(messages) : update;
  };
  const callbacks: jest.Mocked<AgentStreamCallbacks> = {
    onStart: jest.fn(),
    onLoadStart: jest.fn(),
    onFinish: jest.fn(),
  };
  return { assistant: () => messages[0], setMessages, callbacks };
}

const message = (text: string): StreamEvent => ({ type: 'message', data: { text } });

describe('readAgentStream', () => {
  it('reports start, first content and a normal finish', async () => {
    const { assistant, setMessages, callbacks } = harness();
    const stream = createEventStream([
      { type: 'start', data: { thread_id: 't1', intent_result_id: 'ir1' } },
      { type: 'group', data: { display_name: 'Shoes', value: 'shoes' } },
      { type: 'search_result', data: { response: { results: [{ id: 1 }] } } },
      message('Hi'),
    ]);

    await readAgentStream(stream, 'a1', setMessages, callbacks).done;

    expect(callbacks.onStart).toHaveBeenCalledWith('t1');
    expect(callbacks.onLoadStart).toHaveBeenCalledTimes(1);
    expect(callbacks.onLoadStart).toHaveBeenCalledWith('ir1');
    expect(callbacks.onFinish).toHaveBeenCalledWith({
      searchResultCount: 1,
      intentResultId: 'ir1',
    });
    expect(assistant()).toMatchObject({
      status: 'done',
      text: 'Hi',
      threadId: 't1',
      intentResultId: 'ir1',
    });
    expect(assistant().groups?.[0].group).toEqual({ display_name: 'Shoes', value: 'shoes' });
  });

  it('accepts the legacy group event shape', async () => {
    const { assistant, setMessages, callbacks } = harness();
    const stream = createEventStream([
      { type: 'group', data: { group: 'Shoes' } },
      { type: 'search_result', data: { response: { results: [] } } },
    ]);

    await readAgentStream(stream, 'a1', setMessages, callbacks).done;

    expect(assistant().groups?.[0].group).toEqual({ display_name: 'Shoes', value: 'Shoes' });
  });

  it('marks the answer failed on a server error and stops reading', async () => {
    const { assistant, setMessages, callbacks } = harness();
    const stream = createEventStream([{ type: 'server_error', data: {} }, message('late')]);

    await readAgentStream(stream, 'a1', setMessages, callbacks).done;

    expect(assistant().status).toBe('error');
    expect(assistant().text).toBe('');
    expect(callbacks.onFinish).not.toHaveBeenCalled();
  });

  it('marks the answer failed when the stream throws', async () => {
    const { assistant, setMessages, callbacks } = harness();

    await readAgentStream(createErroringStream(), 'a1', setMessages, callbacks).done;

    expect(assistant().status).toBe('error');
    expect(callbacks.onFinish).not.toHaveBeenCalled();
  });

  it('leaves the answer untouched once cancelled', async () => {
    const { assistant, setMessages, callbacks } = harness();
    let release!: () => void;
    const gate = new Promise<void>((r) => {
      release = r;
    });
    const stream = new ReadableStream<StreamEvent>({
      async pull(controller) {
        await gate;
        controller.enqueue(message('late'));
        controller.close();
      },
    });

    const handle = readAgentStream(stream, 'a1', setMessages, callbacks);
    handle.cancel();
    release();
    await handle.done;

    expect(assistant().status).toBe('loading');
    expect(callbacks.onFinish).not.toHaveBeenCalled();
  });
});
