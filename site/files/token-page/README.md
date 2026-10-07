# Token page

A good looking page for your vibe/vibe token, live from the chain:
price, progress to graduation, current tax, holders, live trades, top holders, and a buy box.
One file, no install.

## 1. Add your token

1. Open `index.html` in any text editor (Notepad, TextEdit, VS Code...).
2. Near the top, replace `PASTE_YOUR_TOKEN_ADDRESS_HERE` with your token address.
   You find it in the address bar on your token's vibe/vibe page: `testnet.vibevibe.fun/token/`**`0x...`**
3. Optional: fill in `title`, `tagline`, `image` (a link to your logo) and your `links` (X, Telegram, Discord, website),
   and pick a color with `accent`.
4. Save.

## 2. Look at it

Double click `index.html`. It opens in your browser and loads everything from Robinhood Chain.

## 3. Put it online (free)

Any of these work, pick one:

- **Netlify Drop**: go to [app.netlify.com/drop](https://app.netlify.com/drop) and drag this folder onto the page. You get a link
  in seconds (make a free account to keep it).
- **GitHub Pages**: create a repository, upload `index.html`, then Settings → Pages → Deploy from branch.
- **Vercel**: [vercel.com/new](https://vercel.com/new) → upload the folder.

## Change it with AI

This folder has an `AGENTS.md` / `CLAUDE.md` file that teaches your AI tool how vibe/vibe works. Open the folder in
ChatGPT / Codex / Claude / Cursor and ask, for example:

- "Make the design look like a retro arcade"
- "Add a chart of the price over the last day"
- "Show the 10 biggest buyers of the week"
- "Add a section explaining how the tax is split"

The buy box only appears for tokens paired with ETH, before graduation. It uses the visitor's own wallet
(MetaMask, Rabby...) on Robinhood Chain testnet.
