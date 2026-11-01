# Mots à retenir

Apprendre l'orthographe de ses mots, avec les listes de mots de l'école : **je regarde, je cache, j'écris**.

- **Jouer en ligne :** https://lechampdelaurore-boop.github.io/mots-a-retenir/

## Le principe

1. **Voir** : le mot s'affiche en grand, lu à voix haute, découpé en syllabes de couleur. Les lettres muettes sont grisées et les lettres pièges surlignées, avec une astuce si besoin (« grand → grande »).
2. **Cacher** : le mot disparaît quelques secondes.
3. **Écrire** de mémoire sur un grand clavier à l'écran (AZERTY avec accents, sans correcteur automatique).
4. **Comparer** lettre à lettre : les lettres justes en vert, la place des lettres manquantes en pointillés.

En cas d'erreur, la carte secoue la tête, les lettres à revoir clignotent, et on réessaie. Au deuxième essai raté, on recopie le mot en le regardant : chaque mot finit sur une réussite. Le mot revient aussi un peu plus tard dans la séance.

Les mots longs (3 syllabes ou plus) s'apprennent d'abord par morceaux, puis en entier.

## Les listes de mots

Dans l'**Espace parent** (en bas de l'accueil) :

- **Ajouter une liste** : coller ou taper les mots (un par ligne, ou séparés par des virgules), lui donner un nom (« Liste semaine 12 ») et, si on veut, la date de la dictée. Avant la dictée, les mots de la liste reviennent tous les jours.
- Pour chaque mot, facultatif : toucher une lettre pour la griser (muette) ou la surligner (piège), corriger les syllabes avec des « / », ajouter une astuce.
- **Mots outils** : une liste toute prête de mots invariables courants (et, est, dans, avec…).
- **Partager par un lien** : les mots sont dans le lien lui-même, rien n'est stocké en ligne. Pratique pour passer une liste d'un téléphone à une tablette.
- **Carnet de progrès** : séances faites, jours de travail, mots au trésor, mots qui résistent.

## Séance du jour et répétition espacée

- Une séance courte (6 mots par défaut, réglable de 5 à 10 dans ⚙), environ 5 minutes, puis « À demain ! ».
- Un mot réussi revient dans 2, puis 4, puis 8 jours. Un mot raté revient le lendemain. Seul le premier essai de la journée compte, et un mot ne recule jamais.
- Un mot réussi 4 jours différents entre dans le **trésor de mots**.
- Bouton « S'entraîner » sur chaque liste pour réviser avant une dictée, en plus de la séance du jour.

Les listes et les progrès restent dans le navigateur de l'appareil : aucun compte, et rien n'est envoyé sur internet.

## Fichiers

- `index.html` : toute l'appli (HTML, CSS et JavaScript, sans bibliothèque). Le haut du style reprend la charte commune des applis ; les 30 personnages de récompense sont dans le script.
- `sw.js` et `manifest.webmanifest` : mode hors ligne et installation. Après une modification des fichiers de l'appli, changer la valeur de `CACHE` dans `sw.js`.
- `fonts/` : polices Fredoka et Nunito (licence SIL Open Font License, voir les fichiers `OFL-*.txt`).
- `tests/telephone.cjs` et `.github/workflows/test-telephone.yml` : après chaque mise en ligne, GitHub ouvre le site publié dans Chrome au format téléphone (7 tailles d'écran) et déroule un mot (voir, écrire, se tromper, recopier) en vérifiant qu'il n'y a ni ascenseur ni erreur dans la console. Résultat et captures dans l'onglet Actions. Lancement local : `npm install --no-save playwright && node tests/telephone.cjs`.
