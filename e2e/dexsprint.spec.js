import { chromium, expect, test as base } from "@playwright/test";

const remoteCdpUrl = process.env.PW_REMOTE_CDP_URL?.trim();

const test = base.extend({
  browser: async ({ browser, browserName }, use) => {
    if (!remoteCdpUrl) {
      await use(browser);
      return;
    }

    if (browserName !== "chromium") {
      throw new Error("PW_REMOTE_CDP_URL requires a Chromium browser project");
    }

    const connectedBrowser = await chromium.connectOverCDP(remoteCdpUrl);
    try {
      await use(connectedBrowser);
    } finally {
      await connectedBrowser.close();
    }
  }
});

const SETTINGS_STORAGE_KEY = "dexsprint-state:v2:settings";

function createPokeApiFixtures() {
  const species = [
    {
      name: "bulbasaur",
      url: "https://pokeapi.co/api/v2/pokemon-species/1/"
    },
    {
      name: "charmander",
      url: "https://pokeapi.co/api/v2/pokemon-species/4/"
    }
  ];

  const generations = [
    {
      name: "generation-i",
      url: "https://pokeapi.co/api/v2/generation/1/"
    }
  ];

  const types = [
    {
      name: "grass",
      url: "https://pokeapi.co/api/v2/type/12/"
    },
    {
      name: "poison",
      url: "https://pokeapi.co/api/v2/type/4/"
    },
    {
      name: "fire",
      url: "https://pokeapi.co/api/v2/type/10/"
    }
  ];

  return {
    speciesList: { results: species },
    generationList: { results: generations },
    typeList: { results: types }
  };
}

function createCatalogSnapshotFixture() {
  return {
    version: "e2e",
    generatedAt: "2026-04-14T00:00:00.000Z",
    entries: [
      {
        canonical: "bulbasaur",
        label: "Bulbasaur",
        dexId: 1,
        generation: "generation-i",
        types: ["grass", "poison"]
      },
      {
        canonical: "charmander",
        label: "Charmander",
        dexId: 4,
        generation: "generation-i",
        types: ["fire"]
      }
    ]
  };
}

async function mockPokeApi(context) {
  const fixtures = createPokeApiFixtures();

  await context.route("https://pokeapi.co/api/v2/**", async (route) => {
    const url = new URL(route.request().url());
    const { pathname, searchParams } = url;
    const normalizedPath = pathname.replace(/\/$/, "");

    if (normalizedPath === "/api/v2/pokemon-species" && searchParams.get("limit") === "2000") {
      await route.fulfill({ json: fixtures.speciesList });
      return;
    }

    if (normalizedPath === "/api/v2/pokemon-species/1") {
      await route.fulfill({
        json: {
          id: 1,
          name: "bulbasaur",
          names: [{ name: "Bulbasaur", language: { name: "en" } }],
          generation: { name: "generation-i" },
          is_legendary: false
        }
      });
      return;
    }

    if (normalizedPath === "/api/v2/pokemon-species/4") {
      await route.fulfill({
        json: {
          id: 4,
          name: "charmander",
          names: [{ name: "Charmander", language: { name: "en" } }],
          generation: { name: "generation-i" },
          is_legendary: false
        }
      });
      return;
    }

    if (normalizedPath === "/api/v2/generation" && searchParams.get("limit") === "40") {
      await route.fulfill({ json: fixtures.generationList });
      return;
    }

    if (normalizedPath === "/api/v2/generation/1") {
      await route.fulfill({
        json: {
          id: 1,
          name: "generation-i",
          pokemon_species: [{ name: "bulbasaur" }, { name: "charmander" }]
        }
      });
      return;
    }

    if (normalizedPath === "/api/v2/type" && searchParams.get("limit") === "40") {
      await route.fulfill({ json: fixtures.typeList });
      return;
    }

    if (normalizedPath === "/api/v2/type/12") {
      await route.fulfill({
        json: {
          id: 12,
          name: "grass",
          pokemon: [{ pokemon: { name: "bulbasaur" } }]
        }
      });
      return;
    }

    if (normalizedPath === "/api/v2/type/4") {
      await route.fulfill({
        json: {
          id: 4,
          name: "poison",
          pokemon: [{ pokemon: { name: "bulbasaur" } }]
        }
      });
      return;
    }

    if (normalizedPath === "/api/v2/type/10") {
      await route.fulfill({
        json: {
          id: 10,
          name: "fire",
          pokemon: [{ pokemon: { name: "charmander" } }]
        }
      });
      return;
    }

    await route.fulfill({ status: 404, json: { error: "NOT_FOUND" } });
  });
}

