import {
  handleSearchResult,
  handleMessage,
  handleServerError,
  handleStreamEnd,
  handleStreamError,
} from '../../src/hooks/asaStreamHandlers';
import { ChatMessage, ResultGroupMeta } from '../../src/types';

const ASSISTANT_ID = 'msg-1';

const baseMessage: ChatMessage = {
  id: ASSISTANT_ID,
  role: 'assistant',
  text: '',
  groups: [],
  status: 'loading',
};

/**
 * Runs the setMessages updater produced by a handler against a starting list
 * and returns the resulting assistant message.
 */
function applyUpdater(
  setMessages: jest.Mock,
  start: ChatMessage[] = [{ ...baseMessage }],
): ChatMessage {
  const updater = setMessages.mock.calls[setMessages.mock.calls.length - 1][0];
  const next: ChatMessage[] = updater(start);
  return next.find((m) => m.id === ASSISTANT_ID)!;
}

describe('asaStreamHandlers', () => {
  describe('handleSearchResult', () => {
    it('uses the pending group and appends normalized results, returning null', () => {
      const setMessages = jest.fn();
      const pending: ResultGroupMeta = { display_name: 'Shoes', value: 'shoes' };
      const data = { response: { results: [{ value: 'a' }, { value: 'b' }] } };

      const returned = handleSearchResult(data, pending, ASSISTANT_ID, setMessages);

      expect(returned).toBeNull();
      const msg = applyUpdater(setMessages);
      expect(msg.status).toBe('streaming');
      expect(msg.groups).toHaveLength(1);
      expect(msg.groups![0]).toEqual({
        group: pending,
        searchResults: [{ value: 'a' }, { value: 'b' }],
      });
    });

    it('derives the group from search_request when there is no pending group', () => {
      const setMessages = jest.fn();
      const data = {
        response: {
          search_request: { display_name: 'Recipes', search_term: 'picnic' },
          results: [{ value: 'x' }],
        },
      };

      handleSearchResult(data, null, ASSISTANT_ID, setMessages);
      const msg = applyUpdater(setMessages);
      expect(msg.groups![0].group).toEqual({ display_name: 'Recipes', value: 'picnic' });
    });

    it('falls back to wrapping the raw data when no results array is present', () => {
      const setMessages = jest.fn();
      const data = { title: 'T', foo: 'bar' };
      handleSearchResult(data, null, ASSISTANT_ID, setMessages);
      const msg = applyUpdater(setMessages);
      expect(msg.groups![0].searchResults).toEqual([data]);
      expect(msg.groups![0].group).toEqual({ display_name: 'T', value: 'T' });
    });

    it('appends to existing groups without clobbering them', () => {
      const setMessages = jest.fn();
      const existing: ChatMessage = {
        ...baseMessage,
        groups: [{ group: { display_name: 'first' }, searchResults: [] }],
      };
      handleSearchResult(
        { results: [{ v: 1 }] },
        { display_name: 'second' },
        ASSISTANT_ID,
        setMessages,
      );
      const msg = applyUpdater(setMessages, [existing]);
      expect(msg.groups).toHaveLength(2);
      expect(msg.groups![1].searchResults).toEqual([{ v: 1 }]);
    });

    it('derives an empty group when neither search_request nor title is present', () => {
      const setMessages = jest.fn();
      handleSearchResult({}, null, ASSISTANT_ID, setMessages);
      const msg = applyUpdater(setMessages);
      expect(msg.groups![0].group).toEqual({ display_name: '', value: '' });
    });
  });

  describe('handleMessage', () => {
    it('concatenates streamed text tokens', () => {
      const setMessages = jest.fn();
      handleMessage({ text: 'Hello ' }, ASSISTANT_ID, setMessages);
      const msg = applyUpdater(setMessages, [{ ...baseMessage, text: 'Hi. ' }]);
      expect(msg.text).toBe('Hi. Hello ');
      expect(msg.status).toBe('streaming');
    });

    it('handles missing text data as empty string', () => {
      const setMessages = jest.fn();
      handleMessage({}, ASSISTANT_ID, setMessages);
      const msg = applyUpdater(setMessages, [{ ...baseMessage, text: 'keep' }]);
      expect(msg.text).toBe('keep');
    });
  });

  describe('handleServerError', () => {
    it('keeps existing text and sets error status', () => {
      const setMessages = jest.fn();
      handleServerError(ASSISTANT_ID, setMessages);
      const msg = applyUpdater(setMessages, [{ ...baseMessage, text: 'partial' }]);
      expect(msg.text).toBe('partial');
      expect(msg.status).toBe('error');
    });
  });

  describe('handleStreamEnd', () => {
    it('marks the message as done', () => {
      const setMessages = jest.fn();
      handleStreamEnd(ASSISTANT_ID, setMessages);
      const msg = applyUpdater(setMessages, [{ ...baseMessage, status: 'streaming' }]);
      expect(msg.status).toBe('done');
    });
  });

  describe('handleStreamError', () => {
    it('keeps partial text but sets error status', () => {
      const setMessages = jest.fn();
      handleStreamError(ASSISTANT_ID, setMessages);
      const msg = applyUpdater(setMessages, [{ ...baseMessage, text: 'partial answer' }]);
      expect(msg.text).toBe('partial answer');
      expect(msg.status).toBe('error');
    });

    it('leaves text empty when there is no partial text', () => {
      const setMessages = jest.fn();
      handleStreamError(ASSISTANT_ID, setMessages);
      const msg = applyUpdater(setMessages, [{ ...baseMessage, text: '' }]);
      expect(msg.text).toBe('');
    });
  });
});
