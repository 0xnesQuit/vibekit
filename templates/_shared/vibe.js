// vibe.js: everything a web page needs to talk to vibe/vibe on Robinhood Chain testnet. No install, no build step:
// it loads viem from a CDN. Used by the vibekit templates; you can copy it into any page.
//   import { tokenInfo, recentTrades, watchTrades, topHolders, connectWallet, buyWithEth } from "./vibe.js";
import {
  createPublicClient, createWalletClient, custom, http, parseAbi, formatUnits, parseUnits,
  keccak256, encodeAbiParameters, defineChain,
} from "https://esm.sh/viem@2.57.3";

export const chain = defineChain({
  id: 46630, name: "Robinhood Chain Testnet",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.testnet.chain.robinhood.com"] } },
  blockExplorers: { default: { name: "Explorer", url: "https://explorer.testnet.chain.robinhood.com" } },
  testnet: true,
});
export const ADDR = {
  zap: "0x2784448c519D01d3aE257C0aac0b7cDAd8AccEB1",
  factory: "0xe794217880011f9cA6961340eD5c16EC9559Fea0",
  locker: "0x7771E60708060c43C8562c4544fBd5c365e549c0",
  poolManager: "0x8366a39CC670B4001A1121B8F6A443A643e40951",
  vibevibe: "0xF1f6b050550531226Ee0257FeC4A1E575ff4c341",
};
export const ZERO = "0x0000000000000000000000000000000000000000";
export const EXPLORER = "https://explorer.testnet.chain.robinhood.com";
export const tokenPage = token => `https://testnet.vibevibe.fun/token/${token}`;
export const client = createPublicClient({ chain, transport: http() });

const factoryAbi = parseAbi(["function curveOf(address token) view returns (address)"]);
const lockerAbi = parseAbi(["function poolKeyOf(address token) view returns ((address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks))"]);
export const curveAbi = parseAbi([
  "function pairCurrency() view returns (address)", "function complete() view returns (bool)",
  "function targetPairUnits() view returns (uint256)", "function pairPrincipal() view returns (uint128)",
  "function currentRateBps() view returns (uint256)",
  "function quoteBuyExactIn(uint256 pairIn) view returns (uint256 gross, uint256 net, uint256 cost, uint256 pairFee, uint256 refund)",
  "function quoteSell(uint256 grossTokens) view returns (uint256 net, uint256 proceeds, uint256 pairFee, uint256 pairOut)",
  "function buyExactIn(uint256 maxPairIn, uint256 minNetOut, address recipient, uint256 deadline) payable",
  "function sell(uint256 grossTokens, uint256 minPairOut, address recipient, uint256 deadline)",
  "event CurveBuy(address indexed buyer, address indexed recipient, uint256 grossTokens, uint256 netTokens, uint256 tokenFee, uint256 pairCost, uint256 pairFee, uint256 rateBps)",
  "event CurveSell(address indexed seller, address indexed recipient, uint256 grossTokens, uint256 netTokens, uint256 tokenFee, uint256 pairProceeds, uint256 pairFee)",
]);
export const tokenAbi = parseAbi([
  "function name() view returns (string)", "function symbol() view returns (string)",
  "function balanceOf(address) view returns (uint256)", "function transfersUnlocked() view returns (bool)",
  "function baseTaxBps() view returns (uint256)", "function pendingReward(address) view returns (uint256)",
]);
const pmAbi = parseAbi(["function extsload(bytes32 slot) view returns (bytes32)"]);
const poolAbi = parseAbi(["event Swap(bytes32 indexed id, address indexed sender, int128 amount0, int128 amount1, uint160 sqrtPriceX96, uint128 liquidity, int24 tick, uint24 fee)"]);
const read = (address, abi, functionName, args = []) => client.readContract({ address, abi, functionName, args });

