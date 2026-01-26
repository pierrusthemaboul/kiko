# 📋 Service Level Agreement (SLA)
## Reporters Corp → K-Hive Corp

**Date d'entrée en vigueur** : Janvier 2026
**Parties** : Reporters Corp (Fournisseur) & K-Hive Corp (Client)

---

## 1. Services couverts

**⚠️ PRINCIPE FONDAMENTAL** : Reporters fournit de la **matière première BRUTE uniquement**. Pas de création de contenu marketing, pas de post-production créative.

### 1.1 Capture Gameplay Brut
- **Livrable** : Vidéo MP4 BRUTE de gameplay Timalaus (non éditée)
- **Délai standard** : 24h après réception de la commande
- **Durées** : 30s, 60s, 120s (ou custom)
- **Type de partie** : Gagnante (6/6) ou Perdante (avec erreur)
- **Mode de jeu** : Classique (focus principal), Précision, Survie
- **Format** : MP4 H.264, minimum 720p, 24fps
- ⚠️ **PAS de** : musique ajoutée, transitions, overlays, texte

### 1.2 Screenshots Gameplay
- **Livrable** : Images PNG brutes du jeu en cours
- **Délai standard** : 2h après réception (capture en direct)
- **Formats** : PNG, minimum 720x1280
- **Types** : Écran de jeu, moment de victoire/défaite, carte événement
- ⚠️ **PAS de** : retouches, filtres, overlays, crop créatif

### 1.3 Découpage Technique Vidéo
- **Livrable** : Segments vidéo découpés depuis un rush brut
- **Délai standard** : 6h après réception du rush
- **Opérations** : Découpage, extraction de frames, nettoyage technique (bugs/menus)
- ⚠️ **PAS de** : transitions, effets, musique, sous-titres, logo

### 1.4 Extraction de Données Techniques
- **Livrable** : Fichier JSON avec données factuelles extraites
- **Délai standard** : 4h après réception screenshot/vidéo
- **Contenu** : Score, dates, événements affichés, mode de jeu, durée de partie
- **Méthode** : OCR automatique ou parsing visuel
- ⚠️ **PAS de** : interprétation marketing, suggestions stratégiques, storytelling

---

## 2. Format des commandes

### 2.1 Fichier de commande
- **Localisation** : `Reporters/DATA_INBOX/FROM_K_HIVE/REQUEST_XXX.md`
- **Numérotation** : Séquentielle (REQUEST_001, REQUEST_002...)
- **Champs obligatoires** :
  ```markdown
  # Commande #XXX
  Client: K-Hive
  Date: YYYY-MM-DD
  Type: [Capture Gameplay | Screenshot | Découpage | Extraction Data]

  ## Specs
  Mode de jeu: [Classique / Précision / Survie]
  Type de partie: [Gagnante / Perdante]
  Durée: [30s / 60s / 120s / Custom]
  Thème/Période: [Optionnel : ex "Napoléon", "Rome Antique"]

  Deadline: [YYYY-MM-DD HH:mm]
  Priorité: [Normal / Urgent]

  ## Notes
  [Précisions techniques si nécessaire]
  ```

### 2.2 Validation de commande
Reporters Corp confirme la prise en charge sous **2h** en créant un fichier `ACK_XXX.md` dans le même dossier.

---

## 3. Format des livrables

### 3.1 Structure de livraison
- **Localisation** : `Reporters/DATA_OUTBOX/TO_K_HIVE/DELIVERY_XXX/`
- **Contenu minimum** :
  - Asset principal (vidéo, rapport, etc.)
  - `METADATA.json` (durée, résolution, thème, etc.)
  - `DELIVERY_REPORT.md` (notes de production, suggestions)

### 3.2 Exemple METADATA.json
```json
{
  "delivery_id": "001",
  "request_id": "001",
  "date": "2026-01-13",
  "type": "simulation",
  "asset": "napoleon_austerlitz_30s.mp4",
  "specs": {
    "duration": "30s",
    "resolution": "1080x1920",
    "format": "mp4",
    "theme": "Napoléon - Austerlitz"
  },
  "produced_by": ["Tom", "Derush"],
  "validated_by": "Lucas"
}
```

---

## 4. Niveaux de priorité

| Priorité | Délai de livraison | Cas d'usage |
|-----------|-------------------|-------------|
| **Normal** | Selon SLA standard | Production éditoriale planifiée |
| **Urgent** | Délai divisé par 2 | Trending topic, opportunité virale |
| **Critique** | 4h maximum | Gestion de crise, correction |

---

## 5. Garanties de qualité

### 5.1 Standards techniques
- Vidéos : Minimum 720p, 30fps, format H.264
- Audio : Clair, sans distorsion, volume normalisé
- Rapports : Markdown formaté, sources vérifiées

### 5.2 Exactitude produit
- Toutes les données gameplay doivent refléter le jeu réel
- Les contextes historiques doivent être sourcés (Wikipedia, docs internes)
- Validation par Lucas avant livraison

### 5.3 Droit de refus
K-Hive peut refuser un livrable si :
- Qualité technique insuffisante
- Données incorrectes par rapport au jeu
- Non-conformité au brief

En cas de refus, Reporters Corp dispose de **12h** pour corriger.

---

## 6. Communication

### 6.1 Point de contact
- **Reporters** : Lucas (Chief Reporter)
- **K-Hive** : Alpha (Lead Stratégie)

### 6.2 Réunions
- **Hebdomadaire** : Sync planning & retours qualité
- **Ad-hoc** : Pour les commandes Urgentes/Critiques

---

## 7. Évolution du contrat

Ce SLA peut être amendé d'un commun accord. Toute modification doit être documentée dans ce fichier avec :
- Date de la modification
- Nature du changement
- Validation des deux parties

---

**Signatures virtuelles :**
- ✅ Lucas (Reporters Corp) - Janvier 2026
- ✅ Pierre/Nexus (K-Hive Corp) - Janvier 2026
