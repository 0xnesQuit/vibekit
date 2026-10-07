import { createPublicClient, http, parseAbi, keccak256, encodeAbiParameters } from "viem";
const c = createPublicClient({ chain: { id: 46630, name: "rh", nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 }, rpcUrls: { default: { http: ["https://rpc.testnet.chain.robinhood.com"] } } }, transport: http() });
const PM = "0x8366a39CC670B4001A1121B8F6A443A643e40951", id = "0x27fd86a24387bdac8d789641f1b774cadeb7af2bad4039135eebcc4bc8d8ec78";
const slot = keccak256(encodeAbiParameters([{ type: "bytes32" }, { type: "uint256" }], [id, 6n]));   // StateLibrary: pools mapping at slot 6
const v = await c.readContract({ address: PM, abi: parseAbi(["function extsload(bytes32 slot) view returns (bytes32)"]), functionName: "extsload", args: [slot] });
const sqrtP = BigInt(v) & ((1n << 160n) - 1n);
const p1per0 = (Number(sqrtP) / 2 ** 96) ** 2;   // currency1 (token) per currency0 (ETH)
console.log("sqrtPriceX96", sqrtP.toString(), "ETH per token:", 1 / p1per0);
const head = await c.getBlockNumber();
const logs = await c.getContractEvents({ address: PM, abi: parseAbi(["event Swap(bytes32 indexed id, address indexed sender, int128 amount0, int128 amount1, uint160 sqrtPriceX96, uint128 liquidity, int24 tick, uint24 fee)"]), args: { id }, fromBlock: head - 30000n > 0n ? head - 30000n : 0n, toBlock: head }).catch(e => (console.log(e.shortMessage), []));
const last = logs.at(-1); if (last) console.log("last swap sqrtPriceX96", last.args.sqrtPriceX96.toString());
