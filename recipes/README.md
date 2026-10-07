# Recipes

Copy a prompt into your AI (set up with the vibe/vibe file or the vibekit MCP, see the main README), replace the parts in {CURLY_BRACKETS}, and you get a working app.

## A website for my token

A landing page with live price, graduation progress, trades, holders and a buy button. *(easiest)* Or start from the ready-made [`templates/token-page`](../templates/token-page).

```
Make a website for my vibe/vibe token {TOKEN}. Use the vibekit token-page template as the starting point if you have it. Show the live price, progress to graduation, the current tax, holders, the latest trades and a big "Buy on vibe/vibe" button. Style: {STYLE}. Give me one index.html file I can open by double clicking, and tell me how to put it online for free.
```

## Buy alerts in Discord or Telegram

A bot that posts every buy of your token in your channel, with the buyer and the graduation progress. *(easy)* Or start from the ready-made [`templates/buy-bot`](../templates/buy-bot).

```
Build me a bot that posts a message in my {CHANNEL} every time someone buys my vibe/vibe token {TOKEN}. Use the vibekit buy-bot template if you have it. Show the amount, who bought, and how close the token is to graduation. It should run with just Node.js (no packages to install). Explain step by step how I get the webhook / bot token and how to run it.
```

## A page only holders can open

Visitors connect their wallet; holders see a secret link or message. *(easy)* Or start from the ready-made [`templates/token-gate`](../templates/token-gate).

```
Make a holders-only page for my vibe/vibe token {TOKEN}: visitors connect their wallet (MetaMask or Rabby) on Robinhood Chain testnet, and if they hold at least {AMOUNT} tokens they see this: {SECRET}. Otherwise show how many they have, how many they need, and a button to buy on vibe/vibe. One index.html file.
```

## Top buyers leaderboard

A live ranking of who bought the most of your token this week. *(easy)*

```
Make a web page that ranks the wallets that bought the most of my vibe/vibe token {TOKEN} in the last 7 days, using the CurveBuy events (and pool Swap events if it has graduated). Remember that trades through the zap router have the real wallet as the recipient or the transaction sender. Show rank, wallet, amount bought, and refresh every minute. One index.html file.
```

## A price chart

A candle chart of your token, like on an exchange. *(medium)*

```
Add a price chart of my vibe/vibe token {TOKEN} to my page. Build the candles from the CurveBuy / CurveSell events (price = pair amount / token amount) for the last 24 hours, 15 minute candles, and draw them with a free chart library from a CDN. One index.html file.
```

## A small game for holders

A browser mini game where holding your token unlocks something (a skin, a level, a score boost). *(medium)*

```
Make a small browser game ({GAME_IDEA}) for my vibe/vibe token {TOKEN}. Players can play without a wallet, but if they connect a wallet that holds my token they unlock {PERK}. Keep it in one index.html file with plain JavaScript, no build tools, and make it work on phones.
```

## Tokens about to graduate

A list of tokens closest to graduation, updated live. *(medium)*

```
Make a page that lists the vibe/vibe tokens that are closest to graduation right now, with their progress bar, price and a link to buy. Use the newest launches (LaunchCreated events or the vibe/vibe REST API from a small server) and read each curve's pairPrincipal / targetPairUnits. Explain which parts must run on a server and why.
```

## Explain my token to my community

A clear, honest explanation of how your token works: the curve, the tax split, graduation. *(no code)*

```
Look up my vibe/vibe token {TOKEN} and explain to my community, in simple words, how it works: the bonding curve, why transfers are locked until graduation, how far it is from graduating, the current tax and where the tax goes (treasury, holders, burn). No hype, no price promises. Write it as a short post I can share.
```
