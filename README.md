# 🎵 Spotify Token Server

A Node.js port of [**topi314/spotify-tokener**](https://github.com/topi314/spotify-tokener) — provides Spotify anonymous access tokens for **LavaSrc / Lavalink** integration.

> **Credits:** Originally created by [topi314](https://github.com/topi314) in Go. This is a Node.js reimplementation for easier deployment on platforms like Railway.  
> Original repository: [github.com/topi314/spotify-tokener](https://github.com/topi314/spotify-tokener) • Licensed under [Apache-2.0](https://github.com/topi314/spotify-tokener/blob/master/LICENSE)

---

## How It Works

1. Launches headless Chrome via Puppeteer
2. Navigates to `open.spotify.com` (like a real browser)
3. Intercepts the `/api/token` network response
4. Caches the token and serves it at `GET /api/token`
5. Auto-refreshes before expiry

No Spotify credentials needed — uses anonymous tokens.

---

## 🚀 Deploy to Railway

1. Push this repo to GitHub
2. Go to [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub Repo**
3. Select your repo — Railway auto-detects the `Dockerfile`
4. After deploy: **Settings** → **Networking** → **Generate Domain**
5. Use your domain in LavaSrc config

---

## 📡 API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/token` | Returns Spotify anonymous token (LavaSrc-compatible) |
| `GET` | `/health` | Health check with uptime & cache info |
| `GET` | `/` | Service info |

---

## LavaSrc Config

```yaml
plugins:
  lavasrc:
    sources:
      spotify: true
    spotify:
      clientId: "your_spotify_client_id"
      clientSecret: "your_spotify_client_secret"
      preferPartnerApi: true # to use customTokenEndpoint it should be true
      customTokenEndpoint: "https://your-app.up.railway.app/api/token"
```

---

## 🖥️ Run Locally

```bash
npm install
node server.js
# → http://localhost:8080/api/token
```

---

## Credits & License

This project is a Node.js reimplementation inspired by:

- **[topi314/spotify-tokener](https://github.com/topi314/spotify-tokener)** by [topi314](https://github.com/topi314) — Original Go implementation
- Licensed under [Apache License 2.0](https://github.com/topi314/spotify-tokener/blob/master/LICENSE)

All credit for the concept, approach, and original implementation goes to **topi314**.
