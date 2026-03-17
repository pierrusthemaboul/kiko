# 🎬 Workflow Reporters avec Métadonnées Temporelles

**Version** : 2.0.0
**Date** : 2026-01-13
**Nouveauté** : Synchronisation automatique vidéo ↔ événements historiques

---

## 🎯 Vue d'ensemble

Le nouveau système de métadonnées temporelles permet de **synchroniser automatiquement** :
- Les vidéos de gameplay enregistrées
- Les événements historiques joués
- Les choix du joueur (AVANT/APRES)
- Les timecodes précis (au centième de seconde)

**Résultat** : K-Hive reçoit des clips pré-découpés avec toutes les informations contextuelles pour créer du contenu marketing ciblé.

---

## 🔄 Ancien vs Nouveau Workflow

### ❌ Ancien workflow (manuel)

```
1. Enregistrer gameplay (ADB) → raw_gameplay.mp4
2. Découper manuellement en segments de 15s
3. Deviner quel événement est dans quel clip
4. Livrer à K-Hive sans contexte
5. K-Hive ne sait pas ce qu'il y a dans les clips
```

**Problèmes** :
- Aucune synchronisation
- K-Hive doit regarder chaque vidéo manuellement
- Pas d'optimisation thématique possible
- Impossibilité de filtrer par période/sujet

### ✅ Nouveau workflow (automatique)

```
1. Jouer une partie sur téléphone
   → L'app génère automatiquement:
      • raw_gameplay.mp4 (vidéo)
      • session_XXX_metadata.json (timecodes + événements)
      • session_XXX_metadata.txt (version lisible)

2. Découpage automatique synchronisé
   → node derush_clipper_v2.js raw_gameplay.mp4 metadata.json
      • Clip 1 : Napoléon (1804) - 12s - ✅ Correct
      • Clip 2 : Jeanne d'Arc (1429) - 15s - ✅ Correct
      • Clip 3 : Occupation zone libre (1942) - 18s - ❌ Incorrect

3. Manifest de delivery pour K-Hive
   → DELIVERY_MANIFEST.json contient:
      • Titre, date, description de chaque événement
      • Hooks marketing pré-générés
      • Métadonnées pour ciblage thématique
```

**Avantages** :
- Synchronisation parfaite
- K-Hive sait exactement ce qu'il y a dans chaque clip
- Filtrage par période/thème possible
- Hooks marketing automatiques
- Storytelling optimisé (réponses correctes vs incorrectes)

---

## 📁 Fichiers générés

### 1. Par l'app React Native (automatique)

Quand une partie se termine, l'app génère **automatiquement** :

```
/storage/emulated/0/Android/data/com.yourapp/files/game_sessions/
├── session_1768314915411_metadata.json   ← Métadonnées complètes
└── session_1768314915411_metadata.txt    ← Version lisible
```

**Contenu du JSON** :
```json
{
  "session_id": "session_1768314915411",
  "mode": "Classique",
  "start_time": 1768314915411,
  "end_time": 1768315057411,
  "duration_seconds": 142,
  "user_name": "Pierre",
  "resultat": "victoire",
  "score_final": 6308,
  "total_events": 6,
  "accuracy_percent": 100,

  "events_timeline": [
    {
      "tour": 1,
      "event_id": "a6eea4bf-5664-487c-ac41-4509303c1cbc",
      "event_titre": "Loi de séparation des Églises et de l'État",
      "event_date": "1905-12-09",
      "event_description": "Le 9 décembre 1905...",
      "event_types": ["Politique", "Religieux"],
      "event_notoriete": 94,

      "timecode_apparition": 0,
      "timecode_choix": 12.5,
      "duree_reflexion": 12.5,

      "choix": "après",
      "correct": true,

      "event_reference_id": null,
      "event_reference_date": null
    },
    {
      "tour": 2,
      "event_id": "6e2c5fa8-2e02-46c7-9f29-f6cd987a853f",
      "event_titre": "Occupation de la zone libre par les Allemands",
      "event_date": "1942-11-11",

      "timecode_apparition": 15.2,
      "timecode_choix": 28.7,
      "duree_reflexion": 13.5,

      "choix": "après",
      "correct": true,

      "event_reference_id": "a6eea4bf-5664-487c-ac41-4509303c1cbc",
      "event_reference_date": "1905-12-09"
    }
  ]
}
```

### 2. Par Reporters (traitement)

Reporters prend ces métadonnées et génère :

```
Architecture_MD/Reporters/OUTPUTS/clips/
├── session_1768314915411_tour1_Loi_separation_Eglises_Etat.mp4
├── session_1768314915411_tour2_Occupation_zone_libre.mp4
├── session_1768314915411_tour3_Victoire_Jeanne_Arc.mp4
├── ...
└── session_1768314915411_DELIVERY_MANIFEST.json  ← Pour K-Hive
```

