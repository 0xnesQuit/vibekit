// vibekit MCP core: tools that let any AI assistant (ChatGPT, Claude, Codex, Cursor, Gemini, Copilot...) read
// vibe/vibe on Robinhood Chain testnet live. No dependencies: plain Node 18+ (fetch). Read-only, except that it can
// prepare an unsigned testnet transaction for the user to sign in their own wallet.
const fs = require("fs"), path = require("path");

const RPC = "https://rpc.testnet.chain.robinhood.com";
const EXPLORER = "https://explorer.testnet.chain.robinhood.com";
const API = "https://testnet.vibevibe.fun/api/v1/chains/46630";
const SITE = "https://testnet.vibevibe.fun";
const VIBERCHECK = "https://vibercheck.xyz";
const CHAIN_ID = 46630;
const ZERO = "0x0000000000000000000000000000000000000000";
const A = { factory: "0xe794217880011f9cA6961340eD5c16EC9559Fea0", zap: "0x2784448c519D01d3aE257C0aac0b7cDAd8AccEB1", locker: "0x7771E60708060c43C8562c4544fBd5c365e549c0", vibevibe: "0xF1f6b050550531226Ee0257FeC4A1E575ff4c341" };
const SEL = { curveOf: "0x05adc47e", isV6Token: "0xb6744f9a", complete: "0x522e1177", pairCurrency: "0x7f1a97f8", targetPairUnits: "0x7d05d553", pairPrincipal: "0xa49fd649",
  currentRateBps: "0x51c9c57a", quoteBuyExactIn: "0xa26eee0a", quoteSell: "0xa64190c4", name: "0x06fdde03", symbol: "0x95d89b41", transfersUnlocked: "0x167e007c",
  baseTaxBps: "0x8e9fb619", packedWeights: "0x2233069d", pendingReward: "0xf40f0f52", pendingPairReward: "0x1fd72d8b", balanceOf: "0x70a08231", buyExactIn: "0xf0a92630", sell: "0x8a038a54" };
const VERSION = "1.0.0";

// ---------- small helpers: ABI encoding/decoding for the few calls we need ----------
const isAddr = a => /^0x[0-9a-fA-F]{40}$/.test(String(a || ""));
const word = n => BigInt(n).toString(16).padStart(64, "0");
const addrWord = a => a.toLowerCase().replace(/^0x/, "").padStart(64, "0");
const words = d => (d || "0x").slice(2).match(/.{64}/g) || [];
const u = w => BigInt("0x" + w);
const toAddr = w => "0x" + w.slice(24);
function str(d) { const h = (d || "0x").slice(2); if (h.length < 128) return null; const len = Number(BigInt("0x" + h.slice(64, 128))); return Buffer.from(h.slice(128, 128 + len * 2), "hex").toString("utf8"); }
function units(v, dec = 18) {   // bigint -> decimal string
  const neg = v < 0n; v = neg ? -v : v; const s = v.toString().padStart(dec + 1, "0");
  const out = (s.slice(0, -dec) + "." + s.slice(-dec)).replace(/\.?0+$/, ""); return (neg ? "-" : "") + out;
}
function parseUnits(x, dec = 18) {   // decimal string -> bigint
  const m = String(x).trim().match(/^(\d*)(?:\.(\d*))?$/); if (!m || (!m[1] && !m[2])) throw new Error("not a number: " + x);
  return BigInt((m[1] || "0") + (m[2] || "").padEnd(dec, "0").slice(0, dec));
}
const short = n => { const x = Number(n); return Math.abs(x) >= 1e6 ? (x / 1e6).toFixed(2) + "M" : Math.abs(x) >= 1e3 ? (x / 1e3).toFixed(2) + "K" : x >= 1 ? x.toFixed(4) : x.toPrecision(4); };
const ipfs = uri => uri && uri.startsWith("ipfs://") ? "https://ipfs.filebase.io/ipfs/" + uri.slice(7) : uri || null;
const links = token => ({ vibevibe: `${SITE}/token/${token}`, explorer: `${EXPLORER}/token/${token}` });

