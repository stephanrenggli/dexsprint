export function createMultiplayerClient({ apiBase = "" } = {}) {
  let socket = null;

  function getWebSocketUrl(roomId, sessionToken) {
    const base = new URL(apiBase || window.location.href, window.location.href);
    const protocol = base.protocol === "https:" ? "wss:" : "ws:";
    return `${protocol}//${base.host}/ws/rooms/${encodeURIComponent(roomId)}?sessionToken=${encodeURIComponent(sessionToken)}`;
  }

  async function postJson(path, payload) {
    let response;
    try {
      response = await fetch(`${apiBase}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload || {})
      });
    } catch {
      throw new Error("Could not reach the multiplayer server.");
    }
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
    let opened = false;
    let reportedFailure = false;
    try {
      socket = new WebSocket(getWebSocketUrl(roomId, sessionToken));
    } catch {
      socket = null;
      if (typeof onError === "function") onError("Could not open a multiplayer connection.");
      return;
    }
    socket.addEventListener("open", () => {
      opened = true;
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
      if (!opened) {
        if (!reportedFailure && typeof onError === "function") {
          reportedFailure = true;
          onError("Could not connect to the multiplayer room.");
        }
        return;
      }
      if (typeof onClose === "function") onClose("Disconnected from multiplayer room.");
    });
    socket.addEventListener("error", () => {
      if (opened || reportedFailure || typeof onError !== "function") return;
      reportedFailure = true;
      onError("Could not connect to the multiplayer room.");
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