// ---------- numbers ----------
export const num = v => Number(formatUnits(v, 18));
export function fmt(n, d = 2) {
  n = Number(n) || 0; const a = Math.abs(n);
  if (a >= 1e9) return (n / 1e9).toFixed(d) + "B"; if (a >= 1e6) return (n / 1e6).toFixed(d) + "M"; if (a >= 1e3) return (n / 1e3).toFixed(d) + "K";
  if (a >= 1) return n.toFixed(d); if (a === 0) return "0"; return n.toPrecision(3);
}
// tiny prices like 0.00000000175 read better as 0.0₈175
export function fmtPrice(p) {
  if (p == null) return "–"; if (p >= 0.001) return fmt(p, 4);
  const z = Math.floor(-Math.log10(p)), sub = String(z).split("").map(d => "₀₁₂₃₄₅₆₇₈₉"[d]).join("");
  return "0.0" + sub + Math.round(p * 10 ** (z + 3));
}
export const short = a => a.slice(0, 6) + "…" + a.slice(-4);
// Token logos live on IPFS. Public gateways often refuse busy users (HTTP 429), so try several in turn.
// (testnet.vibevibe.fun/media/<cid>.webp only works on vibe/vibe itself: it blocks other sites.)
export const IPFS_GATEWAYS = ["https://ipfs.filebase.io/ipfs/", "https://gateway.pinata.cloud/ipfs/", "https://ipfs.io/ipfs/", "https://dweb.link/ipfs/"];
export function ipfsUrls(uri) {
  const m = /^ipfs:\/\/(.+)$/.exec(uri || "") || /\/ipfs\/([^?#]+)/.exec(uri || "");
  return m ? IPFS_GATEWAYS.map(g => g + m[1]) : uri ? [uri] : [];
}
// <img> that falls back to the next gateway when one fails; onFail runs when none work
export function loadImage(img, uri, onFail) {
  const urls = ipfsUrls(uri); let i = 0;
  if (!urls.length) return onFail && onFail();
  img.onerror = () => { if (++i < urls.length) img.src = urls[i]; else { img.onerror = null; onFail && onFail(); } };
  img.src = urls[0];
}
export const ago = sec => { const s = Date.now() / 1000 - sec; return s < 60 ? Math.max(1, Math.round(s)) + "s ago" : s < 3600 ? Math.round(s / 60) + "m ago" : s < 86400 ? Math.round(s / 3600) + "h ago" : Math.round(s / 86400) + "d ago"; };

// ---------- the token ----------
// name, symbol, curve, pair, graduated?, graduation progress, live tax, price (pair currency per token)
export async function tokenInfo(token) {
  const curve = await read(ADDR.factory, factoryAbi, "curveOf", [token]);
  if (curve === ZERO) throw new Error("This is not a vibe/vibe V6 token. Check the address on its vibe/vibe page.");
  const [name, symbol, unlocked, pair, complete, target, raised, rate] = await Promise.all([
    read(token, tokenAbi, "name"), read(token, tokenAbi, "symbol"), read(token, tokenAbi, "transfersUnlocked"),
    read(curve, curveAbi, "pairCurrency"), read(curve, curveAbi, "complete"), read(curve, curveAbi, "targetPairUnits"),
    read(curve, curveAbi, "pairPrincipal"), read(curve, curveAbi, "currentRateBps")]);
  let price = null, pairSymbol = "ETH";
  if (pair !== ZERO) pairSymbol = await read(pair, tokenAbi, "symbol").catch(() => "PAIR");
  if (!complete) { const [, net, cost] = await read(curve, curveAbi, "quoteBuyExactIn", [10n ** 15n]); if (net > 0n) price = Number(cost) / Number(net); }
  let poolId = null, poolKey = null;
  if (unlocked) {   // graduated: trades happen on the Uniswap v4 pool; its id is the hash of its key
    poolKey = await read(ADDR.locker, lockerAbi, "poolKeyOf", [token]);
    poolId = keccak256(encodeAbiParameters([{ type: "address" }, { type: "address" }, { type: "uint24" }, { type: "int24" }, { type: "address" }],
      [poolKey.currency0, poolKey.currency1, poolKey.fee, poolKey.tickSpacing, poolKey.hooks]));
    // live pool price: Uniswap v4 keeps each pool's state in PoolManager storage (pools mapping at slot 6), sqrtPriceX96 in the low 160 bits
    const slot0 = await read(ADDR.poolManager, pmAbi, "extsload", [keccak256(encodeAbiParameters([{ type: "bytes32" }, { type: "uint256" }], [poolId, 6n]))]);
    const sqrtP = BigInt(slot0) & ((1n << 160n) - 1n), oneInZero = (Number(sqrtP) / 2 ** 96) ** 2;   // currency1 per currency0
    if (sqrtP > 0n) price = poolKey.currency1.toLowerCase() === token.toLowerCase() ? 1 / oneInZero : oneInZero;   // pair per token
  }
  return { token, curve, name, symbol, pair, pairSymbol, pairIsEth: pair === ZERO, graduated: unlocked, complete,
    progress: complete ? 1 : Number(raised) / Number(target), raised: num(raised), target: num(target), taxPercent: Number(rate) / 100, price, poolId, poolKey };
}

// ---------- trades ----------
const isZap = a => a && a.toLowerCase() === ADDR.zap.toLowerCase();
function curveTrade(l) {   // trades made on vibe/vibe go through the zap router: then the real wallet is the recipient (or the tx sender)
  const buy = l.eventName === "CurveBuy", who = buy ? l.args.buyer : l.args.seller;
  return { side: buy ? "buy" : "sell", trader: isZap(who) && !isZap(l.args.recipient) ? l.args.recipient : who, tokens: num(buy ? l.args.netTokens : l.args.grossTokens),
    pair: num(buy ? l.args.pairCost : l.args.pairProceeds), tx: l.transactionHash, block: l.blockNumber };
}
function poolTrade(l, info) {
  const tokenIs0 = info.poolKey.currency0.toLowerCase() === info.token.toLowerCase();
  const t = tokenIs0 ? l.args.amount0 : l.args.amount1, p = tokenIs0 ? l.args.amount1 : l.args.amount0;
  return { side: t > 0n ? "buy" : "sell", trader: l.args.sender, tokens: num(t < 0n ? -t : t), pair: num(p < 0n ? -p : p), tx: l.transactionHash, block: l.blockNumber };
}
async function logsBetween(info, from, to) {
  if (info.graduated) return (await client.getContractEvents({ address: ADDR.poolManager, abi: poolAbi, eventName: "Swap", args: { id: info.poolId }, fromBlock: from, toBlock: to })).map(l => poolTrade(l, info));
  return (await client.getContractEvents({ address: info.curve, abi: curveAbi, fromBlock: from, toBlock: to })).filter(l => l.eventName === "CurveBuy" || l.eventName === "CurveSell").map(curveTrade);
}
const times = new Map();
async function stamp(trades) {   // adds a unix time to each trade (one block lookup per block)
  await Promise.all([...new Set(trades.map(t => t.block))].filter(b => !times.has(b)).map(async b => times.set(b, Number((await client.getBlock({ blockNumber: b })).timestamp))));
  for (const t of trades) t.time = times.get(t.block);
  await Promise.all(trades.filter(t => isZap(t.trader)).map(async t => { try { t.trader = (await client.getTransaction({ hash: t.tx })).from; } catch (_) { } }));
  return trades;
}
// newest trades first; looks back in 5,000-block steps (the RPC's limit) until it has `limit` trades or `maxSteps` steps
export async function recentTrades(info, limit = 20, maxSteps = 12) {
  const head = await client.getBlockNumber(); let out = [], to = head;
  for (let i = 0; i < maxSteps && out.length < limit && to > 0n; i++) {
    const from = to > 4999n ? to - 4999n : 0n;
    out = out.concat((await logsBetween(info, from, to)).reverse()); to = from - 1n;
  }
  return stamp(out.slice(0, limit));
}
// calls onTrade(trade) for every new buy or sell; returns a function that stops watching
export function watchTrades(info, onTrade, everyMs = 4000) {
  let last = null, stop = false;
  (async function loop() {
    while (!stop) {
      try {
        const head = await client.getBlockNumber();
        if (last !== null && head > last) for (const t of await stamp(await logsBetween(info, last + 1n, head > last + 4999n ? last + 4999n : head))) onTrade(t);
        last = last === null ? head : (head > last + 4999n ? last + 4999n : head);
      } catch (_) { }
      await new Promise(r => setTimeout(r, everyMs));
    }
  })();
  return () => { stop = true; };
}

// ---------- holders (from the explorer; the curve itself holds the unsold supply until graduation) ----------
export async function topHolders(info, limit = 10) {
  const j = await fetch(`${EXPLORER}/api/v2/tokens/${info.token}/holders`).then(r => r.json());
  // skip contracts that hold tokens without being holders: the curve (unsold supply), the token itself (holder rewards), the burn address
  const skip = [info.curve, info.token, ADDR.poolManager, "0x000000000000000000000000000000000000dead"].map(a => a.toLowerCase());
  return (j.items || []).filter(i => !skip.includes(i.address.hash.toLowerCase())).slice(0, limit)
    .map(i => ({ address: i.address.hash, balance: num(BigInt(i.value)), percent: num(BigInt(i.value)) / 1e7 }));
}
export async function holderCount(token) {
  const j = await fetch(`${EXPLORER}/api/v2/tokens/${token}`).then(r => r.json()).catch(() => null);
  return j ? Number(j.holders_count || j.holders || 0) : null;
}
export const balanceOf = (token, wallet) => read(token, tokenAbi, "balanceOf", [wallet]).then(num);

// ---------- wallet ----------
// asks MetaMask / Rabby / any browser wallet to connect and switch to Robinhood Chain testnet
export async function connectWallet() {
  if (!window.ethereum) throw new Error("No wallet found. Install MetaMask or Rabby, then reload this page.");
  const [account] = await window.ethereum.request({ method: "eth_requestAccounts" });
  try { await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: "0xb626" }] }); }
  catch (e) {
    if (e.code !== 4902 && !/unrecognized|not added|unknown chain/i.test(e.message || "")) throw e;
    await window.ethereum.request({ method: "wallet_addEthereumChain", params: [{ chainId: "0xb626", chainName: "Robinhood Chain Testnet",
      nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 }, rpcUrls: ["https://rpc.testnet.chain.robinhood.com"], blockExplorerUrls: [EXPLORER] }] });
  }
  return { account, wallet: createWalletClient({ account, chain, transport: custom(window.ethereum) }) };
}
// what a buy of `eth` (a string like "0.01") would give, with the live tax
export async function quoteBuy(info, eth) {
  const [, net, cost, fee, refund] = await read(info.curve, curveAbi, "quoteBuyExactIn", [parseUnits(String(eth), 18)]);
  return { tokens: num(net), pay: num(cost), fee: num(fee), refund: num(refund), taxPercent: info.taxPercent };
}
// buys on the curve with ETH (ETH-paired tokens, before graduation). Returns the transaction hash.
export async function buyWithEth({ wallet, account }, info, eth, slippagePercent = 5) {
  if (!info.pairIsEth) throw new Error(`This token is bought with ${info.pairSymbol}, not ETH. Use the vibe/vibe page.`);
  if (info.complete) throw new Error("The curve is complete. Trade on the vibe/vibe page.");
  const amount = parseUnits(String(eth), 18);
  const [, net] = await read(info.curve, curveAbi, "quoteBuyExactIn", [amount]);
  const min = net * BigInt(Math.round((100 - slippagePercent) * 100)) / 10000n, deadline = BigInt(Math.floor(Date.now() / 1000) + 300);
  const hash = await wallet.writeContract({ address: info.curve, abi: curveAbi, functionName: "buyExactIn", args: [amount, min, account, deadline], value: amount });
  await client.waitForTransactionReceipt({ hash });
  return hash;
}
// sells tokens on the curve (no approve needed). Returns the transaction hash.
export async function sellTokens({ wallet, account }, info, tokens, slippagePercent = 5) {
  if (info.complete) throw new Error("The curve is complete. Trade on the vibe/vibe page.");
  const amount = parseUnits(String(tokens), 18);
  const [, , , out] = await read(info.curve, curveAbi, "quoteSell", [amount]);
  const min = out * BigInt(Math.round((100 - slippagePercent) * 100)) / 10000n, deadline = BigInt(Math.floor(Date.now() / 1000) + 300);
  const hash = await wallet.writeContract({ address: info.curve, abi: curveAbi, functionName: "sell", args: [amount, min, account, deadline] });
  await client.waitForTransactionReceipt({ hash });
  return hash;
}
