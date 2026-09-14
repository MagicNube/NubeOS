type StatusCheckbox = {
  label: string;
  checked?: boolean;
  onChange: (checked: boolean) => void;
};

export function confirmInferredStatusChange(
  itemName: string,
  currentStatus: string,
  suggestedStatus: string,
  source = "El historial",
  consequence?: string,
  option?: StatusCheckbox,
): Promise<boolean> {
  return showStatusChoice({
    heading: "¿Actualizar el estado?",
    message: `${source} sugiere cambiar “${itemName}” de ${currentStatus} a ${suggestedStatus}.${consequence ? ` ${consequence}` : ""}`,
    currentStatus, suggestedStatus, option,
    choices: [
      { label: `Mantener ${currentStatus}`, value: false },
      { label: `Cambiar a ${suggestedStatus}`, value: true, recommended: true },
    ],
    cancelled: false,
  });
}

export function chooseInferredStatus<T extends string>(
  itemName: string,
  currentStatus: string,
  heading: string,
  message: string,
  choices: { label: string; value: T; recommended?: boolean }[],
): Promise<T | null> {
  return showStatusChoice<T | null>({
    heading, message: `“${itemName}”: ${message}`,
    currentStatus,
    suggestedStatus: choices.find((choice) => choice.recommended)?.label ?? choices[0].label,
    choices: [
      ...choices.filter((choice) => choice.recommended),
      ...choices.filter((choice) => !choice.recommended),
      { label: "Mantener estado actual", value: null },
    ],
    cancelled: null,
  });
}

function showStatusChoice<T>({ heading, message: description, currentStatus, suggestedStatus, option, choices, cancelled }: {
  heading: string;
  message: string;
  currentStatus: string;
  suggestedStatus: string;
  option?: StatusCheckbox;
  choices: { label: string; value: T; recommended?: boolean }[];
  cancelled: T;
}): Promise<T> {
  return new Promise((resolve) => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const backdrop = document.createElement("div");
    backdrop.className = "ui-status-confirm-backdrop";

    const dialog = document.createElement("section");
    dialog.className = "ui-status-confirm";
    dialog.setAttribute("aria-labelledby", "ui-status-confirm-title");
    dialog.setAttribute("aria-modal", "true");
    dialog.setAttribute("role", "alertdialog");

    const eyebrow = document.createElement("span");
    eyebrow.textContent = "CAMBIO SUGERIDO";
    const title = document.createElement("h2");
    title.id = "ui-status-confirm-title";
    title.textContent = heading;
    const message = document.createElement("p");
    message.textContent = description;

    const transition = document.createElement("div");
    transition.className = "ui-status-confirm-transition";
    const previous = document.createElement("strong");
    previous.textContent = currentStatus;
    const arrow = document.createElement("span");
    arrow.textContent = "→";
    const next = document.createElement("strong");
    next.textContent = suggestedStatus;
    transition.append(previous, arrow, next);

    const optionalChoice = option ? document.createElement("label") : null;
    if (optionalChoice && option) {
      optionalChoice.className = "ui-status-confirm-option";
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = option.checked ?? true;
      checkbox.addEventListener("change", () => option.onChange(checkbox.checked));
      const optionText = document.createElement("span");
      optionText.textContent = option.label;
      optionalChoice.append(checkbox, optionText);
    }

    const actions = document.createElement("div");
    actions.className = "ui-status-confirm-actions";
    if (choices.length > 2) actions.classList.add("ui-status-confirm-actions-stacked");
    const buttons = choices.map((choice) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = choice.recommended ? "primary-button" : "secondary-button";
      button.textContent = choice.label + (choices.length > 2 && choice.recommended ? " (recomendado)" : "");
      button.addEventListener("click", () => finish(choice.value));
      actions.append(button);
      return button;
    });
    dialog.append(eyebrow, title, message, transition);
    if (optionalChoice) dialog.append(optionalChoice);
    dialog.append(actions);
    backdrop.append(dialog);

    let restoreBackground: () => void = () => undefined;

    const finish = (accepted: T) => {
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
        finish(cancelled);
      }
      if (event.key === "Tab") {
        const controls = Array.from(dialog.querySelectorAll<HTMLElement>("input, button"));
        const index = controls.indexOf(document.activeElement as HTMLElement);
        event.preventDefault();
        event.stopImmediatePropagation();
        controls[(index + (event.shiftKey ? -1 : 1) + controls.length) % controls.length]?.focus();
      }
    };
    backdrop.addEventListener("click", (event) => {
      if (event.target === backdrop) finish(cancelled);
    });
    document.addEventListener("keydown", onKeyDown, true);
    document.body.append(backdrop);
    restoreBackground = makeBackgroundInert(backdrop);
    buttons[choices.findIndex((choice) => choice.recommended)]?.focus();
  });
}
import { makeBackgroundInert } from "./modalA11y";
