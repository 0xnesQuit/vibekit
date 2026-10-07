import { createPublicClient, http, parseAbi } from "viem";
const c = createPublicClient({ chain: { id: 46630, name: "rh", nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 }, rpcUrls: { default: { http: ["https://rpc.testnet.chain.robinhood.com"] } } }, transport: http() });
const TOK = "0xdD708a2f0728C17C00D22cE6D4785F9Eb982e25C", CUR = "0xD640e16e8ad8D85b948a1a06A26Aab7d07a2069A", HOLDER = "0x19298c37FDcBEb0a7619e9D1CF6058d932ee74FC";
const abi = parseAbi(["function pendingReward(address account) view returns (uint256)", "function pendingPairReward(address account) view returns (uint256)", "function balanceOf(address) view returns (uint256)",
  "function allowance(address,address) view returns (uint256)", "function curve() view returns (address)", "function factory() view returns (address)", "function pairCurrency() view returns (address)",
  "function projectTreasury() view returns (address)", "function giftReserved() view returns (uint256)", "function token() view returns (address)", "function hook() view returns (address)",
  "function poolKeyOf(address token) view returns ((address currency0,address currency1,uint24 fee,int24 tickSpacing,address hooks))"]);
const r = (a, f, args = []) => c.readContract({ address: a, abi, functionName: f, args }).then(v => v, e => "ERR " + (e.shortMessage || "").slice(0, 60));
const out = {};
for (const [name, addr] of [["token", TOK], ["curve", CUR]]) for (const f of ["pendingReward", "pendingPairReward", "balanceOf"]) out[name + "." + f] = await r(addr, f, [HOLDER]);
for (const f of ["curve", "factory", "pairCurrency", "projectTreasury", "token", "hook"]) { out["token." + f] = await r(TOK, f); out["curve." + f] = await r(CUR, f); }
out["token.allowance(holder,curve)"] = await r(TOK, "allowance", [HOLDER, CUR]);
const ZAP = "0x2784448c519D01d3aE257C0aac0b7cDAd8AccEB1";
out["zap.poolKeyOf(VQUEST)"] = await r(ZAP, "poolKeyOf", [TOK]);
out["zap.poolKeyOf(graduated?)"] = "see below";
console.log(JSON.stringify(out, (k, v) => typeof v === "bigint" ? v.toString() : v, 1));
