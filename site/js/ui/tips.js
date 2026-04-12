import { clearContainer } from "./dom.js";

export function createInfoTipContent(tip) {
  const label = tip.dataset.tipLabel || "Help";
  const text = tip.dataset.tip || "";
  const tipId = tip.dataset.tipId || "";
  clearContainer(tip);

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
