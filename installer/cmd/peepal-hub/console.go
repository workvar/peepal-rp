package main

import "net/http"

// console is a single page for the developer: every installation, its health,
// and the buttons that queue a command. It is served from a string rather
// than a bundle so the hub stays a single binary with no build step.
func (s *Server) console(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path != "/" {
		http.NotFound(w, r)
		return
	}
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.Write([]byte(consoleHTML))
}

const consoleHTML = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><title>Installations</title>
<style>
 :root{--bg:#0f1218;--panel:#161b24;--line:#262d3b;--text:#e6eaf2;--muted:#8d97ab;
       --accent:#4f8cff;--ok:#35c98a;--bad:#e5544b}
 body{margin:0;background:var(--bg);color:var(--text);
      font:14px/1.5 -apple-system,"Segoe UI",Roboto,sans-serif}
 header{padding:16px 22px;border-bottom:1px solid var(--line);display:flex;
        justify-content:space-between;align-items:center}
 h1{font-size:16px;margin:0}
 main{padding:20px 22px;display:grid;gap:14px}
 .card{background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:14px}
 table{width:100%;border-collapse:collapse;font-size:13px}
 th{text-align:left;color:var(--muted);font-weight:500;padding:8px 6px;border-bottom:1px solid var(--line)}
 td{padding:9px 6px;border-bottom:1px solid var(--line)}
 .dot{width:8px;height:8px;border-radius:50%;display:inline-block;background:var(--bad)}
 .dot.on{background:var(--ok)}
 button{all:unset;cursor:pointer;padding:4px 10px;border:1px solid var(--line);
        border-radius:7px;font-size:12px;margin-right:4px}
 button:hover{border-color:var(--accent)}
 pre{background:#0b0e13;border:1px solid var(--line);border-radius:8px;padding:12px;
     max-height:340px;overflow:auto;font-size:12px;white-space:pre-wrap}
 input{background:#0b0e13;border:1px solid var(--line);color:var(--text);
       padding:6px 9px;border-radius:7px}
</style></head><body>
<header><h1>Installations</h1><span id="count" style="color:var(--muted)"></span></header>
<main>
 <div class="card"><table id="tbl"><thead><tr>
   <th></th><th>Install</th><th>App</th><th>Version</th><th>Mode</th><th>CPU</th>
   <th>Memory</th><th>Errors</th><th>Last seen</th><th>Actions</th>
 </tr></thead><tbody></tbody></table></div>
 <div class="card"><h3 id="detail-title" style="margin:0 0 10px;font-size:13px;color:var(--muted)">
   Select an installation</h3>
   <div id="exec" style="margin-bottom:10px;display:none">
     <input id="cmdline" placeholder="command to run (must be allow-listed)" size="52">
     <button onclick="send('exec',{command:document.getElementById('cmdline').value})">Run</button>
   </div>
   <pre id="detail">-</pre></div>
</main>
<script>
const token = new URLSearchParams(location.search).get("token") || "";
let current = null;

async function get(path){ const r = await fetch(path + "?token=" + token); return r.json(); }

async function send(name, args){
  if(!current) return;
  await fetch("/api/command?token=" + token, {method:"POST",
    headers:{"Content-Type":"application/json"},
    body: JSON.stringify({install_id: current, name: name, args: args||{}})});
  document.getElementById("detail").textContent =
    "queued " + name + "; it runs on the next heartbeat.";
}

function pct(n){ return Math.round(n||0) + "%"; }
function gb(n){ return n ? (n/1073741824).toFixed(1) + " GB" : "-"; }

async function refresh(){
  const list = await get("/api/installs");
  document.getElementById("count").textContent = list.length + " total";
  const body = document.querySelector("#tbl tbody");
  body.innerHTML = "";
  for(const i of list){
    const m = i.metrics || {};
    const online = (Date.now() - new Date(i.last_seen)) < 300000;
    const tr = document.createElement("tr");
    tr.innerHTML =
      '<td><span class="dot ' + (online?"on":"") + '"></span></td>' +
      "<td>" + i.id + "</td><td>" + (i.app||"-") + "</td><td>" + (i.version||"-") + "</td>" +
      "<td>" + (m.mode||"-") + "</td><td>" + pct(m.cpu_percent) + "</td>" +
      "<td>" + gb(m.mem_used_bytes) + " / " + gb(m.mem_total_bytes) + "</td>" +
      "<td>" + i.errors + "</td><td>" + new Date(i.last_seen).toLocaleString() + "</td>";
    const td = document.createElement("td");
    for(const [label, cmd] of [["Open","open"],["Restart","restart"],["Update","update"],["Logs","logs"]]){
      const b = document.createElement("button");
      b.textContent = label;
      b.onclick = () => { current = i.id; if(cmd === "open") show(i.id); else send(cmd, {}); };
      td.append(b);
    }
    tr.append(td);
    body.append(tr);
  }
  if(current) show(current, true);
}

async function show(id, quiet){
  current = id;
  document.getElementById("exec").style.display = "block";
  document.getElementById("detail-title").textContent = "Installation " + id;
  const d = await get("/api/install/" + id);
  const lines = [];
  lines.push(JSON.stringify(d.install.metrics, null, 2));
  if(d.install.results && d.install.results.length){
    lines.push("\n--- command results ---");
    for(const r of d.install.results.slice(-5))
      lines.push(r.id + " " + (r.ok ? "ok" : "failed") + " " + (r.error||"") + "\n" + (r.output||""));
  }
  lines.push("\n--- recent events ---");
  for(const e of (d.events||[]).slice(-40)){
    if(e.kind === "log") lines.push((e.lines||[]).join("\n"));
    else lines.push(e.at + "  " + e.kind + "  " + (e.message||""));
  }
  document.getElementById("detail").textContent = lines.join("\n");
}

refresh();
setInterval(refresh, 10000);
</script></body></html>`
