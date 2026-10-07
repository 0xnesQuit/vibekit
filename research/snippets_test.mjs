// Runs the snippets from context/vibevibe.md section 6 (read side) against the live chain.
import { createPublicClient, http, parseAbi, formatUnits, defineChain } from "viem";
const robinhoodTestnet = defineChain({ id: 46630, name: "Robinhood Chain Testnet", nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.testnet.chain.robinhood.com"] } }, testnet: true });
const client = createPublicClient({ chain: robinhoodTestnet, transport: http() });
const FACTORY = "0xe794217880011f9cA6961340eD5c16EC9559Fea0";
const factoryAbi = parseAbi(["function curveOf(address token) view returns (address)"]);
const curveAbi = parseAbi([
  "function pairCurrency() view returns (address)", "function complete() view returns (bool)",
  "function targetPairUnits() view returns (uint256)", "function pairPrincipal() view returns (uint128)",
  "function currentRateBps() view returns (uint256)",
  "function quoteBuyExactIn(uint256 pairIn) view returns (uint256 gross, uint256 net, uint256 cost, uint256 pairFee, uint256 refund)",
  "event CurveBuy(address indexed buyer, address indexed recipient, uint256 grossTokens, uint256 netTokens, uint256 tokenFee, uint256 pairCost, uint256 pairFee, uint256 rateBps)",
  "event CurveSell(address indexed seller, address indexed recipient, uint256 grossTokens, uint256 netTokens, uint256 tokenFee, uint256 pairProceeds, uint256 pairFee)"]);
const tokenAbi = parseAbi(["function name() view returns (string)", "function symbol() view returns (string)", "function transfersUnlocked() view returns (bool)"]);
async function tokenInfo(token) {
  const curve = await client.readContract({ address: FACTORY, abi: factoryAbi, functionName: "curveOf", args: [token] });
  const r = (address, abi, functionName, args = []) => client.readContract({ address, abi, functionName, args });
  const [name, symbol, unlocked, pair, complete, target, raised, taxBps] = await Promise.all([
    r(token, tokenAbi, "name"), r(token, tokenAbi, "symbol"), r(token, tokenAbi, "transfersUnlocked"),
    r(curve, curveAbi, "pairCurrency"), r(curve, curveAbi, "complete"), r(curve, curveAbi, "targetPairUnits"),
    r(curve, curveAbi, "pairPrincipal"), r(curve, curveAbi, "currentRateBps")]);
  let price = null;
  if (!complete) { const [, net, cost] = await r(curve, curveAbi, "quoteBuyExactIn", [10n ** 15n]); if (net > 0n) price = Number(cost) / Number(net); }
  return { name, symbol, curve, pairIsEth: pair === "0x0000000000000000000000000000000000000000", graduated: unlocked, progress: complete ? 1 : Number(raised) / Number(target), taxPercent: Number(taxBps) / 100, price };
}
for (const t of ["0xdD708a2f0728C17C00D22cE6D4785F9Eb982e25C", "0x92b6cadbc8149189efd5e4cc8e54129ba55a7a6a", "0x4A84161B6Bc6De966b36BFDEaA3b5c3d161cb73b"]) console.log(await tokenInfo(t));
const info = await tokenInfo("0x4A84161B6Bc6De966b36BFDEaA3b5c3d161cb73b"), head = await client.getBlockNumber();
const logs = await client.getContractEvents({ address: info.curve, abi: curveAbi, fromBlock: head - 4999n, toBlock: head });
console.log("events in last 5000 blocks:", logs.length, logs.slice(0, 2).map(l => [l.eventName, formatUnits(l.args.netTokens ?? l.args.grossTokens, 18)]));
const h = await fetch("https://explorer.testnet.chain.robinhood.com/api/v2/tokens/0xdD708a2f0728C17C00D22cE6D4785F9Eb982e25C/holders").then(r => r.json());
console.log("holders page:", h.items.length, h.items.slice(0, 2).map(i => [i.address.hash, formatUnits(BigInt(i.value), 18)]));