**Contenu du DELIVERY_MANIFEST.json** :
```json
{
  "session_id": "session_1768314915411",
  "video_source": "raw_gameplay_1768314915411.mp4",
  "total_duration": 142,

  "metadata": {
    "mode": "Classique",
    "user": "Pierre",
    "score": 6308,
    "level": 3,
    "resultat": "victoire",
    "accuracy": 100
  },

  "clips": [
    {
      "clip_id": "clip_1",
      "filename": "session_1768314915411_tour1_Loi_separation_Eglises_Etat.mp4",
      "tour": 1,
      "timecode_start": 0,
      "timecode_end": 13.5,
      "duration": 13.5,

      "evenement": {
        "titre": "Loi de séparation des Églises et de l'État",
        "date": "1905-12-09",
        "description": "Le 9 décembre 1905...",
        "types": ["Politique", "Religieux"],
        "notoriete": 94
      },

      "choix": {
        "reponse": "après",
        "correct": true,
        "duree_reflexion": 12.5
      },

      "hook_suggere": "📅 1905 : Loi de séparation des Églises et de l'État"
    }
  ]
}
```

---

## 🚀 Workflow Complet

### Étape 1 : Enregistrer une session de jeu

```bash
# Option A : Enregistrement manuel avec ADB
cd Architecture_MD/Reporters/TOOLS/
node tom_simulator.js --duration 120

# Option B : Enregistrement automatisé (recommandé)
node workflow_reporter.js --duration 120 --count 1
```

**Résultat** :
- `ASSETS_RAW/raw_gameplay_SESSION_ID.mp4`
- Pendant ce temps, l'app génère automatiquement les métadonnées

### Étape 2 : Récupérer les métadonnées depuis le téléphone

```bash
# Identifier le session_id de la partie jouée
SESSION_ID="session_1768314915411"

# Récupérer les métadonnées depuis le téléphone via ADB
adb pull /storage/emulated/0/Android/data/com.timalaus/files/game_sessions/${SESSION_ID}_metadata.json ASSETS_RAW/
adb pull /storage/emulated/0/Android/data/com.timalaus/files/game_sessions/${SESSION_ID}_metadata.txt ASSETS_RAW/

# Alternative : Utiliser le script de récupération
node tools/fetch_metadata.js $SESSION_ID
```

**Note** : Le session_id est affiché dans les logs de l'app :
```
[GameMetadata] 🎬 Session démarrée: session_1768314915411
```

### Étape 3 : Découper automatiquement avec métadonnées

```bash
cd Architecture_MD/Reporters/TOOLS/

node derush_clipper_v2.js \
  ../ASSETS_RAW/raw_gameplay_session_1768314915411.mp4 \
  ../ASSETS_RAW/session_1768314915411_metadata.json
```

**Résultat** :
```
🎬 DERUSH CLIPPER V2 : "Découpage intelligent avec métadonnées"
   📹 Vidéo source : raw_gameplay_session_1768314915411.mp4
   📄 Métadonnées : session_1768314915411_metadata.json
   📁 Destination : OUTPUTS/clips/

   ⏱️  Durée vidéo : 142.0s
   📊 Session ID : session_1768314915411
   🎮 Mode : Classique
   🏆 Résultat : VICTOIRE

📋 Découpage en 6 clips (1 par événement)

   Clip 1/6 : Tour 1
      📅 Événement : Loi de séparation des Églises et de l'État (1905-12-09)
      ⏱️  Timecode : 0.0s → 13.5s (13.5s)
      🎯 Choix : APRÈS ✅ (12.5s)
      ✅ Créé : session_1768314915411_tour1_Loi_separation_Eglises_Etat.mp4

   Clip 2/6 : Tour 2
      📅 Événement : Occupation de la zone libre par les Allemands (1942-11-11)
      ⏱️  Timecode : 15.2s → 29.7s (14.5s)
      🎯 Choix : APRÈS ✅ (13.5s)
      ✅ Créé : session_1768314915411_tour2_Occupation_zone_libre.mp4

✅ DÉCOUPAGE TERMINÉ

📦 LIVRABLES POUR K-HIVE :
   📁 OUTPUTS/clips/
   📹 6 clips vidéo
   📄 1 manifest de delivery
```

### Étape 4 : Valider et livrer à K-Hive

```bash
# Valider les clips
node lucas_validator.js ../OUTPUTS/clips/session_1768314915411_*.mp4

# Créer le dossier de livraison
DELIVERY_ID="DELIVERY_$(date +%s)"
mkdir -p ../DATA_OUTBOX/TO_K_HIVE/$DELIVERY_ID

# Copier les clips et le manifest
cp ../OUTPUTS/clips/session_1768314915411_*.mp4 ../DATA_OUTBOX/TO_K_HIVE/$DELIVERY_ID/
cp ../OUTPUTS/clips/session_1768314915411_DELIVERY_MANIFEST.json ../DATA_OUTBOX/TO_K_HIVE/$DELIVERY_ID/

# Créer le README pour K-Hive
cat > ../DATA_OUTBOX/TO_K_HIVE/$DELIVERY_ID/README.md <<EOF
# Livraison Reporters → K-Hive

**Date** : $(date)
**Session ID** : session_1768314915411
**Clips** : 6
**Format** : MP4, 1080p, 9:16

## Contenu

Voir \`DELIVERY_MANIFEST.json\` pour les détails complets.

Chaque clip contient :
- 1 événement historique précis
- Titre, date, description
- Hook marketing pré-généré
- Métadonnées de ciblage

## Utilisation K-Hive

1. Lire le DELIVERY_MANIFEST.json
2. Filtrer par thème/période si besoin
3. Ajouter overlays TikTok (titre, date)
4. Publier avec le hook suggéré
EOF

echo "✅ Livraison prête dans: DATA_OUTBOX/TO_K_HIVE/$DELIVERY_ID"
```

