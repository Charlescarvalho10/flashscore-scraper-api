import express from 'express';
import { chromium } from 'playwright';

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/jogos', async (req, res) => {
  try {
    const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();

    await page.goto('https://www.flashscore.com/', { timeout: 60000 });

    await page.waitForSelector('.event__match', { timeout: 15000 });

    const jogos = await page.$$eval('.event__match', (matches) => {
      const dataHoje = new Date().toISOString().split('T')[0]; // yyyy-mm-dd

      const resultados = matches.map(match => {
        const liga = match.closest('.event__header')?.querySelector('.event__title')?.textContent?.trim() || "Desconhecida";
        const timeA = match.querySelector('.event__participant--home')?.textContent?.trim() || "Time A";
        const timeB = match.querySelector('.event__participant--away')?.textContent?.trim() || "Time B";
        const hora = match.querySelector('.event__time')?.textContent?.trim() || "";

        return {
          data: dataHoje,
          hora,
          liga,
          timeA,
          timeB,
          probabilidades: {
            ambasMarcam: Math.random().toFixed(2),
            over15: Math.random().toFixed(2),
            over35: Math.random().toFixed(2),
            escanteios5Mais: Math.random().toFixed(2),
          }
        };
      });

      return resultados.slice(0, 10); // limitar a 10 jogos
    });

    await browser.close();

    res.json({
      status: 'ok',
      atualizado: new Date().toISOString(),
      jogos
    });

  } catch (error) {
    console.error('Erro no /jogos:', error.message);
    res.status(500).json({ erro: 'Erro ao coletar dados dos jogos' });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
