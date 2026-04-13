import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { buildGuessIndex } from "../../../shared/src/guess.js";
import { loadCatalog, type CatalogEntry, type CatalogSnapshot } from "./catalog.js";

interface CatalogSnapshotCache {
  version: string;
  generatedAt: string;
  entries: CatalogEntry[];
}

export interface CatalogStoreOptions {
  cachePath?: string;
}

const DEFAULT_CACHE_PATH = path.resolve(process.cwd(), ".cache", "catalog-snapshot.json");

function hydrateSnapshot(snapshot: CatalogSnapshotCache): CatalogSnapshot {
  return {
    ...snapshot,
    guessIndex: buildGuessIndex(snapshot.entries)
  };
}

function isCatalogSnapshotCache(value: unknown): value is CatalogSnapshotCache {
  if (!value || typeof value !== "object") return false;
  const snapshot = value as Partial<CatalogSnapshotCache>;
  return (
    typeof snapshot.version === "string" &&
    typeof snapshot.generatedAt === "string" &&
    Array.isArray(snapshot.entries)
  );
}

export class CatalogStore {
  #catalog: CatalogSnapshot | null = null;
  #loading: Promise<CatalogSnapshot> | null = null;
  #refreshing: Promise<void> | null = null;
  #cachePath: string;

  constructor(options: CatalogStoreOptions = {}) {
    this.#cachePath = options.cachePath || DEFAULT_CACHE_PATH;
  }

  async getCatalog(): Promise<CatalogSnapshot> {
    if (this.#catalog) return this.#catalog;
    const cached = await this.#readCachedCatalog();
    if (cached) {
      this.#catalog = cached;
      void this.#refreshCatalog();
      return cached;
    }
    if (!this.#loading) {
      this.#loading = loadCatalog().then(async (catalog) => {
        this.#catalog = catalog;
        await this.#writeCachedCatalog(catalog);
        return catalog;
      }).finally(() => {
        this.#loading = null;
      });
    }
    return this.#loading;
  }

  getLoadedCatalog(): CatalogSnapshot | null {
    return this.#catalog;
  }

  async #readCachedCatalog(): Promise<CatalogSnapshot | null> {
    try {
      const text = await readFile(this.#cachePath, "utf8");
      const parsed = JSON.parse(text) as unknown;
      if (!isCatalogSnapshotCache(parsed)) return null;
      return hydrateSnapshot(parsed);
    } catch {
      return null;
    }
  }

  async #writeCachedCatalog(catalog: CatalogSnapshot): Promise<void> {
    try {
      await mkdir(path.dirname(this.#cachePath), { recursive: true });
      const snapshot: CatalogSnapshotCache = {
        version: catalog.version,
        generatedAt: catalog.generatedAt,
        entries: catalog.entries
      };
      await writeFile(this.#cachePath, JSON.stringify(snapshot, null, 2), "utf8");
    } catch (error) {
      console.warn("Failed to write catalog cache", error);
    }
  }

  async #refreshCatalog(): Promise<void> {
    if (this.#refreshing || this.#loading) return;
    this.#refreshing = loadCatalog()
      .then((catalog) => {
        this.#catalog = catalog;
        void this.#writeCachedCatalog(catalog);
      })
      .catch((error) => {
        console.warn("Catalog refresh failed", error);
      })
      .finally(() => {
        this.#refreshing = null;
      });
    await this.#refreshing;
  }
}
