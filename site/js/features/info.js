import { normalizeName, prettifyName } from "../domain/text.js";
import { TYPE_ID_MAP } from "../core/app-config.js";
import {
  renderLabeledCards,
  renderTextChips,
  renderTypeChips
} from "../ui/chips.js";

export function createInfoController({
  state,
  pokedex,
  modalController,
  infoModal,
  infoClose,
  infoSprite,
  infoTitle,
  infoMeta,
  infoTypes,
  infoGenus,
  infoAbilities,
  infoStats,
  infoFacts,
  getSpriteForEntry,
  playCry
}) {
  function getTypeId(typeName) {
    return TYPE_ID_MAP[typeName] || 1;
  }

  async function getPokedexInfo(entry) {
    if (!entry || !entry.dexId) return null;
    if (state.infoCache.has(entry.dexId)) return state.infoCache.get(entry.dexId);
    const [pokemon, species] = await pokedex.resource([
      `/api/v2/pokemon/${entry.dexId}`,
      `/api/v2/pokemon-species/${entry.dexId}`
    ]);
    if (!pokemon || !species) return null;

    const heightM = pokemon.height ? `${(pokemon.height / 10).toFixed(1)} m` : "";
    const weightKg = pokemon.weight ? `${(pokemon.weight / 10).toFixed(1)} kg` : "";
    const abilities = (pokemon.abilities || [])
      .slice()
      .sort((a, b) => Number(a.slot || 0) - Number(b.slot || 0))
      .map((a) => {
        const name = prettifyName(a.ability.name);
        return a.is_hidden ? `${name} (Hidden)` : name;
      });
    const genusEntry = (species.genera || []).find(
      (g) => g.language && g.language.name === "en"
    );

    const details = {
      genus: genusEntry ? genusEntry.genus : "",
      height: heightM,
      weight: weightKg,
      abilities,
      baseExperience: pokemon.base_experience ? String(pokemon.base_experience) : "",
      color: species.color ? prettifyName(species.color.name) : "",
      habitat: species.habitat ? prettifyName(species.habitat.name) : "",
      shape: species.shape ? prettifyName(species.shape.name) : "",
      growthRate: species.growth_rate ? prettifyName(species.growth_rate.name) : "",
      captureRate:
        typeof species.capture_rate === "number" ? String(species.capture_rate) : "",
      baseHappiness:
        typeof species.base_happiness === "number" ? String(species.base_happiness) : ""
    };
    state.infoCache.set(entry.dexId, details);
    return details;
  }

  function renderInfoMeta(entry) {
    if (!infoMeta) return;
    const values = [];
    if (entry?.dexId) {
      values.push(`#${String(entry.dexId).padStart(4, "0")}`);
    }
    if (entry?.generation) {
      values.push(entry.generation);
    }
    renderTextChips(infoMeta, values, "info-meta-chip");
  }

  function renderInfoTypes(typeNames = []) {
    renderTypeChips(infoTypes, typeNames, getTypeId);
  }

  function renderInfoStats(details) {
    if (!infoStats) return;
    const stats = [
      { label: "Height", value: details.height || "-" },
      { label: "Weight", value: details.weight || "-" },
      { label: "Base Exp", value: details.baseExperience || "-" },
      { label: "Abilities", value: String((details.abilities || []).length) }
    ];
    renderLabeledCards(infoStats, stats, {
      cardClass: "info-stat-card",
      labelClass: "info-stat-card__label",
      valueClass: "info-stat-card__value"
    });
  }

  function renderInfoAbilities(details) {
    if (!infoAbilities) return;
    const abilities = details.abilities || [];
    if (!abilities.length) {
      infoAbilities.textContent = "No ability data available.";
      return;
    }
    renderTextChips(infoAbilities, abilities, "info-pill");
  }

  function renderInfoFacts(details) {
    if (!infoFacts) return;
    const facts = [
      { label: "Color", value: details.color },
      { label: "Habitat", value: details.habitat },
      { label: "Shape", value: details.shape },
      { label: "Growth Rate", value: details.growthRate },
      { label: "Capture Rate", value: details.captureRate },
      { label: "Base Happiness", value: details.baseHappiness }
    ].filter((fact) => fact.value);
    renderLabeledCards(infoFacts, facts, {
      cardClass: "info-fact",
      labelClass: "info-fact__label",
      valueClass: "info-fact__value",
      emptyMessage: "No additional data available."
    });
  }

  function renderInfoModalContent(entry, { loading = false } = {}) {
    if (!entry || !infoModal) return;
    if (infoTitle) infoTitle.textContent = entry.label;
    if (infoSprite) {
      infoSprite.src = getSpriteForEntry(entry);
      infoSprite.alt = entry.label;
    }
    renderInfoMeta(entry);
    renderInfoTypes();
    if (infoGenus) infoGenus.textContent = loading ? "Loading details..." : "";
    if (infoStats) infoStats.innerHTML = "";
    if (infoAbilities) infoAbilities.innerHTML = "";
    if (infoFacts) infoFacts.innerHTML = "";
  }

  async function loadInfoModalDetails(entry) {
    if (!entry || !infoModal) return;
    try {
      const details = await getPokedexInfo(entry);
      if (!details) return;
      if (infoGenus) infoGenus.textContent = details.genus || "";
      renderInfoStats(details);
      renderInfoAbilities(details);
      renderInfoFacts(details);
      renderInfoTypes(entry.types || []);
    } catch {
      if (infoGenus) infoGenus.textContent = "Could not load details.";
    }
  }

  async function openInfoModal(entry) {
    if (!entry || !infoModal) return;
    renderInfoModalContent(entry, { loading: true });
    state.activeEntry = entry;
    modalController?.openModal(infoModal, infoClose);
    playCry(entry.normalized || normalizeName(entry.label || ""));
    await loadInfoModalDetails(entry);
  }

  function closeInfoModal() {
    if (!infoModal) return;
    modalController?.closeModal(infoModal);
    state.activeEntry = null;
  }

  function refreshActiveDetailViews() {
    if (state.activeEntry && infoModal && !infoModal.classList.contains("hidden")) {
      renderInfoModalContent(state.activeEntry, { loading: true });
      void loadInfoModalDetails(state.activeEntry);
    }
  }

  return {
    getTypeId,
    getPokedexInfo,
    renderInfoMeta,
    renderInfoStats,
    renderInfoAbilities,
    renderInfoFacts,
    renderInfoTypes,
    renderInfoModalContent,
    loadInfoModalDetails,
    openInfoModal,
    closeInfoModal,
    refreshActiveDetailViews
  };
}
