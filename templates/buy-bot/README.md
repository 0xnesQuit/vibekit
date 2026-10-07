# Buy alert bot

Posts a message in your Discord or Telegram every time someone buys your vibe/vibe token:

> 🟢🟢 **New buy!** 2.44M $NVDG for 0.0043 ETH
> by 0x87bd…2645 · 5.8% to graduation

Works before graduation (curve trades) and after (pool trades). Nothing to install except Node.js.

## 1. Install Node.js (once)

Go to [nodejs.org](https://nodejs.org), click the big **LTS** button, install it like any program.

## 2. Get a place to post

**Discord (easiest)**
1. In your Discord server: **Server Settings → Integrations → Webhooks → New Webhook**.
2. Pick the channel, click **Copy Webhook URL**.

**Telegram**
1. Open Telegram, search **@BotFather**, send `/newbot`, follow the two questions. It gives you a **bot token** like `123456:ABC-...`.
2. Add your new bot to your group (or channel, as an admin).
3. Send any message in the group, then open `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates` in your browser.
   Find `"chat":{"id":-100...` and copy that number (with the minus sign). That's your **chat id**.

You can use both at once.

## 3. Fill in `bot.js`

Open `bot.js` in any text editor (Notepad works) and fill in the top part:

```js
token: "0x...your token address...",       // from testnet.vibevibe.fun/token/0x...
discordWebhook: "https://discord.com/api/webhooks/...",
telegramBotToken: "123456:ABC-...",
telegramChatId: "-100...",
```

Save the file.

## 4. Run it

Open a terminal in this folder:
- **Windows:** open the folder, click the address bar, type `cmd`, press Enter.
- **Mac:** right click the folder → **New Terminal at Folder**.

Then type:

```
node bot.js
```

A "✅ Buy bot is live" message appears in your channel. Leave the window open; every new buy is posted within a few seconds.
Stop it with `Ctrl + C`.

## Keep it running 24/7 (optional)

The bot runs as long as that window is open. To keep it running without your computer, put the folder on any small
server or a free Node host (Railway, Render, a Raspberry Pi...) and run `node bot.js` there.

## Change it with AI

This folder has an `AGENTS.md` / `CLAUDE.md` file that teaches ChatGPT / Codex / Claude / Cursor how vibe/vibe works.
Open the folder in your AI tool and ask things like:

- "Also post sells, but only bigger than 0.05 ETH"
- "Add the buyer's vibercheck level to the message"
- "Post a daily summary at 20:00 with the number of buys and holders"

**Keep `bot.js` private** once it has your webhook or bot token: anyone with them can post in your channel.
