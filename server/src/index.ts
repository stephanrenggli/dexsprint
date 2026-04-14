import path from "node:path";
import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import fastifyWebsocket from "@fastify/websocket";
import { CatalogStore } from "./catalog/catalog-store.js";
import { toBrowserCatalogSnapshot } from "./catalog/catalog.js";
import { RoomStore } from "./rooms/room-store.js";
import { registerRoomRealtime } from "./realtime/room-realtime.js";
import type { CreateRoomRequest, JoinRoomRequest } from "../../shared/src/protocol.js";

const siteRoot = process.env.SITE_ROOT || path.resolve(process.cwd(), "site");
const port = Number.parseInt(process.env.PORT || "3000", 10);
const host = process.env.HOST || "0.0.0.0";
const roomsPersistencePath =
  process.env.ROOMS_PERSISTENCE_PATH || path.resolve(process.cwd(), ".cache", "rooms.json");
const catalogCachePath =
  process.env.CATALOG_CACHE_PATH || path.resolve(process.cwd(), ".cache", "catalog-snapshot.json");
const catalogRefreshIntervalMs = Number.parseInt(
  process.env.CATALOG_REFRESH_INTERVAL_MS || `${6 * 60 * 60 * 1000}`,
  10
);

const app = Fastify({ logger: true });
const catalogStore = new CatalogStore({ cachePath: catalogCachePath });
const roomStore = new RoomStore(undefined, { persistencePath: roomsPersistencePath });

await app.register(fastifyWebsocket);

app.get("/health", async () => ({
  ok: true,
  catalogLoaded: Boolean(catalogStore.getLoadedCatalog()),
  now: new Date().toISOString()
}));

app.get("/api/catalog/version", async () => {
  const catalog = await catalogStore.getCatalog();
  return {
    version: catalog.version,
    generatedAt: catalog.generatedAt,
    count: catalog.entries.length
  };
});

app.get("/api/catalog", async () => {
  const catalog = await catalogStore.getCatalog();
  return toBrowserCatalogSnapshot(catalog);
});

app.post("/api/rooms", async (request, reply) => {
  const catalog = await catalogStore.getCatalog();
  const result = roomStore.createRoom(catalog, request.body as CreateRoomRequest);
  reply.code(201);
  return result;
});

app.post("/api/rooms/:code/join", async (request, reply) => {
  const { code } = request.params as { code: string };
  const result = roomStore.joinRoom(code, request.body as JoinRoomRequest);
  if (!result) {
    reply.code(404);
    return { error: "ROOM_NOT_FOUND", message: "Room not found." };
  }
  return result;
});

registerRoomRealtime({ app, catalogStore, roomStore });

await app.register(fastifyStatic, {
  root: siteRoot,
  prefix: "/"
});

app.setNotFoundHandler((request, reply) => {
  if (request.method === "GET" && !request.url.startsWith("/api/") && !request.url.startsWith("/ws/")) {
    return reply.sendFile("index.html");
  }
  reply.code(404).send({ error: "NOT_FOUND", message: "Not found." });
});

setInterval(() => {
  const removed = roomStore.cleanupExpired();
  if (removed > 0) app.log.info({ removed }, "expired multiplayer rooms");
}, 5 * 60 * 1000).unref();

try {
  await roomStore.restorePersistedRooms().catch((error) => {
    app.log.warn({ error }, "restoring persisted multiplayer rooms failed");
  });
  void catalogStore.getCatalog().catch((error) => {
    app.log.warn({ error }, "initial catalog warmup failed");
  });
  if (catalogRefreshIntervalMs > 0) {
    setInterval(() => {
      void catalogStore.refreshCatalog().then((catalog) => {
        if (catalog) return;
        app.log.warn("catalog refresh returned no data");
      });
    }, catalogRefreshIntervalMs).unref();
  }
  await app.listen({ port, host });
} catch (error) {
  app.log.error(error);
  process.exitCode = 1;
}
