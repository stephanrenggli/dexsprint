import { loadCatalog, type CatalogSnapshot } from "./catalog.js";

export class CatalogStore {
  #catalog: CatalogSnapshot | null = null;
  #loading: Promise<CatalogSnapshot> | null = null;

  async getCatalog(): Promise<CatalogSnapshot> {
    if (this.#catalog) return this.#catalog;
    if (!this.#loading) {
      this.#loading = loadCatalog().then((catalog) => {
        this.#catalog = catalog;
        this.#loading = null;
        return catalog;
      });
    }
    return this.#loading;
  }

  getLoadedCatalog(): CatalogSnapshot | null {
    return this.#catalog;
  }
}
