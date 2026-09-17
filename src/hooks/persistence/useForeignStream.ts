import { useCallback, useEffect, useRef, useState } from 'react';
import { ChatSession } from '../chatSession';

/** An answer streaming in another tab: blocks sending and settles after the grace period. */
export default function useForeignStream(session: ChatSession) {
  const [foreignInFlight, setForeignInFlight] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setForeign = useCallback(
    (value: boolean) => {
      session.foreignInFlight = value;
      setForeignInFlight(value);
    },
    [session],
  );

  const clearTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
  }, []);

  /** Show the thread as streaming elsewhere, then run `onExpire` unless cleared before. */
  const watch = useCallback(
    (remainingMs: number, onExpire: () => void) => {
      clearTimer();
      setForeign(true);
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        setForeign(false);
        onExpire();
      }, remainingMs);
    },
    [clearTimer, setForeign],
  );

  const stop = useCallback(() => {
    clearTimer();
    setForeign(false);
  }, [clearTimer, setForeign]);

  useEffect(() => clearTimer, [clearTimer]);

  return { foreignInFlight, setForeignInFlight, watch, stop, clearTimer };
}