async function openApp(page, context) {
  await context.route("**/api/catalog", async (route) => {
    await route.fulfill({ json: createCatalogSnapshotFixture() });
  });
  await mockPokeApi(context);
  await page.goto("/");
  await expect(page.locator("#name-input")).toBeEnabled();
  await expect(page.locator("#status")).toBeHidden();
}

async function openMultiplayerModal(page, { force = false } = {}) {
  const trigger = (await page.evaluate(() => document.body.classList.contains("compact-mode")))
    ? "#multiplayer-open-compact"
    : "#multiplayer-open";
  await page.locator(trigger).click({ force });
  await expect(page.locator("#multiplayer-modal")).toBeVisible();
}

async function openSettingsModal(page) {
  const trigger = (await page.evaluate(() => document.body.classList.contains("compact-mode")))
    ? "#filters-toggle-compact"
    : "#filters-toggle";
  await page.locator(trigger).click();
  await expect(page.locator("#settings-modal")).toBeVisible();
}

async function closeSettingsModal(page) {
  await page.locator("#settings-close").click();
  await expect(page.locator("#settings-modal")).toBeHidden();
}

async function closeMultiplayerModal(page) {
  await page.locator("#multiplayer-close").click();
  await expect(page.locator("#multiplayer-modal")).toBeHidden();
}

async function setCompactMode(page, enabled) {
  const isCompact = await page.evaluate(() => document.body.classList.contains("compact-mode"));
  if (Boolean(isCompact) !== Boolean(enabled)) {
    await page.locator("#compact-toggle").click();
  }
}

async function setSettingsSelect(page, selector, value) {
  await page.locator(selector).selectOption(value);
}

async function setSettingsToggle(page, selector, checked) {
  const toggle = page.locator(selector);
  if (checked) {
    await toggle.check();
  } else {
    await toggle.uncheck();
  }
}

async function setTheme(page, theme) {
  await page.locator(`.theme-chip[data-theme="${theme}"]`).click();
}

async function setMultiplayerSelect(page, selector, value) {
  await page.locator(selector).selectOption(value);
}

async function setMultiplayerToggle(page, selector, checked) {
  const toggle = page.locator(selector);
  if (checked) {
    await toggle.check();
  } else {
    await toggle.uncheck();
  }
}

async function createMultiplayerRoom(page, { playerName = "Ash", mode } = {}) {
  const createResponsePromise = page.waitForResponse((response) => {
    return response.url().endsWith("/api/rooms") && response.request().method() === "POST";
  });

  await openMultiplayerModal(page);
  if (playerName) {
    await page.locator("#multiplayer-player-name").fill(playerName);
  }
  if (mode) {
    await page.locator("#multiplayer-mode").selectOption(mode);
  }
  await page.locator("#multiplayer-create").click();

  const createResponse = await createResponsePromise;
  const createPayload = await createResponse.json();
  const roomCode =
    (await page.locator("#multiplayer-room-code").textContent())?.trim() ||
    createPayload.roomCode ||
    "";

  return {
    createPayload,
    roomCode
  };
}

async function joinMultiplayerRoom(page, { roomCode, playerName = "Misty", force = false } = {}) {
  await openMultiplayerModal(page, { force });
  await page.locator("#multiplayer-player-name").fill(playerName);
  await page.locator("#multiplayer-room-code-input").fill(roomCode || "");
  await page.locator("#multiplayer-join").click();
}

async function readSettingsRecord(page) {
  return await page.evaluate((storageKey) => {
    const raw = localStorage.getItem(storageKey);
    return raw ? JSON.parse(raw) : null;
  }, SETTINGS_STORAGE_KEY);
}

