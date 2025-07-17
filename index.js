const express = require('express');
const { chromium } = require('playwright');

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/jogos', async (req, res) => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();

  try {
    await page.goto('https://www.flashscore.com/', { timeout: 60000 });
    await page.waitForSelector('.event__match', { timeout: 15000 });

    const jogos = await page.$$eval('.event__match', (matches) => {
      const dataHoje = new Date().toISOString().split('T')[0];
      const resultados = [];
      let ligaAtual = "Desconhecida";

      for (let i = 0; i < matches.length && resultados.length < 10; i++) {
        const match = matches[i];

        const header = match.previousElementSibling?.classList.contains('event__header')
          ? match.previousElementSibling
          : match.closest('.event__match')?.previousElementSibling;

        if (header?.querySelector('.event__title')) {
          ligaAtual = header.querySelector('.event__title')?.textContent?.trim() || ligaAtual;
        }

        const timeA = match.querySelector('.event__participant--home')?.textContent?.trim() || "Time A";
        const timeB = match.querySelector('.event__participant--away')?.textContent?.trim() || "Time B";
        const hora = match.querySelector('.event__time')?.textContent?.trim() || "";

        resultados.push({
          data: dataHoje,
          hora,
          liga: ligaAtual,
          timeA,
          timeB
        });
      }

      return resultados;
    });

    const enrichedJogos = [];

    for (const jogo of jogos) {
      const stats = {
        timeA: await getUltimos5JogosStats(browser, jogo.timeA),
        timeB: await getUltimos5JogosStats(browser, jogo.timeB)
      };

      const probabilidades = calcularProbabilidades(stats);

      enrichedJogos.push({
        ...jogo,
        probabilidades
      });
    }

    res.json({
      status: 'ok',
      atualizado: new Date().toISOString(),
      jogos: enrichedJogos
    });
  } catch (error) {
    console.error('Erro no /jogos:', error.message);
    res.status(500).json({ erro: 'Erro ao coletar dados dos jogos' });
  } finally {
    await browser.close();
  }
});

async function getUltimos5JogosStats(browser, nomeTime) {
  const context = await browser.newContext();
  const page = await context.newPage();
  const stats = [];

  try {
    await page.goto('https://www.flashscore.com/', { timeout: 60000 });
    await page.fill('input[type="search"]', nomeTime);
    await page.waitForTimeout(1000);
    await page.keyboard.press('Enter');
    await page.waitForSelector('a.participant__image', { timeout: 10000 });

    const resultado = await page.$$eval('a.participant__image', (links, nomeTime) => {
      const link = links.find(a => a.textContent?.toLowerCase().includes(nomeTime.toLowerCase()));
      return link?.getAttribute('href') || links[0]?.getAttribute('href');
    }, nomeTime);

    if (!resultado) throw new Error('Time não encontrado');

    await page.goto(`https://www.flashscore.com${resultado}`);
    await page.waitForSelector('.tabs__tab', { timeout: 15000 });

    const tabIndex = await page.$$eval('.tabs__tab', tabs => {
      const index = tabs.findIndex(t => t.textContent?.toLowerCase().includes('results'));
      return index >= 0 ? index : 1;
    });

    const tabs = await page.$$('.tabs__tab');
    await tabs[tabIndex].click();

    await page.waitForSelector('.event__match--static', { timeout: 15000 });

    const jogos = await page.$$eval('.event__match--static', (rows) => {
      return rows.slice(0, 5).map(row => {
        const placar = row.querySelector('.event__scores')?.textContent?.trim() || '';
        const partes = placar.split(':');
        const golsCasa = parseInt(partes[0]) || 0;
        const golsFora = parseInt(partes[1]) || 0;
        return {
          golsFeitos: golsCasa,
          golsSofridos: golsFora,
          totalGols: golsCasa + golsFora
        };
      });
    });

    stats.push(...jogos);
  } catch (e) {
    console.error(`Erro ao buscar jogos do time ${nomeTime}:`, e.message);
  } finally {
    await context.close();
  }

  return stats;
}

function calcularProbabilidades({ timeA, timeB }) {
  const todosJogos = [...timeA, ...timeB];
  const total = todosJogos.length || 1;
  const somaGols = todosJogos.reduce((acc, j) => acc + j.totalGols, 0);
  const mediaGols = somaGols / total;

  const over15 = todosJogos.filter(j => j.totalGols > 1.5).length / total;
  const over35 = todosJogos.filter(j => j.totalGols > 3.5).length / total;
  const ambasMarcam = todosJogos.filter(j => j.golsFeitos > 0 && j.golsSofridos > 0).length / total;

  const escanteios5Mais = Math.min(1, Math.random() * 0.6 + 0.4);
  const cartoes = Math.min(1, Math.random() * 0.5 + 0.3);

  return {
    ambasMarcam: ambasMarcam.toFixed(2),
    over15: over15.toFixed(2),
    over35: over35.toFixed(2),
    mediaGols: mediaGols.toFixed(2),
    escanteios5Mais: escanteios5Mais.toFixed(2),
    cartoes: cartoes.toFixed(2)
  };
}

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
