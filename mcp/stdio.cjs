#!/usr/bin/env node
// vibekit MCP over stdio, for assistants that run MCP servers locally: node mcp/stdio.cjs
const { handle } = require("./core.cjs");
let buf = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", chunk => {
  buf += chunk; let i;
  while ((i = buf.indexOf("\n")) >= 0) {
    const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1); if (!line) continue;
    let msg; try { msg = JSON.parse(line); } catch (_) { process.stdout.write(JSON.stringify({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "parse error" } }) + "\n"); continue; }
    handle(msg).then(out => { if (out) process.stdout.write(JSON.stringify(out) + "\n"); });
  }
});