async function rpc(method, params) {
  const r = await fetch(RPC, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }) });
  const j = await r.json(); if (j.error) throw new Error(j.error.message || "rpc error"); return j.result;
}
const ethCall = (to, data) => rpc("eth_call", [{ to, data }, "latest"]);
const cache = new Map();
async function getJson(url, ttl = 15000) {   // cached GET, a polite user agent
  const hit = cache.get(url); if (hit && Date.now() - hit.at < ttl) return hit.v;
  const r = await fetch(url, { headers: { "user-agent": "vibekit-mcp/" + VERSION, accept: "application/json" } });
  if (!r.ok) throw new Error(`${r.status} from ${url.replace(/\?.*/, "")}`);
  const v = await r.json(); cache.set(url, { at: Date.now(), v }); if (cache.size > 500) cache.delete(cache.keys().next().value); return v;
}

// ---------- chain reads ----------
async function curveOf(token) { return toAddr(words(await ethCall(A.factory, SEL.curveOf + addrWord(token)))[0]); }
async function live(token) {   // live state straight from the contracts
  const curve = await curveOf(token);
  if (curve === ZERO) return null;
  const c = sel => ethCall(curve, sel).then(d => words(d)), t = sel => ethCall(token, sel);
  const [pair, complete, target, raised, rate, unlocked, base, weights, name, symbol] = await Promise.all([
    c(SEL.pairCurrency), c(SEL.complete), c(SEL.targetPairUnits), c(SEL.pairPrincipal), c(SEL.currentRateBps),
    t(SEL.transfersUnlocked), t(SEL.baseTaxBps), t(SEL.packedWeights), t(SEL.name), t(SEL.symbol)]);
  const w = u(words(weights)[0]), done = u(complete[0]) === 1n, pairAddr = toAddr(pair[0]);
  let price = null;
  if (!done) { try { const q = words(await ethCall(curve, SEL.quoteBuyExactIn + word(10n ** 15n))); if (u(q[1]) > 0n) price = Number(u(q[2])) / Number(u(q[1])); } catch (_) { } }
  return { token: token.toLowerCase(), curve, name: str(name), symbol: str(symbol), pair: pairAddr === ZERO ? "ETH" : pairAddr, pairIsEth: pairAddr === ZERO,
    curveComplete: done, graduated: u(words(unlocked)[0]) === 1n, transfersLocked: u(words(unlocked)[0]) !== 1n,
    graduationProgressPercent: done ? 100 : Math.round(Number(u(raised[0])) / Number(u(target[0])) * 10000) / 100,
    raised: units(u(raised[0])), target: units(u(target[0])), taxNowPercent: Number(u(rate[0])) / 100, baseTaxPercent: Number(u(words(base)[0])) / 100,
    taxSplitPercent: { projectTreasury: Number(w & 0xffffn) / 100, holders: Number((w >> 16n) & 0xffffn) / 100, burn: Number((w >> 32n) & 0xffffn) / 100, holdersInPair: Number((w >> 48n) & 0xffffn) / 100 }, taxSplitNote: "taxSplitPercent divides the project's 80% of the tax; the protocol always gets the other 20% (in the pair currency).",
    pricePerToken: price, priceUnit: pairAddr === ZERO ? "ETH" : "pair token" };
}
const compactLaunch = l => l && ({ token: l.tokenAddress, curve: l.curveAddress, name: l.name, symbol: l.symbol, pair: l.pairSymbol, lifecycle: l.lifecycle, graduated: l.graduated,
  createdAt: l.createdAt, launcher: l.launcherAddress, image: ipfs(l.content && l.content.image && l.content.image.uri), link: `${SITE}/token/${l.tokenAddress}` });

