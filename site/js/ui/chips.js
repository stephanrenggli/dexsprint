export function renderTextChips(container, values = [], className) {
  if (!container) return;
  const fragment = document.createDocumentFragment();
  values.forEach((value) => {
    const chip = document.createElement("span");
    chip.className = className;
    chip.textContent = value;
    fragment.appendChild(chip);
  });
  container.replaceChildren(fragment);
}

export function renderTypeChips(container, typeNames = [], getTypeId = () => 1) {
  if (!container) return;
  const fragment = document.createDocumentFragment();
  (typeNames || []).forEach((typeName) => {
    const chip = document.createElement("span");
    chip.className = "info-type-chip";
    const icon = document.createElement("img");
    icon.alt = `${typeName} type`;
    icon.src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/types/generation-ix/scarlet-violet/small/${getTypeId(typeName)}.png`;
    const text = document.createElement("span");
    text.textContent = typeName;
    chip.appendChild(icon);
    chip.appendChild(text);
    fragment.appendChild(chip);
  });
  container.replaceChildren(fragment);
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
  const fragment = document.createDocumentFragment();
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
  list.forEach((item) => {
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
    fragment.appendChild(card);
  });
  container.replaceChildren(fragment);
}
