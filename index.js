const express = require("express");
const { chromium } = require("playwright");

const app = express();
const port = process.env.PORT || 3000;

app.get("/jogos", async (req, res) => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto("https://www.flashscore.com", { timeout: 60000 });

    // Exemplo de scraping (ajuste conforme necessidade real)
    const jogos = await page.evaluate(() => {
        return Array.from(document.querySelectorAll(".event__match"))
            .map(el => ({
                id: el.getAttribute("id"),
                time: el.querySelector(".event__time")?.textContent,
                home: el.querySelector(".event__participant--home")?.textContent,
                away: el.querySelector(".event__participant--away")?.textContent,
                score: el.querySelector(".event__scores")?.textContent,
            }));
    });

    await browser.close();
    res.json({ jogos });
});

app.get("/", (req, res) => {
    res.send("API do Flashscore Scraper está online!");
});

app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});