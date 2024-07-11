import React from 'react';
import { render, renderHook } from '@testing-library/react';
import useRequestConfigs from '../src/hooks/useRequestConfigs';
import CioAsaProvider from '../src/components/CioAsaProvider/CioAsaProvider';
import testRequestState from './local_examples/testRequestState.json';
import testUrl from './local_examples/testJsonEncodedUrl.json';
import { TEST_API_KEY } from './local_examples/constants';
import { defaultQueryStringMap } from '../src/utils/urlHelpers';
import { RequestConfigs } from '../src/types';

describe('Testing Hook: useRequestConfigs', () => {
  let location;
  const mockLocation = new URL('https://example.com/asa');

  beforeEach(() => {
    location = window.location;
    // @ts-ignore
    delete window.location;
    // @ts-ignore
    window.location = mockLocation;
    mockLocation.href = 'https://example.com/';
  });

  afterEach(() => {
    window.location = location;
  });

  it('Should throw error if called outside of AsaContext', () => {
    const spy = jest.spyOn(console, 'error');
    spy.mockImplementation(() => {});
    expect(() => renderHook(() => useRequestConfigs())).toThrow();
    spy.mockRestore();
  });

  it('Should return an object with domain=assistant if no defaults have been specified', () => {
    function TestReactComponent() {
      const { requestConfigs, setRequestConfigs } = useRequestConfigs();
      expect(requestConfigs).toEqual({ domain: 'assistant' });
      expect(typeof setRequestConfigs).toEqual('function');
      return <div>hello</div>;
    }

    render(
      <CioAsaProvider apiKey={TEST_API_KEY}>
        <TestReactComponent />
      </CioAsaProvider>,
    );
  });

  it('Should return configurations set as defaults at Asa Context', () => {
    window.location.href = 'https://example.com/asa?q=how%20do%20I%20make%20an%20ice%20cream%3F';
    function TestReactComponent() {
      const { requestConfigs } = useRequestConfigs();
      expect(requestConfigs).toEqual({
        ...testRequestState,
        intent: 'how do I make an ice cream?',
      });

      return <div>hello</div>;
    }

    render(
      <CioAsaProvider
        apiKey={TEST_API_KEY}
        staticRequestConfigs={testRequestState as RequestConfigs}>
        <TestReactComponent />
      </CioAsaProvider>,
    );
  });

  it('Should return configurations set in the URL path/query parameters', () => {
    function TestReactComponent() {
      window.location.href = testUrl;
      const { requestConfigs } = useRequestConfigs();

      expect(requestConfigs).toEqual(testRequestState);

      return <div>hello</div>;
    }

    render(
      <CioAsaProvider apiKey={TEST_API_KEY}>
        <TestReactComponent />
      </CioAsaProvider>,
    );
  });

  it('Should return merged configurations with the URL query parameters taking priority', () => {
    function TestReactComponent() {
      window.location.href = 'https://www.example.com/asa?q=fire&resultsPerPod=15';
      const { requestConfigs } = useRequestConfigs();
      const decodedRequestState: RequestConfigs = testRequestState;
      decodedRequestState.numResultsPerPage = 15;
      decodedRequestState.intent = 'fire';

      expect(requestConfigs).toEqual(decodedRequestState);

      return <div>hello</div>;
    }

    render(
      <CioAsaProvider
        apiKey={TEST_API_KEY}
        staticRequestConfigs={testRequestState as RequestConfigs}>
        <TestReactComponent />
      </CioAsaProvider>,
    );
  });

  test('Using setRequestConfigs should work', () => {
    function TestReactComponent() {
      window.location.href = 'https://www.example.com/asa?q=fire&resultsPerPod=15';
      const { setRequestConfigs } = useRequestConfigs();

      const oldUrlObj = new URL(window.location.href);
      setRequestConfigs({ numResultsPerPage: 12 });
      const newUrlObj = new URL(window.location.href);

      expect(newUrlObj.searchParams.get(defaultQueryStringMap.numResultsPerPage)).toEqual('12');

      // Check the remaining query parameters are the same
      expect(newUrlObj.searchParams.get(defaultQueryStringMap.intent)).toEqual(
        oldUrlObj.searchParams.get(defaultQueryStringMap.intent),
      );

      return <div>hello</div>;
    }

    render(
      <CioAsaProvider apiKey={TEST_API_KEY}>
        <TestReactComponent />
      </CioAsaProvider>,
    );
  });
});
