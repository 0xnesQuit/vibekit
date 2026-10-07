import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
const client = new Client({ name: "stdio-test", version: "1.0.0" });
await client.connect(new StdioClientTransport({ command: process.execPath, args: ["mcp/stdio.cjs"] }));
const { tools } = await client.listTools();
const r = await client.callTool({ name: "quote_trade", arguments: { token: "0x4A84161B6Bc6De966b36BFDEaA3b5c3d161cb73b", side: "buy", amount: "0.01" } });
console.log("stdio ok:", tools.length, "tools; quote:", r.structuredContent.receiveTokens, "tokens");
await client.close();
