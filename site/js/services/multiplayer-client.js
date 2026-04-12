export function createMultiplayerClient({ apiBase = "" } = {}) {
  let socket = null;

  function getWebSocketUrl(roomId, sessionToken) {
    const base = new URL(apiBase || window.location.href, window.location.href);
    const protocol = base.protocol === "https:" ? "wss:" : "ws:";
    return `${protocol}//${base.host}/ws/rooms/${encodeURIComponent(roomId)}?sessionToken=${encodeURIComponent(sessionToken)}`;
  }

  async function postJson(path, payload) {
    const response = await fetch(`${apiBase}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload || {})
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.message || "Multiplayer request failed.");
    }
    return data;
  }

  function createRoom(payload) {
    return postJson("/api/rooms", payload);
  }

  function joinRoom(code, payload) {
    return postJson(`/api/rooms/${encodeURIComponent(code)}/join`, payload);
  }

  function connect({ roomId, sessionToken, onMessage, onOpen, onClose, onError }) {
    disconnect();
    socket = new WebSocket(getWebSocketUrl(roomId, sessionToken));
    socket.addEventListener("open", () => {
      if (typeof onOpen === "function") onOpen();
    });
    socket.addEventListener("message", (event) => {
      try {
        const message = JSON.parse(event.data);
        if (typeof onMessage === "function") onMessage(message);
      } catch (error) {
        console.warn("Invalid multiplayer message", error);
      }
    });
    socket.addEventListener("close", () => {
      socket = null;
      if (typeof onClose === "function") onClose();
    });
    socket.addEventListener("error", () => {
      if (typeof onError === "function") onError();
    });
  }

  function send(message) {
    if (!socket || socket.readyState !== WebSocket.OPEN) return false;
    socket.send(JSON.stringify(message));
    return true;
  }

  function disconnect() {
    if (!socket) return;
    const current = socket;
    socket = null;
    current.close();
  }

  return {
    createRoom,
    joinRoom,
    connect,
    send,
    disconnect
  };
}
