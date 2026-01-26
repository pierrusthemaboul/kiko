# 🔄 Spécifications d'échange de données
## K-Hive ↔ Reporters

Ce document définit les formats standards pour la communication entre les deux entreprises.

---

## 1. Commandes (K-Hive → Reporters)

### 1.1 Fichier REQUEST
**Chemin** : `Reporters/DATA_INBOX/FROM_K_HIVE/REQUEST_XXX.md`

**Template** :
```markdown
# Commande #XXX

## Informations générales
- **Client** : K-Hive
- **Date de commande** : YYYY-MM-DD HH:mm
- **Agent demandeur** : [Alpha/Beta/Gamma/Delta]
- **Deadline souhaitée** : YYYY-MM-DD HH:mm
- **Priorité** : [Normal/Urgent/Critique]

## Type de prestation
- [ ] Simulation Gameplay
- [ ] Intelligence Produit
- [ ] Montage Vidéo
- [ ] Asset Brut (Screenshot, Audio)

## Spécifications

### Sujet
[Description précise : période historique, événement, personnage, etc.]

### Format souhaité
- **Durée** : [15s / 30s / 60s / Autre]
- **Ratio** : [9:16 TikTok / 16:9 YouTube / 1:1 Instagram]
- **Résolution** : [720p / 1080p / 4K]

### Mode de jeu
- [ ] Mode Classique
- [ ] Mode Précision
- [ ] Mode Survie
- [ ] Autre : _______

### Contraintes créatives
[Optionnel : angle narratif, éléments à mettre en avant, tone of voice, etc.]

## Contexte marketing
**Objectif de campagne** : [Awareness / Engagement / Conversion / Education]
**Plateforme cible** : [TikTok / YouTube / Instagram / Plusieurs]
**Public cible** : [Ados / Jeunes adultes / Profs / Grand public]

## Budget alloué
- **Nombre de simulations** : [1-5]
- **Temps de montage** : [Simple / Moyen / Complexe]
- **Recherche contexte** : [Oui / Non]

## Notes additionnelles
[Tout élément utile pour la production]

---
**Signature** : [Nom de l'agent K-Hive]
```

### 1.2 Accusé de réception
**Chemin** : `Reporters/DATA_INBOX/FROM_K_HIVE/ACK_XXX.md`

**Format** :
```markdown
# Accusé de Réception - Commande #XXX

- **Prise en charge** : ✅ Confirmée
- **Date/heure** : YYYY-MM-DD HH:mm
- **Responsable** : Lucas
- **Agent assigné** : [Tom / Sarah / Derush]
- **Délai estimé** : [X heures]
- **Statut** : EN COURS

---
*Vous serez notifié lors de la livraison dans `DATA_OUTBOX/TO_K_HIVE/DELIVERY_XXX/`*
```

---

## 2. Livrables (Reporters → K-Hive)

### 2.1 Structure du dossier DELIVERY
**Chemin** : `Reporters/DATA_OUTBOX/TO_K_HIVE/DELIVERY_XXX/`

**Contenu** :
```
DELIVERY_XXX/
├── DELIVERY_REPORT.md          # Rapport de livraison
├── METADATA.json               # Métadonnées techniques
├── assets/
│   ├── main_video.mp4         # Asset principal
│   ├── thumbnail.jpg          # Miniature (optionnel)
│   ├── subtitles.srt          # Sous-titres (optionnel)
│   └── raw_footage.mp4        # Footage brut (si demandé)
└── context/
    ├── historical_context.md  # Contexte historique
    └── game_stats.json        # Stats extraites du jeu
```

### 2.2 DELIVERY_REPORT.md
**Template** :
```markdown
# 📦 Rapport de Livraison - Commande #XXX

## Résumé
- **Commande liée** : REQUEST_XXX
- **Date de livraison** : YYYY-MM-DD HH:mm
- **Délai respecté** : ✅ / ⚠️ (retard de Xh)

## Assets livrés
1. **main_video.mp4** - Vidéo principale (30s, 1080p, 9:16)
2. **thumbnail.jpg** - Miniature haute résolution
3. **historical_context.md** - Contexte Bataille d'Austerlitz

## Détails de production

### Simulation
- **Mode** : Classique
- **Thème** : Napoléon - Austerlitz (1805)
- **Durée de jeu** : 2min30
- **Résultat** : Victoire (Score: 15,420 pts)

### Montage
- **Logiciel** : ffmpeg + scripts custom
- **Effets** : Cuts dynamiques, ralentis x2 sur moments clés
- **Audio** : Musique épique du jeu + mix voix off (optionnel)

### Contexte recherché
- **Sources** : Wikipedia FR/EN, KNOWLEDGE_BASE/TIMALAUS_BIBLE.md
- **Facts vérifiés** : 3 faits historiques + 2 faits gameplay

## Recommandations marketing

### Hooks identifiés
1. "Napoléon a gagné Austerlitz en 9h. Combien de temps te faut-il dans Timalaus ?"
2. "La bataille des 3 empereurs, rejouée sur ton téléphone"
3. "15,000 points = niveau Napoléon. T'es capable ?"

### Plateformes recommandées
- ✅ **TikTok** : Format parfait, trending #History
- ✅ **YouTube Shorts** : Audience éducative forte
- ⚠️ **Instagram** : Moins de traction sur ce thème

### Timing optimal
- **Meilleur jour** : Jeudi-Vendredi (engagement +20%)
- **Meilleure heure** : 18h-21h (cible ados/jeunes adultes)

## Notes de production
[Éventuels problèmes rencontrés, suggestions d'amélioration, etc.]

---
**Validé par** : Lucas (Chief Reporter)
**Agents contributeurs** : Tom (Simulation), Sarah (Contexte), Derush (Montage)
```

