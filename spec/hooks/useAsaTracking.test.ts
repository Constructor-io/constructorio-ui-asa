import { renderHook } from '@testing-library/react';
import { Tracker } from '@constructor-io/constructorio-client-javascript/lib/types/constructorio';
import useAsaTracking from '../../src/hooks/useAsaTracking';
import { createMockTracker } from '../local_examples/mockCioClient';

describe('useAsaTracking', () => {
  it('returns no-op functions when no tracker is provided', () => {
    const { result } = renderHook(() => useAsaTracking({}));
    // Should not throw when called without a tracker.
    expect(() => {
      result.current.trackSubmit('shoes');
      result.current.trackResultLoadStarted({ intent: 'shoes' });
      result.current.trackResultLoadFinished({ intent: 'shoes', searchResultCount: 0 });
      result.current.trackResultClick({ intent: 'shoes', searchResultId: 'sr-1' });
      result.current.trackResultView({
        intent: 'shoes',
        searchResultId: 'sr-1',
        numResultsViewed: 0,
      });
      result.current.trackSearchSubmit({
        intent: 'shoes',
        searchTerm: 'shoes',
        userInput: 'shoes',
        searchResultId: 'sr-1',
      });
    }).not.toThrow();
  });

  it('forwards trackSubmit with merged section and threadId', () => {
    const tracker = createMockTracker();
    const { result } = renderHook(() =>
      useAsaTracking({
        tracker: tracker as unknown as Tracker,
        section: 'Products',
        threadId: 't-1',
      }),
    );

    result.current.trackSubmit('shoes');

    expect(tracker.trackAssistantSubmit).toHaveBeenCalledWith({
      intent: 'shoes',
      section: 'Products',
      threadId: 't-1',
    });
  });

  it('omits section and threadId when not provided', () => {
    const tracker = createMockTracker();
    const { result } = renderHook(() => useAsaTracking({ tracker: tracker as unknown as Tracker }));

    result.current.trackSubmit('shoes');

    expect(tracker.trackAssistantSubmit).toHaveBeenCalledWith({ intent: 'shoes' });
  });

  it('forwards trackResultLoadStarted with optional intentResultId', () => {
    const tracker = createMockTracker();
    const { result } = renderHook(() =>
      useAsaTracking({ tracker: tracker as unknown as Tracker, section: 'Products' }),
    );

    result.current.trackResultLoadStarted({ intent: 'shoes', intentResultId: 'ir-1' });

    expect(tracker.trackAssistantResultLoadStarted).toHaveBeenCalledWith({
      intent: 'shoes',
      intentResultId: 'ir-1',
      section: 'Products',
    });
  });

  it('forwards trackResultLoadFinished with the search result count', () => {
    const tracker = createMockTracker();
    const { result } = renderHook(() => useAsaTracking({ tracker: tracker as unknown as Tracker }));

    result.current.trackResultLoadFinished({ intent: 'shoes', searchResultCount: 3 });

    expect(tracker.trackAssistantResultLoadFinished).toHaveBeenCalledWith({
      intent: 'shoes',
      searchResultCount: 3,
    });
  });

  it('forwards trackResultClick with only the fields that are present', () => {
    const tracker = createMockTracker();
    const { result } = renderHook(() => useAsaTracking({ tracker: tracker as unknown as Tracker }));

    result.current.trackResultClick({
      intent: 'shoes',
      searchResultId: 'sr-1',
      itemId: 'i-1',
      itemName: 'Sneaker',
    });

    expect(tracker.trackAssistantResultClick).toHaveBeenCalledWith({
      intent: 'shoes',
      searchResultId: 'sr-1',
      itemId: 'i-1',
      itemName: 'Sneaker',
    });
  });

  it('forwards trackResultView with items only when non-empty', () => {
    const tracker = createMockTracker();
    const { result } = renderHook(() => useAsaTracking({ tracker: tracker as unknown as Tracker }));

    result.current.trackResultView({
      intent: 'shoes',
      searchResultId: 'sr-1',
      numResultsViewed: 2,
      items: [{ itemId: 'i-1' }],
    });

    expect(tracker.trackAssistantResultView).toHaveBeenCalledWith({
      intent: 'shoes',
      searchResultId: 'sr-1',
      numResultsViewed: 2,
      items: [{ itemId: 'i-1' }],
    });
  });

  it('omits an empty items array from trackResultView', () => {
    const tracker = createMockTracker();
    const { result } = renderHook(() => useAsaTracking({ tracker: tracker as unknown as Tracker }));

    result.current.trackResultView({
      intent: 'shoes',
      searchResultId: 'sr-1',
      numResultsViewed: 0,
      items: [],
    });

    expect(tracker.trackAssistantResultView).toHaveBeenCalledWith({
      intent: 'shoes',
      searchResultId: 'sr-1',
      numResultsViewed: 0,
    });
  });

  it('forwards trackSearchSubmit with searchTerm and userInput', () => {
    const tracker = createMockTracker();
    const { result } = renderHook(() =>
      useAsaTracking({ tracker: tracker as unknown as Tracker, threadId: 't-9' }),
    );

    result.current.trackSearchSubmit({
      intent: 'shoes',
      searchTerm: 'running shoes',
      userInput: 'running shoes',
      searchResultId: 'sr-1',
      intentResultId: 'ir-1',
    });

    expect(tracker.trackAssistantSearchSubmit).toHaveBeenCalledWith({
      intent: 'shoes',
      searchTerm: 'running shoes',
      userInput: 'running shoes',
      searchResultId: 'sr-1',
      intentResultId: 'ir-1',
      threadId: 't-9',
    });
  });
});
