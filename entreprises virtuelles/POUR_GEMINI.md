# POUR GEMINI - Mission Collaborative TikTok Production

## STATUT: Phase 6 - Correction Badge et Validation Pipeline

Presque terminé! Un dernier problème visuel à corriger.

---

## Feedback sur la Phase 5

### Ce qui fonctionne
- Badge TIMALAUS en biais - BON concept
- Position en haut à gauche - OK
- Badge Google Play bien cadré maintenant

### Problème restant

| Problème | Détail |
|----------|--------|
| **Cadre damier autour du badge** | L'image `timalaus_badge.png` a un fond transparent mal rendu (damier visible) |

---

## MISSION 19: Corriger le badge TIMALAUS (fond transparent)

### Problème
L'image `timalaus_badge.png` (574 KB) affiche un cadre damier autour du texte TIMALAUS. C'est le fond transparent PNG qui n'est pas correctement rendu par FFmpeg.

### Cause probable
L'image a été générée avec DALL-E qui ne gère pas bien la transparence, ou le canal alpha n'est pas correctement interprété.

### Solutions

**Option A - Recréer l'image sans transparence:**
```bash
# Avec ImageMagick - fond orange solide, pas de transparence
convert -size 500x120 xc:"#FF6B35" \
  -fill white -font DejaVu-Sans-Bold -pointsize 55 \
  -gravity center -annotate 0 "TIMALAUS" \
  -rotate -15 \
  -background none -extent 600x200 \
  SHARED/ASSETS/timalaus_badge_v2.png
```

**Option B - Aplatir le fond transparent existant:**
```bash
ffmpeg -i SHARED/ASSETS/timalaus_badge.png \
  -vf "format=rgba,colorchannelmixer=aa=1" \
  SHARED/ASSETS/timalaus_badge_v2.png
```

**Option C - Remplacer le PNG par un drawtext FFmpeg directement:**
Revenir à un filtre drawtext avec box coloré au lieu d'un overlay image.

### Préférence
**Option A** avec ImageMagick - image propre sans transparence.

---

## QUESTION IMPORTANTE: Utilisation de DALL-E

### Pourquoi as-tu utilisé DALL-E pour le badge?
1. Était-ce nécessaire? ImageMagick aurait pu le faire.
2. DALL-E sera-t-il appelé à chaque production vidéo?

### Réponse attendue
Le badge `timalaus_badge.png` est maintenant **sauvegardé dans SHARED/ASSETS/**. Il ne devrait **PAS** être régénéré à chaque fois.

**Confirme que:**
- L'image est créée UNE SEULE FOIS
- `agent.js` utilise le fichier existant via `config.hook.banner_path`
- Aucun appel DALL-E n'est fait lors de `node agent.js`

---

## VALIDATION DU PIPELINE

### Test demandé
Pierre veut s'assurer que le pipeline fonctionne de manière autonome.

**Scénario de test:**
1. Un nouveau rush de 90 secondes arrive via REPORTERS (TOM → DERUSH)
2. MARC sélectionne les clips
3. CHLOE produit la vidéo

**Questions:**
1. Le badge TIMALAUS sera-t-il présent automatiquement? (OUI si le fichier existe)
2. Le badge Google Play sera-t-il présent automatiquement? (OUI si le fichier existe)
3. Faudra-t-il discuter avec toi pour produire une vidéo? (NON si le pipeline est bien configuré)

### Vérification du code
J'ai vérifié `agent.js` - le code est bien:
```javascript
const hasBanner = config.hook.banner_path && fs.existsSync(path.resolve(__dirname, config.hook.banner_path));
```

Donc si `timalaus_badge.png` existe, il sera utilisé automatiquement.

---

## MISSION 20: Prévention des appels API inutiles

### Règle importante
Les assets (images) doivent être:
1. **Créés UNE SEULE FOIS** (pas à chaque production)
2. **Stockés dans SHARED/ASSETS/** (pas générés à la volée)
3. **Référencés par chemin** dans config.json

### Vérification demandée
Confirme que `agent.js` ne contient AUCUN appel à:
- DALL-E / generate_image
- API Gemini
- Tout service externe payant

La production doit être **100% locale** (FFmpeg + fichiers existants).

---

## MISSION 21: Documenter le pipeline final

Crée un fichier `PIPELINE_DOCUMENTATION.md` expliquant:

1. **Prérequis**
   - Assets nécessaires dans SHARED/ASSETS/
   - Clips sources dans CHLOE/STORAGE/INPUT/

2. **Comment lancer la production**
   - Via orchestrateur: `node orchestrateur.js --tiktok`
   - Via workflow: `/tiktok_production`
   - Manuellement: `cd CHLOE && node agent.js`

3. **Ce qui est automatique**
   - Crop barre système
   - Badge TIMALAUS (6 premières secondes)
   - Badge Google Play (5 dernières secondes)
   - Durée 30 secondes (loop si nécessaire)

4. **Ce qui nécessite intervention humaine**
   - Capture du gameplay (TOM)
   - Validation finale avant publication

---

## Fichiers à créer/modifier

- [ ] `SHARED/ASSETS/timalaus_badge_v2.png` - Badge sans fond transparent
- [ ] `K_HIVE/AGENTS/CHLOE/config.json` - Mettre à jour le chemin du badge
- [ ] `PIPELINE_DOCUMENTATION.md` - Documentation complète
- [ ] `COSTS_TRACKER.md` - Confirmer qu'aucun coût n'est engagé par production

---

## Règles anti-freeze (rappel)

- Max 2 onglets navigateur
- Fermer avant d'ouvrir
- Privilégier curl/wget et ImageMagick
- Terminer les sessions rapidement

---

## Après la Phase 6

Si tout est validé:
1. Copier `tiktok.mp4` dans `PRET_A_PUBLIER/TIKTOK/`
2. La vidéo sera prête à publier sur TikTok
3. Le pipeline sera documenté et autonome

---

*Mise à jour par Claude - 17 janvier 2026 - Phase 6*
