const express = require('express');
const { chromium } = require('playwright');

const app = express();
const PORT = process.env.PORT || 3000;

async function buscarUltimos5Jogos(time, page) {
  try {
    await page.goto('https://www.flashscore.com/', { timeout: 60000 });
    await page.waitForSelector('input[type="search"]', { timeout: 15000 });

    await page.fill('input[type="search"]', time);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(2000);

    const teamLink = await page.$('a[href*="/team/"]');
    if (!teamLink) throw new Error('Time não encontrado');

    await teamLink.click();
    await page.waitForSelector('.tabs__text--default', { timeout: 15000 });

    const resultados = [];

    // Tentar acessar a aba "Resultados"
    const btnResultados = await page.$('a[href*="results/"]');
    if (btnResultados) {
      await btnResultados.click();
      await page.waitForTimeout(2000);
    }

    const partidas = await page.$$('.event__match--static');
    for (let i = 0; i < Math.min(5, partidas.length); i++) {
      const golsA = await partidas[i].$eval('.event__score--home', el => parseInt(el.textContent.trim()));
      const golsB = await partidas[i].$eval('.event__score--away', el => parseInt(el.textContent.trim()));
      const cartoes = Math.floor(Math.random() * 7); // Placeholder até ter fonte real
      const escanteios = Math.floor(Math.random() * 12); // Placeholder até ter fonte real

      resultados.push({ golsA, golsB, escanteios, cartoes });
    }

    return resultados;
  } catch (err) {
    console.error(`Erro ao buscar últimos 5 jogos do time ${time}:`, err.message);
    return [];
  }
}

function calcularProbabilidades(jogos) {
  if (!jogos.length) return {
    ambasMarcam: 0,
    over15: 0,
    over35: 0,
    escanteios5Mais: 0,
    mediaGols: 0,
    mediaCartoes: 0
  };

  const ambas = jogos.filter(j => j.golsA > 0 && j.golsB > 0).length;
  const over15 = jogos.filter(j => j.golsA + j.golsB > 1.5).length;
  const over35 = jogos.filter(j => j.golsA + j.golsB > 3.5).length;
  const escanteios = jogos.filter(j => j.escanteios >= 5).length;
  const mediaGols = jogos.reduce((s, j) => s + j.golsA + j.golsB, 0) / jogos.length;
  const mediaCartoes = jogos.reduce((s, j) => s + j.cartoes, 0) / jogos.length;

  return {
    ambasMarcam: (ambas / jogos.length).toFixed(2),
    over15: (over15 / jogos.length).toFixed(2),
    over35: (over35 / jogos.length).toFixed(2),
    escanteios5Mais: (escanteios / jogos.length).toFixed(2),
    mediaGols: mediaGols.toFixed(2),
    mediaCartoes: mediaCartoes.toFixed(2)
  };
}

app.get('/jogos', async (req, res) => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();

  try {
    await page.goto('https://www.flashscore.com/', { timeout: 60000 });
    await page.waitForSelector('.event__match', { timeout: 15000 });

    const jogos = await page.$$eval('.event__match', (matches) => {
      const dataHoje = new Date().toISOString().split('T')[0];
      const jogosDia = [];

      for (const match of matches.slice(0, 10)) {
        const liga = match.closest('.event__header')?.querySelector('.event__title')?.textContent?.trim() || "Desconhecida";
        const timeA = match.querySelector('.event__participant--home')?.textContent?.trim() || "Time A";
        const timeB = match.querySelector('.event__participant--away')?.textContent?.trim() || "Time B";
        const hora = match.querySelector('.event__time')?.textContent?.trim() || "";

        jogosDia.push({ data: dataHoje, hora, liga, timeA, timeB });
      }

      return jogosDia;
    });

    for (const jogo of jogos) {
      const pageTimeA = await browser.newPage();
      const pageTimeB = await browser.newPage();

      const ultimosA = await buscarUltimos5Jogos(jogo.timeA, pageTimeA);
      const ultimosB = await buscarUltimos5Jogos(jogo.timeB, pageTimeB);

      await pageTimeA.close();
      await pageTimeB.close();

      const probA = calcularProbabilidades(ultimosA);
      const probB = calcularProbabilidades(ultimosB);

      jogo.probabilidades = {
        ambasMarcam: ((+probA.ambasMarcam + +probB.ambasMarcam) / 2).toFixed(2),
        over15: ((+probA.over15 + +probB.over15) / 2).toFixed(2),
        over35: ((+probA.over35 + +probB.over35) / 2).toFixed(2),
        escanteios5Mais: ((+probA.escanteios5Mais + +probB.escanteios5Mais) / 2).toFixed(2),
        mediaGols: ((+probA.mediaGols + +probB.mediaGols) / 2).toFixed(2),
        mediaCartoes: ((+probA.mediaCartoes + +probB.mediaCartoes) / 2).toFixed(2)
      };
    }

    res.json({
      status: 'ok',
      atualizado: new Date().toISOString(),
      jogos
    });

  } catch (e) {
    console.error('Erro geral:', e.message);
    res.status(500).json({ erro: 'Erro ao coletar os jogos' });
  } finally {
    await browser.close();
  }
});

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
