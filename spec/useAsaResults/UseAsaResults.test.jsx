import { renderHook, waitFor } from '@testing-library/react';
import { renderHookWithCioAsa } from '../test-utils';
import useAsaResults from '../../src/hooks/useAsaResults';
import { expectedGroups, mockGroups } from '../local_examples/asaApiMocks';

// mock client made to feed the mockGroups in the same way as the real client
const mockClient = {
  assistant: {
    getAssistantResultsStream: () => ({
      getReader: () => {
        let readIndex = -1;

        return {
          read: () => {
            readIndex += 1;
            return Promise.resolve(mockGroups[readIndex]);
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

    await waitFor(() => {
      expect(res.result.current.groups).toStrictEqual(expectedGroups);
    });
  });

  it('Should throw error if no intent is passed', () => {
    const spy = jest.spyOn(console, 'error');
    spy.mockImplementation(() => {});
    expect(() => renderHookWithCioAsa(() => useAsaResults(''))).toThrow();
  });

  it('Should throw error when domain is not set', () => {
    const spy = jest.spyOn(console, 'error');
    spy.mockImplementation(() => {});
    expect(() => renderHookWithCioAsa(() => useAsaResults('picnic'), { initialProps: { staticRequestConfigs: { domain: '' } } })).toThrow();
  });

  test('Should throw error if used outside Context Provider', () => {
    const spy = jest.spyOn(console, 'error');
    spy.mockImplementation(() => {});
    expect(() => renderHook(() => useAsaResults('picnic'))).toThrow();
    spy.mockRestore();
  });
});
