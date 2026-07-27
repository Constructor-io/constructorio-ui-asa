import {
  handleSearchResult,
  handleMessage,
  handleServerError,
  handleStreamEnd,
  handleStreamError,
  MessageUpdater,
} from '../../src/hooks/asaStreamHandlers';
import type { ChatMessage, ResultGroupMeta } from '../../src/types';

const ASSISTANT_ID = 'assistant-1';

function makeAssistant(overrides: Partial<ChatMessage> = {}): ChatMessage {
  return {
    id: ASSISTANT_ID,
    role: 'assistant',
    text: '',
    groups: [],
    status: 'loading',
    ...overrides,
  };
}

function applyUpdater(
  start: ChatMessage[],
  run: (setMessages: MessageUpdater) => void,
): ChatMessage[] {
  let state = start;
  const setMessages: MessageUpdater = (action) => {
    state = typeof action === 'function' ? action(state) : action;
  };
  run(setMessages);
  return state;
}

describe('asaStreamHandlers', () => {
  describe('handleSearchResult', () => {
    it('appends a new group using the pending group label and clears it', () => {
      const pending: ResultGroupMeta = { display_name: 'Shoes', value: 'shoes' };
      const data = { response: { results: [{ id: 'p1' }] } };

      let returned: ResultGroupMeta | null = pending;
      const result = applyUpdater([makeAssistant()], (setMessages) => {
        returned = handleSearchResult(data, pending, ASSISTANT_ID, setMessages);
      });

      expect(returned).toBeNull();
      expect(result[0].groups).toHaveLength(1);
      expect(result[0].groups?.[0].group).toEqual(pending);
      expect(result[0].groups?.[0].searchResults).toEqual([{ id: 'p1' }]);
      expect(result[0].status).toBe('streaming');
    });

    it('derives the group label from the payload when no pending group exists', () => {
      const data = {
        response: {
          search_request: { display_name: 'Hats', search_term: 'hats' },
          results: [{ id: 'p2' }],
        },
      };

      const result = applyUpdater([makeAssistant()], (setMessages) => {
        handleSearchResult(data, null, ASSISTANT_ID, setMessages);
      });

      expect(result[0].groups?.[0].group).toEqual({ display_name: 'Hats', value: 'hats' });
    });

    it('only updates the message with the matching id', () => {
      const other = makeAssistant({ id: 'other' });
      const result = applyUpdater([other, makeAssistant()], (setMessages) => {
        handleSearchResult({ results: [{ id: 'p3' }] }, null, ASSISTANT_ID, setMessages);
      });

      expect(result[0].groups).toHaveLength(0);
      expect(result[1].groups).toHaveLength(1);
    });
  });

  describe('handleMessage', () => {
    it('appends streamed text and marks the message streaming', () => {
      const result = applyUpdater([makeAssistant({ text: 'Hel' })], (setMessages) => {
        handleMessage({ text: 'lo' }, ASSISTANT_ID, setMessages);
      });

      expect(result[0].text).toBe('Hello');
      expect(result[0].status).toBe('streaming');
    });
  });

  describe('handleServerError', () => {
    it('marks the message as error while preserving any partial text', () => {
      const result = applyUpdater(
        [makeAssistant({ text: 'partial', status: 'streaming' })],
        (setMessages) => {
          handleServerError(ASSISTANT_ID, setMessages);
        },
      );

      expect(result[0].status).toBe('error');
      expect(result[0].text).toBe('partial');
    });
  });

  describe('handleStreamEnd', () => {
    it('marks the message as done', () => {
      const result = applyUpdater([makeAssistant({ status: 'streaming' })], (setMessages) => {
        handleStreamEnd(ASSISTANT_ID, setMessages);
      });

      expect(result[0].status).toBe('done');
    });
  });

  describe('handleStreamError', () => {
    it('marks the message as error and keeps partial text', () => {
      const result = applyUpdater(
        [makeAssistant({ text: 'partial', status: 'streaming' })],
        (setMessages) => {
          handleStreamError(ASSISTANT_ID, setMessages);
        },
      );

      expect(result[0].status).toBe('error');
      expect(result[0].text).toBe('partial');
    });
  });
});
