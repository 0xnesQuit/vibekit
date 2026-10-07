import { createPublicClient, http, parseAbi } from "viem";
const c = createPublicClient({ chain: { id: 46630, name: "rh", nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 }, rpcUrls: { default: { http: ["https://rpc.testnet.chain.robinhood.com"] } } }, transport: http() });
const TOK = "0x92b6cadbc8149189efd5e4cc8e54129ba55a7a6a", CUR = "0x7e66196503ba6f5987808266007ce570bc8adcdd";
const abi = parseAbi(["function poolKeyOf(address token) view returns ((address currency0,address currency1,uint24 fee,int24 tickSpacing,address hooks))", "function transfersUnlocked() view returns (bool)",
  "function complete() view returns (bool)", "function poolId() view returns (bytes32)", "function symbol() view returns (string)", "function pairCurrency() view returns (address)"]);
const r = (a, f, args = []) => c.readContract({ address: a, abi, functionName: f, args }).then(v => v, e => "ERR " + (e.shortMessage || "").slice(0, 50));
const A = { zap: "0x2784448c519D01d3aE257C0aac0b7cDAd8AccEB1", hook: "0xA5E27E3E54739162fe52C2C48E55B6dd6572e8EC", locker: "0x7771E60708060c43C8562c4544fBd5c365e549c0", factory: "0xe794217880011f9cA6961340eD5c16EC9559Fea0", pairPolicy: "0x48CFA6c8F3591C6F385652CADf71F310afB2cc84" };
const out = { symbol: await r(TOK, "symbol"), transfersUnlocked: await r(TOK, "transfersUnlocked"), complete: await r(CUR, "complete"), tokenPoolId: await r(TOK, "poolId"), pair: await r(TOK, "pairCurrency") };
for (const [n, a] of Object.entries(A)) out["poolKeyOf@" + n] = await r(a, "poolKeyOf", [TOK]);
const api = await fetch("https://testnet.vibevibe.fun/api/v1/chains/46630/v6/launches/" + TOK, { headers: { "user-agent": "vibekit-research" } }).then(r => r.json());
out.api = { lifecycle: api.data.launch.lifecycle, graduation: api.data.launch.graduation };
console.log(JSON.stringify(out, (k, v) => typeof v === "bigint" ? v.toString() : v, 1));
