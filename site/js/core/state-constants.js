export const STORAGE_SCHEMA_VERSION = 2;
export const STORAGE_KEY = `dexsprint-state:v${STORAGE_SCHEMA_VERSION}`;
export const STORAGE_BACKUP_KEY = `${STORAGE_KEY}:backup`;
export const STORAGE_SETTINGS_KEY = `${STORAGE_KEY}:settings`;
export const LEGACY_STORAGE_KEY = "pokequiz-state";
export const LEGACY_STORAGE_SETTINGS_KEY = "pokequiz-state:settings";
export const SAVE_STATE_DEBOUNCE_MS = 150;
export const DEFAULT_STATUS = "";
export const DEFAULT_GAME_MODE = "off";
export const DEFAULT_TYPO_MODE = "normal";
export const PROGRESS_CODE_PREFIX = "dexsprint.";
export const LEGACY_PROGRESS_CODE_PREFIX = "dq3.";
export const BADGES = [
  {
    id: "first-catch",
    icon: "P1",
    title: "First Catch",
    description: "Find your first Pokemon.",
    unlocked: ({ foundCount }) => foundCount >= 1
  },
  {
    id: "rookie-trainer",
    icon: "10",
    title: "Rookie Trainer",
    description: "Find 10 Pokemon.",
    unlocked: ({ foundCount }) => foundCount >= 10
  },
  {
    id: "collector",
    icon: "100",
    title: "Collector",
    description: "Find 100 Pokemon.",
    unlocked: ({ foundCount }) => foundCount >= 100
  },
  {
    id: "halfway-there",
    icon: "50%",
    title: "Halfway There",
    description: "Reach 50% overall completion.",
    unlocked: ({ totalCount, foundCount }) =>
      totalCount > 0 && foundCount / totalCount >= 0.5
  },
  {
    id: "region-master",
    icon: "GEN",
    title: "Region Master",
    description: "Complete any generation.",
    unlocked: ({ completedGenerations }) => completedGenerations.length > 0
  },
  {
    id: "type-specialist",
    icon: "TYPE",
    title: "Type Specialist",
    description: "Complete any type.",
    unlocked: ({ completedTypes }) => completedTypes.length > 0
  },
  {
    id: "national-dex",
    icon: "DEX",
    title: "National Dex",
    description: "Find every Pokemon in the quiz.",
    unlocked: ({ totalCount, foundCount }) =>
      totalCount > 0 && foundCount === totalCount
  }
];
