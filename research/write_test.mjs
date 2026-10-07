// Real testnet trades with a throwaway wallet, to prove the documented buy/sell code and the MCP's unsigned
// transactions work end to end:  node research/write_test.mjs [token]   (needs ~0.01 test ETH in research/.testwallet)
import fs from "fs";
import { createPublicClient, createWalletClient, http, parseAbi, parseEther, formatUnits, defineChain } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import mcp from "../mcp/core.cjs";
const chain = defineChain({ id: 46630, name: "Robinhood Chain Testnet", nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 }, rpcUrls: { default: { http: ["https://rpc.testnet.chain.robinhood.com"] } } });
const account = privateKeyToAccount(fs.readFileSync(new URL("./.testwallet", import.meta.url), "utf8").trim());
const client = createPublicClient({ chain, transport: http() }), wallet = createWalletClient({ account, chain, transport: http() });
const TOKEN = process.argv[2] || "0x4A84161B6Bc6De966b36BFDEaA3b5c3d161cb73b";
const curveAbi = parseAbi(["function quoteBuyExactIn(uint256 pairIn) view returns (uint256 gross, uint256 net, uint256 cost, uint256 pairFee, uint256 refund)",
  "function quoteSell(uint256 grossTokens) view returns (uint256 net, uint256 proceeds, uint256 pairFee, uint256 pairOut)",
  "function buyExactIn(uint256 maxPairIn, uint256 minNetOut, address recipient, uint256 deadline) payable",
  "function sell(uint256 grossTokens, uint256 minPairOut, address recipient, uint256 deadline)", "function complete() view returns (bool)"]);
const tokenAbi = parseAbi(["function balanceOf(address) view returns (uint256)"]);
const curve = await client.readContract({ address: "0xe794217880011f9cA6961340eD5c16EC9559Fea0", abi: parseAbi(["function curveOf(address) view returns (address)"]), functionName: "curveOf", args: [TOKEN] });
const bal = () => client.readContract({ address: TOKEN, abi: tokenAbi, functionName: "balanceOf", args: [account.address] });
console.log("wallet", account.address, "ETH", formatUnits(await client.getBalance({ address: account.address }), 18), "curve", curve);

// 1. buy with the code from context/vibevibe.md section 6
const ethIn = parseEther("0.002");
const [, net] = await client.readContract({ address: curve, abi: curveAbi, functionName: "quoteBuyExactIn", args: [ethIn] });
let hash = await wallet.writeContract({ address: curve, abi: curveAbi, functionName: "buyExactIn", args: [ethIn, net * 95n / 100n, account.address, BigInt(Math.floor(Date.now() / 1000) + 300)], value: ethIn });
let rc = await client.waitForTransactionReceipt({ hash }); const b1 = await bal();
console.log("1 buyExactIn:", rc.status, hash, "tokens now", formatUnits(b1, 18), "(quoted", formatUnits(net, 18) + ")");

// 2. MCP build_trade_transaction (buy), signed here like a wallet would
const r = await mcp.handle({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "build_trade_transaction", arguments: { token: TOKEN, side: "buy", amount: "0.001", wallet: account.address } } });
const tx = r.result.structuredContent; console.log("2 MCP says:", tx.summary);
hash = await wallet.sendTransaction({ to: tx.to, data: tx.data, value: BigInt(tx.value) });
rc = await client.waitForTransactionReceipt({ hash }); const b2 = await bal();
console.log("  sent:", rc.status, hash, "tokens now", formatUnits(b2, 18));

// 3. sell half on the curve, no approve
const half = b2 / 2n;
const [, , , out] = await client.readContract({ address: curve, abi: curveAbi, functionName: "quoteSell", args: [half] });
hash = await wallet.writeContract({ address: curve, abi: curveAbi, functionName: "sell", args: [half, out * 95n / 100n, account.address, BigInt(Math.floor(Date.now() / 1000) + 300)] });
rc = await client.waitForTransactionReceipt({ hash });
console.log("3 sell (no approve):", rc.status, hash, "tokens now", formatUnits(await bal(), 18), "ETH", formatUnits(await client.getBalance({ address: account.address }), 18));