### 2.3 METADATA.json
**Format** :
```json
{
  "delivery": {
    "id": "001",
    "request_id": "001",
    "date": "2026-01-13T14:30:00Z",
    "status": "completed",
    "validated_by": "Lucas"
  },
  "assets": {
    "main": {
      "filename": "main_video.mp4",
      "type": "video/mp4",
      "duration_seconds": 30,
      "resolution": "1080x1920",
      "fps": 30,
      "size_mb": 12.5,
      "codec": "H.264"
    },
    "thumbnail": {
      "filename": "thumbnail.jpg",
      "type": "image/jpeg",
      "resolution": "1080x1920",
      "size_kb": 450
    }
  },
  "content": {
    "theme": "Napoléon - Bataille d'Austerlitz",
    "period": "1805",
    "game_mode": "Classique",
    "difficulty": "Moyen",
    "tags": ["histoire", "napoleon", "guerre", "strategie"]
  },
  "production": {
    "simulation_time_minutes": 2.5,
    "editing_time_minutes": 15,
    "research_time_minutes": 10,
    "total_production_hours": 0.6,
    "agents": ["Tom", "Sarah", "Derush"]
  },
  "marketing": {
    "platforms": ["TikTok", "YouTube Shorts"],
    "target_audience": "15-25 ans",
    "content_type": "Educational Gaming",
    "viral_potential": "high"
  }
}
```

---

## 3. Statuts & Codes

### 3.1 Statuts de commande
| Code | Signification | Visibilité |
|------|---------------|------------|
| `RECEIVED` | Commande reçue, pas encore traitée | K-Hive |
| `ACKNOWLEDGED` | Prise en charge confirmée | K-Hive & Reporters |
| `IN_PROGRESS` | En cours de production | Reporters |
| `REVIEW` | En validation par Lucas | Reporters |
| `DELIVERED` | Livré dans OUTBOX | K-Hive & Reporters |
| `ACCEPTED` | Validé par K-Hive | K-Hive |
| `REJECTED` | Refusé, correction nécessaire | K-Hive & Reporters |

### 3.2 Codes de priorité
| Code | Délai SLA | Usage |
|------|-----------|-------|
| `NORMAL` | Standard (24h-48h) | Production planifiée |
| `URGENT` | Réduit (12h-24h) | Opportunité trending |
| `CRITICAL` | Immédiat (4h) | Gestion de crise |

---

## 4. Conventions de nommage

### 4.1 Fichiers de commande
`REQUEST_[ID]_[DATE].md`
- Exemple : `REQUEST_001_20260113.md`

### 4.2 Fichiers de livraison
`DELIVERY_[ID]_[THEME_SLUG].md`
- Exemple : `DELIVERY_001_napoleon_austerlitz.md`

### 4.3 Assets vidéo
`[theme]_[duration]_[resolution]_v[version].mp4`
- Exemple : `napoleon_austerlitz_30s_1080p_v1.mp4`

---

## 5. Notifications

### 5.1 Système de flag
Pour signaler qu'un fichier est prêt à être lu par l'autre entreprise, créer un fichier `.ready` :

**K-Hive** : `REQUEST_001.md` + `REQUEST_001.ready`
**Reporters** : `DELIVERY_001/` + `DELIVERY_001.ready`

### 5.2 Logs d'échange
Chaque entreprise maintient un fichier `EXCHANGE_LOG.md` :

```markdown
# Log d'échanges

## 2026-01-13
- 10:30 - [OUT] REQUEST_001 envoyé à Reporters (Napoléon Austerlitz)
- 10:45 - [IN] ACK_001 reçu de Reporters (Délai: 24h)
- 14:30 - [IN] DELIVERY_001 reçu de Reporters (Qualité: ✅)

## 2026-01-14
- 09:00 - [OUT] REQUEST_002 envoyé à Reporters (Renaissance Florence)
```

---

## 6. Versioning

Ce document suit le versioning sémantique :
- **Version actuelle** : 1.0.0
- **Dernière mise à jour** : 2026-01-13
- **Prochaine révision prévue** : 2026-02-01

---

**Maintenu par** : Pierre (Architecture Lead)
