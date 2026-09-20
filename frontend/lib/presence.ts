/**
 * Browser helper for the tenant presence WebSocket (GET /api/v1/presence).
 * Auth rides on the same httpOnly cookies as GraphQL/REST; the browser sends
 * them automatically for same-site requests (no credentials option on WebSocket).
 */

const PRESENCE_PATH = "/api/v1/presence";

/** Resolve the presence WebSocket URL from NEXT_PUBLIC_API_URL or the page origin. */
export function presenceWsUrl(): string {
  const apiBase = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
  if (apiBase) {
    let wsBase = apiBase;
    if (/^https:/i.test(wsBase)) {
      wsBase = wsBase.replace(/^https:/i, "wss:");
    } else if (/^http:/i.test(wsBase)) {
      wsBase = wsBase.replace(/^http:/i, "ws:");
    }
    return `${wsBase}${PRESENCE_PATH}`;
  }

  if (typeof window === "undefined") {
    return `ws://localhost:8080${PRESENCE_PATH}`;
  }

  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${window.location.host}${PRESENCE_PATH}`;
}

export type PresenceConnection = {
  /** Close the socket and cancel reconnect attempts. */
  close: () => void;
};

type ConnectOptions = {
  /** Called when the socket opens (including after reconnect). */
  onOpen?: () => void;
  /** Called on close/error before a reconnect is scheduled (not after intentional close). */
  onClose?: () => void;
};

/**
 * Open a presence WebSocket and lightly reconnect with exponential backoff
 * (1s → 2s → 4s … capped at 30s). Sends an optional "ping" every 45s while open
 * so the server read deadline stays fresh.
 */
export function connectPresence(options: ConnectOptions = {}): PresenceConnection {
  let socket: WebSocket | null = null;
  let closed = false;
  let attempt = 0;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let pingTimer: ReturnType<typeof setInterval> | null = null;

  const clearTimers = () => {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    if (pingTimer) {
      clearInterval(pingTimer);
      pingTimer = null;
    }
  };

  const scheduleReconnect = () => {
    if (closed) return;
    const delay = Math.min(30_000, 1000 * 2 ** attempt);
    attempt += 1;
    reconnectTimer = setTimeout(open, delay);
  };

  const open = () => {
    if (closed || typeof window === "undefined") return;

    clearTimers();

    try {
      socket = new WebSocket(presenceWsUrl());
    } catch {
      scheduleReconnect();
      return;
    }

    socket.onopen = () => {
      attempt = 0;
      options.onOpen?.();
      pingTimer = setInterval(() => {
        if (socket?.readyState === WebSocket.OPEN) {
          socket.send("ping");
        }
      }, 45_000);
    };

    socket.onmessage = () => {
      // Server may reply "pong"; ignore payloads.
    };

    socket.onerror = () => {
      // onclose follows; reconnect there.
    };

    socket.onclose = () => {
      clearTimers();
      socket = null;
      if (closed) return;
      options.onClose?.();
      scheduleReconnect();
    };
  };

  open();

  return {
    close: () => {
      closed = true;
      clearTimers();
      if (socket) {
        socket.onclose = null;
        socket.close();
        socket = null;
      }
    },
  };
}