function parseTimerText(value) {
  const parts = (value || "")
    .trim()
    .split(":")
    .map((part) => Number(part));
  if (parts.some((part) => Number.isNaN(part))) return 0;
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  return 0;
}

test("loads the quiz shell and catalog data", async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await openApp(page, context);
    await expect(page.getByLabel("Name a Pokemon")).toBeVisible();
    await expect(page.locator("#sprite-grid")).toBeVisible();
  } finally {
    await context.close();
  }
});

test("accepts a valid guess, rejects duplicates, and rejects near-misses", async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await openApp(page, context);
    await openSettingsModal(page);

    await setSettingsSelect(page, "#typo-mode", "strict");
    await expect(page.locator("#autocorrect-toggle")).toBeDisabled();
    await closeSettingsModal(page);

    await page.locator("#name-input").fill("Bulbasaur");
    await page.locator("#name-input").press("Enter");
    await expect(page.locator("#found-count")).toHaveText("1/2");

    await page.locator("#name-input").fill("Bulbasaur");
    await page.locator("#name-input").press("Enter");
    await expect(page.locator("#status")).toHaveText("Already found!");
    await expect(page.locator("#found-count")).toHaveText("1/2");

    await page.locator("#name-input").fill("Bulbasar");
    await page.locator("#name-input").press("Enter");
    await expect(page.locator("#status")).toHaveText("Too far off. Try English, German, or Spanish names.");
    await expect(page.locator("#found-count")).toHaveText("1/2");
  } finally {
    await context.close();
  }
});

test("updates and persists the global settings surface", async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await openApp(page, context);
    await openSettingsModal(page);

    await setCompactMode(page, true);
    await expect(page.locator("body")).toHaveClass(/compact-mode/);
    await expect(page.locator("#compact-toggle")).toHaveText("Normal Mode");

    await setSettingsSelect(page, "#game-mode", "practice");
    await setSettingsSelect(page, "#typo-mode", "strict");
    await expect(page.locator("#autocorrect-toggle")).toBeDisabled();
    await setSettingsSelect(page, "#typo-mode", "forgiving");
    await expect(page.locator("#autocorrect-toggle")).toBeEnabled();
    await setSettingsToggle(page, "#autocorrect-toggle", false);

    await setSettingsToggle(page, "#cries-toggle", true);
    await setSettingsToggle(page, "#legacy-cries-toggle", true);
    await setSettingsToggle(page, "#outline-toggle", true);
    await setSettingsToggle(page, "#dark-toggle", true);
    await setSettingsToggle(page, "#show-dex-toggle", true);
    await setSettingsToggle(page, "#shiny-toggle", true);

    await setTheme(page, "fire");

    const storedSettings = await readSettingsRecord(page);
    expect(storedSettings).toMatchObject({
      gameMode: "practice",
      compact: true,
      outlinesOff: false,
      cries: true,
      legacyCries: true,
      showDex: true,
      shiny: true,
      typoMode: "forgiving",
      autocorrect: false,
      dark: true,
      theme: "fire",
    });
  } finally {
    await context.close();
  }
});

