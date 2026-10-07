#!/usr/bin/env node
// vibevibekit: build on vibe/vibe (Robinhood Chain testnet) with AI.
//   npx vibevibekit init [folder] [--token 0x...]          starter folder for any AI tool (AGENTS.md, MCP configs, START.md)
//   npx vibevibekit new token-page|token-gate|buy-bot [folder] --token 0x...   a ready-made app set to your token
//   npx vibevibekit token 0x...                             live info about a token
//   npx vibevibekit mcp                                     the vibekit MCP server over stdio
const fs = require("fs"), path = require("path");
const ROOT = path.join(__dirname, "..");
const MCP_URL = "https://vibercheck.xyz/api/mcp";
const TEMPLATES = ["token-page", "token-gate", "buy-bot"];

const args = process.argv.slice(2), flags = {}, pos = [];
for (let i = 0; i < args.length; i++) { if (args[i].startsWith("--")) { const k = args[i].slice(2); flags[k] = args[i + 1] && !args[i + 1].startsWith("--") ? args[++i] : true; } else pos.push(args[i]); }
const [cmd, ...rest] = pos;
const isAddr = a => /^0x[0-9a-fA-F]{40}$/.test(a || "");
const die = msg => { console.error("\n  " + msg + "\n"); process.exit(1); };
const write = (dir, rel, body) => { const f = path.join(dir, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, body); };
const freshDir = name => { const dir = path.resolve(name); if (fs.existsSync(dir) && fs.readdirSync(dir).length) die(`The folder "${name}" already exists and is not empty. Pick another name.`); return dir; };

async function tokenInfo(token) {
  const { handle } = require("../mcp/core.cjs");
  const r = await handle({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "get_token", arguments: { token } } });
  if (!r || !r.result || r.result.isError) throw new Error(r && r.result ? r.result.content[0].text : "could not read the token");
  return r.result.structuredContent;
}

function aiFiles(dir) {
  const ctx = fs.readFileSync(path.join(ROOT, "context", "vibevibe.md"), "utf8");
  write(dir, "AGENTS.md", ctx); write(dir, "CLAUDE.md", "@AGENTS.md\n"); write(dir, "GEMINI.md", "@./AGENTS.md\n");
  write(dir, ".cursor/rules/vibevibe.mdc", "---\ndescription: vibe/vibe (Robinhood Chain testnet) facts and code\nalwaysApply: true\n---\n" + ctx);
  for (const f of [".windsurf/rules/vibevibe.md", ".github/copilot-instructions.md", ".clinerules/vibevibe.md", ".roo/rules/vibevibe.md"]) write(dir, f, ctx);
  write(dir, ".mcp.json", JSON.stringify({ mcpServers: { vibekit: { type: "http", url: MCP_URL } } }, null, 2) + "\n");
  write(dir, ".cursor/mcp.json", JSON.stringify({ mcpServers: { vibekit: { url: MCP_URL } } }, null, 2) + "\n");
  write(dir, ".vscode/mcp.json", JSON.stringify({ servers: { vibekit: { type: "http", url: MCP_URL } } }, null, 2) + "\n");
  write(dir, ".gemini/settings.json", JSON.stringify({ mcpServers: { vibekit: { httpUrl: MCP_URL } } }, null, 2) + "\n");
  write(dir, ".codex/config.toml", `[mcp_servers.vibekit]\nurl = "${MCP_URL}"\n`);
}

async function init() {
  const name = rest[0] || "my-vibevibe-app", token = flags.token;
  if (token && !isAddr(token)) die("--token must be a token address (0x followed by 40 characters).");
  const dir = freshDir(name);
  let line = "My token address is [paste it here].";
  if (token) { try { const t = await tokenInfo(token); line = `My token is ${token} ($${t.symbol}).`; } catch (_) { line = `My token is ${token}.`; } }
  aiFiles(dir);
  write(dir, "START.md", `# Your vibe/vibe project

Open this folder in your AI tool (Claude Code, Codex, Cursor, Gemini CLI, VS Code with Copilot, Cline or Roo Code, Windsurf).
It already knows vibe/vibe (AGENTS.md) and is connected to live vibe/vibe data (vibekit MCP).

Paste this as your first message:

I want to build something on vibe/vibe (testnet.vibevibe.fun), a token launchpad on Robinhood Chain testnet.
Use the vibe/vibe file (vibevibe.md / AGENTS.md) and, if you have it, the vibekit tools. Never guess addresses or functions.
${line}
I am a beginner: give me complete files, and tell me exactly what to click and type to run them.
What I want: [describe it in your own words]

Setup help: https://vibercheck.xyz/build
`);
  console.log(`
  Done: ${path.relative(process.cwd(), dir) || "."}

  Next:
    cd ${name}
    claude            (or codex, gemini, or open the folder in Cursor / VS Code)

  Then paste the first message from START.md and say what you want to build.
`);
}

