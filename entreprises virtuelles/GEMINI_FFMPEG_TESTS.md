# GEMINI_FFMPEG_TESTS.md

Ce document rapporte les résultats des tests FFmpeg pour l'effet typewriter.

## Test 1 : Commande basique (Suggérée)
**Commande** :
`ffmpeg -f lavfi -i color=c=black:s=1080x1920:d=5 -vf "drawtext=text='Test typewriter':fontcolor=white:fontsize=48:x=(w-text_w)/2:y=h/2:enable='gte(t,0)'" -c:v libx264 -t 5 test_basic.mp4`

**Résultat** : ✅ SUCCÈS
**Observation** : Affiche le texte de manière statique. Ce n'est pas un effet typewriter mais cela valide le fonctionnement de `drawtext`.

## Test 2 : Effet "Reveal" (Typewriter simulate)
**Commande** :
`ffmpeg -f lavfi -i color=c=black:s=1080x1920:d=5 -vf "drawtext=text='Vini Vidi Vici':fontcolor=white:fontsize=72:x=(w-text_w)/2:y=h/2-100:enable='between(t,0,5)', drawbox=x=0+t*400:y=h/2-150:w=1080:h=200:color=black:t=fill:enable='between(t,0,5)'" -c:v libx264 -t 5 test_typewriter_ok.mp4`

**Résultat** : ✅ SUCCÈS
**Observation** : Cet effet utilise un rectangle noir qui se déplace pour révéler le texte blanc sur fond noir. C'est une simulation efficace de l'effet typewriter sans complexité excessive dans le script.

## Test 3 : Effet Scroll (Alternative)
**Commande** (Non testée mais théorique) :
`drawtext=text='...':x=w-t*150:y=400`
**Observation** : Très simple et très utilisé sur TikTok.

---
*Les fichiers .mp4 ont été générés dans le dossier racine.*
