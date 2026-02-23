# 📚 Documentation pour IA - Machine à Événements

**Dossier centralisé de documentation pour les assistants IA travaillant sur la génération d'images historiques**

---

## 📁 Structure

### 1️⃣ flux_generation/
**Documentation critique sur Flux-Schnell et la génération d'images**

- **MODE_EMPLOI_FLUX.md** ⭐
  - Guide complet de Flux-Schnell
  - Paradoxe des negative prompts
  - Stratégie "Positive Only"
  - Paramètres optimaux par époque

- **CONCLUSIONS_SESSION_FLUX.md** ⭐
  - Session d'analyse du 31/01/2026
  - Les 4 optimisations implémentées
  - Résultats avant/après (50% → 0% anachronismes)

- **GUIDE_ANALYSE_IMAGES.md** ⭐
  - Comment télécharger et analyser les images
  - Utilisation de curl + Read
  - Points d'analyse critiques

- **revue_illustrations.md**
  - Revue des illustrations générées

---

### 2️⃣ agents/
**Documentation du système multi-agents**

- **GENESIS.md** - Agent de génération de prompts
- **SENTINEL.md** - Agent de détection de doublons
- **ARTISAN.md** - Agent de génération d'images
- **REXP.md** - Agent d'export/rapport
- **seed_context.md** - Contexte de démarrage Genesis

---

### 3️⃣ rapports/
**Rapports système et améliorations**

- **SYSTEM_COMPLET_RAPPORT.md** - Vue d'ensemble du système
- **ORCHESTRATOR_GUIDE.md** - Guide d'orchestration des agents
- **AMELIORATIONS_SENTINEL.md** - Améliorations agent Sentinel
- **SENTINEL_AMELIORE_RAPPORT.md** - Rapport Sentinel amélioré

---

### 4️⃣ contexte/
**Contexte général du projet**

- **choix_des_evenements.md** - Critères de sélection des événements
- **MIGRATION_STRATEGY.md** - Stratégie de migration des données

---

## 🎯 Pour Démarrer Rapidement

**Si vous travaillez sur la génération d'images Flux:**
1. Lire **flux_generation/MODE_EMPLOI_FLUX.md** (règles d'or)
2. Lire **flux_generation/CONCLUSIONS_SESSION_FLUX.md** (optimisations)
3. Utiliser **flux_generation/GUIDE_ANALYSE_IMAGES.md** pour analyser

**Si vous travaillez sur le système multi-agents:**
1. Lire **rapports/ORCHESTRATOR_GUIDE.md** (vue d'ensemble)
2. Consulter **agents/[NOM_AGENT].md** selon besoin

---

## ⚠️ Important

- Ces fichiers sont des **COPIES** des originaux
- Les originaux restent à la racine de machine_a_evenements/
- Ne pas modifier ici, modifier les originaux si nécessaire

---

**Dernière mise à jour**: 31 janvier 2026
**Objectif**: Centraliser la documentation pour faciliter le travail des IA assistantes
