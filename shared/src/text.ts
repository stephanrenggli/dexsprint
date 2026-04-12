const DIACRITIC_REGEX = /[\u0300-\u036f]/g;
const NON_ALPHANUMERIC_REGEX = /[^a-z0-9]/g;

export function normalizeGuess(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(DIACRITIC_REGEX, "")
    .replace(/♀/g, "f")
    .replace(/♂/g, "m")
    .replace(/&/g, "and")
    .replace(NON_ALPHANUMERIC_REGEX, "");
}

export function normalizeName(value: string): string {
  return normalizeGuess(value);
}

export function prettifyName(value: string): string {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
