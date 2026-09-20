// Custom Playwright reporter. Streams test lifecycle, step lifecycle, and
// stdout/stderr to the dashboard via plain HTTP POSTs. No external deps.

const http = require("http");

// Step categories worth showing. 'hook' and 'fixture' are too noisy.
const STEP_KEEP = new Set(["expect", "pw:api", "test.step"]);

class DashboardReporter {
  constructor(options = {}) {
    this.port = parseInt(options.port || process.env.DASHBOARD_PORT || "9323", 10);
    this.host = "127.0.0.1";
    this.startedAt = 0;
    this.currentTestId = null;
  }

  post(evt) {
    const data = JSON.stringify({ ...evt, ts: Date.now() });
    const req = http.request(
      {
        hostname: this.host,
        port: this.port,
        path: "/event",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(data),
        },
      },
      (res) => res.resume()
    );
    req.on("error", () => { /* dashboard may not be up yet */ });
    req.write(data);
    req.end();
  }

  onBegin(config, suite) {
    this.startedAt = Date.now();
    const tests = collectTests(suite);
    this.post({
      type: "run:start",
      total: tests.length,
      tests: tests.map((t) => ({
        id: t.id,
        title: t.title,
        path: pathOf(t),
        file: t.location.file,
      })),
    });
  }

  onTestBegin(test) {
    this.currentTestId = test.id;
    this.post({
      type: "test:start",
      id: test.id,
      title: test.title,
      path: pathOf(test),
      file: test.location.file,
    });
  }

  onStepBegin(test, _result, step) {
    if (!STEP_KEEP.has(step.category)) return;
    this.post({
      type: "step:start",
      testId: test.id,
      stepId: stepId(step),
      title: step.title,
      category: step.category,
    });
  }

  onStepEnd(test, _result, step) {
    if (!STEP_KEEP.has(step.category)) return;
    this.post({
      type: "step:end",
      testId: test.id,
      stepId: stepId(step),
      title: step.title,
      category: step.category,
      durationMs: step.duration,
      error: step.error ? simplifyError(step.error) : null,
    });
  }

  onStdOut(chunk, test) {
    this.emitLog("stdout", chunk, test);
  }

  onStdErr(chunk, test) {
    this.emitLog("stderr", chunk, test);
  }

  emitLog(stream, chunk, test) {
    const text = chunk?.toString?.() ?? String(chunk ?? "");
    if (!text.trim()) return;
    this.post({
      type: "log",
      stream,
      text,
      testId: test ? test.id : this.currentTestId,
    });
  }

  onTestEnd(test, result) {
    this.currentTestId = null;
    this.post({
      type: "test:end",
      id: test.id,
      title: test.title,
      path: pathOf(test),
      file: test.location.file,
      status: result.status,
      durationMs: result.duration,
      error: result.error ? simplifyError(result.error) : null,
      retry: result.retry,
    });
  }

  onEnd(result) {
    this.post({
      type: "run:end",
      status: result.status,
      durationMs: Date.now() - this.startedAt,
    });
  }

  onError(error) {
    this.post({ type: "run:error", error: simplifyError(error) });
  }
}

function collectTests(suite) {
  const out = [];
  for (const s of suite.suites) out.push(...collectTests(s));
  for (const t of suite.tests || []) out.push(t);
  return out;
}

// Walk up the suite chain and collect human-readable describe titles.
// Excludes the file-path suite and the project-name suite.
function pathOf(test) {
  const parts = [];
  let s = test.parent;
  while (s) {
    const title = s.title;
    if (title && !looksLikeFilePath(title) && !looksLikeProject(title)) {
      parts.unshift(title);
    }
    s = s.parent;
  }
  return parts;
}

function looksLikeFilePath(t) {
  return /[\\/]/.test(t) || /\.spec\.(t|j)sx?$/.test(t);
}
function looksLikeProject(t) {
  return t === "chromium" || t === "firefox" || t === "webkit";
}

function stepId(step) {
  // Playwright steps don't have stable IDs; combine title + start time.
  return `${step.title}@${step.startTime?.getTime?.() ?? 0}`;
}

function simplifyError(err) {
  if (!err) return null;
  return {
    message: err.message || String(err),
    stack: err.stack || "",
    location: err.location || null,
  };
}

module.exports = DashboardReporter;