// ---------- tools ----------
const CONTEXT = (() => { for (const p of [path.join(__dirname, "..", "context", "vibevibe.md"), path.join(__dirname, "vibevibe.md")]) { try { return fs.readFileSync(p, "utf8"); } catch (_) { } } return ""; })();
const SECTIONS = (() => { const out = {}; for (const part of CONTEXT.split(/\n(?=## \d+\. )/)) { const m = part.match(/^## \d+\. ([^\n]+)/); out[m ? m[1].toLowerCase() : "intro"] = part.trim(); } return out; })();
const TOPIC = { overview: "intro", network: "network", addresses: "addresses (current launchpad = v6)", lifecycle: "how a token works (lifecycle)", tax: "tax and holder rewards",
  contracts: "contract functions (verified on chain)", code: "ready-made code (viem)", api: "data without contracts", rules: "rules for the assistant" };

const tools = [
  { name: "vibevibe_docs", title: "vibe/vibe builder docs",
    description: "Verified facts and copy-paste code for building on vibe/vibe (Robinhood Chain testnet): network settings, contract addresses, token lifecycle (curve, transfer lock, graduation), tax, every contract function, viem code, and the data APIs. Call this first before writing any vibe/vibe code. topic: overview | network | addresses | lifecycle | tax | contracts | code | api | rules | all",
    inputSchema: { type: "object", properties: { topic: { type: "string", enum: ["overview", "network", "addresses", "lifecycle", "tax", "contracts", "code", "api", "rules", "all"], default: "all" } } },
    run: async ({ topic = "all" }) => topic === "all" ? CONTEXT : (SECTIONS[TOPIC[topic]] || CONTEXT) },
  { name: "search_tokens", title: "Search tokens",
    description: "Find vibe/vibe tokens by name or symbol (newest first). Returns token and curve addresses, pair, lifecycle and links.",
    inputSchema: { type: "object", required: ["query"], properties: { query: { type: "string" }, limit: { type: "integer", minimum: 1, maximum: 50, default: 10 } } },
    run: async ({ query, limit = 10 }) => { const j = await getJson(`${API}/v6/launches?limit=${Math.min(50, limit)}&q=${encodeURIComponent(query)}`); return { tokens: (j.data.items || []).map(compactLaunch) }; } },
  { name: "latest_launches", title: "Latest launches",
    description: "The newest tokens launched on vibe/vibe.",
    inputSchema: { type: "object", properties: { limit: { type: "integer", minimum: 1, maximum: 50, default: 10 } } },
    run: async ({ limit = 10 }) => { const j = await getJson(`${API}/v6/launches?limit=${Math.min(50, limit)}`); return { tokens: (j.data.items || []).map(compactLaunch) }; } },
  { name: "get_token", title: "Token details",
    description: "Everything about one token: name, description, image, socials, pair currency, live price, graduation progress, live tax and its split, lifecycle, holder count and links. Give the token address (not the curve).",
    inputSchema: { type: "object", required: ["token"], properties: { token: { type: "string", description: "token address 0x..." } } },
    run: async ({ token }) => {
      if (!isAddr(token)) throw new Error("token must be an address 0x...");
      const [l, apiLaunch, ex] = await Promise.all([live(token), getJson(`${API}/v6/launches/${token.toLowerCase()}`).catch(() => null), getJson(`${EXPLORER}/api/v2/tokens/${token}`).catch(() => null)]);
      if (!l) return { error: "not a vibe/vibe V6 token (the factory has no curve for it). Check the address, or it may be a legacy launch." };
      const a = apiLaunch && apiLaunch.data && apiLaunch.data.launch;
      if (l.pricePerToken == null && l.graduated && a && a.graduation) {   // pool price from the newest Swap (sqrtPriceX96), else the pool's starting price
        try {
          const head = BigInt(await rpc("eth_blockNumber", [])), SWAP = "0x40e9cecb9f5f1f1c5b9c97dec2917b7ee92e57ba5563708daca94dd84ad7112f";
          let sqrt = null;
          for (let i = 0n; i < 8n && sqrt === null; i++) {
            const to = head - i * 5000n, from = to - 4999n;
            const logs = await rpc("eth_getLogs", [{ address: "0x8366a39CC670B4001A1121B8F6A443A643e40951", topics: [SWAP, a.graduation.poolId], fromBlock: "0x" + from.toString(16), toBlock: "0x" + to.toString(16) }]);
            if (logs.length) sqrt = u(words(logs[logs.length - 1].data)[2]);
          }
          if (sqrt === null) sqrt = BigInt(a.graduation.poolInitialSqrtPriceX96);
          const oneInZero = (Number(sqrt) / 2 ** 96) ** 2, tokenIs1 = l.pairIsEth || BigInt(l.pair) < BigInt(token);   // currency0 sorts lower
          l.pricePerToken = tokenIs1 ? 1 / oneInZero : oneInZero; l.priceSource = "pool";
        } catch (_) { }
      }
      return { ...l, description: a && a.content && a.content.description, image: ipfs(a && a.content && a.content.image && a.content.image.uri), socials: a && a.content && a.content.socials,
        lifecycle: a ? a.lifecycle : (l.graduated ? "GRADUATED" : l.curveComplete ? "CURVE_COMPLETE" : "CURVE_TRADING"), launcher: a && a.launcherAddress, createdAt: a && a.createdAt,
        graduation: a && a.graduation, holders: ex ? Number(ex.holders_count || ex.holders || 0) : null, links: links(token) };
    } },
  { name: "get_trades", title: "Recent trades",
    description: "Recent buys and sells of a token (curve and pool), newest first, with amounts and traders. Also returns top holders and trade stats.",
    inputSchema: { type: "object", required: ["token"], properties: { token: { type: "string" }, limit: { type: "integer", minimum: 1, maximum: 50, default: 20 } } },
    run: async ({ token, limit = 20 }) => {
      const j = (await getJson(`${API}/v6/launches/${String(token).toLowerCase()}/market?limit=${Math.min(50, limit)}`)).data;
      return { token, stats: j.stats, trades: (j.trades || []).map(t => ({ at: t.occurredAt, side: t.side, venue: t.venue, trader: t.actorAddress, tokens: units(BigInt(t.tokenAmountUnits || 0)), pair: units(BigInt(t.pairAmountUnits || 0)), tx: t.transactionHash })) };
    } },
  { name: "get_holders", title: "Top holders",
    description: "Top holders of a token with their share of the supply. The curve contract (unsold supply before graduation) is listed separately.",
    inputSchema: { type: "object", required: ["token"], properties: { token: { type: "string" }, limit: { type: "integer", minimum: 1, maximum: 50, default: 20 } } },
    run: async ({ token, limit = 20 }) => {
      if (!isAddr(token)) throw new Error("token must be an address 0x...");
      const [j, curve] = await Promise.all([getJson(`${EXPLORER}/api/v2/tokens/${token}/holders`), curveOf(token).catch(() => null)]);
      const supply = 10n ** 27n, rows = (j.items || []).map(i => ({ address: i.address.hash.toLowerCase(), balance: BigInt(i.value) }));
      // not real holders: the curve (unsold supply), the token itself (holder rewards), the v4 PoolManager (pool liquidity), the burn address
      const pm = "0x8366a39cc670b4001a1121b8f6a443a643e40951", dead = "0x000000000000000000000000000000000000dead";
      const inCurve = rows.find(r => curve && r.address === curve.toLowerCase()), skip = new Set([curve && curve.toLowerCase(), token.toLowerCase(), pm, dead]);
      const sum = a => units(rows.filter(r => r.address === a).reduce((x, r) => x + r.balance, 0n));
      return { token, unsoldInCurve: inCurve ? units(inCurve.balance) : "0", inPool: sum(pm), burned: sum(dead), heldForRewards: sum(token.toLowerCase()), holders: rows.filter(r => !skip.has(r.address)).slice(0, limit).map(r => ({ address: r.address, balance: units(r.balance), percentOfSupply: Math.round(Number(r.balance * 1000000n / supply)) / 10000 })) };
    } },
  { name: "get_price_history", title: "Price history",
    description: "Price candles for a token. interval: 1m 5m 15m 30m 1h 4h 1D 1W.",
    inputSchema: { type: "object", required: ["token"], properties: { token: { type: "string" }, interval: { type: "string", enum: ["1m", "5m", "15m", "30m", "1h", "4h", "1D", "1W"], default: "1h" } } },
    run: async ({ token, interval = "1h" }) => (await getJson(`${API}/v6/launches/${String(token).toLowerCase()}/candles?interval=${encodeURIComponent(interval)}`)).data },
  { name: "get_wallet", title: "Wallet overview",
    description: "What a wallet holds on vibe/vibe, the tokens it launched, and its trader profile (class and level from vibercheck).",
    inputSchema: { type: "object", required: ["wallet"], properties: { wallet: { type: "string" } } },
    run: async ({ wallet }) => {
      if (!isAddr(wallet)) throw new Error("wallet must be an address 0x...");
      const w = wallet.toLowerCase();
      const [pos, launched, vc] = await Promise.all([getJson(`${API}/wallets/${w}/positions?limit=50`).catch(() => null), getJson(`${API}/v6/wallets/${w}/launches?limit=50`).catch(() => null), getJson(`${VIBERCHECK}/api/check?w=${w}`).catch(() => null)]);
      return { wallet: w, positions: pos && pos.data && pos.data.items, launched: launched && launched.data && (launched.data.items || []).map(compactLaunch),
        profile: vc && vc.ok && vc.found ? { class: vc.cls, level: vc.level, rank: vc.rank ? `${vc.rank} of ${vc.total}` : null, badges: vc.badges, guild: vc.guild && vc.guild.name, page: `${VIBERCHECK}/v/${w}` } : null, links: { explorer: `${EXPLORER}/address/${w}`, vibevibe: `${SITE}/portfolio/${w}` } };
    } },
  { name: "quote_trade", title: "Quote a trade",
    description: "Exact quote for buying or selling on a token's bonding curve, including the live tax and fees. side=buy: amount is in the pair currency (ETH for most tokens). side=sell: amount is in tokens. Only works before graduation.",
    inputSchema: { type: "object", required: ["token", "side", "amount"], properties: { token: { type: "string" }, side: { type: "string", enum: ["buy", "sell"] }, amount: { type: "string", description: "decimal amount, e.g. 0.01" } } },
    run: async ({ token, side, amount }) => {
      const l = await live(token); if (!l) throw new Error("not a vibe/vibe V6 token");
      if (l.curveComplete) return { error: "the curve is complete (graduated or graduating); trade on the vibe/vibe page", link: links(token).vibevibe };
      const amt = parseUnits(amount);
      if (side === "buy") { const q = words(await ethCall(l.curve, SEL.quoteBuyExactIn + word(amt))); return { side, pay: units(u(q[2])), payCurrency: l.pair, receiveTokens: units(u(q[1])), pairFee: units(u(q[3])), refund: units(u(q[4])), taxNowPercent: l.taxNowPercent, minReceiveAt5PercentSlippage: units(u(q[1]) * 95n / 100n) }; }
      const q = words(await ethCall(l.curve, SEL.quoteSell + word(amt))); return { side, sellTokens: amount, receive: units(u(q[3])), receiveCurrency: l.pair, pairFee: units(u(q[2])), taxNowPercent: l.taxNowPercent, minReceiveAt5PercentSlippage: units(u(q[3]) * 95n / 100n) };
    } },
  { name: "build_trade_transaction", title: "Prepare a testnet trade",
    description: "Prepares an UNSIGNED testnet transaction to buy (with ETH) or sell a token on its bonding curve, for the user to sign in their own wallet (send {to, data, value} with eth_sendTransaction). Only for ETH-paired tokens before graduation. Never asks for a private key.",
    inputSchema: { type: "object", required: ["token", "side", "amount", "wallet"], properties: { token: { type: "string" }, side: { type: "string", enum: ["buy", "sell"] }, amount: { type: "string", description: "buy: ETH to spend; sell: tokens to sell" }, wallet: { type: "string", description: "the address that signs and receives" }, slippagePercent: { type: "number", default: 5 } } },
    run: async ({ token, side, amount, wallet, slippagePercent = 5 }) => {
      if (!isAddr(wallet)) throw new Error("wallet must be an address 0x...");
      const l = await live(token); if (!l) throw new Error("not a vibe/vibe V6 token");
      if (l.curveComplete) return { error: "curve complete: trade on the vibe/vibe page instead", link: links(token).vibevibe };
      if (side === "buy" && !l.pairIsEth) return { error: "this token is paired with another token, not ETH; buy it on the vibe/vibe page (it routes through the zap router)", link: links(token).vibevibe };
      const amt = parseUnits(amount), keep = BigInt(Math.round((100 - Math.min(50, Math.max(0.1, slippagePercent))) * 100)), deadline = BigInt(Math.floor(Date.now() / 1000) + 600);
      if (side === "buy") {
        const q = words(await ethCall(l.curve, SEL.quoteBuyExactIn + word(amt))), min = u(q[1]) * keep / 10000n;
        return { chainId: CHAIN_ID, to: l.curve, value: "0x" + amt.toString(16), data: SEL.buyExactIn + word(amt) + word(min) + addrWord(wallet) + word(deadline),
          summary: `Buy at least ${units(min)} ${l.symbol} for ${amount} ETH (tax now ${l.taxNowPercent}%, expires in 10 minutes)` };
      }
      const q = words(await ethCall(l.curve, SEL.quoteSell + word(amt))), min = u(q[3]) * keep / 10000n;
      return { chainId: CHAIN_ID, to: l.curve, value: "0x0", data: SEL.sell + word(amt) + word(min) + addrWord(wallet) + word(deadline),
        summary: `Sell ${amount} ${l.symbol} for at least ${units(min)} ${l.pair} (no approve needed, expires in 10 minutes)` };
    } },
  { name: "list_guilds", title: "Guild ranking",
    description: "vibe/vibe guilds ranked by trading volume (from vibercheck.xyz): rank, 24h move, members, volume, volume today and distance to the top 100 line.",
    inputSchema: { type: "object", properties: { sort: { type: "string", enum: ["volume", "members", "referrals", "active"], default: "volume" }, limit: { type: "integer", minimum: 1, maximum: 100, default: 20 } } },
    run: async ({ sort = "volume", limit = 20 }) => { const j = await getJson(`${VIBERCHECK}/api/guilds?sort=${sort}`, 60000); return { total: j.total, guilds: j.guilds.slice(0, limit).map(g => ({ rank: g.rank, rank24hAgo: g.rank_24h, slug: g.slug, name: g.name, members: g.members, volumeEth: g.volume, volumeTodayEth: g.vol_24h, activeToday: g.active_24h, page: `${VIBERCHECK}/g/${g.slug}` })) }; } },
  { name: "get_guild", title: "Guild details",
    description: "One guild by slug: rank, gap to the guild above and to the top 100, volume today, and its most active listed members (from vibercheck.xyz).",
    inputSchema: { type: "object", required: ["slug"], properties: { slug: { type: "string" } } },
    run: async ({ slug }) => {
      const j = await getJson(`${VIBERCHECK}/api/guild?slug=${encodeURIComponent(String(slug).toLowerCase())}`, 60000); if (!j.ok) return { error: "guild not found" };
      const g = j.guild; return { name: g.name, slug: g.slug, rank: g.rank, of: j.total, members: g.members, volumeEth: g.volume, volumeTodayEth: g.vol_24h, gapToAboveEth: g.gap_above, gapToTop100Eth: g.gap_top,
        topMembersThisWeek: j.members.slice().sort((a, b) => b.volume_7d - a.volume_7d).slice(0, 10).map(m => ({ address: m.address, x: m.x, volume7dEth: m.volume_7d, trades7d: m.trades_7d })), page: `${VIBERCHECK}/g/${g.slug}` };
    } },
];

// ---------- MCP (JSON-RPC) ----------
const INSTRUCTIONS = "vibekit: live data and verified facts for building on vibe/vibe (testnet.vibevibe.fun) on Robinhood Chain testnet (chain id 46630). Before writing vibe/vibe code, call vibevibe_docs. Use get_token / get_trades / get_holders to look at real data while building. This is a testnet: tokens have no real value. Never ask users for private keys; build_trade_transaction only prepares unsigned transactions.";
const PROTOCOLS = ["2025-06-18", "2025-03-26", "2024-11-05"];
async function handle(msg) {
  if (Array.isArray(msg)) { const out = (await Promise.all(msg.map(handle))).filter(Boolean); return out.length ? out : null; }
  const { id, method, params = {} } = msg || {};
  const ok = result => id === undefined ? null : { jsonrpc: "2.0", id, result };
  const err = (code, message) => id === undefined ? null : { jsonrpc: "2.0", id, error: { code, message } };
  try {
    if (method === "initialize") return ok({ protocolVersion: PROTOCOLS.includes(params.protocolVersion) ? params.protocolVersion : PROTOCOLS[0], capabilities: { tools: { listChanged: false } },
      serverInfo: { name: "vibekit", title: "vibekit for vibe/vibe", version: VERSION }, instructions: INSTRUCTIONS });
    if (method === "ping") return ok({});
    if (method === "tools/list") return ok({ tools: tools.map(({ run, ...t }) => ({ ...t, annotations: { readOnlyHint: true, openWorldHint: true } })) });
    if (method === "tools/call") {
      const t = tools.find(x => x.name === params.name); if (!t) return err(-32602, "unknown tool " + params.name);
      try {
        const res = await t.run(params.arguments || {});
        const text = typeof res === "string" ? res : JSON.stringify(res, (k, v) => typeof v === "bigint" ? v.toString() : v, 1);
        return ok({ content: [{ type: "text", text }], ...(typeof res === "object" && res && !Array.isArray(res) ? { structuredContent: JSON.parse(text) } : {}) });
      } catch (e) { return ok({ content: [{ type: "text", text: "Error: " + (e.message || e) }], isError: true }); }
    }
    if (method && method.startsWith("notifications/")) return null;
    if (method === "resources/list") return ok({ resources: [] });
    if (method === "prompts/list") return ok({ prompts: [] });
    return err(-32601, "method not found: " + method);
  } catch (e) { return err(-32603, e.message || "internal error"); }
}

module.exports = { handle, tools, live, VERSION };