test("restores the single-player snapshot after leaving multiplayer", async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await openApp(page, context);
    await openSettingsModal(page);

    await setCompactMode(page, true);
    await setSettingsSelect(page, "#typo-mode", "forgiving");
    await setSettingsToggle(page, "#autocorrect-toggle", false);
    await setSettingsToggle(page, "#cries-toggle", true);
    await setSettingsToggle(page, "#legacy-cries-toggle", true);
    await setSettingsToggle(page, "#outline-toggle", true);
    await setSettingsToggle(page, "#dark-toggle", true);
    await setSettingsToggle(page, "#show-dex-toggle", true);
    await setSettingsToggle(page, "#shiny-toggle", true);
    await setTheme(page, "fire");
    await setSettingsSelect(page, "#group-filter", "none");

    const soloSettingsBeforeRoom = await readSettingsRecord(page);

    await closeSettingsModal(page);

    await page.locator("#name-input").fill("Bulbasaur");
    await page.locator("#name-input").press("Enter");
    await expect(page.locator("#found-count")).toHaveText("1/2");
    await expect(page.locator("#timer")).not.toHaveText("00:00");

    await expect
      .poll(
        async () => {
          const text = (await page.locator("#timer").textContent()) || "";
          return parseTimerText(text);
        },
        { timeout: 5000 }
      )
      .toBeGreaterThan(0);

    await openMultiplayerModal(page);
    await page.locator("#multiplayer-player-name").fill("Ash");
    await setMultiplayerSelect(page, "#multiplayer-mode", "race");
    await setMultiplayerSelect(page, "#multiplayer-typo-mode", "strict");
    await setMultiplayerToggle(page, "#multiplayer-outline-toggle", false);
    await setMultiplayerToggle(page, "#multiplayer-show-dex-toggle", false);

    const createResponsePromise = page.waitForResponse((response) => {
      return response.url().endsWith("/api/rooms") && response.request().method() === "POST";
    });
    await page.locator("#multiplayer-create").click();
    const createResponse = await createResponsePromise;
    const roomJoinResponse = await createResponse.json();

    expect(roomJoinResponse.snapshot.settings).toMatchObject({
      mode: "race",
      typoMode: "strict",
      outlinesOff: true,
      showDex: false
    });

    await expect(page.locator("#multiplayer-panel")).toBeVisible();
    await expect(page.locator("#found-count")).toHaveText("0/2");
    await expect(page.locator("#timer")).toHaveText("00:00");

    await page.locator("#multiplayer-leave").click();
    await expect(page.locator("#multiplayer-panel")).toBeHidden();

    await expect(page.locator("body")).toHaveClass(/compact-mode/);
    await expect(page.locator("html")).toHaveClass(/dark-mode/);
    await expect(page.locator("html")).toHaveAttribute("data-theme", "fire");
    await expect(page.locator("#compact-toggle")).toHaveText("Normal Mode");
    await expect(page.locator("#typo-mode")).toHaveValue("forgiving");
    await expect(page.locator("#autocorrect-toggle")).not.toBeChecked();
    await expect(page.locator("#cries-toggle")).toBeChecked();
    await expect(page.locator("#legacy-cries-toggle")).toBeChecked();
    await expect(page.locator("#outline-toggle")).toBeChecked();
    await expect(page.locator("#dark-toggle")).toBeChecked();
    await expect(page.locator("#show-dex-toggle")).toBeChecked();
    await expect(page.locator("#shiny-toggle")).toBeChecked();
    expect(await readSettingsRecord(page)).toEqual(soloSettingsBeforeRoom);

    await expect(page.locator("#found-count")).toHaveText("1/2");
    await expect
      .poll(
        async () => {
          const text = (await page.locator("#timer").textContent()) || "";
          return parseTimerText(text);
        },
        { timeout: 5000 }
      )
      .toBeGreaterThan(0);
  } finally {
    await context.close();
  }
});

