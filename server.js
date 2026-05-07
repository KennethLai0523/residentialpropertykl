const express = require("express");
const { chromium } = require("playwright-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");

chromium.use(StealthPlugin());

const app = express();
app.use(express.json({ limit: "1mb" }));

app.post("/scrape", async (req, res) => {
  const { url } = req.body || {};

  if (!url) {
    return res.status(400).json({ error: "Missing URL" });
  }

  let browser;

  try {
    browser = await chromium.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-blink-features=AutomationControlled"
      ]
    });

    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
      viewport: { width: 1366, height: 768 },
      locale: "en-US",
      timezoneId: "Asia/Kuala_Lumpur"
    });

    const page = await context.newPage();

    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 60000
    });

    await page.waitForTimeout(8000);

    const text = await page.evaluate(() => document.body.innerText || "");

    return res.json({
      text,
      length: text.length,
      preview: text.slice(0, 500)
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  } finally {
    if (browser) await browser.close();
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Scraper running on port ${PORT}`);
});