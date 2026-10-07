// Downloads the starter folder from the live /build page like a user would (headless Chrome).
const path = require("path"), fs = require("fs");
const { launch } = require("../../vibequest/scripts/cdp.js");
const DIR = process.argv[2];
(async () => {
  const b = await launch(9391), p = await b.open("about:blank");
  await p.send("Browser.setDownloadBehavior", { behavior: "allow", downloadPath: DIR }).catch(() => {});
  await p.send("Page.setDownloadBehavior", { behavior: "allow", downloadPath: DIR }).catch(() => {});
  await p.send("Page.enable"); await p.send("Page.navigate", { url: "https://vibercheck.xyz/build#ai" });
  await new Promise(r => setTimeout(r, 4000));
  await p.eval(`document.getElementById("tok").value = "0x4A84161B6Bc6De966b36BFDEaA3b5c3d161cb73b"; useToken(document.getElementById("tok").value)`);
  await new Promise(r => setTimeout(r, 4000));
  await p.eval(`document.querySelector('[data-tab="Claude Code"]').click(); document.getElementById("starterzip").click()`);
  for (let i = 0; i < 20 && !fs.readdirSync(DIR).some(f => f.endsWith(".zip")); i++) await new Promise(r => setTimeout(r, 500));
  console.log(fs.readdirSync(DIR)); b.close(); process.exit(0);
})();
