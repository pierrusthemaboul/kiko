# GEMINI_CHLOE_ANALYSIS.md

Ce document contient l'analyse de l'agent CHLOE et mes propositions pour répondre aux exigences TikTok.

## 1. Comment forcer une durée de 25-30 secondes ?

**Problème actuel** : CHLOE prend un clip source et l'encode tel quel. Si le clip fait 5s, la vidéo fait 5s.

**Propositions :**
- **Option A (Boucle)** : Utiliser `-stream_loop -1` avant l'input et limiter la sortie avec `-t 30`. C'est simple mais peut être répétitif.
- **Option B (Concaténation)** : Modifier le pipeline pour que MARC sélectionne plusieurs clips (ex: 3-4 clips de 8s) et que CHLOE les concatène. C'est la solution la plus "TikTok native".
- **Option C (Ralenti)** : Appliquer un filtre `setpts` pour ralentir le gameplay. Peu recommandé car cela dénature le jeu.

**Recommandation technique** : Commencer par l'Option A pour garantir les 30s, tout en travaillant sur l'Option B avec l'orchestrateur.

## 2. Comment implémenter un effet typewriter/déroulement ?

**Problème actuel** : `drawtext` affiche tout le texte d'un coup.

**Propositions :**
- **Effet Scroll (Déroulement horizontal/vertical)** : Plus simple en FFmpeg.
  `x=w-t*200` (scroll horizontal) ou `y=h-t*100` (scroll vertical).
- **Effet Typewriter (Apparition caractère par caractère)** :
  FFmpeg ne le gère pas nativement de manière simple. On peut simuler cela en superposant un rectangle noir qui se déplace pour "révéler" le texte :
  `drawbox=x=t*200:y=400:w=1000:h=100:color=black:t=fill` (sur le texte blanc).
  **Ou mieux** : Utiliser un filtre complexe qui affiche des sous-chaînes, mais cela nécessite de générer dynamiquement la commande FFmpeg pour chaque lettre (complexe pour l'agent).

**Recommandation technique** : Utiliser un **effet de révélation par masque mobile** ou un **scroll vertical** élégant.

## 3. Comment ajouter un CTA dans les 5 dernières secondes ?

**Proposition :**
Ajouter un second `drawtext` ou un overlay image activé par `enable='gt(t, duration-5)'`.

Exemple de filtre pour le CTA :
`drawtext=text='TÉLÉCHARGE TIMALAUS MAINTENANT !':fontcolor=yellow:fontsize=60:x=(w-text_w)/2:y=h-200:enable='gt(t,25)'`

## 4. Suggestions de filtres FFmpeg (Résumé)

Voici une structure de commande améliorée pour `agent.js` :

```bash
# 1. Input en boucle pour atteindre 30s
ffmpeg -stream_loop -1 -i input.mp4 -t 30 \
-vf "[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=20:5[bg]; \
[0:v]scale=-1:1920:force_original_aspect_ratio=decrease[fg]; \
[bg][fg]overlay=(W-w)/2:(H-h)/2[v1]; \
[v1]drawtext=text='VOTRE HOOK':...:enable='between(t,0,6)'[v2]; \
[v2]drawtext=text='TÉLÉCHARGE MAINTENANT':...:enable='gt(t,25)'[outv]" \
... output.mp4
```

---
*Prochaine étape : Test de l'effet typewriter dans `GEMINI_FFMPEG_TESTS.md`.*
