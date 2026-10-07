// Calls the vibe/vibe V6 contracts on Robinhood Chain testnet with the ABI found in the vibe/vibe web app, to check every
// function and event the toolkit will document actually works on chain.
import { createPublicClient, http, parseAbi, toEventSelector, formatEther } from "viem";
const chain = { id: 46630, name: "Robinhood Chain Testnet", nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 }, rpcUrls: { default: { http: ["https://rpc.testnet.chain.robinhood.com"] } } };
const c = createPublicClient({ chain, transport: http() });
const FACTORY = "0xe794217880011f9cA6961340eD5c16EC9559Fea0";
const factory = parseAbi(["function launchCount() view returns (uint256)", "function tokenOfLaunch(uint256) view returns (address)", "function curveOf(address token) view returns (address)",
  "function isV6Token(address) view returns (bool)", "function isV6Curve(address) view returns (bool)", "function creationFee() view returns (uint256)", "function launchEnabled() view returns (bool)",
  "function zap() view returns (address)", "function hook() view returns (address)", "function locker() view returns (address)", "function poolManager() view returns (address)"]);
const curve = parseAbi(["function quoteBuyExactIn(uint256 pairIn) view returns (uint256 gross, uint256 net, uint256 cost, uint256 pairFee, uint256 refund)",
  "function quoteSell(uint256 grossTokens) view returns (uint256 net, uint256 proceeds, uint256 pairFee, uint256 pairOut)", "function sold() view returns (uint120)",
  "function targetPairUnits() view returns (uint256)", "function complete() view returns (bool)", "function pairCurrency() view returns (address)", "function currentRateBps() view returns (uint256)",
  "function createdAt() view returns (uint256)", "function launcher() view returns (address)", "function projectTreasury() view returns (address)", "function pairPrincipal() view returns (uint128)"]);
const token = parseAbi(["function name() view returns (string)", "function symbol() view returns (string)", "function totalSupply() view returns (uint256)", "function transfersUnlocked() view returns (bool)",
  "function balanceOf(address) view returns (uint256)", "function pendingReward(address account) view returns (uint256)", "function baseTaxBps() view returns (uint256)", "function packedWeights() view returns (uint64)", "function poolId() view returns (bytes32)"]);
const r = (address, abi, functionName, args = []) => c.readContract({ address, abi, functionName, args }).then(v => v, e => "ERR " + e.shortMessage);
const out = {};
out.launchCount = await r(FACTORY, factory, "launchCount");
for (const f of ["creationFee", "launchEnabled", "zap", "hook", "locker", "poolManager"]) out[f] = await r(FACTORY, factory, f);
const tok = process.argv[2] || await r(FACTORY, factory, "tokenOfLaunch", [out.launchCount - 1n]);
const cur = await r(FACTORY, factory, "curveOf", [tok]);
out.latest = { tok, cur, isV6Token: await r(FACTORY, factory, "isV6Token", [tok]), isV6Curve: await r(FACTORY, factory, "isV6Curve", [cur]) };
for (const f of ["sold", "targetPairUnits", "complete", "pairCurrency", "currentRateBps", "createdAt", "launcher", "projectTreasury", "pairPrincipal"]) out.latest[f] = await r(cur, curve, f);
out.latest.quoteBuy001 = await r(cur, curve, "quoteBuyExactIn", [10n ** 16n]);
out.latest.quoteSell1M = await r(cur, curve, "quoteSell", [10n ** 24n]);
for (const f of ["name", "symbol", "totalSupply", "transfersUnlocked", "baseTaxBps", "packedWeights", "poolId"]) out.latest[f] = await r(tok, token, f);
out.vquest = { transfersUnlocked: await r("0xdD708a2f0728C17C00D22cE6D4785F9Eb982e25C", token, "transfersUnlocked"), curve: await r(FACTORY, factory, "curveOf", ["0xdD708a2f0728C17C00D22cE6D4785F9Eb982e25C"]) };
out.topics = {
  LaunchCreated: toEventSelector("event LaunchCreated(uint256 indexed launchId, address indexed launcher, address indexed token, address curve, string name, string symbol, string metadataURI, address pairCurrency, uint16 taxBps, uint64 packedWeights, address projectTreasury, uint256 targetPairUnits, uint256 netPersonal, uint256 giftNetTotal, bytes32 giftRoot, uint256 giftCount)"),
  known: "0xa7e8032bfd07a9fbcde50eabe91eb2901faee6dbddd9cced579491d9b07ef5c8",
};
console.log(JSON.stringify(out, (k, v) => typeof v === "bigint" ? v.toString() : v, 1));
