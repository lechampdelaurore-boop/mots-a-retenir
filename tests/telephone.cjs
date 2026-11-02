// Vérifie sur le site EN LIGNE, au format de plusieurs téléphones, qu'une séance se déroule
// sans ascenseur (voir le mot, l'écrire au clavier, se tromper, recopier) et sans erreur dans la console.
// Vérifie aussi l'écran d'une dictée (choix du groupe, case « faite ») : rien ne dépasse sur le côté,
// et les questions sur les lettres (méthode de l'orthophoniste) : pas d'ascenseur.
// Et un mot long : par défaut écrit tout de suite en entier ; avec le réglage « Mots longs par morceaux »,
// le mot entier écrit dès le morceau 1 est accepté (bug « construction » corrigé).
// Et la dictée blanche : écrire sans ascenseur, puis correction sans dépassement sur le côté.
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
  const lines = ['| Écran | Voir | Écrire | Erreur | Recopier | Dictée | Questions | Morceaux | Dictée blanche | Console |', '|---|---|---|---|---|---|---|---|---|---|'];
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
    // Écran d'une dictée : groupe violet (le plus de mots), puis case « faite » sur l'accueil.
    await page.goto(URL + '?nocache=' + Date.now());
    const side = () => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    await page.click('#homeDicts li:nth-child(1) .dict-open');
    await page.click('#dGroupes [data-g="violet"]');
    res.dictee = await side();
    await page.screenshot({ path: `captures/${w}x${h}-5-dictee.png`, fullPage: true });
    await page.click('#dBack');
    await page.click('#homeDicts li:nth-child(1) .coche input');
    res.dictee = Math.max(res.dictee, await side());
    await page.screenshot({ path: `captures/${w}x${h}-6-accueil.png`, fullPage: true });
    // Questions sur les lettres pour tous les nouveaux mots (réglage ⚙), puis séance sur la dictée 1.
    await page.click('#gearBtn');
    await page.click('input[name="quiz"][value="nouveaux"] + span');
    await page.click('#setBack');
    await page.click('#homeDicts li:nth-child(1) .dict-open');
    await page.click('#dGo');
    await page.click('#seenBtn');
    await page.waitForSelector('#pave');
    await page.click('#pave [data-n="1"]');
    res.questions = await over();
    await page.screenshot({ path: `captures/${w}x${h}-7-questions.png` });
    // Mot long, nouveau, réglage « par morceaux » activé. Le mot entier tapé au morceau 1 doit être accepté.
    const p2 = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    p2.on('pageerror', e => errors.push(e.message));
    p2.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await p2.addInitScript(() => {
      localStorage.setItem('marc.mots.listes', JSON.stringify([{ id: 'long', name: 'Mot long', test: '', created: 1, words: [{ w: 'construction', syl: '', marks: {}, tip: '' }] }]));
      localStorage.setItem('marc.mots.reglages', JSON.stringify({ sound: false, anim: false, voice: false, syl: true, size: 6, quiz: 'non', morceaux: true }));
    });
    await p2.goto(URL + '?nocache=' + Date.now());
    await p2.click('#startBtn');
    await p2.waitForSelector('#seenBtn');
    if (!/Morceau 1/.test(await p2.textContent('#card .etiquette'))) errors.push('réglage par morceaux sans effet');
    await p2.click('#seenBtn');
    await p2.waitForSelector('#kb', { timeout: 8000 });
    for (const ch of 'construction') await p2.click(`#kb [data-k="${ch}"]`);
    res.morceaux = await p2.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
    await p2.screenshot({ path: `captures/${w}x${h}-8-morceau.png` });
    await p2.click('#checkBtn');
    await p2.waitForSelector('#nextBtn, #retryBtn');
    if (!(await p2.$('#nextBtn'))) errors.push('construction refusé au morceau 1');
    await p2.close();
    // Dictée blanche (dictée 1, groupe rouge) : écrire sans ascenseur, se relire, correction sans dépassement sur le côté.
    const p3 = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    p3.on('pageerror', e => errors.push(e.message));
    p3.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await p3.addInitScript(() => { if (!sessionStorage.getItem('fait')) { sessionStorage.setItem('fait', 1); localStorage.setItem('marc.mots.reglages', JSON.stringify({ sound: false, anim: false, voice: false, syl: true, size: 6 })); } });
    await p3.goto(URL + '?nocache=' + Date.now());
    await p3.click('#homeDicts li:nth-child(1) .dict-open');
    await p3.click('#dGroupes [data-g="rouge"]');
    await p3.click('#dBlanche');
    await p3.waitForSelector('#bSay');
    const mots = await p3.evaluate(() => JSON.parse(localStorage.getItem('marc.mots.blanche')).words);
    res.blanche = 0;
    for (let i = 0; i < mots.length; i++) {
      const t = i === 0 ? mots[i] + 'x' : mots[i]; // une faute exprès
      for (const ch of t.toLowerCase()) await p3.click(`#kb [data-k="${ch}"]`);
      res.blanche = Math.max(res.blanche, await p3.evaluate(() => document.documentElement.scrollHeight - window.innerHeight));
      if (i === 0) await p3.screenshot({ path: `captures/${w}x${h}-9-dictee-blanche.png` });
      await p3.click('#bNext');
    }
    await p3.waitForSelector('#rGo');
    await p3.click('#rGo');
    await p3.waitForSelector('#cBack');
    res.blanche = Math.max(res.blanche, await p3.evaluate(() => document.documentElement.scrollWidth - window.innerWidth));
    await p3.screenshot({ path: `captures/${w}x${h}-10-correction.png`, fullPage: true });
    if ((await p3.textContent('#cTitle')) !== (mots.length - 1) + ' sur ' + mots.length) errors.push('score de la dictée blanche faux');
    await p3.close();
    const cell = d => (d > 0 ? `❌ dépasse de ${d} px` : '✅');
    if (Object.values(res).some(d => d > 0) || errors.length) failed = true;
    lines.push(`| ${w}×${h} | ${cell(res.voir)} | ${cell(res.ecrire)} | ${cell(res.erreur)} | ${cell(res.recopier)} | ${cell(res.dictee)} | ${cell(res.questions)} | ${cell(res.morceaux)} | ${cell(res.blanche)} | ${errors.length ? '❌ ' + errors.join(' / ') : '✅'} |`);
    await page.close();
  }
  await browser.close();
  const report = lines.join('\n');
  console.log(report);
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, '## Test téléphone (site en ligne)\n\n' + report + '\n');
  process.exit(failed ? 1 : 0);
})();
