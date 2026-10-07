// ============================================================================
//  BUY ALERT BOT (made with vibekit)
//  Posts a message to Discord and/or Telegram every time someone buys (or sells) your vibe/vibe token.
//  Nothing to install: you only need Node.js (https://nodejs.org, the LTS button).
//
//  1. Fill in the settings below and save.
//  2. Open a terminal in this folder and run:   node bot.js
//  3. Leave it running. A "bot is live" message shows up in your channel right away.
//  How to get a Discord webhook or a Telegram bot token: see README.md (2 minutes each).
//  Keep this file to yourself once it has your webhook / bot token in it.
// ============================================================================
const CONFIG = {
  // Your token address (from its vibe/vibe page: testnet.vibevibe.fun/token/0x...)
  token: "PASTE_YOUR_TOKEN_ADDRESS_HERE",

  // Discord: paste a webhook URL (Server settings > Integrations > Webhooks > New webhook > Copy URL). "" = off
  discordWebhook: "",

  // Telegram: bot token from @BotFather and the chat id of your group or channel. "" = off
  telegramBotToken: "",
  telegramChatId: "",

  // What to post
  postBuys: true,
  postSells: false,
  minimumAmount: 0,          // skip trades smaller than this (in ETH, or in the pair token)
  emoji: "🟢",               // repeated by trade size, like 🟢🟢🟢
};
// ======================= no need to edit below this line =======================

const RPC = "https://rpc.testnet.chain.robinhood.com", EXPLORER = "https://explorer.testnet.chain.robinhood.com";
const API = "https://testnet.vibevibe.fun/api/v1/chains/46630";
const FACTORY = "0xe794217880011f9cA6961340eD5c16EC9559Fea0", ZAP = "0x2784448c519d01d3ae257c0aac0b7cdad8acceb1";
const POOL_MANAGER = "0x8366a39CC670B4001A1121B8F6A443A643e40951";
const T = { buy: "0x55867fe9a84ea30ad247ef1bb703eba47fd9af476149002512a2814b1e3d8fb5", sell: "0x3899b2b9ba4dfe77b54ff5e6f921672b2a7563ade468f2a106b25a4b808d60de",
  swap: "0x40e9cecb9f5f1f1c5b9c97dec2917b7ee92e57ba5563708daca94dd84ad7112f" };
const SEL = { curveOf: "0x05adc47e", symbol: "0x95d89b41", pairCurrency: "0x7f1a97f8", complete: "0x522e1177", targetPairUnits: "0x7d05d553", pairPrincipal: "0xa49fd649", transfersUnlocked: "0x167e007c" };

const sleep = ms => new Promise(r => setTimeout(r, ms));
async function rpc(method, params) {
  for (let i = 0; ; i++) {
    try {
      const r = await fetch(RPC, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }) });
      const j = await r.json(); if (j.error) throw new Error(j.error.message); return j.result;
    } catch (e) { if (i >= 4) throw e; await sleep(1500 * (i + 1)); }
  }
}
const call = (to, data) => rpc("eth_call", [{ to, data }, "latest"]);
const words = d => (d || "0x").slice(2).match(/.{64}/g) || [];
const big = w => BigInt("0x" + w), addr = w => "0x" + w.slice(24), topicAddr = t => "0x" + t.slice(26).toLowerCase();
const signed = w => { const v = big(w); return v >= 1n << 255n ? v - (1n << 256n) : v; };
const str = d => { const h = d.slice(2); const n = Number(BigInt("0x" + h.slice(64, 128))); return Buffer.from(h.slice(128, 128 + n * 2), "hex").toString(); };
const amount = v => Number(v < 0n ? -v : v) / 1e18;
const fmt = n => n >= 1e9 ? (n / 1e9).toFixed(2) + "B" : n >= 1e6 ? (n / 1e6).toFixed(2) + "M" : n >= 1e3 ? (n / 1e3).toFixed(2) + "K" : n >= 1 ? n.toFixed(2) : n.toPrecision(3);
const short = a => a.slice(0, 6) + "…" + a.slice(-4);

async function send(text, html) {
  const jobs = [];
  if (CONFIG.discordWebhook) jobs.push(fetch(CONFIG.discordWebhook, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ content: text }) })
    .then(r => { if (!r.ok) console.log("Discord said", r.status, "(check the webhook URL)"); }));
  if (CONFIG.telegramBotToken && CONFIG.telegramChatId) jobs.push(fetch(`https://api.telegram.org/bot${CONFIG.telegramBotToken}/sendMessage`, { method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: CONFIG.telegramChatId, text: html, parse_mode: "HTML", disable_web_page_preview: true }) })
    .then(async r => { if (!r.ok) console.log("Telegram said", r.status, (await r.text()).slice(0, 120), "(check the bot token and chat id, and that the bot is in the group)"); }));
  await Promise.all(jobs.map(p => p.catch(e => console.log("could not post:", e.message))));
}

