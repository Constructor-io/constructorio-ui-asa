import { useRef } from 'react';

/** A ref that always holds the latest `value`, for async code that must not read stale props. */
export default function useLatest<T>(value: T) {
  const ref = useRef(value);
  ref.current = value;
  return ref;
}
