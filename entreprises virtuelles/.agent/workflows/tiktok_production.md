---
description: Pipeline de production TikTok (Mode Turbo)
---

Ce workflow permet d'exécuter la production vidéo sans validations manuelles répétitives.

// turbo-all
1. Nettoyer les anciens rapports et vidéos
    `rm -f K_HIVE/AGENTS/CHLOE/STORAGE/OUTPUT/*.mp4 K_HIVE/AGENTS/CHLOE/STORAGE/OUTPUT/*.md`

2. Lancer la production CHLOE
    `cd K_HIVE/AGENTS/CHLOE && node agent.js`

3. Vérifier la durée de la vidéo produite
    `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 K_HIVE/AGENTS/CHLOE/STORAGE/OUTPUT/tiktok.mp4`
