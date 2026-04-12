export function getModalBaseLayer(modalId) {
  switch (modalId) {
    case "confirm-modal":
      return 1000;
    case "settings-modal":
      return 900;
    case "qr-modal":
      return 950;
    case "achievements-modal":
      return 800;
    case "changelog-modal":
      return 700;
    case "info-modal":
      return 600;
    default:
      return 500;
  }
}

export function getModalFocusableElements(modal) {
  if (!modal) return [];
  return [...modal.querySelectorAll("a[href], button, textarea, input, select, [tabindex]:not([tabindex='-1'])")]
    .filter((el) => !el.hasAttribute("disabled") && el.getAttribute("aria-hidden") !== "true");
}

export function trapModalFocus(activeModal, event) {
  if (!activeModal || event.key !== "Tab") return;
  const focusable = getModalFocusableElements(activeModal);
  if (!focusable.length) {
    event.preventDefault();
    if (activeModal.focus) activeModal.focus();
    return;
  }
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  const current = document.activeElement;
  if (event.shiftKey && current === first) {
    event.preventDefault();
    last.focus();
    return;
  }
  if (!event.shiftKey && current === last) {
    event.preventDefault();
    first.focus();
  }
}

export function flashElement(el, className, timeout = 700) {
  if (!el || !className) return;
  el.classList.remove(className);
  void el.offsetWidth;
  el.classList.add(className);
  clearTimeout(el._flashTimer);
  el._flashTimer = setTimeout(() => {
    el.classList.remove(className);
  }, timeout);
}

export function setCheckboxGroupDisabled(inputs, disabled, container = null) {
  if (container) {
    container.setAttribute("aria-disabled", disabled ? "true" : "false");
  }
  const checkboxInputs = inputs || [];
  [...checkboxInputs].forEach((input) => {
    input.disabled = disabled;
  });
}