test("keeps the single-player snapshot after reloading from multiplayer", async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await openApp(page, context);
    await openSettingsModal(page);

    await setCompactMode(page, true);
    await setSettingsSelect(page, "#typo-mode", "forgiving");
    await setSettingsToggle(page, "#autocorrect-toggle", false);
    await setSettingsToggle(page, "#cries-toggle", true);
    await setSettingsToggle(page, "#legacy-cries-toggle", true);
    await setSettingsToggle(page, "#outline-toggle", true);
    await setSettingsToggle(page, "#dark-toggle", true);
    await setSettingsToggle(page, "#show-dex-toggle", true);
    await setSettingsToggle(page, "#shiny-toggle", true);
    await setTheme(page, "fire");
    await setSettingsSelect(page, "#group-filter", "none");

    const soloSettingsBeforeRoom = await readSettingsRecord(page);

    await closeSettingsModal(page);

    await page.locator("#name-input").fill("Bulbasaur");
    await page.locator("#name-input").press("Enter");
    await expect(page.locator("#found-count")).toHaveText("1/2");
    await expect(page.locator("#timer")).not.toHaveText("00:00");

    await openMultiplayerModal(page);
    await page.locator("#multiplayer-player-name").fill("Ash");
    await setMultiplayerSelect(page, "#multiplayer-mode", "race");
    await setMultiplayerSelect(page, "#multiplayer-typo-mode", "strict");
    await setMultiplayerToggle(page, "#multiplayer-outline-toggle", false);
    await setMultiplayerToggle(page, "#multiplayer-show-dex-toggle", false);

    const createResponsePromise = page.waitForResponse((response) => {
      return response.url().endsWith("/api/rooms") && response.request().method() === "POST";
    });
    await page.locator("#multiplayer-create").click();
    const createResponse = await createResponsePromise;
    const roomJoinResponse = await createResponse.json();

    expect(roomJoinResponse.snapshot.settings).toMatchObject({
      mode: "race",
      typoMode: "strict",
      outlinesOff: true,
      showDex: false
    });

    await expect(page.locator("#multiplayer-panel")).toBeVisible();
    await page.locator("#multiplayer-leave").click();
    await expect(page.locator("#multiplayer-panel")).toBeHidden();

    await page.reload();
    await expect(page.locator("#name-input")).toBeEnabled();
    await expect(page.locator("#status")).toBeHidden();

    await expect(page.locator("body")).toHaveClass(/compact-mode/);
    await expect(page.locator("html")).toHaveClass(/dark-mode/);
    await expect(page.locator("html")).toHaveAttribute("data-theme", "fire");
    await expect(page.locator("#compact-toggle")).toHaveText("Normal Mode");
    await expect(page.locator("#typo-mode")).toHaveValue("forgiving");
    await expect(page.locator("#autocorrect-toggle")).not.toBeChecked();
    await expect(page.locator("#cries-toggle")).toBeChecked();
    await expect(page.locator("#legacy-cries-toggle")).toBeChecked();
    await expect(page.locator("#outline-toggle")).toBeChecked();
    await expect(page.locator("#dark-toggle")).toBeChecked();
    await expect(page.locator("#show-dex-toggle")).toBeChecked();
    await expect(page.locator("#shiny-toggle")).toBeChecked();
    expect(await readSettingsRecord(page)).toEqual(soloSettingsBeforeRoom);

    await expect(page.locator("#found-count")).toHaveText("1/2");
    await expect
      .poll(
        async () => {
          const text = (await page.locator("#timer").textContent()) || "";
          return parseTimerText(text);
        },
        { timeout: 4000 }
      )
      .toBeGreaterThan(0);
  } finally {
    await context.close();
  }
});

test("updates the main board filter controls", async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await openApp(page, context);

    await setSettingsSelect(page, "#group-filter", "type");
    await page.locator("#filters-panel-toggle").click();
    await expect(page.locator("#filters-panel")).toBeVisible();
    await expect(page.locator("#filters-panel-toggle")).toHaveText("Hide Filters");

    const storedSettings = await readSettingsRecord(page);
    expect(storedSettings).toMatchObject({
      group: "type",
      filtersPanelExpanded: true
    });
  } finally {
    await context.close();
  }
});

test("resets the global settings surface", async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await openApp(page, context);
    await openSettingsModal(page);

    await setCompactMode(page, true);
    await setSettingsToggle(page, "#dark-toggle", true);
    await setSettingsToggle(page, "#show-dex-toggle", true);
    await page.locator("#settings-reset").click();
    await expect(page.locator("#confirm-modal")).toBeVisible();
    await page.locator("#confirm-accept").click();

    await expect(page.locator("body")).not.toHaveClass(/compact-mode/);
    await expect(page.locator("body")).toHaveClass(/outlines-off/);
    await expect(page.locator("html")).not.toHaveClass(/dark-mode/);
    await expect(page.locator("html")).toHaveAttribute("data-theme", "normal");
    await expect(page.locator("#compact-toggle")).toHaveText("Compact Mode");
    await expect(page.locator("#dark-toggle")).not.toBeChecked();
    await expect(page.locator("#show-dex-toggle")).not.toBeChecked();
    expect(await readSettingsRecord(page)).toBeNull();
  } finally {
    await context.close();
  }
});

