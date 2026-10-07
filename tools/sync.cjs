// Copies context/vibevibe.md to every place an AI coding tool looks for project instructions, in the repo root and in
// each template, so whatever assistant someone uses (Codex, Claude, Cursor, Gemini, Copilot, Windsurf...) knows vibe/vibe.
// Run after editing context/vibevibe.md:  node tools/sync.cjs
const fs = require("fs"), path = require("path");
const ROOT = path.join(__dirname, "..");
const ctx = fs.readFileSync(path.join(ROOT, "context", "vibevibe.md"), "utf8");
const note = "<!-- generated from context/vibevibe.md by tools/sync.cjs, edit that file instead -->\n";
// AGENTS.md is read by Codex, Cursor, GitHub Copilot, Windsurf, Gemini CLI (when configured) and many others.
// The small pointer files cover tools that look for their own file name.
const files = {
  "AGENTS.md": note + ctx,
  "CLAUDE.md": "@AGENTS.md\n",                                         // Claude Code imports AGENTS.md
  "GEMINI.md": "@./AGENTS.md\n",                                       // Gemini CLI imports AGENTS.md
  ".github/copilot-instructions.md": note + ctx,                       // GitHub Copilot (older versions)
  ".cursor/rules/vibevibe.mdc": "---\ndescription: vibe/vibe (Robinhood Chain testnet) facts and code\nalwaysApply: true\n---\n" + ctx,
  ".windsurf/rules/vibevibe.md": note + ctx,
  ".clinerules/vibevibe.md": note + ctx,                               // Cline (VS Code extension, often used with DeepSeek)
  ".roo/rules/vibevibe.md": note + ctx,                                // Roo Code
};
const TPL = path.join(ROOT, "templates");
const targets = [ROOT, ...fs.readdirSync(TPL).filter(t => !t.startsWith("_")).map(t => path.join(TPL, t)).filter(p => fs.statSync(p).isDirectory())];
// web templates are ONE file (index.html) so they work by double click:
// templates/_src/<name>.html with the shared vibe.js inlined  ->  templates/<name>/index.html
const vibe = fs.readFileSync(path.join(TPL, "_shared", "vibe.js"), "utf8").replace(/^export (const|async function|function) /gm, "$1 ");
for (const f of fs.readdirSync(path.join(TPL, "_src")).filter(f => f.endsWith(".html"))) {
  const dir = path.join(TPL, f.replace(/\.html$/, "")); fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "index.html"), fs.readFileSync(path.join(TPL, "_src", f), "utf8").replace("/*VIBE_JS*/", () => "// ---- vibe.js (from vibekit templates/_shared) ----\n" + vibe));
  if (!targets.includes(dir)) targets.push(dir);
}
for (const dir of targets) for (const [rel, body] of Object.entries(files)) {
  const f = path.join(dir, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, body);
}
// the npm package (vibevibekit): the same helpers for Node and bundlers, with viem from npm instead of a CDN
fs.mkdirSync(path.join(ROOT, "sdk"), { recursive: true });
fs.writeFileSync(path.join(ROOT, "sdk", "index.mjs"), "// generated from templates/_shared/vibe.js by tools/sync.cjs, edit that file instead\n" +
  fs.readFileSync(path.join(TPL, "_shared", "vibe.js"), "utf8").replace('"https://esm.sh/viem@2.57.3"', '"viem"'));
// the hosted MCP server bundles the same file
fs.copyFileSync(path.join(ROOT, "context", "vibevibe.md"), path.join(ROOT, "mcp", "vibevibe.md"));
console.log(`synced into ${targets.length} folders`);

// recipes/README.md from recipes/recipes.json
const recipes = JSON.parse(fs.readFileSync(path.join(ROOT, "recipes", "recipes.json"), "utf8"));
fs.writeFileSync(path.join(ROOT, "recipes", "README.md"), "# Recipes\n\nCopy a prompt into your AI (set up with the vibe/vibe file or the vibekit MCP, see the main README), replace the parts in {CURLY_BRACKETS}, and you get a working app.\n\n" +
  recipes.map(r => `## ${r.title}\n\n${r.get} *(${r.level})*${r.template ? ` Or start from the ready-made [\`templates/${r.template}\`](../templates/${r.template}).` : ""}\n\n\`\`\`\n${r.prompt}\n\`\`\`\n`).join("\n"));

// site/files: what vibercheck.xyz/build serves for downloads
const FILES = path.join(ROOT, "site", "files");
fs.rmSync(FILES, { recursive: true, force: true });
const put = (rel, from) => { const f = path.join(FILES, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.copyFileSync(from, f); };
put("vibevibe.md", path.join(ROOT, "context", "vibevibe.md"));
put("recipes.json", path.join(ROOT, "recipes", "recipes.json"));
for (const t of ["token-page", "token-gate", "buy-bot"]) for (const f of ["index.html", "bot.js", "README.md", "AGENTS.md", "CLAUDE.md", "GEMINI.md"]) {
  const src = path.join(TPL, t, f); if (fs.existsSync(src)) put(`${t}/${f}`, src);
}
console.log("site files ready");
