package proxy

import "html/template"

// page is the maintenance screen. It polls the status endpoint and reloads
// itself the moment the stack is serving again, so nobody has to sit there
// pressing refresh.
var page = template.Must(template.New("maintenance").Parse(`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Peepal is updating</title>
<style>
  :root { color-scheme: light dark; }
  * { box-sizing: border-box; }
  body {
    margin: 0; min-height: 100vh; display: grid; place-items: center;
    font: 16px/1.6 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    background: #0f1720; color: #e6edf3;
  }
  .card {
    max-width: 30rem; padding: 2.5rem; text-align: center;
    background: #161f2b; border: 1px solid #24303f; border-radius: 14px;
    box-shadow: 0 20px 45px rgba(0,0,0,.35);
  }
  h1 { margin: 0 0 .5rem; font-size: 1.4rem; font-weight: 600; }
  p { margin: 0 0 1.25rem; color: #9fb0c3; }
  .bar { height: 6px; border-radius: 999px; background: #24303f; overflow: hidden; }
  .bar span {
    display: block; height: 100%; width: 35%; border-radius: 999px;
    background: linear-gradient(90deg,#2f81f7,#56d4dd);
    animation: slide 1.4s ease-in-out infinite;
  }
  @keyframes slide { 0% { margin-left: -35%; } 100% { margin-left: 100%; } }
  .err { margin-top: 1.25rem; padding: .75rem; border-radius: 8px; text-align: left;
         background: #2a1618; border: 1px solid #5c2a2f; color: #ffb4ab;
         font: 13px/1.5 ui-monospace, SFMono-Regular, Menlo, monospace; white-space: pre-wrap; }
  .foot { margin-top: 1.5rem; font-size: .8rem; color: #66788c; }
</style>
</head>
<body>
  <div class="card">
    <h1>{{ .Headline }}</h1>
    <p>{{ .Step }}. This page refreshes on its own, so you can leave it open.</p>
    {{ if .Failed }}
      <div class="err">{{ .Error }}</div>
    {{ else }}
      <div class="bar"><span></span></div>
    {{ end }}
    <div class="foot">HTTP 503 &middot; the service is temporarily unavailable</div>
  </div>
<script>
  async function check() {
    try {
      const r = await fetch('/_peepal/status', { cache: 'no-store' });
      const s = await r.json();
      if (s.mode === 'running') { location.reload(); return; }
      document.querySelector('p').firstChild.textContent = s.step + '. This page refreshes on its own, so you can leave it open.';
    } catch (e) { /* the agent is restarting; try again shortly */ }
    setTimeout(check, 5000);
  }
  setTimeout(check, 3000);
</script>
</body>
</html>`))
