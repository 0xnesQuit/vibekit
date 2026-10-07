# Holders-only page

Visitors connect their wallet. If they hold enough of your token, they see the members part
(an invite link, a secret page, a download, a thank you...). If not, it shows how many they need and where to buy.
One file, no install.

## 1. Set it up

1. Open `index.html` in any text editor.
2. Replace `PASTE_YOUR_TOKEN_ADDRESS_HERE` with your token address (from `testnet.vibevibe.fun/token/0x...`).
3. Set `minimum`: how many tokens a wallet needs.
4. Write what holders see in `members`. Plain text works; links and images work too (it's HTML).
5. Save, double click `index.html` to try it with your wallet.

**Want to use the wallet button (you need it here)?** Wallet extensions don't work on files opened from your computer
until you allow it. Pick one:
- Quick: open `chrome://extensions`, click **Details** under MetaMask (or Rabby), turn on **Allow access to file URLs**,
  reload the page.
- Or put the page online (below) and open the link. Everything works there.

## 2. Put it online (free)

Same as any web page: drag the folder onto [app.netlify.com/drop](https://app.netlify.com/drop), or use GitHub Pages / Vercel.

## Good to know

- The members part is inside the file, so someone who reads the page source can see it. Great for perks and fun on
  testnet; for real secrets you need a server that checks the wallet (ask your AI: "make the members part come from a
  server that checks the balance").
- Before graduation tokens can't be sent between wallets, only bought and sold. The page tells visitors to buy on
  vibe/vibe.

## Change it with AI

Open the folder in ChatGPT / Codex / Claude / Cursor (the `AGENTS.md` file teaches them vibe/vibe) and ask:

- "Give holders of 10M+ a gold badge and a different message"
- "Let holders download a file"
- "Show a leaderboard of the top 10 holders under the gate"
