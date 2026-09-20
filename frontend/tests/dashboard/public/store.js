// In-memory state for the dashboard. Pure data, no DOM access.

export class Store {
  constructor() {
    this.tests = new Map();   // id -> test record
    this.order = [];          // test ids in discovery order
    this.run = { startedAt: 0, endedAt: 0, total: 0, status: null };
    this.runStatus = "idle";  // idle | running | finished (from server)
    this.filter = "all";
    this.selectedId = null;
    this.currentId  = null;   // currently-running test id (auto-follow)
    this.collapsed  = new Set(); // describe-path keys (joined with '/') that are collapsed
  }

  apply(evt) {
    if (evt.type === "snapshot") {
      this.runStatus = "idle";
      for (const e of evt.events) this.apply(e);
      return;
    }
    switch (evt.type) {
      case "snapshot:cleared": return this.onClear();
      case "run:status":       return this.onRunStatus(evt);
      case "run:start":        return this.onRunStart(evt);
      case "test:start":       return this.onTestStart(evt);
      case "step:start":       return this.onStepStart(evt);
      case "step:end":         return this.onStepEnd(evt);
      case "log":              return this.onLog(evt);
      case "test:end":         return this.onTestEnd(evt);
      case "run:end":          return this.onRunEnd(evt);
      case "run:error":        return;
    }
  }

  onClear() {
    this.tests.clear();
    this.order = [];
    this.run = { startedAt: 0, endedAt: 0, total: 0, status: null };
    this.currentId = null;
    this.selectedId = null;
  }

  onRunStatus(evt) {
    this.runStatus = evt.status;
  }

  onRunStart(evt) {
    this.tests.clear();
    this.order = [];
    this.run = { startedAt: evt.ts, endedAt: 0, total: evt.total, status: "running" };
    this.runStatus = "running";
    this.currentId = null;
    for (const t of evt.tests) {
      this.tests.set(t.id, this.makeTest(t));
      this.order.push(t.id);
    }
  }

  makeTest(t) {
    const path = Array.isArray(t.path) ? t.path : (t.suite ? [t.suite] : []);
    return {
      id: t.id, title: t.title, path, file: t.file || "",
      status: "pending", durationMs: 0, error: null, startedAt: 0,
      steps: [], logs: [],
    };
  }

  onTestStart(evt) {
    const t = this.tests.get(evt.id) || this.makeTest(evt);
    t.status = "running";
    t.startedAt = evt.ts;
    t.steps = [];
    t.logs = [];
    this.tests.set(evt.id, t);
    this.currentId = evt.id;
  }

  onStepStart(evt) {
    const t = this.tests.get(evt.testId);
    if (!t) return;
    t.steps.push({
      id: evt.stepId, title: evt.title, category: evt.category,
      status: "running", durationMs: 0, error: null,
    });
  }

  onStepEnd(evt) {
    const t = this.tests.get(evt.testId);
    if (!t) return;
    const step = t.steps.find((s) => s.id === evt.stepId);
    if (!step) return;
    step.status = evt.error ? "failed" : "passed";
    step.durationMs = evt.durationMs || 0;
    step.error = evt.error || null;
  }

  onLog(evt) {
    const id = evt.testId || this.currentId;
    if (!id) return;
    const t = this.tests.get(id);
    if (!t) return;
    t.logs.push({ stream: evt.stream, text: evt.text, ts: evt.ts });
    if (t.logs.length > 500) t.logs.splice(0, t.logs.length - 500);
  }

  onTestEnd(evt) {
    const t = this.tests.get(evt.id) || this.makeTest(evt);
    t.status = evt.status === "timedOut" ? "timedout" : evt.status;
    t.durationMs = evt.durationMs;
    t.error = evt.error || null;
    this.tests.set(evt.id, t);
    if (this.currentId === evt.id) this.currentId = null;
  }

  onRunEnd(evt) {
    this.run.endedAt = evt.ts;
    this.run.status = evt.status;
    this.runStatus = "finished";
    this.currentId = null;
  }

  counts() {
    let passed = 0, failed = 0, skipped = 0, running = 0, pending = 0;
    for (const t of this.tests.values()) {
      if (t.status === "passed") passed++;
      else if (t.status === "failed" || t.status === "timedout") failed++;
      else if (t.status === "skipped") skipped++;
      else if (t.status === "running") running++;
      else pending++;
    }
    return { passed, failed, skipped, running, pending, total: this.tests.size || this.run.total };
  }

  elapsedMs() {
    if (!this.run.startedAt) return 0;
    return (this.run.endedAt || Date.now()) - this.run.startedAt;
  }

  filtered() {
    const all = this.order.map((id) => this.tests.get(id)).filter(Boolean);
    return all.filter((t) => {
      if (this.filter === "all") return true;
      if (this.filter === "failed") return t.status === "failed" || t.status === "timedout";
      return t.status === this.filter;
    });
  }

  /**
   * Build a flat list of rows in tree order:
   *   { type: "group", title, depth, key, count, failed, running, collapsed }
   *   { type: "test",  test, depth }
   * Group rows belong to describe-path prefixes; test rows are leaves.
   */
  treeRows() {
    const tests = this.filtered();
    const rows = [];
    const opened = new Set(); // keys we've already emitted a group row for

    for (const t of tests) {
      // Emit any missing parent groups in order.
      for (let i = 0; i < t.path.length; i++) {
        const key = t.path.slice(0, i + 1).join("/");
        if (!opened.has(key)) {
          opened.add(key);
          rows.push({
            type: "group",
            depth: i,
            title: t.path[i],
            key,
            collapsed: this.collapsed.has(key),
          });
        }
      }
      // Test row indented one level deeper than its containing describe.
      rows.push({ type: "test", depth: t.path.length, test: t });
    }

    // Annotate groups with aggregate counts.
    const acc = new Map();
    for (const t of tests) {
      for (let i = 0; i < t.path.length; i++) {
        const key = t.path.slice(0, i + 1).join("/");
        const a = acc.get(key) || { total: 0, passed: 0, failed: 0, running: 0 };
        a.total++;
        if (t.status === "passed") a.passed++;
        else if (t.status === "failed" || t.status === "timedout") a.failed++;
        else if (t.status === "running") a.running++;
        acc.set(key, a);
      }
    }
    for (const r of rows) if (r.type === "group") Object.assign(r, acc.get(r.key) || {});

    // Hide tests whose parent group is collapsed.
    const visible = [];
    let hideUnder = null; // depth at which we are currently hiding
    for (const r of rows) {
      if (hideUnder !== null && r.depth > hideUnder) continue;
      if (hideUnder !== null && r.depth <= hideUnder) hideUnder = null;
      visible.push(r);
      if (r.type === "group" && r.collapsed) hideUnder = r.depth;
    }
    return visible;
  }

  toggleCollapse(key) {
    if (this.collapsed.has(key)) this.collapsed.delete(key);
    else this.collapsed.add(key);
  }

  selected() {
    const id = this.selectedId || this.currentId;
    return id ? this.tests.get(id) : null;
  }
}
