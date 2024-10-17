import { renderHook } from '@testing-library/react';
import { delay, renderHookWithCioAsa } from '../test-utils';
import useAsaResults from '../../src/hooks/useAsaResults';

// example data that could be returned by the ASA Client
const mockGroups = [
  { done: false, value: { type: 'group', group: 'a' } },
  { done: false, value: { type: 'search_result', result: 'b' } },
  { done: false, value: { type: 'search_result', result: 'c' } },
  { done: false, value: { type: 'group', group: 'd' } },
  { done: false, value: { type: 'search_result', result: 'e' } },
  { done: true },
];

// data we expect the hook to return
const expectedGroups = [
  {
    group: { group: 'a', type: 'group' },
    searchResults: [
      { result: 'b', type: 'search_result' },
      { result: 'c', type: 'search_result' },
    ],
  },
  { group: { group: 'd', type: 'group' }, searchResults: [{ result: 'e', type: 'search_result' }] },
];

// mock client made to feed the mockGroups in the same way as the real client
const mockClient = {
  assistant: {
    getAssistantResultsStream: () => ({
      getReader: () => {
        let readIndex = -1;

        return {
          read: () => {
            readIndex += 1;
            return mockGroups[readIndex];
          },
          cancel: () => {},
        };
      },
    }),
  },
};

describe('Testing Hook: useAsaResults', () => {
  it('Should stream results correctly', async () => {
    const res = renderHookWithCioAsa(() => useAsaResults('picnic'), {
      initialProps: { cioClient: mockClient },
    });

    res.rerender();

    // I tried to find a better way to wait for the state update. Nothing worked
    await delay(500);

    const { groups } = res.result.current;

    expect(groups).toStrictEqual(expectedGroups);
  });

  it('Should throw error if no intent is passed', () => {
    expect(() => renderHookWithCioAsa(() => useAsaResults(''))).toThrow();
  });

  test('Should throw error if used outside Context Provider', () => {
    const spy = jest.spyOn(console, 'error');
    spy.mockImplementation(() => {});
    expect(() => renderHook(() => useAsaResults('picnic'))).toThrow();
    spy.mockRestore();
  });
});
