import { useEffect, useRef } from 'react';

/** A ref that is `true` while mounted, for async work that must not land after unmount. */
export default function useIsMounted() {
  const ref = useRef(true);
  useEffect(() => {
    ref.current = true;
    return () => {
      ref.current = false;
    };
  }, []);
  return ref;
}
