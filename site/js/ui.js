export function createInfoTipContent(tip) {
  const label = tip.dataset.tipLabel || "Help";
  const text = tip.dataset.tip || "";
  const tipId = tip.dataset.tipId || "";
  tip.replaceChildren();

  const button = document.createElement("button");
  button.className = "info-tip__button";
  button.type = "button";
  button.setAttribute("aria-label", `${label} help`);
  if (tipId) button.setAttribute("aria-describedby", tipId);

  const bubble = document.createElement("span");
  if (tipId) bubble.id = tipId;
  bubble.className = "info-tip__bubble";
  bubble.setAttribute("role", "tooltip");
  bubble.textContent = text;

  tip.appendChild(button);
  tip.appendChild(bubble);
}

export function enhanceSettingsInfoTips(settingsPanelCard) {
  if (!settingsPanelCard) return;
  const tips = [...settingsPanelCard.querySelectorAll(".info-tip[data-tip]")];
  tips.forEach((tip) => {
    if (tip.dataset.enhanced === "true") return;
    createInfoTipContent(tip);
    tip.dataset.enhanced = "true";
  });
}

export function positionSettingsInfoTips(settingsPanelCard) {
  if (!settingsPanelCard) return;
  const panelRect = settingsPanelCard.getBoundingClientRect();
  const tips = [...settingsPanelCard.querySelectorAll(".info-tip")];
  tips.forEach((tip) => {
    const bubble = tip.querySelector(".info-tip__bubble");
    if (!bubble) return;
    const tipRect = tip.getBoundingClientRect();
    const bubbleRect = bubble.getBoundingClientRect();
    const gap = 8;
    const panelPadding = 8;
    const rightSpace = panelRect.right - tipRect.right - panelPadding;
    const leftSpace = tipRect.left - panelRect.left - panelPadding;
    const fitsRight = rightSpace >= bubbleRect.width + gap;
    const fitsLeft = leftSpace >= bubbleRect.width + gap;
    let side = "right";
    if (fitsLeft && !fitsRight) side = "left";
    else if (!fitsLeft && fitsRight) side = "right";
    else if (!fitsLeft && !fitsRight) side = leftSpace >= rightSpace ? "left" : "right";
    tip.dataset.side = side;
  });
}

export function getModalBaseLayer(modalId) {
  switch (modalId) {
    case "confirm-modal":
      return 1000;
    case "settings-modal":
      return 900;
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

async function drainStateToastQueue(stateToastState, refs) {
  if (stateToastState.active || !refs?.toastEl) return;
  stateToastState.active = true;
  while (stateToastState.queue.length) {
    const next = stateToastState.queue.shift();
    if (!next) continue;
    if (refs.metaEl) refs.metaEl.textContent = next.meta;
    if (refs.iconEl) refs.iconEl.textContent = next.icon;
    if (refs.titleEl) refs.titleEl.textContent = next.title;
    refs.toastEl.hidden = false;
    refs.toastEl.classList.remove("is-active");
    void refs.toastEl.offsetWidth;
    refs.toastEl.classList.add("is-active");
    await new Promise((resolve) => setTimeout(resolve, 1800));
  }
  refs.toastEl.hidden = true;
  stateToastState.active = false;
}

export function showStateToast(stateToastState, refs, { meta, title, icon }) {
  if (!refs?.toastEl) return;
  stateToastState.queue.push({
    meta: meta || "Update",
    title: title || "",
    icon: icon || "OK"
  });
  if (stateToastState.active) return;
  void drainStateToastQueue(stateToastState, refs);
}
