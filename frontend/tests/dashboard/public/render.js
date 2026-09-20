// DOM rendering. Reads from Store, writes to the page.

const ICON = {
  pending: "·", running: "▸", passed: "✓",
  failed: "✕", timedout: "⏱", skipped: "↷",
};

let bound = false;

export function render(store) {
  if (!bound) bindControls(store);

  renderStats(store);
  renderTreeList(store);
  renderDetail(store);
  renderRestart(store);
}

function bindControls(store) {
  bound = true;
  document.querySelectorAll(".filter").forEach((btn) => {
    btn.addEventListener("click", () => {
      store.filter = btn.dataset.filter;
      document.querySelectorAll(".filter").forEach((b) =>
        b.classList.toggle("active", b === btn));
      render(store);
    });
  });

  document.getElementById("restart-btn")?.addEventListener("click", () => {
    fetch("/restart", { method: "POST" })
      .then((r) => r.json().catch(() => ({})))
      .then(() => showToast("Restarting test suite…"))
      .catch(() => showToast("Restart failed. Check the terminal."));
  });
}

function renderRestart(store) {
  const btn = document.getElementById("restart-btn");
  const status = document.getElementById("run-status");
  if (status) {
    status.textContent = store.runStatus;
    status.className = `run-status ${store.runStatus}`;
  }
  if (btn) {
    btn.disabled = false; // always clickable; server kills the active run
    btn.classList.toggle("warn", store.runStatus === "running");
    btn.title = store.runStatus === "running"
      ? "Restart will interrupt the current run"
      : "Re-run the full suite";
  }
}

function renderStats(store) {
  const c = store.counts();
  setText("stat-total",   c.total);
  setText("stat-passed",  c.passed);
  setText("stat-failed",  c.failed);
  setText("stat-skipped", c.skipped);
  setText("stat-elapsed", formatDuration(store.elapsedMs()));

  const dot = document.getElementById("status-dot");
  dot.className = "dot";
  if (store.runStatus === "running" || c.running > 0) dot.classList.add("running");
  else if (c.failed > 0) dot.classList.add("failed");
  else if (store.run.endedAt) dot.classList.add("passed");

  const bar = document.getElementById("progress-bar");
  const done = c.passed + c.failed + c.skipped;
  const total = c.total || 1;
  bar.style.width = `${Math.min(100, (done / total) * 100)}%`;
  bar.classList.toggle("has-failed", c.failed > 0);
}

function renderTreeList(store) {
  const root = document.getElementById("tree-list");
  const empty = document.getElementById("empty");
  const rows = store.treeRows();

  empty.style.display = rows.length === 0 ? "block" : "none";

  root.innerHTML = rows.map((r) => r.type === "group" ? groupRow(r, store) : testRow(r, store)).join("");

  root.querySelectorAll(".tree-row.group").forEach((el) => {
    el.addEventListener("click", () => {
      store.toggleCollapse(el.dataset.key);
      render(store);
    });
  });
  root.querySelectorAll(".tree-row.test").forEach((el) => {
    el.addEventListener("click", () => {
      store.selectedId = el.dataset.id;
      render(store);
    });
  });
}

function indent(depth) {
  return depth * 18;
}

function groupRow(r, store) {
  const chev = r.collapsed ? "▸" : "▾";
  const dim = r.running > 0 ? "running" : (r.failed > 0 ? "failed" : (r.passed === r.total && r.total > 0 ? "passed" : ""));
  const failPart = r.failed > 0 ? `<span class="fail-count">${r.failed}✕</span>` : "";
  return `
    <div class="tree-row group ${dim}" data-key="${escape(r.key)}" style="padding-left:${indent(r.depth) + 8}px">
      <span class="chev">${chev}</span>
      <span class="group-title">${escape(r.title)}</span>
      <span class="group-meta">${failPart}<span class="dim">${r.passed}/${r.total}</span></span>
    </div>
  `;
}

function testRow(r, store) {
  const t = r.test;
  const selected = (store.selectedId || store.currentId) === t.id ? "selected" : "";
  return `
    <div class="tree-row test ${t.status} ${selected}" data-id="${escape(t.id)}" style="padding-left:${indent(r.depth) + 8}px">
      <span class="icon">${ICON[t.status] || "·"}</span>
      <span class="title">${escape(t.title)}</span>
      <span class="duration">${t.durationMs ? formatDuration(t.durationMs) : ""}</span>
    </div>
  `;
}

function renderDetail(store) {
  const root = document.getElementById("detail");
  const t = store.selected();
  if (!t) {
    root.innerHTML = `<div class="detail-empty">Live view will appear here when a test starts</div>`;
    return;
  }
  const badge = `<span class="badge ${t.status}">${t.status}</span>`;
  const breadcrumb = t.path.join(" › ");
  const errBlock = t.error
    ? `<div class="section"><label>Error</label><pre class="error">${escape(t.error.message || "")}\n\n${escape(t.error.stack || "")}</pre></div>`
    : "";

  root.innerHTML = `
    <div class="detail-head">
      <h3>${escape(t.title)}</h3>
      <div class="meta">${badge} · ${escape(breadcrumb)}</div>
      <div class="meta2">${t.durationMs ? formatDuration(t.durationMs) : (t.status === "running" ? "running…" : "")}</div>
    </div>

    <div class="section">
      <label>Steps <span class="dim">(${t.steps.length})</span></label>
      <ul class="steps">
        ${t.steps.map(stepRowHTML).join("") || "<li class='dim'>No steps yet</li>"}
      </ul>
    </div>

    <div class="section">
      <label>Console <span class="dim">(${t.logs.length})</span></label>
      <div class="logs" id="log-feed">
        ${t.logs.map(logRow).join("") || "<div class='dim'>No logs yet</div>"}
      </div>
    </div>

    ${errBlock}
  `;
  const feed = document.getElementById("log-feed");
  if (feed) feed.scrollTop = feed.scrollHeight;
}

function stepRowHTML(s) {
  const icon = s.status === "running" ? "▸"
             : s.status === "passed"  ? "✓"
             : s.status === "failed"  ? "✕"
             : "·";
  const dur = s.durationMs ? `<span class="step-dur">${formatDuration(s.durationMs)}</span>` : "";
  const errLine = s.error ? `<div class="step-err">${escape(s.error.message || "")}</div>` : "";
  return `
    <li class="step ${s.status}">
      <span class="step-icon">${icon}</span>
      <span class="step-title">${escape(s.title)}</span>
      <span class="step-cat">${escape(s.category)}</span>
      ${dur}
      ${errLine}
    </li>
  `;
}

function logRow(l) {
  return `<div class="log ${l.stream}">${escape(l.text)}</div>`;
}

function setText(id, v) {
  const el = document.getElementById(id);
  if (el) el.textContent = String(v);
}

function formatDuration(ms) {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function escape(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

let toastTimer = null;
function showToast(msg) {
  const el = document.getElementById("toast");
  if (!el) return;
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, 2500);
}