---

## 💡 Cas d'usage K-Hive

### 1. Créer une série TikTok sur Napoléon

```javascript
// K-Hive lit le manifest
const manifest = require('./DELIVERY_MANIFEST.json');

// Filtrer les clips sur Napoléon
const napoleonClips = manifest.clips.filter(clip =>
  clip.evenement.titre.toLowerCase().includes('napoléon') ||
  clip.evenement.date.startsWith('18')  // 1800s
);

// Créer des posts TikTok
napoleonClips.forEach(clip => {
  createTikTokPost({
    video: clip.filename,
    caption: clip.hook_suggere,
    hashtags: ['#histoire', '#napoleon', '#timalaus'],
    overlay: {
      title: clip.evenement.titre,
      date: clip.evenement.date,
    }
  });
});
```

### 2. Créer un carrousel Instagram "Réponses incorrectes"

```javascript
const incorrectClips = manifest.clips.filter(clip =>
  clip.choix && !clip.choix.correct
);

createInstagramCarousel({
  title: "Les pièges de l'histoire !",
  clips: incorrectClips,
  caption: `${incorrectClips.length} événements trompeurs ! Combien auriez-vous eu bon ? 🤔`
});
```

### 3. Créer un thread Twitter éducatif

```javascript
const educationalThread = manifest.clips.map(clip => ({
  tweet: `📅 ${clip.evenement.date.split('-')[0]} : ${clip.evenement.titre}

${clip.evenement.description}

Notoriété : ${clip.evenement.notoriete}/100
${clip.choix.correct ? '✅' : '❌'} Réponse : ${clip.choix.reponse.toUpperCase()}`,
  media: clip.filename
}));

postThread(educationalThread);
```

---

## 🔧 Scripts utilitaires

### Récupérer les métadonnées depuis le téléphone

```bash
# tools/fetch_metadata.js
#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');

const sessionId = process.argv[2];
if (!sessionId) {
  console.error('Usage: node fetch_metadata.js <session_id>');
  process.exit(1);
}

const remotePath = `/storage/emulated/0/Android/data/com.timalaus/files/game_sessions`;
const localPath = path.join(__dirname, '../ASSETS_RAW');

try {
  execSync(`adb pull ${remotePath}/${sessionId}_metadata.json ${localPath}/`);
  execSync(`adb pull ${remotePath}/${sessionId}_metadata.txt ${localPath}/`);
  console.log(`✅ Métadonnées récupérées: ${sessionId}`);
} catch (error) {
  console.error(`❌ Erreur: ${error.message}`);
}
```

### Lister les sessions disponibles

```bash
# Lister les métadonnées sur le téléphone
adb shell ls -lh /storage/emulated/0/Android/data/com.timalaus/files/game_sessions/

# Lister les métadonnées locales
ls -lh Architecture_MD/Reporters/ASSETS_RAW/*_metadata.json
```

---

## 📊 Métriques et Performance

### Avant (workflow manuel)

- Temps de production : **30-60 min** pour 3 parties
- Précision de découpage : **❌ Variable**
- Contexte disponible : **❌ Aucun**
- Exploitation K-Hive : **⚠️ Limitée**

### Après (workflow automatisé)

- Temps de production : **5 min** pour 1 partie
- Précision de découpage : **✅ Parfaite (0.01s)**
- Contexte disponible : **✅ Complet**
- Exploitation K-Hive : **✅ Maximale**

---

## 🎯 Prochaines améliorations

### Court terme (Semaine 1)
- [ ] Script automatique de récupération des métadonnées
- [ ] Validation automatique des timecodes
- [ ] Génération de thumbnails pour chaque clip

### Moyen terme (Mois 1)
- [ ] Génération de hooks marketing AI-powered
- [ ] Filtrage intelligent par thème/période
- [ ] Export direct vers K-Hive DATA_INBOX

### Long terme (Trimestre 1)
- [ ] Génération automatique de vidéos TikTok complètes (overlays inclus)
- [ ] Système de recommandation de contenu basé sur les tendances
- [ ] Dashboard de monitoring de la production

---

**Maintenu par** : Reporters Corp
**Support** : [TOOLS_MANIFEST.md](TOOLS_MANIFEST.md)
