const express = require("express");
const puppeteer = require("puppeteer");

// ─── Config ──────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 8080;
const SPOTIFY_URL = "https://open.spotify.com";
const SPOTIFY_TOKEN_URL = `${SPOTIFY_URL}/api/token`;
const SELF_PING_INTERVAL = 14 * 60 * 1000; // 14 minutes — keeps Render free tier alive
const TOKEN_REFRESH_BUFFER = 5 * 60 * 1000; // Refresh 5 min before expiry

// ─── State ───────────────────────────────────────────────────────────────────
let browser = null;
let cachedToken = null;
let cachedTokenExpiry = 0;
let isRefreshing = false;

// ─── Browser Management ─────────────────────────────────────────────────────
async function launchBrowser() {
  if (browser) {
    try {
      await browser.close();
    } catch (_) {
      /* ignore */
    }
  }

  console.log("[browser] Launching headless Chrome...");
  const launchOptions = {
    headless: "new",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--disable-extensions",
      "--disable-background-networking",
      "--disable-default-apps",
      "--disable-sync",
      "--disable-translate",
      "--no-first-run",
      "--single-process",
    ],
  };

  // Use system Chromium when set (Docker/Render)
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    launchOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
  }

  browser = await puppeteer.launch(launchOptions);
  browser.on("disconnected", () => {
    console.warn("[browser] Chrome disconnected, will relaunch on next request");
    browser = null;
  });

  console.log("[browser] Chrome launched successfully");
  return browser;
}

async function ensureBrowser() {
  if (!browser || !browser.connected) {
    await launchBrowser();
  }
  return browser;
}

// ─── Token Fetching ─────────────────────────────────────────────────────────
async function fetchSpotifyToken() {
  const b = await ensureBrowser();
  const page = await b.newPage();

  try {
    // Set a mobile user agent (same as the original Go project)
    await page.setUserAgent(
      "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) " +
        "AppleWebKit/537.36 (KHTML, like Gecko) " +
        "Chrome/125.0.0.0 Mobile Safari/537.36"
    );

    // Enable request interception to capture the token response
    await page.setRequestInterception(true);

    return await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Token fetch timed out after 30 seconds"));
      }, 30000);

      // Listen for the token API response
      page.on("response", async (response) => {
        const url = response.url();
        if (!url.startsWith(SPOTIFY_TOKEN_URL)) return;

        try {
          clearTimeout(timeout);
          const body = await response.text();
          const json = JSON.parse(body);

          // Validate the response has the expected fields
          if (!json.accessToken || !json.accessTokenExpirationTimestampMs) {
            reject(new Error("Invalid token response from Spotify"));
            return;
          }

          console.log(
            `[token] Got token, expires in ${Math.round(
              (json.accessTokenExpirationTimestampMs - Date.now()) / 1000 / 60
            )} minutes`
          );

          resolve(json);
        } catch (err) {
          reject(new Error(`Failed to parse token response: ${err.message}`));
        }
      });

      // Allow all requests to pass through
      page.on("request", (req) => {
        req.continue();
      });

      // Navigate to Spotify — this triggers the token fetch
      page.goto(SPOTIFY_URL, { waitUntil: "domcontentloaded" }).catch(reject);
    });
  } finally {
    try {
      await page.close();
    } catch (_) {
      /* ignore */
    }
  }
}

async function getToken() {
  // Return cached token if still valid
  if (cachedToken && Date.now() < cachedTokenExpiry) {
    console.log("[token] Returning cached token");
    return cachedToken;
  }

  // Prevent concurrent refreshes
  if (isRefreshing) {
    console.log("[token] Already refreshing, waiting...");
    await new Promise((r) => setTimeout(r, 2000));
    if (cachedToken && Date.now() < cachedTokenExpiry) {
      return cachedToken;
    }
  }

  isRefreshing = true;
  try {
    console.log("[token] Fetching fresh token from Spotify...");
    const token = await fetchSpotifyToken();

    // Cache the token, refresh 5 min before it actually expires
    cachedToken = token;
    cachedTokenExpiry =
      token.accessTokenExpirationTimestampMs - TOKEN_REFRESH_BUFFER;

    return token;
  } finally {
    isRefreshing = false;
  }
}

// ─── Express Server ─────────────────────────────────────────────────────────
const app = express();

// CORS — allow access from anywhere
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

// GET /api/token — the main endpoint LavaSrc calls
app.get("/api/token", async (req, res) => {
  try {
    const token = await getToken();
    res.json(token);
  } catch (err) {
    console.error("[error] Failed to get token:", err.message);

    // Invalidate cache on error so next request retries
    cachedToken = null;
    cachedTokenExpiry = 0;

    res.status(500).json({
      error: "Failed to fetch Spotify token",
      message: err.message,
    });
  }
});

// GET /health — health check for Render
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    uptime: Math.round(process.uptime()),
    browserConnected: browser?.connected ?? false,
    tokenCached: cachedToken !== null,
    tokenExpiresIn: cachedToken
      ? Math.round((cachedTokenExpiry - Date.now()) / 1000)
      : null,
  });
});

// GET / — info page
app.get("/", (req, res) => {
  res.json({
    service: "spotify-tokener",
    version: "1.0.0",
    endpoints: {
      token: "/api/token",
      health: "/health",
    },
    usage:
      'Set customTokenEndpoint in your LavaSrc config to "https://your-app.onrender.com/api/token"',
  });
});

// ─── Self-Ping (keeps Render free tier alive) ────────────────────────────────
function startSelfPing() {
  if (!process.env.RENDER_EXTERNAL_URL) return; // Only on Render

  const url = `${process.env.RENDER_EXTERNAL_URL}/health`;
  console.log(`[ping] Self-ping enabled every 14 min → ${url}`);

  setInterval(async () => {
    try {
      await fetch(url);
      console.log("[ping] Self-ping OK");
    } catch (err) {
      console.warn("[ping] Self-ping failed:", err.message);
    }
  }, SELF_PING_INTERVAL);
}

// ─── Startup ────────────────────────────────────────────────────────────────
async function start() {
  console.log("╔══════════════════════════════════════════╗");
  console.log("║       Spotify Token Server v1.0.0        ║");
  console.log("║   For LavaSrc / Lavalink Integration     ║");
  console.log("╚══════════════════════════════════════════╝");

  // Pre-launch browser
  await launchBrowser();

  // Pre-fetch first token so it's cached immediately
  try {
    await getToken();
    console.log("[startup] Initial token cached successfully");
  } catch (err) {
    console.warn("[startup] Initial token fetch failed (will retry on first request):", err.message);
  }

  app.listen(PORT, () => {
    console.log(`[server] Listening on port ${PORT}`);
    console.log(`[server] Token endpoint: http://localhost:${PORT}/api/token`);
    startSelfPing();
  });
}

// ─── Graceful Shutdown ──────────────────────────────────────────────────────
async function shutdown(signal) {
  console.log(`\n[shutdown] Received ${signal}, closing...`);
  if (browser) {
    try {
      await browser.close();
    } catch (_) {
      /* ignore */
    }
  }
  process.exit(0);
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

// Start the server
start().catch((err) => {
  console.error("[fatal]", err);
  process.exit(1);
});
