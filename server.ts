import express from "express";
import { createServer as createViteServer } from "vite";
import axios from "axios";
import cors from "cors";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // API Route to proxy RSS feeds
  app.get("/api/rss-proxy", async (req, res) => {
    const { url } = req.query;
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: "Missing or invalid URL parameter" });
    }

    try {
      // Fetch the RSS feed server-side
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        timeout: 10000 // 10s timeout
      });
      
      // Return the raw XML/content
      res.send(response.data);
    } catch (error) {
      console.error(`Error fetching RSS feed: ${url}`, error);
      res.status(500).json({ error: "Failed to fetch RSS feed" });
    }
  });

  // API Route to proxy Yahoo Finance
  app.get("/api/finance-proxy", async (req, res) => {
    const { symbol, range = '1mo', interval = '1d' } = req.query;
    if (!symbol || typeof symbol !== 'string') {
      return res.status(400).json({ error: "Missing or invalid symbol parameter" });
    }

    try {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}`;
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        timeout: 10000
      });
      
      res.json(response.data);
    } catch (error) {
      console.error(`Error fetching finance data for: ${symbol}`, error);
      res.status(500).json({ error: "Failed to fetch finance data" });
    }
  });

  // API Health Check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production static file serving (if built)
    app.use(express.static('dist'));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
