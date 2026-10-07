# vibekit

**Build on [vibe/vibe](https://testnet.vibevibe.fun) with AI. No coding needed.**

vibekit gives you three things:

1. **Ready-made apps for your token**: a token page, a holders-only page and a Discord/Telegram buy bot.
   Paste your token address, done.
2. **An AI that knows vibe/vibe**: one file (`AGENTS.md`) that teaches ChatGPT, Claude, Codex, Cursor, Gemini or Copilot
   every vibe/vibe contract, rule and code pattern, checked on the live chain, plus an **MCP server** that lets your AI
   look at live tokens, trades, holders and guilds while it builds.
3. **Recipes**: copy-paste prompts that end in a working app.

👉 **Easiest start: [vibercheck.xyz/build](https://vibercheck.xyz/build)**. Paste your token, download, or follow the
step by step setup for your AI tool. Everything below is the same thing for people who like GitHub.

---

## 1. Ready-made apps

| Template | What you get | How to use |
|---|---|---|
| [`templates/token-page`](templates/token-page) | Live price, graduation progress, tax, holders, live trades, buy box | open `index.html` in Notepad, paste your token address, double click it |
| [`templates/token-gate`](templates/token-gate) | Wallet connect; holders of your token see your members content | same: paste token, set the minimum, write the members part |
| [`templates/buy-bot`](templates/buy-bot) | Posts every buy in your Discord or Telegram | paste token + webhook in `bot.js`, run `node bot.js` |

The web templates are a **single file** with no build step, so they work by double click and can be published by
dragging them onto [Netlify Drop](https://app.netlify.com/drop). The bot needs only [Node.js](https://nodejs.org), no packages.

## 2. Make your AI know vibe/vibe

### The vibe/vibe file

[`AGENTS.md`](AGENTS.md) (same text in [`context/vibevibe.md`](context/vibevibe.md)) holds everything an AI needs:
network settings, every V6 contract address, the token lifecycle (curve, transfer lock, graduation), the tax and holder
rewards, every contract function and event, ready viem code, and the data APIs, plus the traps (trades through the zap
router, holder lists, RPC limits).

- **Codex, Cursor, GitHub Copilot, Windsurf**: read `AGENTS.md` automatically when it's in your project folder.
- **Claude Code**: `CLAUDE.md` imports it. **Gemini CLI**: `GEMINI.md` imports it.
- **ChatGPT, Claude.ai and any chat AI**: attach `vibevibe.md` to the chat (or a Project).

Every template folder already contains these files.

### The vibekit MCP server

Hosted, free, no install, no sign in:

```
https://vibercheck.xyz/api/mcp
```

| Tool | Setup |
|---|---|
| ChatGPT (Plus/Pro, web) | Settings → turn on Developer mode → Apps & Connectors → Create → URL above, "No authentication" |
| Claude.ai / Claude app | Settings → Connectors → Add custom connector → URL above |
| Claude Code | `claude mcp add --transport http vibekit https://vibercheck.xyz/api/mcp` |
| Codex | `codex mcp add vibekit --url https://vibercheck.xyz/api/mcp` |
| Cursor | `~/.cursor/mcp.json`: `{"mcpServers":{"vibekit":{"url":"https://vibercheck.xyz/api/mcp"}}}` |
| Gemini CLI | `~/.gemini/settings.json`: `{"mcpServers":{"vibekit":{"httpUrl":"https://vibercheck.xyz/api/mcp"}}}` |
| VS Code (Copilot) | `.vscode/mcp.json`: `{"servers":{"vibekit":{"type":"http","url":"https://vibercheck.xyz/api/mcp"}}}` |
| Windsurf | `mcp_config.json`: `{"mcpServers":{"vibekit":{"serverUrl":"https://vibercheck.xyz/api/mcp"}}}` |

The **starter folder** on [vibercheck.xyz/build](https://vibercheck.xyz/build#ai) comes with all of these already set up
for the folder: open it in your tool and start talking.

Tools it gives your AI (all read-only; nothing is ever signed or sent for you):

| Tool | What it does |
|---|---|
| `vibevibe_docs` | the vibe/vibe file, by topic |
| `search_tokens`, `latest_launches` | find tokens |
| `get_token` | live price, graduation progress, tax and split, lifecycle, holders, links |
| `get_trades`, `get_holders`, `get_price_history` | trades, top holders, candles |
| `get_wallet` | holdings, launches, vibercheck profile |
| `quote_trade` | exact buy/sell quote with the live tax |
| `build_trade_transaction` | an **unsigned** testnet transaction for the user to sign in their own wallet |
| `list_guilds`, `get_guild` | guild ranking and details from vibercheck |

Prefer running it yourself (stdio)? `node mcp/stdio.cjs`, no dependencies. Or mount `mcp/http.cjs` on any Node server.

## 3. Recipes

[`recipes/`](recipes) has prompts like *"a website for my token"*, *"buy alerts in Discord"*, *"a small game for holders"*,
*"tokens about to graduate"*. Set your AI up as above, paste, change the parts in brackets.

---

## For developers

- [`templates/_shared/vibe.js`](templates/_shared/vibe.js): a small browser module (viem from a CDN) with `tokenInfo`,
  `recentTrades`, `watchTrades`, `topHolders`, `connectWallet`, `quoteBuy`, `buyWithEth`, `sellTokens`.
- [`mcp/core.cjs`](mcp/core.cjs): the MCP tools, zero dependencies.
- [`research/`](research): scripts that check the documented contracts, functions and snippets against the live chain.
- After editing `context/vibevibe.md` or a template, run `node tools/sync.cjs`: it copies the context into every
  `AGENTS.md` / `CLAUDE.md` / `GEMINI.md` / Cursor / Windsurf / Copilot file and rebuilds the one-file templates.

How the facts were checked: the V6 deployment and ABIs come from the public vibe/vibe web app and were verified by
calling every function on Robinhood Chain testnet (`research/verify*.mjs`, `research/snippets_test.mjs`) and by matching
function selectors and event topics against real transactions. The buy and sell code and the MCP's unsigned
transactions were tested with real testnet trades (`research/write_test.mjs`).

## Good to know

- **Testnet only.** Robinhood Chain testnet tokens have no monetary value. Never paste a real private key anywhere.
- **Unofficial.** vibekit is a community toolkit by [@0xHaileyy](https://x.com/0xHaileyy), not made or endorsed by vibe/vibe.
- The vibe/vibe REST API blocks browser requests from other sites, so pages use the chain (RPC) and the explorer API;
  servers, bots and the MCP server can use the REST API.

MIT License.
