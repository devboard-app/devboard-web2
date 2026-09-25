import { useEffect, useRef, type RefObject } from 'react';

/** Marks elements whose click swaps an open panel's content instead of closing it (ticket cards). */
const KEEP_PANEL_OPEN_ATTR = 'data-keep-panel-open';

/**
 * Closes a non-modal side panel on Escape or on a click outside it.
 *
 * - Clicks on `[data-keep-panel-open]` elements don't count as outside, so clicking
 *   another ticket card switches the panel instead of closing it.
 * - Both the press and the release must be outside: a text selection that starts
 *   in the panel and ends on the board doesn't close it.
 * - Uses `click`, not `pointerdown`, so a field being edited blurs (and saves) first.
 * - The first Escape only leaves a focused field; the next one closes the panel.
 */
export function useDismiss(ref: RefObject<HTMLElement | null>, onDismiss: () => void) {
  const onDismissRef = useRef(onDismiss);
  useEffect(() => { onDismissRef.current = onDismiss; });

  useEffect(() => {
    let pressedOutside = false;

    function isOutside(target: EventTarget | null) {
      if (!(target instanceof Element) || !ref.current) return false;
      if (ref.current.contains(target)) return false;
      return !target.closest(`[${KEEP_PANEL_OPEN_ATTR}]`);
    }

    function onPointerDown(e: PointerEvent) {
      pressedOutside = isOutside(e.target);
    }

    function onClick(e: MouseEvent) {
      if (pressedOutside && isOutside(e.target)) onDismissRef.current();
      pressedOutside = false;
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Escape' || e.defaultPrevented) return;
      const el = e.target;
      if (el instanceof HTMLElement && (el.matches('input, textarea, select') || el.isContentEditable)) {
        el.blur();
        return;
      }
      onDismissRef.current();
    }

    // Capture phase: runs before any inner handler can stop propagation.
    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('click', onClick, true);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [ref]);
}
