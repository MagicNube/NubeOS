import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import type { KeyboardEvent as ReactKeyboardEvent, ReactNode } from "react";
import { makeBackgroundInert } from "./modalA11y";
import "./ui.css";

const focusableSelector = [
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "a[href]",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

function modalControls(dialog: HTMLElement) {
  return Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector))
    .filter((element) => !element.hasAttribute("data-focus-guard") && element.tabIndex >= 0 && element.getClientRects().length > 0);
}

export default function Modal({
  children,
  className = "",
  initialFocus = "first",
  labelledBy,
  onClose,
}: {
  children: ReactNode;
  className?: string;
  initialFocus?: "first" | "dialog";
  labelledBy: string;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    const backdrop = backdropRef.current;
    const restoreBackground = backdrop ? makeBackgroundInert(backdrop) : () => undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const requestedFocus = dialog?.querySelector<HTMLElement>("[autofocus]");
    const firstFocusable = (dialog ? modalControls(dialog) : [])
      .find((element) => !element.classList.contains("ui-cover-adjust-button"));
    (initialFocus === "dialog" ? dialog : requestedFocus ?? firstFocusable ?? dialog)?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      restoreBackground();
      previousFocus?.focus();
    };
  }, []);

  function handleKeyDown(event: ReactKeyboardEvent<HTMLElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      onClose();
      return;
    }
    // Native date inputs have several Tab stops within one DOM input.
    // Boundary guards wrap only after those segments have been traversed.
  }

  function wrapFocus(edge: "first" | "last") {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const controls = modalControls(dialog);
    (edge === "first" ? controls[0] : controls[controls.length - 1])?.focus();
    if (!controls.length) dialog.focus();
  }

  return createPortal(
    <div
      className="ui-modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      ref={backdropRef}
    >
      <section
        aria-labelledby={labelledBy}
        aria-modal="true"
        className={`ui-modal-surface ${className}`.trim()}
        onKeyDown={handleKeyDown}
        ref={dialogRef}
        role="dialog"
        tabIndex={-1}
      >
        <span className="ui-focus-guard" data-focus-guard="" onFocus={() => wrapFocus("last")} tabIndex={0} />
        {children}
        <span className="ui-focus-guard" data-focus-guard="" onFocus={() => wrapFocus("first")} tabIndex={0} />
      </section>
    </div>,
    document.body,
  );
}
