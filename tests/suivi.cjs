// Vérifie le suivi « déjà entraînés » sur la page d'une dictée et à l'accueil :
// chaque mot montre son état (pas encore / entraîné / au trésor), le compteur « X sur N » est juste,
// un mot écrit (juste ou raté) passe à « entraîné », et rien ne dépasse sur le côté, en clair et en sombre.
// Usage : node tests/suivi.cjs [url]   (captures dans captures/)
const { chromium } = require('playwright');
const fs = require('fs');

const URL = process.argv[2] || 'https://lechampdelaurore-boop.github.io/mots-a-retenir/';
const SIZES = [[320, 568], [360, 640], [390, 844], [430, 932]];
const keyOf = s => s.normalize('NFC').replace(/[’]/g, "'").replace(/\s+/g, ' ').trim().toLowerCase();

(async () => {
  fs.mkdirSync('captures', { recursive: true });
  const browser = await chromium.launch();
  const errors = [];
  const check = (ok, msg) => { if (!ok) errors.push(msg); };
  for (const scheme of ['light', 'dark']) for (const [w, h] of SIZES) {
    const tag = `${scheme} ${w}×${h}`;
    const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, colorScheme: scheme });
    page.on('pageerror', e => errors.push(tag + ' : ' + e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(tag + ' : ' + m.text()); });
    await page.addInitScript(() => { if (!sessionStorage.getItem('fait')) { sessionStorage.setItem('fait', 1); localStorage.clear(); localStorage.setItem('marc.mots.reglages', JSON.stringify({ sound: false, anim: false, voice: false, syl: true, size: 6, quiz: 'non' })); } });
    await page.goto(URL + '?nocache=' + Date.now());
    await page.click('#homeDicts li:nth-child(1) .dict-open');
    // R4 : sans groupe, pas de compteur.
    check(!(await page.$('#dMots .suivi')), tag + ' : compteur affiché sans groupe');
    await page.click('#dGroupes [data-g="vert"]');
    // R1 : progression posée à la main (1 mot sur 5 au trésor, 2 sur 5 entraînés).
    const words = await page.evaluate(() => JSON.parse(localStorage.getItem('marc.mots.listes')).find(l => l.dictee === 1).words.map(x => x.w));
    const uniq = [...new Set(words.map(keyOf))];
    const t = '2026-01-01', pr = {};
    uniq.forEach((k, i) => {
      if (i % 5 === 0) pr[k] = { box: 4, due: t, last: t, days: 4, tries: 4, first: 4, miss: 0, views: 0, gold: t };
      else if (i % 5 === 1 || i % 5 === 3) pr[k] = { box: 1, due: t, last: t, days: 1, tries: 1, first: 1, miss: 0, views: 0 };
    });
    await page.evaluate(p => localStorage.setItem('marc.mots.progres', JSON.stringify(p)), pr);
    const n = uniq.length, nv = Object.keys(pr).length, ng = uniq.filter((k, i) => i % 5 === 0).length;
    await page.goto(URL + '?nocache=' + Date.now());
    const homeSub = async () => page.textContent('#homeDicts li:nth-child(1) .sub');
    check((await homeSub()).includes(`${nv} sur ${n} entraînés · ${ng} au trésor`), tag + ' : accueil faux : ' + await homeSub());
    await page.click('#homeDicts li:nth-child(1) .dict-open');
    const etats = async () => page.evaluate(() => [...document.querySelectorAll('#dMots .chips li')].map(li => [li.firstChild && li.childNodes[li.childNodes.length - 2].textContent, li.className]));
    const count = async c => (await etats()).filter(e => e[1] === c).length;
    check(await page.textContent('#dMots .suivi .big') === `Déjà entraînés : ${nv} sur ${n}`, tag + ' : compteur faux');
    check(await count('gold') === ng && await count('vu') === nv - ng && await count('neuf') === n - nv, tag + ' : états des mots faux');
    const side = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    check(side <= 0, tag + ` : dépasse sur le côté de ${side} px`);
    await page.screenshot({ path: `captures/suivi-${scheme}-${w}x${h}.png`, fullPage: true });
    // R2 + R3 : une séance, 1er mot écrit juste, 2e raté ; tous les deux passent à « entraîné ».
    await page.click('#dGo');
    const ecrire = async faux => {
      await page.waitForSelector('#seenBtn');
      const mot = (await page.textContent('#card .word')).trim();
      await page.click('#seenBtn');
      await page.waitForSelector('#kb', { timeout: 8000 });
      for (const ch of (faux ? mot + 'x' : mot).toLowerCase()) await page.click(`#kb [data-k="${ch}"]`);
      await page.click('#checkBtn');
      await page.waitForSelector(faux ? '#retryBtn' : '#nextBtn');
      return keyOf(mot);
    };
    const m1 = await ecrire(false);
    await page.click('#nextBtn');
    const m2 = await ecrire(true);
    check(!pr[m1] && !pr[m2], tag + ' : la séance ne commence pas par des mots pas encore vus');
    await page.click('#quit');
    check((await homeSub()).includes(`${nv + 2} sur ${n} entraînés`), tag + ' : accueil pas mis à jour : ' + await homeSub());
    await page.click('#homeDicts li:nth-child(1) .dict-open');
    check(await page.textContent('#dMots .suivi .big') === `Déjà entraînés : ${nv + 2} sur ${n}`, tag + ' : compteur pas mis à jour');
    check(await count('vu') === nv - ng + 2, tag + ' : mots écrits pas passés à « entraîné »');
    await page.close();
  }
  await browser.close();
  const report = errors.length ? '❌ ' + errors.join('\n❌ ') : '✅ Suivi « déjà entraînés » : tout est bon (clair et sombre, ' + SIZES.length + ' tailles).';
  console.log(report);
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, '## Suivi « déjà entraînés » (site en ligne)\n\n' + report + '\n');
  process.exit(errors.length ? 1 : 0);
})();
