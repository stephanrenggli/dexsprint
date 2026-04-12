import { renderNodeList } from "./dom.js";

export function renderTextChips(container, values = [], className) {
  renderNodeList(container, values, (value) => {
    const chip = document.createElement("span");
    chip.className = className;
    chip.textContent = value;
    return chip;
  });
}

export function renderPokemonMetaChips(container, entry = null, className) {
  if (!container) return;
  const values = [];
  if (entry?.dexId) {
    values.push(`#${String(entry.dexId).padStart(4, "0")}`);
  }
  if (entry?.generation) {
    values.push(entry.generation);
  }
  renderTextChips(container, values, className);
}

export function renderTypeChips(container, typeNames = [], getTypeId = () => 1) {
  renderNodeList(container, typeNames, (typeName) => {
    const chip = document.createElement("span");
    chip.className = "info-type-chip";
    const icon = document.createElement("img");
    icon.alt = `${typeName} type`;
    icon.src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/types/generation-ix/scarlet-violet/small/${getTypeId(typeName)}.png`;
    const text = document.createElement("span");
    text.textContent = typeName;
    chip.appendChild(icon);
    chip.appendChild(text);
    return chip;
  });
}

export function renderLabeledCards(
  container,
  items,
  {
    cardClass,
    labelClass,
    valueClass,
    emptyMessage = "",
    hideWhenEmpty = false
  } = {}
) {
  if (!container) return;
  const list = items || [];
  if (!list.length) {
    if (hideWhenEmpty) {
      container.classList.add("hidden");
    } else if (emptyMessage) {
      container.textContent = emptyMessage;
    }
    return;
  }

  container.classList.remove("hidden");
  renderNodeList(container, list, (item) => {
    const card = document.createElement("div");
    card.className = cardClass;

    const label = document.createElement("span");
    label.className = labelClass;
    label.textContent = item.label;

    const value = document.createElement("strong");
    value.className = valueClass;
    value.textContent = item.value;

    card.appendChild(label);
    card.appendChild(value);
    return card;
  });
}
