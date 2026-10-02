# Enquête flashs / snaps d'animation — EventLayoutA (Kiko / Timalaus)

Statut : **VALIDÉ ON-DEVICE — ENQUÊTE CLOSE** (30/09/2026).
Verdict final : la classe de bugs « flashs / snaps d'animation » du mode Classique
est **éliminée**. Validation on-device sur capture8 (`kiko_flash8.mp4`) — verdict
utilisateur : « **ça fonctionne parfaitement** ». Cause racine confirmée et fix
définitif : **§12**.
Historique du raisonnement (diagnostic, captures 3→7, migration Reanimated) :
§1-§11.
Dossier Honcho de référence : peer `kiko-enquete-flashs`.

---

## 1. Environnement (vérifié le 30/09/2026)

- App : Timalaus mobile — repo `C:\Users\pierr\dev\kiko\mobile_app`
- React Native 0.81.5, Expo SDK 54, Android
- **`newArchEnabled=true`** (Fabric + Hermes) — `android/gradle.properties`
- `react-native-reanimated` 4.1.7 + `react-native-worklets` 0.5.1 installés.
  Au démarrage de l'enquête `EventLayoutA` utilisait le core `Animated` ;
  **il est passé à Reanimated 4 le 30/09/2026** (§9), et la vague 2 (§10)
  migre le reste du mode classique.
- Fichier clé : `components/game/EventLayoutA.tsx`
  (2 vues alternées viewA/viewB, `translateY` animé, swap `opacity-v2` au
  completion ; désormais **`useSharedValue` + un `useAnimatedStyle` par vue**)
- Instrumentation : `utils/logger.ts` (`traceGameRender` + wrap de
  `NativeAnimatedHelper.API`)

## 2. Symptôme

À chaque transition, la carte sortante (ex. boson de Higgs) monte normalement
hors écran, puis **RÉAPPARAÎT ~200-300 ms en position haute (top anchor)**,
avant que la carte montée (Deep Blue) ne s'installe.
Symptôme utilisateur confirmé : « la carte qui monte s'affiche un bref instant
en bas ».

Interprétation : les deux = une vue animée qui **retombe à `translateY = 0`**,
c.-à-d. à sa *position de repos* (ancre bottom pour viewB, top pour viewA).

## 3. Preuves capture3 (vidéo montage 20 fps — la plus précise à ce jour)

- Wrap de `NativeAnimatedHelper.API` : ~2 `disconnectAnimatedNodeFromView`
  + ~7 `dropAnimatedNode` + connects **par transition**.
- **AUCUN `restoreDefaultValues` aligné avec les swaps.**
- Les disconnects ~300 ms post-swap portent sur des viewTags *transitoires*
  = les **vues de boutons** (key par event → nouveaux viewTags natifs à chaque
  `buttons.mount`, anciens détruits).
- Les **vues cartes** (connectées au mount, tags stables) ne recréent PAS leur
  props node au swap.

## 4. Hypothèse écartée (avec nuance)

Écarté : recréation d'`AnimatedProps` sur les vues cartes.

**Nuance critique (New Architecture) :** l'absence de `restoreDefaultValues` ne
prouve PAS l'absence de réécriture des props. `restoreDefaultValues` est la
signature d'un **attach/detach de nœud**, pas d'un **props-update** sur un nœud
existant. Sur Fabric, le chemin de réécriture des props diffère de Paper.

## 5. Hypothèses restantes (état capture3)

- (a) reset interne natif à la complétion / teardown du `Animated.timing` ;
- (b) `scheduleUpdate` post-completion (`onUpdateRef` → sync Fiber/Shadow) qui
  commit des valeurs statiques stale ;
- (c) race entre le `setValue` du teleport (ex. +381) et le teardown natif.

## 6. Hypothèse forte (30/09/2026) — stale JS `_value` re-poussée

Avec `useNativeDriver: true`, le **`_value` JS d'un `Animated.Value` n'est PAS
resynchronisé** pendant l'animation native (gotcha RN documenté ;
`onAnimatedValueUpdate` throttlé ~100 ms et seulement si listeners).

Conséquence : un `setValue` JS dans le bloc de swap

- `viewAOpacity.setValue(1)` / `viewBOpacity.setValue(1)` au début
  d'`animateCards`, puis
- `exitingTranslateY / exitingScale / exitingOpacity.setValue(...)` au swap

déclenche `AnimatedProps.update()` → recalcul des props → la valeur de la
**carte montante** est relue *stale* côté JS (= `0` ou `±moveDistance`, sa
position de repos) et re-poussée → la carte montante clignote à sa position de
repos (bas).

Correspondance avec le code : la valeur montante (`risingTranslateY`) **n'est
jamais `setValue`'d côté JS** après l'animation. Son `_value` reste à sa valeur
de repos, alors que le natif l'a déplacée.

