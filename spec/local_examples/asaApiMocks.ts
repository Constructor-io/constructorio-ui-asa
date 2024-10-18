// example data that could be returned by the ASA Client
export const mockGroups = [
  { done: false, value: { type: 'group', group: 'a' } },
  { done: false, value: { type: 'search_result', result: 'b' } },
  { done: false, value: { type: 'search_result', result: 'c' } },
  { done: false, value: { type: 'group', group: 'd' } },
  { done: false, value: { type: 'search_result', result: 'e' } },
  { done: true },
];

// data we expect the hook to return
export const expectedGroups = [
  {
    group: { group: 'a', type: 'group' },
    searchResults: [
      { result: 'b', type: 'search_result' },
      { result: 'c', type: 'search_result' },
    ],
  },
  { group: { group: 'd', type: 'group' }, searchResults: [{ result: 'e', type: 'search_result' }] },
];
