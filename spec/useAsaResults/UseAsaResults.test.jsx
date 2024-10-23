import { renderHook, waitFor } from '@testing-library/react';
import { renderHookWithCioAsa } from '../test-utils';
import useAsaResults, { Status } from '../../src/hooks/useAsaResults';
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

// mock client made to throw an error on read
const failClient = {
  assistant: {
    getAssistantResultsStream: () => ({
      getReader: () => ({
        read: () => { throw Error('could not read') },
        cancel: () => { },
      }),
    }),
  },
};

describe('Testing Hook: useAsaResults', () => {
  it('Should stream results and update status correctly', async () => {
    const res = renderHookWithCioAsa(() => useAsaResults('picnic'), {
      initialProps: { cioClient: mockClient },
    });

    expect(res.result.current.status).toBe(Status.LOADING);

    res.rerender();

    await waitFor(() => {
      expect(res.result.current.groups).toStrictEqual(expectedGroups);
      expect(res.result.current.status).toBe(Status.SUCCESS);
    });
  });

  it('Should update status if request fails', async () => {
    const res = renderHookWithCioAsa(() => useAsaResults('picnic'), {
      initialProps: { cioClient: failClient },
    });
    
    res.rerender();

    await waitFor(() => {
      expect(res.result.current.status).toBe(Status.ERROR);
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