### Fix candidat (à tester, instrumentation capture4 d'abord)

1. `risingTranslateY.setValue(riseTarget)` (et `risingScale`) au completion,
   pour aligner le JS sur le natif. (Faible risque.)
2. Alternative : `risingTranslateY.stopAnimation(cb)` (flush natif → JS).
3. Diagnostic/fix bis : `risingTranslateY.addListener(...)` (force le sync JS).
4. Migration de ces transitions vers **Reanimated 4** (déjà installé, valeurs
   cohérentes UI-thread) — élimine toute la classe de bugs « stale JS value » du
   core Animated en driver natif.

## 7. Instrumentation capture4 (ajoutée dans `utils/logger.ts`)

- trace `animated.setValue` (chaque setValue natif + valeur) ;
- `createAnimatedNode` (mapping nodeTag→type) ;
- `startAnimatingNode` / `stopAnimation` ;
- `layout.node-tags` exposant les nodeTags des 6 `Animated.Value`
  d'EventLayoutA (transA/B, scaleA/B, opA/B via `__getNativeTag()`).

**Attention :** si le writer est le chemin props-update
(`setNativeProps` / props Fabric), il **ne passe PAS** par
`setAnimatedNodeValue` → un trace `setValue` vide ne prouve PAS l'absence de
writer. Prévoir un second trace sur `AnimatedProps.prototype.update` /
`__getValueWithStaticProps` si besoin.

## 8. Faits établis (à conserver)

- Countdown race prouvée : `screen.render` mode=game avant `countdown=3` →
  premier arbre jeu monté ~30 ms puis démonté.
- zIndex constants déployés (`swapMethod 'opacity-v2'` confirmé actif) mais
  insuffisant.
- reveal permanente + gate image + underlay synchrone déployés.
- `contentOpacity` dip 0.3 = dims globaux aux modales (problème séparé).

## 9. Étape « Reanimated-migration » (en cours — 30/09/2026)

**Nature : étape d'implémentation à part entière**, distincte des hypothèses
§4-§6 (qui documentent le diagnostic du core `Animated`). Le fix candidat n°4
du §6.4 (migration Reanimated 4) est désormais **appliqué dans le code**.

### Ce qui a changé dans `components/game/EventLayoutA.tsx`

- Les `Animated.Value` RN de la famille carte sont remplacés par des
  `useSharedValue` :
  `viewATranslateY` / `viewBTranslateY`,
  `viewAScale` / `viewBScale`,
  `viewAOpacity` / `viewBOpacity`.
- **Les ancres `top` passent aussi en shared values** :
  `viewAAnchorY` / `viewBAnchorY` (init. `topCardInitialY` / `bottomCardTop`,
  resync sur changement de dimensions). L'ancienne ancre statique
  `topCardInitialY` / `bottomCardTop` n'est plus posée directement en style.
- **`top` + `translateY` + `scale` + `opacity` sont combinés dans un seul
  `useAnimatedStyle` par vue** (`viewAAnimStyle` / `viewBAnimStyle`) →
  **un seul canal UI-thread**, plus de race Fabric vs driver natif.
- Fin de transition remontée au JS via `runOnJS(onTransitionEnd)` (dans le
  callback de `withTiming` de la vue montante) → c'est `onTransitionEnd` qui
  fait le travail de swap :
  - bascule des rôles `swapped` + `currentTop` / `currentBottom` ;
  - reset `translateY = 0` sur la vue recyclée **et** `opacity = 0` sur la
    vue sortante (masquage atomique avant recyclage) ;
  - `swapMethod` loggé = `'reanimated-v4'`.
- Backstop `requestAnimationFrame` conservé (2ᵉ assertion des valeurs, puis
  `setTransitioning(false)`) ; animation de fin de niveau via
  `withSequence(withTiming(1.1) → withTiming(1))`.

### État

- **Typecheck : OK.**
- App relancée (**PID 27618**) pour la capture7.
- **Capture7 (`kiko_flash7.mp4`) : RÉSULTAT PARTIEL POSITIF — VOIR §10.**

## 10. RÉSULTAT PARTIEL POSITIF — capture7 (`kiko_flash7.mp4`)

**La migration Reanimated 4 d'`EventLayoutA` a RÉSOLU les snaps / flashs des
transitions de cartes.** Confirmation utilisateur sur la capture7
(`kiko_flash7.mp4`) : « **transitions beaucoup mieux** ».

- **Cause racine validée empiriquement** : le bug venait du **double canal**
  `React-top` (ancre statique posée en style) **vs** `Animated-translateY`
  (valeur animée sur le driver natif) — deux writers concurrents sur la même
  vue, qui se battaient au swap (§4-§6 du diagnostic core `Animated`).
  En fusionnant `top` + `translateY` + `scale` + `opacity` dans **un seul
  `useAnimatedStyle` par vue** (un seul canal UI-thread), la classe de bugs
  « stale JS `_value` re-poussée » disparaît.
