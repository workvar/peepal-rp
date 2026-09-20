// Dashboard server.
// HTTP serves the static UI; WebSocket fan-outs live test events.
// The custom Playwright reporter posts events to /event over HTTP.
// POST /restart kills the active Playwright run and spawns a fresh one.

const http = require("http");
const fs = require("fs");
const path = require("path");
const { WebSocketServer } = require("ws");

const PUBLIC_DIR = path.join(__dirname, "public");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js":   "application/javascript; charset=utf-8",
  ".css":  "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg":  "image/svg+xml",
};

function startDashboardServer({ port, spawnRun } = {}) {
  const state = {
    clients: new Set(),
    history: [],          // events since the last `run:start`
    currentChild: null,   // ChildProcess of the running Playwright run
    runStatus: "idle",    // idle | running | finished
  };

  const server = http.createServer((req, res) => {
    if (req.method === "POST" && req.url === "/event")    return onEvent(req, res, state);
    if (req.method === "POST" && req.url === "/restart")  return onRestart(req, res, state, spawnRun);
    if (req.method === "GET"  && req.url === "/history")  return onHistory(req, res, state);
    if (req.method === "GET"  && req.url === "/status")   return onStatus(req, res, state);
    return serveStatic(req, res);
  });

  const wss = new WebSocketServer({ server });
  wss.on("connection", (ws) => {
    state.clients.add(ws);
    ws.send(JSON.stringify({ type: "snapshot", events: state.history }));
    ws.send(JSON.stringify({ type: "run:status", status: state.runStatus }));
    ws.on("close", () => state.clients.delete(ws));
  });

  function setChild(child) {
    state.currentChild = child;
    state.runStatus = "running";
    broadcast(state, { type: "run:status", status: "running" });
    if (!child) return;
    child.on("exit", () => {
      state.currentChild = null;
      state.runStatus = "finished";
      broadcast(state, { type: "run:status", status: "finished" });
    });
  }

  return new Promise((resolve) => {
    server.listen(port, () => resolve({
      server, wss, state, setChild,
    }));
  });
}

function onEvent(req, res, state) {
  let body = "";
  req.on("data", (c) => (body += c));
  req.on("end", () => {
    try {
      const evt = JSON.parse(body);
      // Clear history on a new run so reloads don't replay stale events.
      if (evt.type === "run:start") state.history = [];
      state.history.push(evt);
      broadcast(state, evt);
      res.writeHead(204);
      res.end();
    } catch {
      res.writeHead(400);
      res.end("bad json");
    }
  });
}

function onRestart(_req, res, state, spawnRun) {
  if (!spawnRun) {
    res.writeHead(503, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ ok: false, error: "restart not configured" }));
  }

  const start = () => {
    state.history = [];
    broadcast(state, { type: "snapshot:cleared" });
    const child = spawnRun();
    if (child) state.setChild?.(child);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, status: "restarted" }));
  };

  if (state.currentChild && !state.currentChild.killed) {
    state.currentChild.once("exit", start);
    state.currentChild.kill("SIGINT");
    // Force-kill after 4s if it didn't exit gracefully (so cleanup teardown still gets a chance first).
    setTimeout(() => {
      if (state.currentChild && !state.currentChild.killed) state.currentChild.kill("SIGKILL");
    }, 4000);
  } else {
    start();
  }
}

function onHistory(_req, res, state) {
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify(state.history));
}

function onStatus(_req, res, state) {
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ status: state.runStatus }));
}

function broadcast(state, evt) {
  const payload = JSON.stringify(evt);
  for (const c of state.clients) if (c.readyState === 1) c.send(payload);
}

function serveStatic(req, res) {
  let urlPath = req.url === "/" ? "/index.html" : req.url;
  urlPath = urlPath.split("?")[0];
  const filePath = path.join(PUBLIC_DIR, urlPath);
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    return res.end("forbidden");
  }
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); return res.end("not found"); }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
    res.end(data);
  });
}

module.exports = { startDashboardServer };
