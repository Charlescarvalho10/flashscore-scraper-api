import { chromium } from 'playwright';

export async function scrapeJogos() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto('https://www.flashscore.com.br/', { timeout: 60000 });
  await page.waitForSelector('.event__match');

  const jogos = await page.$$eval('.event__match', (nodes) =>
    nodes.map((el) => {
      const timeCasa = el.querySelector('.event__participant--home')?.textContent || '';
      const timeFora = el.querySelector('.event__participant--away')?.textContent || '';
      const horario = el.querySelector('.event__time')?.textContent || '';
      return { timeCasa, timeFora, horario };
    })
  );

  await browser.close();

  return jogos.map(jogo => ({
    ...jogo,
    probabilidades: ['+1.5 gols', 'ambas marcam']
  }));
}
