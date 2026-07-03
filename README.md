<div align="center">
  <h1>🎵 Spotify Token Server for Lavalink</h1>
  <p><strong>The ultimate, zero-config solution to bypass Spotify's token restrictions.</strong></p>
  <p>Keep your music bots playing without interruptions. Seamlessly integrates with <a href="https://github.com/topi314/LavaSrc">LavaSrc</a> and <a href="https://github.com/lavalink-devs/Lavalink">Lavalink</a>.</p>
</div>

---

## ✨ Features

- **Anonymous Access:** No need for personal Spotify credentials or premium accounts.
- **Auto-Caching & Refresh:** Automatically handles token rotation in the background so your music never stops.
- **Seamless Integration:** Built specifically to act as a `customTokenEndpoint` for the [LavaSrc](https://github.com/topi314/LavaSrc) plugin.
- **Deploy Anywhere:** Ready for instant deployment in any Docker environment.

---

## 🛠️ How It Works

Behind the scenes, this server uses headless Chrome (via Puppeteer) to act like a real browser navigating to Spotify. It intercepts the network traffic, snags the fresh anonymous access token, caches it, and serves it directly to [LavaSrc](https://github.com/topi314/LavaSrc) via a fast API.

---

## 🚀 Getting Started

The absolute easiest way to run this is via our pre-built Docker image. 

Create a `compose.yml` file on your server:

```yaml
services:
  spotify-tokener:
    image: ghcr.io/viperxd/spotify-tokener:latest
    container_name: spotify-tokener
    restart: unless-stopped
    ports:
      - "8080:8080"
```
Then start it up:
```bash
docker compose up -d
```

---

## 🎧 Lavalink Configuration

Once your server is running, just tell [LavaSrc](https://github.com/topi314/LavaSrc) where to find it. Add your URL to your [Lavalink](https://github.com/lavalink-devs/Lavalink) `application.yml`:

```yaml
plugins:
  lavasrc:
    sources:
      spotify: true
    spotify:
      clientId: "your_spotify_client_id"
      clientSecret: "your_spotify_client_secret"
      
      # Put your new token server URL here!
      preferPartnerApi: true # (This must be true to use a custom token endpoint)
      customTokenEndpoint: "http://your-server-ip:8080/api/token" 
```

---

## 📡 API Reference

| Method | Endpoint | Description |
|--------|------|-------------|
| `GET` | `/api/token` | Returns the Spotify anonymous token JSON (LavaSrc-compatible). |
| `GET` | `/health` | Server health check, uptime, and cache expiration info. |
| `GET` | `/` | Basic service info. |

---

## 🖥️ Manual Installation (For Developers)

Want to run it from source?

```bash
# Install dependencies
npm install

# Start the server
node server.js

# Your endpoint is now live at: http://localhost:8080/api/token
```
