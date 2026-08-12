import { renderHook } from '@testing-library/react';
import useViewportTracking from '../../src/hooks/useViewportTracking';
import {
  mockIntersectionObserver,
  MockIntersectionObserver,
} from '../local_examples/mockIntersectionObserver';

describe('useViewportTracking', () => {
  let io: MockIntersectionObserver;

  beforeEach(() => {
    io = mockIntersectionObserver();
  });

  afterEach(() => {
    io.restore();
  });

  it('fires onView once when the element becomes visible', () => {
    const onView = jest.fn();
    const { result } = renderHook(() => useViewportTracking({ onView }));

    result.current.ref(document.createElement('div'));
    expect(io.observe).toHaveBeenCalledTimes(1);

    io.trigger(true);
    expect(onView).toHaveBeenCalledTimes(1);
    expect(io.disconnect).toHaveBeenCalled();
  });

  it('does not fire again after the first impression', () => {
    const onView = jest.fn();
    const { result } = renderHook(() => useViewportTracking({ onView }));

    result.current.ref(document.createElement('div'));
    io.trigger(true);
    io.trigger(true);

    expect(onView).toHaveBeenCalledTimes(1);
  });

  it('does not fire while the element is not intersecting', () => {
    const onView = jest.fn();
    const { result } = renderHook(() => useViewportTracking({ onView }));

    result.current.ref(document.createElement('div'));
    io.trigger(false);

    expect(onView).not.toHaveBeenCalled();
  });

  it('attaches no observer when disabled', () => {
    const onView = jest.fn();
    const { result } = renderHook(() => useViewportTracking({ onView, enabled: false }));

    result.current.ref(document.createElement('div'));

    expect(io.observe).not.toHaveBeenCalled();
    expect(onView).not.toHaveBeenCalled();
  });
});
