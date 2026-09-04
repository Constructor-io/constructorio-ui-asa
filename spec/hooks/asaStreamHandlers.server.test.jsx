import {
  handleSearchResult,
  handleMessage,
  handleServerError,
  handleStreamEnd,
  handleStreamError,
} from '../../src/hooks/asaStreamHandlers';

const assistantId = 'assistant-1';

/** Applies the updater the handler passes to setMessages against a starting list. */
function applyUpdate(setMessages, messages) {
  expect(setMessages).toHaveBeenCalledTimes(1);
  return setMessages.mock.calls[0][0](messages);
}

describe('asaStreamHandlers (SSR / node environment)', () => {
  let setMessages;
  let messages;

  beforeEach(() => {
    setMessages = jest.fn();
    messages = [
      { id: 'user-1', role: 'user', text: 'Show me shoes', status: 'done' },
      { id: assistantId, role: 'assistant', text: '', groups: [], status: 'loading' },
    ];
  });

  it('appends streamed text to the assistant message without a DOM', () => {
    handleMessage({ text: 'Here ' }, assistantId, setMessages);

    const [, assistant] = applyUpdate(setMessages, messages);
    expect(assistant.text).toBe('Here ');
    expect(assistant.status).toBe('streaming');
  });

  it('leaves other messages untouched', () => {
    handleMessage({ text: 'Hi' }, assistantId, setMessages);

    const [user] = applyUpdate(setMessages, messages);
    expect(user).toBe(messages[0]);
  });

  it('attaches a search result group using the pending group metadata', () => {
    const pendingGroup = { display_name: 'Shoes', value: 'shoes' };

    const next = handleSearchResult(
      { response: { results: [{ value: 'Runner' }] } },
      pendingGroup,
      assistantId,
      setMessages,
    );

    expect(next).toBeNull();
    const [, assistant] = applyUpdate(setMessages, messages);
    expect(assistant.groups).toHaveLength(1);
    expect(assistant.groups[0].group).toEqual(pendingGroup);
    expect(assistant.groups[0].searchResults).toEqual([{ value: 'Runner' }]);
  });

  it('derives group metadata from the payload when none is pending', () => {
    handleSearchResult(
      {
        response: { search_request: { display_name: 'Boots', search_term: 'boots' }, results: [] },
      },
      null,
      assistantId,
      setMessages,
    );

    const [, assistant] = applyUpdate(setMessages, messages);
    expect(assistant.groups[0].group).toEqual({ display_name: 'Boots', value: 'boots' });
  });

  it('marks the message as errored on a server error', () => {
    handleServerError(assistantId, setMessages);

    const [, assistant] = applyUpdate(setMessages, messages);
    expect(assistant.status).toBe('error');
  });

  it('marks the message as errored when the stream throws', () => {
    handleStreamError(assistantId, setMessages);

    const [, assistant] = applyUpdate(setMessages, messages);
    expect(assistant.status).toBe('error');
  });

  it('marks the message as done when the stream ends', () => {
    handleStreamEnd(assistantId, setMessages);

    const [, assistant] = applyUpdate(setMessages, messages);
    expect(assistant.status).toBe('done');
  });
});