async function create() {
  const kind = rest[0], name = rest[1] || (kind ? `my-${kind}` : ""), token = flags.token;
  if (!TEMPLATES.includes(kind)) die(`Pick one: ${TEMPLATES.join(", ")}\n  e.g. npx vibevibekit new token-page --token 0x...`);
  if (!isAddr(token)) die(`Add your token address: npx vibevibekit new ${kind} --token 0x...\n  (it's in the address bar of your token's page: testnet.vibevibe.fun/token/0x...)`);
  const dir = freshDir(name), src = path.join(ROOT, "templates", kind);
  let info = null; try { info = await tokenInfo(token); } catch (_) {}
  const copy = (from, to) => { for (const e of fs.readdirSync(from, { withFileTypes: true })) { const a = path.join(from, e.name), b = path.join(to, e.name); if (e.isDirectory()) { fs.mkdirSync(b, { recursive: true }); copy(a, b); } else fs.copyFileSync(a, b); } };
  fs.mkdirSync(dir, { recursive: true }); copy(src, dir);
  const main = path.join(dir, kind === "buy-bot" ? "bot.js" : "index.html");
  let body = fs.readFileSync(main, "utf8").replace(/token: "PASTE_YOUR_TOKEN_ADDRESS_HERE"/, `token: "${token}"`);
  if (kind === "token-page" && info) {
    const s = info.socials || {}, str = v => JSON.stringify(v || "");
    body = body.replace(/image: "",/, `image: ${str(info.image)},`)
      .replace(/links: \{ website: "", x: "", telegram: "", discord: "" \}/, `links: { website: ${str(s.website)}, x: ${str(s.x)}, telegram: ${str(s.telegram)}, discord: ${str(s.discord)} }`);
    if (info.description) body = body.replace(/tagline: "",/, `tagline: ${str(info.description.split("\n")[0].slice(0, 180))},`);
  }
  fs.writeFileSync(main, body);
  const label = info ? `$${info.symbol}` : token;
  console.log(`
  Done: ${name} (set to ${label})
` + (kind === "buy-bot" ? `
  Next: open ${name}/bot.js, paste your Discord webhook or Telegram bot details at the top, then:
    cd ${name}
    node bot.js
` : `
  Next: open ${name}/index.html in your browser (double click it).
  For the wallet button, put the folder online by dragging it onto https://app.netlify.com/drop
  (or allow "file URLs" for your wallet extension, see ${name}/README.md).
`) + `
  Want changes? Open the folder in your AI tool: it already knows vibe/vibe (AGENTS.md).
`);
}

async function token() {
  const t = rest[0]; if (!isAddr(t)) die("Usage: npx vibevibekit token 0x...");
  const i = await tokenInfo(t);
  console.log(JSON.stringify(i, null, 2));
}

function help() {
  console.log(`
  vibevibekit: build on vibe/vibe (Robinhood Chain testnet) with AI

    npx vibevibekit init [folder] [--token 0x...]       starter folder for your AI tool
    npx vibevibekit new token-page [folder] --token 0x...   live token page, one file
    npx vibevibekit new token-gate [folder] --token 0x...   holders-only page
    npx vibevibekit new buy-bot [folder] --token 0x...      Discord / Telegram buy alerts
    npx vibevibekit token 0x...                          live info about a token
    npx vibevibekit mcp                                  vibekit MCP server (stdio)

  In code:  import { tokenInfo, quoteBuy, buyWithEth } from "vibevibekit";
  Guide: https://vibercheck.xyz/build   Code: https://github.com/0xnesQuit/vibekit
  Testnet only. Test tokens have no real value.
`);
}

(async () => {
  if (cmd === "mcp") return require("../mcp/stdio.cjs");
  if (cmd === "init") return init();
  if (cmd === "new" || cmd === "create") return create();
  if (cmd === "token") return token();
  help();
})().catch(e => die(e.message || String(e)));
