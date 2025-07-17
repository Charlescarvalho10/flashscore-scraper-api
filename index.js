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
    const titulo = await page.title();

    // MOCK de jogos para funcionar no n8n
    const jogos = [
      {
        liga: "Brasileirão",
        timeA: "Palmeiras",
        timeB: "Flamengo",
        probabilidades: {
          ambasMarcam: 0.73,
          over25: 0.66
        }
      },
      {
        liga: "Premier League",
        timeA: "Chelsea",
        timeB: "Liverpool",
        probabilidades: {
          ambasMarcam: 0.59,
          over25: 0.72
        }
      }
    ];

    await browser.close();

    res.json({
      status: 'ok',
      hora: new Date().toLocaleTimeString(),
      titulo,
      jogos // <- aqui está o array que o n8n precisa
    });
  } catch (error) {
    console.error('Erro ao acessar /jogos:', error);
    res.status(500).json({ error: 'Erro ao coletar dados' });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