(async () => {
  if (!/^0x[0-9a-fA-F]{40}$/.test(CONFIG.token)) return console.log("Open bot.js, paste your token address where it says PASTE_YOUR_TOKEN_ADDRESS_HERE, save, and run it again.");
  if (!CONFIG.discordWebhook && !(CONFIG.telegramBotToken && CONFIG.telegramChatId)) return console.log("Add a Discord webhook or a Telegram bot token + chat id in bot.js first (see README.md).");
  const token = CONFIG.token.toLowerCase();
  const curve = addr(words(await call(FACTORY, SEL.curveOf + token.slice(2).padStart(64, "0")))[0]);
  if (/^0x0+$/.test(curve)) return console.log("That address is not a vibe/vibe V6 token. Copy it again from the token's vibe/vibe page.");
  const symbol = str(await call(token, SEL.symbol)), pair = addr(words(await call(curve, SEL.pairCurrency))[0]);
  const pairSymbol = /^0x0+$/.test(pair) ? "ETH" : str(await call(pair, SEL.symbol));
  const graduated = big(words(await call(token, SEL.transfersUnlocked))[0]) === 1n;
  let poolId = null, tokenIs0 = false;
  if (graduated) {   // after graduation trades happen on the Uniswap v4 pool
    const j = await fetch(`${API}/v6/launches/${token}`, { headers: { "user-agent": "vibekit-buy-bot" } }).then(r => r.json());
    poolId = j.data.launch.graduation.poolId; tokenIs0 = false;   // vibe/vibe pools: currency0 = pair (ETH sorts first), currency1 = token
    if (!/^0x0+$/.test(pair) && BigInt(pair) > BigInt(token)) tokenIs0 = true;
  }
  const link = `https://testnet.vibevibe.fun/token/${token}`;
  console.log(`Watching $${symbol} (${graduated ? "pool" : "curve"} trades). Press Ctrl+C to stop.`);
  await send(`✅ Buy bot is live for $${symbol}. New trades will show up here.\n${link}`, `✅ Buy bot is live for <b>$${symbol}</b>. New trades will show up here.\n<a href="${link}">open on vibe/vibe</a>`);

  async function progress() {
    if (graduated) return "graduated ✓";
    const [t, r] = await Promise.all([call(curve, SEL.targetPairUnits), call(curve, SEL.pairPrincipal)]);
    return (Number(big(words(r)[0])) / Number(big(words(t)[0])) * 100).toFixed(1) + "% to graduation";
  }
  async function realTrader(who, recipient, tx) {   // trades from the vibe/vibe site go through the zap router
    if (who !== ZAP) return who; if (recipient && recipient !== ZAP) return recipient;
    try { return (await rpc("eth_getTransactionByHash", [tx])).from; } catch (_) { return who; }
  }
  let last = BigInt(await rpc("eth_blockNumber", []));
  for (;;) {
    await sleep(4000);
    try {
      const head = BigInt(await rpc("eth_blockNumber", [])); if (head <= last) continue;
      const to = head > last + 4999n ? last + 4999n : head;
      const filter = graduated ? { address: POOL_MANAGER, topics: [T.swap, poolId] } : { address: curve, topics: [[T.buy, T.sell]] };
      const logs = await rpc("eth_getLogs", [{ ...filter, fromBlock: "0x" + (last + 1n).toString(16), toBlock: "0x" + to.toString(16) }]);
      last = to;
      for (const l of logs) {
        const w = words(l.data); let side, tokens, paid, who;
        if (graduated) {   // Swap(id, sender, amount0, amount1, ...): amounts from the trader's side
          const t = signed(tokenIs0 ? w[0] : w[1]), p = signed(tokenIs0 ? w[1] : w[0]);
          side = t > 0n ? "buy" : "sell"; tokens = amount(t); paid = amount(p); who = await realTrader(topicAddr(l.topics[2]), null, l.transactionHash);
        } else if (l.topics[0] === T.buy) { side = "buy"; tokens = amount(big(w[1])); paid = amount(big(w[3])); who = await realTrader(topicAddr(l.topics[1]), topicAddr(l.topics[2]), l.transactionHash); }
        else { side = "sell"; tokens = amount(big(w[0])); paid = amount(big(w[3])); who = await realTrader(topicAddr(l.topics[1]), topicAddr(l.topics[2]), l.transactionHash); }
        if ((side === "buy" && !CONFIG.postBuys) || (side === "sell" && !CONFIG.postSells) || paid < CONFIG.minimumAmount) continue;
        const dots = side === "buy" ? (CONFIG.emoji || "🟢").repeat(Math.max(1, Math.min(10, Math.ceil(Math.log10(paid * 1000 + 1) * 2)))) : "🔴";
        const p = await progress().catch(() => "");
        console.log(new Date().toLocaleTimeString(), side.toUpperCase(), fmt(tokens), symbol, "for", fmt(paid), pairSymbol, "by", who);
        await send(`${dots}\n**${side === "buy" ? "New buy" : "Sell"}!** ${fmt(tokens)} $${symbol} for ${fmt(paid)} ${pairSymbol}\nby ${short(who)} · ${p}\n<${EXPLORER}/tx/${l.transactionHash}> · <${link}>`,
          `${dots}\n<b>${side === "buy" ? "New buy" : "Sell"}!</b> ${fmt(tokens)} $${symbol} for ${fmt(paid)} ${pairSymbol}\nby <code>${short(who)}</code> · ${p}\n<a href="${EXPLORER}/tx/${l.transactionHash}">transaction</a> · <a href="${link}">buy on vibe/vibe</a>`);
      }
    } catch (e) { console.log("hiccup, retrying:", e.message); }
  }
})();
