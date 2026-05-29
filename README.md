# 🎵 Spotify Token Server

A lightweight server that provides Spotify anonymous access tokens for **LavaSrc / Lavalink** integration.

Drop-in replacement for Spotify's default token endpoint that **actually works**.

## How It Works

1. Launches headless Chrome via Puppeteer
2. Navigates to `open.spotify.com` (like a real browser)
3. Intercepts the `/api/token` network response
4. Caches the token and serves it at `GET /api/token`
5. Auto-refreshes before expiry

No Spotify credentials needed — uses anonymous tokens.

---

## 🚀 Deploy to Render (Free)

### Step 1: Push to GitHub

Create a new GitHub repo and push this project:

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/spotify-tokener.git
git push -u origin main
```

### Step 2: Deploy on Render

1. Go to [render.com](https://render.com) and sign in
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repo (`spotify-tokener`)
4. Configure:
   - **Name**: `spotify-tokener`
   - **Region**: Pick closest to your Lavalink server
   - **Runtime**: **Docker**
   - **Instance Type**: **Free**
5. Click **"Deploy Web Service"**

> ⏳ First deploy takes ~5 minutes (building Docker image with Chrome)

### Step 3: Get Your URL

After deploy, Render gives you a URL like:
```
https://spotify-tokener-xxxx.onrender.com
```

Test it by visiting:
```
https://spotify-tokener-xxxx.onrender.com/api/token
```

You should see a JSON response with `accessToken`, `clientId`, etc.

### Step 4: Configure LavaSrc

Update your Lavalink `application.yml`:

```yaml
plugins:
  lavasrc:
    sources:
      spotify: true
    spotify:
      clientId: "your_spotify_client_id"
      clientSecret: "your_spotify_client_secret"
      customTokenEndpoint: "https://spotify-tokener-xxxx.onrender.com/api/token"
```

Replace `spotify-tokener-xxxx.onrender.com` with your actual Render URL.

---

## 📡 API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/token` | Returns Spotify anonymous token (LavaSrc-compatible) |
| `GET` | `/health` | Health check with uptime, browser status, cache info |
| `GET` | `/` | Service info |

### Token Response Format

```json
{
  "clientId": "d8a5ed958d274c2e8ee717e6a4b0971d",
  "accessToken": "BQD...long_token_here",
  "accessTokenExpirationTimestampMs": 1234567890000,
  "isAnonymous": true
}
```

---

## 🖥️ Run Locally (for testing)

```bash
# Install dependencies (downloads Chromium automatically)
npm install

# Start the server
node server.js
```

Server starts at `http://localhost:8080`. Test with:
```bash
curl http://localhost:8080/api/token
```

---

## ⚠️ Render Free Tier Notes

- Free instances **sleep after 15 minutes of inactivity**
- This server has a **built-in self-ping** that keeps it awake automatically
- The self-ping uses `RENDER_EXTERNAL_URL` (auto-set by Render)
- First request after a cold start takes ~10-15 seconds (Chrome startup)

---

## 🔧 Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8080` | Server port (Render sets this automatically) |
| `PUPPETEER_EXECUTABLE_PATH` | _(auto)_ | Path to Chrome (set in Dockerfile for Docker) |
| `RENDER_EXTERNAL_URL` | _(auto)_ | Your Render URL (auto-set, enables self-ping) |

---

## License

MIT
