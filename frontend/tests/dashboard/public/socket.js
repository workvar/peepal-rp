// WebSocket connection with auto-reconnect.

export function connect(onEvent) {
  let ws;
  let retry = 0;

  function open() {
    const proto = location.protocol === "https:" ? "wss" : "ws";
    ws = new WebSocket(`${proto}://${location.host}`);
    ws.onopen = () => { retry = 0; };
    ws.onmessage = (msg) => {
      try { onEvent(JSON.parse(msg.data)); } catch {}
    };
    ws.onclose = () => {
      retry = Math.min(retry + 1, 5);
      setTimeout(open, 500 * retry);
    };
    ws.onerror = () => ws.close();
  }
  open();
}