- Le symptôme historique (réapparition haute de la carte sortante /
  clignotement bas de la carte montante) n'est **plus observé**.

> Restent documentées comme **historique du raisonnement** (non actives) :
> hypothèses a/b/c du §5 et l'hypothèse forte du §6.

## 11. VAGUE 2 (en cours — 30/09/2026) — Reanimated sur tout le mode classique

**Nature :** après le succès d'`EventLayoutA`, migration Reanimated des
**autres `Animated.Value` visibles du jeu classique** (même classe de bug
stale-JS / double canal).

| Composant | Valeurs migrées |
|---|---|
| `RewardAnimation` | bulle de récompense |
| `UserInfo` | bounce cœurs |
| `LevelUpModalBis` | enter + bouton GO |
| `GameContentA` | `contentOpacity` (dip) |
| `GameScreen` | `fadeAnim` + `bgFadeAnim` (écrans classic + precision) |
| `Countdown` | pulse timer + tuto |
| `AnimatedEventCardA` | `dateScale` / `fadeAnim` / `titleColor` (loop) |
| `OverlayChoiceButtonsA` | 8 valeurs : fade / scale / rotate / pulse / glows |
| `LevelTransition` | `opacity` / `scale` |

### MÉCANISME DU FLASH DE FIN DE NIVEAU (révélé par la capture7)

La capture7 a montré le **mécanisme du flash de fin de niveau** : l'écran passe
au **NOIR ~300 ms** entre la fin du jeu et le fade-in de la modale. Cause :
**dip de `contentOpacity` à 0.3** (le contenu se vide) **alors que le backdrop
de la modale n'est pas encore opaque** → fenêtre noire. C'est ce point que la
migration de `GameContentA` (`contentOpacity`) et `GameScreen` (`fadeAnim` +
`bgFadeAnim`) doit traiter dans la vague 2.

### État vague 2

- **Typecheck : OK.**
- App relancée (**PID 11317**).
- **Capture8 lancée** pour valider : rewards de vie + écran de fin de niveau
  + boutons.

### Volontairement LAISSÉS en core `Animated`

- `progressAnim` (`useGameLogicA`) — **driver JS**, pas de snap possible.
- `TutorialGhostHand` (tuto).
- Composants **legacy / précision** hors mode classique.

---

## 12. VERDICT FINAL — VALIDÉ ON-DEVICE (capture8, 30/09/2026)

**Verdict : VALIDÉ ON-DEVICE — enquête close.** L'utilisateur (Pierre) a joué en
mode **Classique** sur appareil réel (niveaux enchaînés). Verdict explicite :
« **ça fonctionne parfaitement** ».

Artefacts :

- `mobile_app/kiko_flash8.mp4` (video capture)
- `mobile_app/logcat_capture8.txt` (logcat, session `1790802651340`, app PID `11317`)

### 12.1 Ce que montre la capture (chiffres vérifiés depuis le logcat)

- **Transitions de cartes — 17** (`transition.start` / `transition.end`),
  **toutes `finished:true`, `superseded:false`, `swapMethod:"reanimated-v4"`** ;
  durée cible 600 ms, exécution mesurée 618-635 ms (avg 625). Répartition par
  niveau : 4 (niv. 1), 6 (niv. 2), 7 (niv. 3) → **plus aucun snap / flash**.
- **Boutons — 20 `buttons.fade-end`**, tous `finished:true`, elapsed
  224-252 ms (≈ **230 ms**) → aucun bouton fantôme résiduel.
- **Récompenses — 3 `reward.end`**, toutes `finished:true` **et** `mounted:true`
  (~2,0 s chacune) : 1 `POINTS` (+250 pts), 2 `EXTRA_LIFE` (+1 vie).
- **Modales de niveau — 3 `levelmodal.enter-end`**, toutes `finished:true`
  (montée niveau 1→2, 2→3, 3→4) ; `levelmodal.button-loop` OK.
- **`js.health` — worstDriftMs 166 / 115 / 90 ms.** Pics de drift JS
  transitoires sans impact visuel : **aucun snap ni flash observé**.
- **Aucune erreur JS / React Native de l'app** dans le log (les lignes `error`
  du fichier appartiennent à d'autres apps du téléphone — Messenger,
  PhoneAdapter, ArtChoreographerMonitor…).
- Progression menée jusqu'à **l'entrée du niveau 4** sans game over
  (`content.gameover-ui` n'apparaît qu'une fois, `isGameOver:false` = render initial).

