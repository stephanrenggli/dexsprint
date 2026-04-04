export function normalizeName(value) {
  if (!value) return "";
  let name = value
    .toLowerCase()
    .trim()
    .replace(/[’']/g, "")
    .replace(/♀/g, "-f")
    .replace(/♂/g, "-m")
    .replace(/\s+/g, "-")
    .replace(/\.+/g, "")
    .replace(/[^a-z0-9-]/g, "");
  name = name.replace(/-+/g, "-");
  return name;
}

export function prettifyName(value) {
  return value
    .split("-")
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(" ")
    .replace("Hp", "HP");
}

export function normalizeGuess(value) {
  if (!value) return "";
  return value
    .toLowerCase()
    .trim()
    .replace(/[’']/g, "")
    .replace(/♀/g, "f")
    .replace(/♂/g, "m")
    .replace(/\s+/g, "")
    .replace(/\.+/g, "")
    .replace(/[^a-z0-9]/g, "");
}

export function formatGenerationLabel(genName) {
  const map = {
    "generation-i": "Kanto (Gen I)",
    "generation-ii": "Johto (Gen II)",
    "generation-iii": "Hoenn (Gen III)",
    "generation-iv": "Sinnoh (Gen IV)",
    "generation-v": "Unova (Gen V)",
    "generation-vi": "Kalos (Gen VI)",
    "generation-vii": "Alola (Gen VII)",
    "generation-viii": "Galar (Gen VIII)",
    "generation-ix": "Paldea (Gen IX)"
  };
  return map[genName] || prettifyName(genName);
}

export function generationOrder(genName) {
  const order = {
    "generation-i": 1,
    "generation-ii": 2,
    "generation-iii": 3,
    "generation-iv": 4,
    "generation-v": 5,
    "generation-vi": 6,
    "generation-vii": 7,
    "generation-viii": 8,
    "generation-ix": 9
  };
  return order[genName] || 999;
}
