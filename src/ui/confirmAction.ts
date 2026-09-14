import { makeBackgroundInert } from "./modalA11y";
import "./ui.css";

export type ConfirmationOptions = {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
};

let confirmationId = 0;

export function confirmAction({
  title,
  message: description,
  confirmLabel,
  cancelLabel = "Cancelar",
  destructive = false,
}: ConfirmationOptions): Promise<boolean> {
  return new Promise((resolve) => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const backdrop = document.createElement("div");
    backdrop.className = "ui-action-confirm-backdrop";

    const dialog = document.createElement("section");
    const titleId = `ui-action-confirm-title-${++confirmationId}`;
    dialog.className = "ui-action-confirm";
    dialog.setAttribute("aria-labelledby", titleId);
    dialog.setAttribute("aria-modal", "true");
    dialog.setAttribute("role", destructive ? "alertdialog" : "dialog");

    const eyebrow = document.createElement("span");
    eyebrow.textContent = destructive ? "ACCIÓN PERMANENTE" : "CONFIRMACIÓN";
    const heading = document.createElement("h2");
    heading.id = titleId;
    heading.textContent = title;
    const message = document.createElement("p");
    message.textContent = description;

    const actions = document.createElement("div");
    actions.className = "ui-action-confirm-actions";
    const cancel = document.createElement("button");
    cancel.type = "button";
    cancel.className = "secondary-button";
    cancel.textContent = cancelLabel;
    const confirm = document.createElement("button");
    confirm.type = "button";
    confirm.className = destructive ? "ui-action-confirm-danger" : "primary-button";
    confirm.textContent = confirmLabel;
    actions.append(cancel, confirm);
    dialog.append(eyebrow, heading, message, actions);
    backdrop.append(dialog);
    document.body.append(backdrop);

    const restoreBackground = makeBackgroundInert(backdrop);

    const finish = (accepted: boolean) => {
      document.removeEventListener("keydown", onKeyDown, true);
      restoreBackground();
      backdrop.remove();
      previousFocus?.focus();
      resolve(accepted);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (backdrop.inert) return;
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopImmediatePropagation();
        finish(false);
        return;
      }
      if (event.key === "Tab") {
        const controls = [cancel, confirm];
        const index = controls.indexOf(document.activeElement as HTMLButtonElement);
        event.preventDefault();
        event.stopImmediatePropagation();
        controls[(index + (event.shiftKey ? -1 : 1) + controls.length) % controls.length]?.focus();
      }
    };

    cancel.addEventListener("click", () => finish(false));
    confirm.addEventListener("click", () => finish(true));
    backdrop.addEventListener("click", (event) => {
      if (event.target === backdrop) finish(false);
    });
    document.addEventListener("keydown", onKeyDown, true);
    cancel.focus();
  });
}
