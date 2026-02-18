
import type { RefObject } from "react";
import { useEffect } from "react";

function getFocusable(node: HTMLElement): HTMLElement[] {
  return Array.from(
    node.querySelectorAll<HTMLElement>(
      "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])"
    )
  ).filter((el) => !el.hasAttribute("disabled"));
}

export function useFocusTrap(enabled: boolean, containerRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const container = containerRef.current;
    if (!enabled || !container) {
      return;
    }

    const focusable = getFocusable(container);
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    first?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Tab") {
        return;
      }

      if (!first || !last) {
        event.preventDefault();
        return;
      }

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    container.addEventListener("keydown", onKeyDown);
    return () => {
      container.removeEventListener("keydown", onKeyDown);
    };
  }, [enabled, containerRef]);
}
