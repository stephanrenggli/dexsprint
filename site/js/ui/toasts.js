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
