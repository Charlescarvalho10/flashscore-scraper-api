import express from 'express';
import { chromium } from 'playwright';

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/jogos', async (req, res) => {
  try {
    const browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox']
    });

    const page = await browser.newPage();
    await page.goto('https://www.flashscore.com', { timeout: 60000 });

    // Exemplo de scraping básico
    const data = await page.evaluate(() => {
      return {
        status: 'ok',
        hora: new Date().toLocaleTimeString(),
        titulo: document.title
      };
    });

    await browser.close();
    res.json(data);
  } catch (error) {
    console.error('Erro ao acessar /jogos:', error);
    res.status(500).json({ error: 'Erro ao coletar dados' });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
