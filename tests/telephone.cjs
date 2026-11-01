// Vérifie sur le site EN LIGNE, au format de plusieurs téléphones, qu'une séance se déroule
// sans ascenseur (voir le mot, l'écrire au clavier, se tromper, recopier) et sans erreur dans la console.
// Usage : node tests/telephone.cjs [url]   (captures dans captures/)
const { chromium } = require('playwright');
const fs = require('fs');

const URL = process.argv[2] || 'https://lechampdelaurore-boop.github.io/mots-a-retenir/';
const SIZES = [[320, 568], [360, 640], [375, 667], [390, 664], [390, 844], [412, 780], [430, 932]];
const expectedCache = (fs.readFileSync('sw.js', 'utf8').match(/mots-a-retenir-v\d+/) || [])[0];
// Une liste d'essai (mots courants, rien de personnel).
const LIST = [{ id: 'test', name: 'Liste d\'essai', test: '', created: 1, words: [
  { w: 'femme', syl: '', marks: { 1: 'p' }, tip: 'femme se lit « fame »' },
  { w: 'papillon', syl: '', marks: {}, tip: '' }
] }];

(async () => {
  fs.mkdirSync('captures', { recursive: true });
  // Attendre que GitHub Pages serve bien la version du dépôt (même CACHE que sw.js).
  for (let i = 0; ; i++) {
    const live = await fetch(URL + 'sw.js?nocache=' + Date.now()).then(r => r.text()).catch(() => '');
    if (live.includes(expectedCache)) { console.log('Version en ligne : ' + expectedCache); break; }
    if (i >= 18) { console.log('Version en ligne différente de ' + expectedCache + ' après 3 min'); process.exit(1); }
    await new Promise(r => setTimeout(r, 10000));
  }

  const browser = await chromium.launch();
  const lines = ['| Écran | Voir | Écrire | Erreur | Recopier | Console |', '|---|---|---|---|---|---|'];
  let failed = false;
  for (const [w, h] of SIZES) {
    const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await page.addInitScript(l => {
      localStorage.setItem('marc.mots.listes', JSON.stringify(l));
      localStorage.setItem('marc.mots.reglages', JSON.stringify({ sound: false, anim: false, voice: false, syl: true, size: 6 }));
    }, LIST);
    await page.goto(URL + '?nocache=' + Date.now());
    const over = () => page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
    const typeWord = async t => { for (const ch of t) await page.click(`#kb [data-k="${ch}"]`); };
    const res = {};
    await page.click('#startBtn');
    await page.waitForSelector('#seenBtn');
    res.voir = await over();
    await page.screenshot({ path: `captures/${w}x${h}-1-voir.png` });
    await page.click('#seenBtn');
    await page.waitForSelector('#kb', { timeout: 8000 });
    await typeWord('fame');
    res.ecrire = await over();
    await page.screenshot({ path: `captures/${w}x${h}-2-ecrire.png` });
    await page.click('#checkBtn');
    await page.waitForSelector('#retryBtn');
    res.erreur = await over();
    await page.screenshot({ path: `captures/${w}x${h}-3-erreur.png` });
    await page.click('#retryBtn');
    await page.waitForSelector('#kb', { timeout: 8000 });
    await typeWord('fame');
    await page.click('#checkBtn');
    await page.click('#retryBtn');
    await page.waitForSelector('#kb');
    await typeWord('femme');
    res.recopier = await over();
    await page.screenshot({ path: `captures/${w}x${h}-4-recopier.png` });
    await page.click('#checkBtn');
    await page.waitForSelector('#nextBtn');
    const cell = d => (d > 0 ? `❌ dépasse de ${d} px` : '✅');
    if (Object.values(res).some(d => d > 0) || errors.length) failed = true;
    lines.push(`| ${w}×${h} | ${cell(res.voir)} | ${cell(res.ecrire)} | ${cell(res.erreur)} | ${cell(res.recopier)} | ${errors.length ? '❌ ' + errors.join(' / ') : '✅'} |`);
    await page.close();
  }
  await browser.close();
  const report = lines.join('\n');
  console.log(report);
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, '## Test téléphone (site en ligne)\n\n' + report + '\n');
  process.exit(failed ? 1 : 0);
})();