test("creates a room with customized multiplayer settings", async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await openApp(page, context);
    await openMultiplayerModal(page);

    await page.locator("#multiplayer-player-name").fill("Ash");
    await setMultiplayerSelect(page, "#multiplayer-mode", "race");
    await setMultiplayerSelect(page, "#multiplayer-typo-mode", "forgiving");
    await setMultiplayerToggle(page, "#multiplayer-autocorrect-toggle", false);
    await setMultiplayerToggle(page, "#multiplayer-outline-toggle", true);
    await setMultiplayerToggle(page, "#multiplayer-show-dex-toggle", true);
    await page.locator("#multiplayer-filters-panel-toggle").click();
    await expect(page.locator("#multiplayer-filters-panel")).toBeVisible();
    await setMultiplayerSelect(page, "#multiplayer-group-filter", "type");
    await setMultiplayerToggle(page, '#multiplayer-type-filter input[value="poison"]', false);
    await setMultiplayerToggle(page, '#multiplayer-type-filter input[value="grass"]', false);
    await setMultiplayerToggle(page, '#multiplayer-type-filter input[value="fire"]', true);
    await expect(page.locator("#multiplayer-filter-summary")).toContainText("Group: Type");
    await expect(page.locator("#multiplayer-filter-summary")).toContainText("Types: Fire");

    const createResponsePromise = page.waitForResponse((response) => {
      return response.url().endsWith("/api/rooms") && response.request().method() === "POST";
    });
    await page.locator("#multiplayer-create").click();
    const createResponse = await createResponsePromise;
    const roomJoinResponse = await createResponse.json();

    expect(roomJoinResponse.snapshot.settings).toMatchObject({
      mode: "race",
      typoMode: "forgiving",
      autocorrect: false,
      outlinesOff: false,
      showDex: true,
      group: "type",
      types: ["fire"]
    });
  } finally {
    await context.close();
  }
});

test("resets a multiplayer room as the host", async ({ browser }) => {
  const hostContext = await browser.newContext();
  const guestContext = await browser.newContext();
  const hostPage = await hostContext.newPage();
  const guestPage = await guestContext.newPage();

  try {
    await Promise.all([
      openApp(hostPage, hostContext),
      openApp(guestPage, guestContext)
    ]);

    const { roomCode } = await createMultiplayerRoom(hostPage, { playerName: "Ash" });
    await closeMultiplayerModal(hostPage);

    await joinMultiplayerRoom(guestPage, { roomCode, playerName: "Misty", force: true });
    await closeMultiplayerModal(guestPage);

    await expect(hostPage.locator("#reset-btn")).toBeEnabled();
    await expect(guestPage.locator("#reset-btn")).toBeDisabled();

    await hostPage.locator("#name-input").fill("Bulbasaur");
    await hostPage.locator("#name-input").press("Enter");

    await expect(hostPage.locator("#found-count")).toHaveText(/^1\/\d+$/);
    await expect(guestPage.locator("#found-count")).toHaveText(/^1\/\d+$/);

    await hostPage.locator("#reset-btn").click();
    await expect(hostPage.locator("#confirm-modal")).toBeVisible();
    await hostPage.locator("#confirm-accept").click();

    await expect(hostPage.locator("#found-count")).toHaveText("0/2");
    await expect(guestPage.locator("#found-count")).toHaveText("0/2");
    await expect(hostPage.locator("#timer")).toHaveText("00:00");
    await expect(guestPage.locator("#timer")).toHaveText("00:00");
    await expect(hostPage.locator("#multiplayer-events")).toContainText("No multiplayer events yet.");
    await expect(guestPage.locator("#multiplayer-events")).toContainText("No multiplayer events yet.");
  } finally {
    await Promise.all([hostContext.close(), guestContext.close()]);
  }
});

