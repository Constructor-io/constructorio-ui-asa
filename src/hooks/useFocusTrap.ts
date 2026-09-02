import { RefObject, useEffect } from 'react';

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface UseFocusTrapOptions {
  /** Called when the Escape key is pressed while focus is inside the container. */
  onEscape?: () => void;
  /** Cycle Tab/Shift+Tab inside the container. Defaults to true. */
  trapFocus?: boolean;
}

/**
 * Traps Tab/Shift+Tab focus within the referenced container and invokes
 * onEscape when Escape is pressed.
 */
export default function useFocusTrap(
  containerRef: RefObject<HTMLElement>,
  { onEscape, trapFocus = true }: UseFocusTrapOptions = {},
) {
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onEscape) {
        onEscape();
      }

      if (e.key === 'Tab' && trapFocus) {
        const focusableElements = container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
        if (focusableElements.length === 0) return;

        const first = focusableElements[0];
        const last = focusableElements[focusableElements.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    return () => container.removeEventListener('keydown', handleKeyDown);
  }, [containerRef, onEscape, trapFocus]);
}
