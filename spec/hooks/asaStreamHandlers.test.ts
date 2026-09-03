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
      expect(msg.groups![0].group).toEqual({
        display_name: 'Recipes',
        value: 'picnic',
        search_request: { display_name: 'Recipes', search_term: 'picnic' },
      });
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

    it('captures result_id and intent_result_id onto the group', () => {
      const setMessages = jest.fn();
      const data = {
        result_id: 'sr-42',
        intent_result_id: 'ir-7',
        response: { results: [{ value: 'a' }] },
      };
      handleSearchResult(data, { display_name: 'Shoes' }, ASSISTANT_ID, setMessages);
      const msg = applyUpdater(setMessages);
      expect(msg.groups![0].searchResultId).toBe('sr-42');
      expect(msg.groups![0].intentResultId).toBe('ir-7');
    });

    it('omits the id fields when the event does not carry them', () => {
      const setMessages = jest.fn();
      handleSearchResult(
        { response: { results: [{ value: 'a' }] } },
        { display_name: 'Shoes' },
        ASSISTANT_ID,
        setMessages,
      );
      const msg = applyUpdater(setMessages);
      expect(msg.groups![0]).not.toHaveProperty('searchResultId');
      expect(msg.groups![0]).not.toHaveProperty('intentResultId');
    });

    it('attaches the echoed request and search metadata onto the group', () => {
      const setMessages = jest.fn();
      const request = {
        num_results_per_page: 20,
        ids: ['1', '2'],
        term: '',
        page: 1,
        sort_by: 'relevance',
        sort_order: 'descending',
        section: 'Products',
        pre_filter_expression: { name: 'Nutrition', value: 'Organic' },
      };
      const searchRequest = {
        display_name: 'Organic Whole Milk',
        search_term: 'Organic Whole Milk',
        params: {},
      };
      const facets = [{ type: 'range', name: 'price', display_name: 'Price' }];
      const data = {
        title: 'Organic Whole Milk',
        request,
        response: {
          search_request: searchRequest,
          alternative_search_requests: [],
          facets,
          results: [{ value: 'a' }],
        },
      };

      handleSearchResult(data, null, ASSISTANT_ID, setMessages);
      const msg = applyUpdater(setMessages);
      expect(msg.groups![0].group).toEqual({
        display_name: 'Organic Whole Milk',
        value: 'Organic Whole Milk',
        request,
        search_request: searchRequest,
        facets,
        alternative_search_requests: [],
      });
    });

    it('attaches the echoed request even when a pending group supplied the labels', () => {
      const setMessages = jest.fn();
      const request = { term: '', ids: ['1'] };
      handleSearchResult(
        { request, response: { results: [{ value: 'a' }] } },
        { display_name: 'Shoes', value: 'shoes' },
        ASSISTANT_ID,
        setMessages,
      );
      const msg = applyUpdater(setMessages);
      expect(msg.groups![0].group).toEqual({
        display_name: 'Shoes',
        value: 'shoes',
        request,
      });
    });

    it('preserves the browse filter and filters that distinguish a category pod', () => {
      const setMessages = jest.fn();
      // Category pods carry an empty `term` and browse on a facet instead; the backend also
      // sets search_term to display_name, so `request` is the only way to tell them apart
      // from a keyword pod and route to a category page.
      // Shape verified against a live `assistant_conversational` response.
      const request = {
        term: '',
        browse_filter_name: 'group_id',
        browse_filter_value: 'cat100260235',
        filters: {
          features: ['blackout'],
          intended_room: ['bedroom'],
          item_type: ['curtain panels'],
          s1_deals_and_promotions: ['SALE', 'CLEARANCE'],
        },
        filter_match_types: {
          features: 'any',
          intended_room: 'any',
          item_type: 'any',
          s1_deals_and_promotions: 'any',
        },
        sort_by: 'relevance',
        sort_order: 'descending',
        page: 1,
        num_results_per_page: 4,
        section: 'Products',
        searchandized_items: [],
      };
      const data = {
        title: 'Budget-Friendly Blackout Panels',
        request,
        response: {
          search_request: {
            display_name: 'Budget-Friendly Blackout Panels',
            search_term: 'Budget-Friendly Blackout Panels',
            // params.filters keeps group_id, which `request` hoists to browse_filter_*.
            params: { filters: { group_id: ['cat100260235'], features: ['blackout'] } },
          },
          results: [{ value: 'a' }],
        },
      };

      handleSearchResult(data, null, ASSISTANT_ID, setMessages);
      const { group } = applyUpdater(setMessages).groups![0];
      expect(group.request).toEqual(request);
      expect(group.request?.term).toBe('');
      expect(group.request?.browse_filter_name).toBe('group_id');
      expect(group.request?.browse_filter_value).toBe('cat100260235');
      // Pods in one response can share a category and differ only by these filters, so they
      // must survive or every "view more" for the category resolves to the same page.
      expect(group.request?.filters).toEqual(request.filters);
      expect(group.request?.filter_match_types).toEqual(request.filter_match_types);
      expect(group.search_request?.params).toEqual({
        filters: { group_id: ['cat100260235'], features: ['blackout'] },
      });
      // search_term is the heading, not a usable query.
      expect(group.search_request?.search_term).toBe(group.display_name);
    });

    it('attaches the request for a recommendation pod that has no search_request', () => {
      const setMessages = jest.fn();
      const request = { term: '', ids: ['1', '2'], section: 'Products' };
      const data = {
        title: 'Recommended for you',
        request,
        response: { search_request: null, results: [{ value: 'a' }] },
      };

      handleSearchResult(data, null, ASSISTANT_ID, setMessages);
      const { group } = applyUpdater(setMessages).groups![0];
      expect(group.request).toEqual(request);
      expect(group).not.toHaveProperty('search_request');
      // Labels still fall back to the event title rather than throwing on the null.
      expect(group.display_name).toBe('Recommended for you');
    });

    it('strips internal A/B config from the request but keeps everything else', () => {
      const setMessages = jest.fn();
      const data = {
        request: {
          term: 'running shoes',
          sort_by: 'relevance',
          some_future_backend_field: 'kept',
          features: { query_items: true, personalization: true },
          feature_variants: { query_items: 'query_items_ctr_and_l2r' },
        },
        response: { results: [{ value: 'a' }] },
      };

      handleSearchResult(data, null, ASSISTANT_ID, setMessages);
      const { group } = applyUpdater(setMessages).groups![0];
      expect(group.request).toEqual({
        term: 'running shoes',
        sort_by: 'relevance',
        // Unrecognized fields still pass through, so the backend can add without a release.
        some_future_backend_field: 'kept',
      });
      expect(group.request).not.toHaveProperty('features');
      expect(group.request).not.toHaveProperty('feature_variants');
      // The SSE payload itself is left untouched.
      expect(data.request.features).toEqual({ query_items: true, personalization: true });
    });

    it('omits the request metadata fields when the event does not carry them', () => {
      const setMessages = jest.fn();
      handleSearchResult(
        { response: { results: [{ value: 'a' }] } },
        { display_name: 'Shoes' },
        ASSISTANT_ID,
        setMessages,
      );
      const { group } = applyUpdater(setMessages).groups![0];
      expect(group).not.toHaveProperty('request');
      expect(group).not.toHaveProperty('search_request');
      expect(group).not.toHaveProperty('facets');
      expect(group).not.toHaveProperty('alternative_search_requests');
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
