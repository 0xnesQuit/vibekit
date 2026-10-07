const http = require("http"), { spawn } = require("child_process");
const got = [];
http.createServer((req, res) => { let d = ""; req.on("data", c => d += c); req.on("end", () => { got.push(JSON.parse(d).content); console.log("\n--- POSTED ---\n" + JSON.parse(d).content); res.end("ok"); }); }).listen(5299, () => {
  const bot = spawn(process.execPath, [__dirname + "/bot_test.cjs"], { stdio: ["ignore", "inherit", "inherit"] });
  setTimeout(() => { bot.kill(); console.log("\nposts received:", got.length); process.exit(0); }, Number(process.argv[2] || 150000));
});