> **Note de comptage.** Le brief mentionnait « 2 `reward.end` + 2
> `levelmodal.enter-end` ». Le log en contient **3 de chaque** : l'utilisateur a
> enchaîné **3 niveaux complets (1→2→3) puis est entré en niveau 4**. Les
> chiffres du log font foi.

### 12.2 CAUSE RACINE CONFIRMÉE

Le positionnement et l'animation des vues passaient par **DEUX canaux non
atomiques** :

1. **React / Fabric** — props `top` et styles statiques, réécrits à chaque
   commit de rendu ;
2. **driver natif du core `Animated`** — `translateY` / `scale` / `opacity`.

Chaque commit Fabric pouvait **réécrire une valeur obsolète**, et l'ordre
d'application entre les deux canaux produisait des **frames où la vue était à une
position incohérente** → snap à l'ancre, carte qui disparaît, fond noir visible
(les « flashs »).

### 12.3 FIX DÉFINITIF

Migration **généralisée à Reanimated 4** : un `useSharedValue` + **un unique
`useAnimatedStyle` combinant `top` + transforms + `opacity`** par vue
→ **un seul canal UI-thread**, plus de race Fabric vs driver natif.

Composants migrés (10 — vérifiés présents dans le code) :

| Composant | Emplacement |
|---|---|
| `EventLayoutA` | `components/game/` |
| `RewardAnimation` | `components/game/` |
| `UserInfo` | `components/game/` |
| `GameContentA` | `components/game/` |
| `Countdown` | `components/game/` |
| `AnimatedEventCardA` | `components/game/` |
| `OverlayChoiceButtonsA` | `components/game/` |
| `LevelTransition` | `components/game/` |
| `LevelUpModalBis` | `components/modals/` |
| `GameScreen` | `app/game/` |

### 12.4 CLEANUP — FAIT (30/09/2026)

- **Instrumentation native SUPPRIMÉE** dans `utils/logger.ts` : tout le bloc de
  wrappers `NativeAnimatedHelper.API` (`restoreDefaultValues` / `connect` /
  `disconnect` / `drop` / `setValue` / `startAnimatingNode` / `stopAnimation` /
  `createAnimatedNode`) **et** la sonde `js.health` ont été retirés.
- **`traceGameRender` conservé mais neutralisé** : exporté, il retourne
  immédiatement via le flag `RENDER_TRACE_ENABLED = false` (`logger.ts`). Les
  **~143 sites d'appel dans 15 fichiers** restent en place — **aucun coût,
  aucune sortie**.
- **Effet rAF de sampling `js-frame-gaps` retiré** d'`EventLayoutA` (les `rAF`
  restants relèvent de la logique de swap / reveal, pas de l'instrumentation).
- **`progressAnim`** (`hooks/useGameLogicA.ts`) **reste volontairement en core
  `Animated`** avec `useNativeDriver:false` → **driver JS, sain**, aucune classe
  de snap possible. À conserver tel quel.

**Pour réactiver l'instrumentation** si un flash réapparaît : repasser
`RENDER_TRACE_ENABLED` à `true` (`utils/logger.ts`). Le reste du montage
(wrappers natifs) devra alors être restauré depuis l'historique git.

**Typecheck : OK.**

> **Note finale (30/09/2026)** — cleanup terminé. L'instrumentation d'enquête a
> été démontée ; ce qui subsiste est **inerte et réversible d'un seul flag**
> (`RENDER_TRACE_ENABLED`). L'enquête reste **close** : verdict on-device
> (capture8) inchangé.

---

## 13. EXTENSION ACCUEIL — ProgressionDrawer + carrousels (validation en attente)

**Symptôme rapporté** : la flèche d'ouverture des tableaux de classement sur la
vue d'accueil produit le même clignotement.

**Constat** : `src/features/home/components/ProgressionDrawer.tsx` pilotait le
`translateY` du tiroir en core `Animated` + un `useEffect` qui faisait
`translateY.setValue(isOpen ? 0 : closedOffset)` **sur chaque changement
d'`isOpen`** — soit un écrasement de la valeur finale pendant que le spring
tournait (saut visible garanti), en plus de la classe double-canal déjà
identifiée (commit Fabric vs driver natif).

**Migration Reanimated 4 (vague 3 — écran d'accueil)** :

| Composant | Animations migrées |
|---|---|
| `ProgressionDrawer` | `translateY` du tiroir (`withSpring`) — l'effet stompant réduit à la seule resync dimensions |
| `LeaderboardCarousel` | slide/fade de changement de période — swap React via `runOnJS` au callback du fade-out |
| `MyRankingCarousel` | idem |
| `QuestCarousel` | fade d'onglet + pulsation du bouton de récompense (`withRepeat`) |

**Typecheck : OK.** Validation on-device à faire (ouverture/fermeture tiroir +
navigation des périodes).