test("creates a room, joins a second player, accepts a guess, and leaves", async ({ browser }) => {
  const hostContext = await browser.newContext();
  const guestContext = await browser.newContext();
  const hostPage = await hostContext.newPage();
  const guestPage = await guestContext.newPage();

  try {
    await Promise.all([
      openApp(hostPage, hostContext),
      openApp(guestPage, guestContext)
    ]);

    const { roomCode } = await createMultiplayerRoom(hostPage, { playerName: "Ash" });

    await expect(hostPage.locator("#multiplayer-panel")).toBeVisible();
    expect(roomCode).toMatch(/^[A-Z0-9_-]+$/);
    await closeMultiplayerModal(hostPage);

    await joinMultiplayerRoom(guestPage, { roomCode, playerName: "Misty", force: true });

    await expect(hostPage.locator("#multiplayer-players")).toContainText("Misty");
    await expect(guestPage.locator("#multiplayer-players")).toContainText("Ash");
    await expect(hostPage.locator("#reset-btn")).toBeEnabled();
    await expect(guestPage.locator("#reset-btn")).toBeDisabled();
    await expect(guestPage.locator("#multiplayer-filters-panel-toggle")).toBeDisabled();
    await expect(guestPage.locator("#multiplayer-group-filter")).toBeDisabled();
    await expect(guestPage.locator("#multiplayer-typo-mode")).toBeDisabled();
    await expect(guestPage.locator("#multiplayer-autocorrect-toggle")).toBeDisabled();
    await expect(guestPage.locator("#multiplayer-outline-toggle")).toBeDisabled();
    await expect(guestPage.locator("#multiplayer-show-dex-toggle")).toBeDisabled();
    await expect(guestPage.locator("#multiplayer-mode")).toBeDisabled();
    await expect(guestPage.locator("#multiplayer-panel")).toBeVisible();
    await closeMultiplayerModal(guestPage);

    await hostPage.locator("#name-input").fill("Bulbasaur");
    await hostPage.locator("#name-input").press("Enter");

    await expect(hostPage.locator("#found-count")).toHaveText(/^1\/\d+$/);
    await expect(guestPage.locator("#found-count")).toHaveText(/^1\/\d+$/);
    await expect(hostPage.locator("#multiplayer-events")).toContainText("found Bulbasaur");

    await openMultiplayerModal(guestPage);
    await guestPage.locator("#multiplayer-leave").click();
    await expect(guestPage.locator("#multiplayer-status")).toHaveText("Left multiplayer room.");
    await expect(guestPage.locator("#multiplayer-panel")).toBeHidden();
  } finally {
    await Promise.all([hostContext.close(), guestContext.close()]);
  }
});

test("rejoins a disconnected multiplayer player with the stored session", async ({ browser }) => {
  const hostContext = await browser.newContext();
  const guestContext = await browser.newContext();
  const hostPage = await hostContext.newPage();
  const guestPage = await guestContext.newPage();

  try {
    await Promise.all([
      openApp(hostPage, hostContext),
      openApp(guestPage, guestContext)
    ]);

    const { roomCode } = await createMultiplayerRoom(hostPage, { playerName: "Ash" });
    await closeMultiplayerModal(hostPage);

    await joinMultiplayerRoom(guestPage, { roomCode, playerName: "Misty", force: true });
    await closeMultiplayerModal(guestPage);

    await expect(hostPage.locator("#multiplayer-players .multiplayer-player")).toHaveCount(2);
    await expect(hostPage.locator("#multiplayer-players .multiplayer-player.is-disconnected")).toHaveCount(0);

    await openMultiplayerModal(guestPage);
    await guestPage.locator("#multiplayer-leave").click();
    await expect(guestPage.locator("#multiplayer-status")).toHaveText("Left multiplayer room.");
    await expect(guestPage.locator("#multiplayer-panel")).toBeHidden();

    await expect(hostPage.locator("#multiplayer-players .multiplayer-player")).toHaveCount(2);
    await expect(hostPage.locator("#multiplayer-players .multiplayer-player.is-disconnected")).toHaveCount(1);

    await joinMultiplayerRoom(guestPage, { roomCode, playerName: "Misty", force: true });
    await closeMultiplayerModal(guestPage);

    await expect(hostPage.locator("#multiplayer-players .multiplayer-player")).toHaveCount(2);
    await expect(hostPage.locator("#multiplayer-players .multiplayer-player.is-disconnected")).toHaveCount(0);
    await expect(hostPage.locator("#multiplayer-players")).toContainText("Misty");
    await expect(hostPage.locator("#multiplayer-players")).toContainText("Ash");
  } finally {
    await Promise.all([hostContext.close(), guestContext.close()]);
  }
});
