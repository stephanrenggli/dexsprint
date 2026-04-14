import { expect, test } from "@playwright/test";

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

    if (pathname === "/api/v2/pokemon-species" && searchParams.get("limit") === "2000") {
      await route.fulfill({ json: fixtures.speciesList });
      return;
    }

    if (pathname === "/api/v2/pokemon-species/1/") {
      await route.fulfill({
        json: {
          name: "bulbasaur",
          names: [{ name: "Bulbasaur", language: { name: "en" } }],
          generation: { name: "generation-i" },
          is_legendary: false
        }
      });
      return;
    }

    if (pathname === "/api/v2/pokemon-species/4/") {
      await route.fulfill({
        json: {
          name: "charmander",
          names: [{ name: "Charmander", language: { name: "en" } }],
          generation: { name: "generation-i" },
          is_legendary: false
        }
      });
      return;
    }

    if (pathname === "/api/v2/generation" && searchParams.get("limit") === "40") {
      await route.fulfill({ json: fixtures.generationList });
      return;
    }

    if (pathname === "/api/v2/generation/1/") {
      await route.fulfill({
        json: {
          name: "generation-i",
          pokemon_species: [{ name: "bulbasaur" }, { name: "charmander" }]
        }
      });
      return;
    }

    if (pathname === "/api/v2/type" && searchParams.get("limit") === "40") {
      await route.fulfill({ json: fixtures.typeList });
      return;
    }

    if (pathname === "/api/v2/type/12/") {
      await route.fulfill({
        json: {
          name: "grass",
          pokemon: [{ pokemon: { name: "bulbasaur" } }]
        }
      });
      return;
    }

    if (pathname === "/api/v2/type/4/") {
      await route.fulfill({
        json: {
          name: "poison",
          pokemon: [{ pokemon: { name: "bulbasaur" } }]
        }
      });
      return;
    }

    if (pathname === "/api/v2/type/10/") {
      await route.fulfill({
        json: {
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

async function openMultiplayerModal(page) {
  await page.locator("#multiplayer-open").click();
  await expect(page.locator("#multiplayer-modal")).toBeVisible();
}

async function openSettingsModal(page) {
  await page.locator("#filters-toggle").click();
  await expect(page.locator("#settings-modal")).toBeVisible();
}

async function readSettingsRecord(page) {
  return await page.evaluate((storageKey) => {
    const raw = localStorage.getItem(storageKey);
    return raw ? JSON.parse(raw) : null;
  }, SETTINGS_STORAGE_KEY);
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

test("updates and persists the global settings surface", async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await openApp(page, context);
    await openSettingsModal(page);

    await page.locator("#compact-toggle").click();
    await expect(page.locator("body")).toHaveClass(/compact-mode/);
    await expect(page.locator("#compact-toggle")).toHaveText("Normal Mode");

    await page.locator("#game-mode").selectOption("practice");
    await page.locator("#typo-mode").selectOption("strict");
    await expect(page.locator("#autocorrect-toggle")).toBeDisabled();
    await page.locator("#typo-mode").selectOption("forgiving");
    await expect(page.locator("#autocorrect-toggle")).toBeEnabled();
    await page.locator("#autocorrect-toggle").uncheck();

    await page.locator("#cries-toggle").check();
    await page.locator("#legacy-cries-toggle").check();
    await page.locator("#outline-toggle").check();
    await page.locator("#dark-toggle").check();
    await page.locator("#show-dex-toggle").check();
    await page.locator("#shiny-toggle").check();

    await page.locator('#theme-chooser .theme-chip[data-theme="fire"]').click();

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

test("updates the main board filter controls", async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await openApp(page, context);

    await page.locator("#group-filter").selectOption("type");
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

    await page.locator("#compact-toggle").click();
    await page.locator("#dark-toggle").check();
    await page.locator("#show-dex-toggle").check();
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
    await page.locator("#multiplayer-mode").selectOption("race");
    await page.locator("#multiplayer-typo-mode").selectOption("forgiving");
    await page.locator("#multiplayer-autocorrect-toggle").uncheck();
    await page.locator("#multiplayer-outline-toggle").check();
    await page.locator("#multiplayer-show-dex-toggle").check();

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
      group: "generation",
      generations: [],
      types: []
    });
  } finally {
    await context.close();
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

    await openMultiplayerModal(hostPage);
    await hostPage.locator("#multiplayer-player-name").fill("Ash");
    await hostPage.locator("#multiplayer-create").click();

    await expect(hostPage.locator("#multiplayer-panel")).toBeVisible();
    const roomCode = (await hostPage.locator("#multiplayer-room-code").textContent())?.trim();
    expect(roomCode).toMatch(/^[A-Z0-9_-]+$/);
    await hostPage.locator("#multiplayer-close").click();

    await openMultiplayerModal(guestPage);
    await guestPage.locator("#multiplayer-player-name").fill("Misty");
    await guestPage.locator("#multiplayer-room-code-input").fill(roomCode || "");
    await guestPage.locator("#multiplayer-join").click();

    await expect(guestPage.locator("#multiplayer-panel")).toBeVisible();
    await expect(hostPage.locator("#multiplayer-players")).toContainText("Misty");
    await expect(guestPage.locator("#multiplayer-players")).toContainText("Ash");
    await guestPage.locator("#multiplayer-close").click();

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
