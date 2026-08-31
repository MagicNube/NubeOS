export function confirmInferredStatusChange(
  itemName: string,
  currentStatus: string,
  suggestedStatus: string,
  source = "El historial",
): Promise<boolean> {
  return new Promise((resolve) => {
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
    title.textContent = "¿Actualizar el estado?";
    const message = document.createElement("p");
    message.textContent = `${source} sugiere cambiar “${itemName}” de ${currentStatus} a ${suggestedStatus}.`;

    const transition = document.createElement("div");
    transition.className = "ui-status-confirm-transition";
    const previous = document.createElement("strong");
    previous.textContent = currentStatus;
    const arrow = document.createElement("span");
    arrow.textContent = "→";
    const next = document.createElement("strong");
    next.textContent = suggestedStatus;
    transition.append(previous, arrow, next);

    const actions = document.createElement("div");
    actions.className = "ui-status-confirm-actions";
    const keep = document.createElement("button");
    keep.className = "secondary-button";
    keep.type = "button";
    keep.textContent = `Mantener ${currentStatus}`;
    const change = document.createElement("button");
    change.className = "primary-button";
    change.type = "button";
    change.textContent = `Cambiar a ${suggestedStatus}`;
    actions.append(keep, change);
    dialog.append(eyebrow, title, message, transition, actions);
    backdrop.append(dialog);

    const finish = (accepted: boolean) => {
      document.removeEventListener("keydown", onKeyDown);
      backdrop.remove();
      resolve(accepted);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") finish(false);
    };
    keep.addEventListener("click", () => finish(false));
    change.addEventListener("click", () => finish(true));
    backdrop.addEventListener("click", (event) => {
      if (event.target === backdrop) finish(false);
    });
    document.addEventListener("keydown", onKeyDown);
    document.body.append(backdrop);
    change.focus();
  });
}
