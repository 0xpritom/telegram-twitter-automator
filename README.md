# Telegram to X Automator

**Telegram to X Automator** is a Chrome/Edge extension that automatically opens X (Twitter) links from Telegram Web and interacts with them using AI-generated comments and likes. It leverages the Groq API for fast and context-aware AI comments.

## Features

- **Automated Interaction**: Automatically open X links posted in Telegram.
- **AI-Powered Comments**: Uses Groq API to generate smart, relevant comments on X posts.
- **Action Modes**: Choose whether to **Like Only**, **Comment Only**, or do **Both (Like & Comment)**.
- **Adjustable Wait Time**: Configure how long the extension waits before performing actions.
- **Easy Toggle**: Quickly enable or disable the bot via the extension popup.

## Installation (Unpacked Extension)

Since this extension is not published on the Chrome Web Store, you need to install it manually as an "unpacked" extension.

1. **Clone or Download** this repository to your local machine.
2. Open your Chromium-based browser (Chrome, Edge, Brave, etc.).
3. Navigate to the extensions page:
   - Chrome: `chrome://extensions/`
   - Edge: `edge://extensions/`
4. Enable **Developer mode** (usually a toggle in the top right corner).
5. Click on **Load unpacked** and select the `telegram-twitter-automator` folder you downloaded.

## Configuration & Setup

1. Click on the extension icon in your browser toolbar to open the popup.
2. **Groq API Key**: You need a free Groq API key to generate comments.
   - Go to [Groq Console](https://console.groq.com/) and create an API key.
   - Paste the API key into the "Groq API Key" field in the extension popup.
3. **Action Mode**: Select your preferred interaction method (Like, Comment, or Both).
4. **Wait Time**: Set the delay (in seconds) before the extension interacts with a post. This helps mimic human behavior.
5. Click **Save Settings**.
6. **Enable the Bot**: Toggle the switch at the top of the popup to turn the bot **On**.

## How It Works

1. Make sure you are logged into **Telegram Web** (`web.telegram.org`) and **X/Twitter** (`x.com` or `twitter.com`).
2. When the bot is active, it continuously monitors your open Telegram Web tabs for new X links.
3. When an X link appears, it automatically opens it in a new tab.
4. On the X page, the extension waits for the configured time, generates an AI comment (if enabled) via Groq, likes the post (if enabled), and submits the comment.

## Permissions Required

- `storage`: To save your configuration and API key locally.
- `tabs` & `scripting`: To interact with Telegram Web and X/Twitter pages.
- `host_permissions`: Access to `telegram.org`, `twitter.com`, `x.com`, and the `api.groq.com`.

## Disclaimer

Use this automation tool responsibly and in accordance with X (Twitter) and Telegram's Terms of Service. Automated interactions can lead to account restrictions if abused.
