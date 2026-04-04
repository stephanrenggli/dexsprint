const TYPE_ID_MAP = {
  Normal: 1,
  Fighting: 2,
  Flying: 3,
  Poison: 4,
  Ground: 5,
  Rock: 6,
  Bug: 7,
  Ghost: 8,
  Steel: 9,
  Fire: 10,
  Water: 11,
  Grass: 12,
  Electric: 13,
  Psychic: 14,
  Ice: 15,
  Dragon: 16,
  Dark: 17,
  Fairy: 18
};

const STUDY_SCENE_PALETTE_BY_TYPE = {
  Normal: { sky: "#c9d6df", sky2: "#8fa4b3", ground: "#b28f65", ground2: "#6e5438", shadow: "rgba(72, 50, 28, 0.34)" },
  Fire: { sky: "#ffb15c", sky2: "#ff6b2c", ground: "#bf4a24", ground2: "#5f160e", shadow: "rgba(96, 22, 8, 0.4)" },
  Water: { sky: "#88ddff", sky2: "#2d90ff", ground: "#2879b8", ground2: "#173e75", shadow: "rgba(13, 46, 88, 0.38)" },
  Electric: { sky: "#fff06b", sky2: "#ffbf00", ground: "#d28d00", ground2: "#6e4e00", shadow: "rgba(97, 74, 0, 0.34)" },
  Grass: { sky: "#baf06b", sky2: "#61b84a", ground: "#4d9a3f", ground2: "#234d1c", shadow: "rgba(27, 67, 21, 0.34)" },
  Ice: { sky: "#d7fcff", sky2: "#78dbff", ground: "#7cb6d8", ground2: "#3d6f97", shadow: "rgba(43, 78, 101, 0.3)" },
  Fighting: { sky: "#dc9b8f", sky2: "#bb4938", ground: "#8d3128", ground2: "#41120f", shadow: "rgba(65, 18, 15, 0.4)" },
  Poison: { sky: "#d49df2", sky2: "#8f3cc8", ground: "#6e3198", ground2: "#34114e", shadow: "rgba(49, 14, 73, 0.4)" },
  Ground: { sky: "#e5c26b", sky2: "#b9873f", ground: "#8c6330", ground2: "#4b3315", shadow: "rgba(65, 43, 16, 0.36)" },
  Flying: { sky: "#d9e5ff", sky2: "#7ea2ff", ground: "#7b96cf", ground2: "#40548d", shadow: "rgba(47, 66, 110, 0.3)" },
  Psychic: { sky: "#ffb4d3", sky2: "#ff4f97", ground: "#d04d82", ground2: "#6e1f42", shadow: "rgba(95, 18, 51, 0.36)" },
  Bug: { sky: "#d6ee7a", sky2: "#95bc2d", ground: "#758f24", ground2: "#384510", shadow: "rgba(42, 52, 12, 0.36)" },
  Rock: { sky: "#d7c1a1", sky2: "#9a7a4c", ground: "#7c613f", ground2: "#43321f", shadow: "rgba(50, 37, 22, 0.34)" },
  Ghost: { sky: "#b3a5e7", sky2: "#6a56b8", ground: "#574190", ground2: "#261943", shadow: "rgba(28, 18, 53, 0.42)" },
  Dragon: { sky: "#b2a0ff", sky2: "#5f37ff", ground: "#4b39bf", ground2: "#1f1368", shadow: "rgba(25, 17, 76, 0.42)" },
  Dark: { sky: "#988f89", sky2: "#564a42", ground: "#443934", ground2: "#1a1412", shadow: "rgba(16, 12, 10, 0.44)" },
  Steel: { sky: "#d4dee7", sky2: "#8fa2b7", ground: "#74879c", ground2: "#394857", shadow: "rgba(40, 51, 63, 0.32)" },
  Fairy: { sky: "#ffc7df", sky2: "#ff8fbe", ground: "#d978a1", ground2: "#70344f", shadow: "rgba(92, 36, 61, 0.34)" }
};

const typeIconBase =
  "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/types/generation-ix/scarlet-violet/small/";
const spriteFallback =
  "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/0.png";
const spriteBase =
  "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/";
const spriteShinyBase =
  "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/";
const criesLatestBase =
  "https://raw.githubusercontent.com/PokeAPI/cries/main/cries/pokemon/latest/";
const criesLegacyBase =
  "https://raw.githubusercontent.com/PokeAPI/cries/main/cries/pokemon/legacy/";
const DEFAULT_INPUT_PLACEHOLDER = "Charizard";

const themeConfigEl = typeof document !== "undefined" ? document.getElementById("theme-config") : null;
const githubRepoMeta =
  typeof document !== "undefined"
    ? document.querySelector('meta[name="dexsprint-github-repo"]')
    : null;
const githubRepo = githubRepoMeta ? githubRepoMeta.getAttribute("content") : "";
const themeConfig = themeConfigEl
  ? JSON.parse(themeConfigEl.textContent)
  : { defaultTheme: "normal", themes: [] };
const DEFAULT_THEME = themeConfig.defaultTheme || "normal";
const THEMES = themeConfig.themes || [];

export {
  TYPE_ID_MAP,
  STUDY_SCENE_PALETTE_BY_TYPE,
  typeIconBase,
  spriteFallback,
  spriteBase,
  spriteShinyBase,
  criesLatestBase,
  criesLegacyBase,
  DEFAULT_INPUT_PLACEHOLDER,
  themeConfig,
  DEFAULT_THEME,
  THEMES,
  githubRepo
};
