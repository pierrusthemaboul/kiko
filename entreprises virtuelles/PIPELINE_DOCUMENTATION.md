# Documentation du Pipeline TikTok - Timalaus

Ce pipeline permet de transformer automatiquement des captures de gameplay en vidéos TikTok optimisées de 30 secondes.

## 1. Prérequis

### Assets Nécessaires
Les fichiers suivants doivent être présents dans `SHARED/ASSETS/` :
- `timalaus_badge_v2.png` : Badge "TIMALAUS" avec fond orange (affiché au début).
- `cta_playstore.png` : Badge officiel "Get it on Google Play" (affiché à la fin).

### Entrées (Input)
Les clips de gameplay (rushes) doivent être placés (par l'Agent DERUSH) dans :
`K_HIVE/AGENTS/CHLOE/STORAGE/INPUT/`

Un fichier de sélection JSON (ex: `selection_session_XXX.json`) doit également être présent pour que CHLOE sache quels clips traiter.

## 2. Comment lancer la production

### Mode Turbo (Recommandé)
Pour produire sans validations manuelles dans Antigravity, tapez la commande :
- `/tiktok_production`

### Mode Manuel
Vous pouvez lancer l'agent CHLOE directement depuis le terminal :
```bash
cd K_HIVE/AGENTS/CHLOE
node agent.js
```

## 3. Automatisations (Features)

L'agent CHLOE applique systématiquement les traitements suivants via FFmpeg :
1. **Recadrage (Crop)** : Coupe les 60px du haut pour supprimer la barre système Android.
2. **Durée 30s** : Si le clip est trop court, il est mis en boucle (`-stream_loop`) pour atteindre exactement 30 secondes.
3. **Flou d'arrière-plan** : Le gameplay est centré sur un fond flouté pour remplir le format 9:16.
4. **Badge TIMALAUS** : Affiché en haut à gauche avec une rotation de -15° pendant les 6 premières secondes.
5. **Badge Google Play** : Affiché centré en bas pendant les 5 dernières secondes.
6. **Rapport de production** : Génère un fichier `.md` détaillant les filtres appliqués pour chaque vidéo.

## 4. Intervention Humaine

1. **Capture (TOM)** : Les sessions doivent être enregistrées via le simulateur ou le téléphone.
2. **Derush** : Le pipeline doit être lancé pour découper les clips.
3. **Validation** : Vérifier le rendu final dans `CHLOE/STORAGE/OUTPUT/` avant publication.

---
**Note sur les coûts** : Une fois les assets créés, la production est **100% locale** et ne génère aucun coût API Gemini ou DALL-E.
