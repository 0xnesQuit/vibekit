// vibekit MCP over HTTP (streamable HTTP transport, stateless, JSON responses). Mount it on any Node http server:
//   const mcp = require("./mcp/http.cjs"); http.createServer((req, res) => mcp(req, res)).listen(8787)
// Hosted at https://vibercheck.xyz/api/mcp so nobody has to install anything.
const { handle, VERSION } = require("./core.cjs");

const HELP = `<!doctype html><meta charset="utf-8"><title>vibekit MCP</title><meta name="viewport" content="width=device-width,initial-scale=1">
<body style="font:16px/1.6 system-ui;background:#05060a;color:#f2f4f3;max-width:720px;margin:40px auto;padding:0 16px">
<h1 style="color:#dff902">vibekit MCP server</h1>
<p>This address is for AI assistants, not for browsers. Add it to your assistant as an MCP server (a "connector"):</p>
<pre style="background:#14171b;padding:12px;border-radius:8px;overflow:auto">https://vibercheck.xyz/api/mcp</pre>
<p>Step by step guides for ChatGPT, Claude, Codex, Cursor, Gemini and VS Code: <a style="color:#dff902" href="https://vibercheck.xyz/build">vibercheck.xyz/build</a></p>
<p style="color:#7d848a">vibekit ${VERSION} · read-only data for vibe/vibe on Robinhood Chain testnet · unofficial community tool</p></body>`;

function body(req) {
  return new Promise((ok, no) => {
    let d = ""; req.setEncoding("utf8");
    req.on("data", c => { d += c; if (d.length > 1e6) { no(new Error("too large")); req.destroy(); } });
    req.on("end", () => ok(d)); req.on("error", no);
  });
}
module.exports = async function mcpHttp(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "content-type, accept, authorization, mcp-session-id, mcp-protocol-version, last-event-id");
  res.setHeader("Access-Control-Expose-Headers", "mcp-session-id");
  if (req.method === "OPTIONS") { res.statusCode = 204; return res.end(); }
  if (req.method === "GET") {   // no server-to-client stream; people who open the link get a short how-to
    if (/text\/html/.test(req.headers.accept || "")) { res.setHeader("Content-Type", "text/html; charset=utf-8"); return res.end(HELP); }
    res.statusCode = 405; res.setHeader("Allow", "POST"); return res.end();
  }
  if (req.method === "DELETE") { res.statusCode = 204; return res.end(); }   // stateless: nothing to close
  if (req.method !== "POST") { res.statusCode = 405; return res.end(); }
  let msg;
  try { msg = JSON.parse(await body(req)); } catch (_) {
    res.statusCode = 400; res.setHeader("Content-Type", "application/json");
    return res.end(JSON.stringify({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "parse error" } }));
  }
  const out = await handle(msg);
  if (!out) { res.statusCode = 202; return res.end(); }   // notifications only
  res.statusCode = 200; res.setHeader("Content-Type", "application/json"); res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(out));
};
