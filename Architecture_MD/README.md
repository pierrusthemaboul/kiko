# 🏗️ Architecture MD - Écosystème d'Entreprises Virtuelles

Bienvenue dans l'écosystème d'entreprises virtuelles agentiques pour Timalaus.

## 📊 Vue d'ensemble

Cet écosystème est composé de **deux entreprises indépendantes** qui collaborent en mode B2B :

```
┌─────────────────────────────────────────────────────────────┐
│                    SHARED/ (Zone commune)                    │
│  • Contrats SLA                                              │
│  • Spécifications API d'échange                              │
│  • Knowledge partagée                                        │
└─────────────────────────────────────────────────────────────┘
           │                                    │
           ▼                                    ▼
┌──────────────────────┐            ┌──────────────────────┐
│   K-Hive Corp        │◄──────────►│  Reporters Corp      │
│   🎯 Marketing       │   B2B      │  📡 Intelligence     │
│   & Communication    │  Exchange  │  Produit & Assets    │
└──────────────────────┘            └──────────────────────┘
```

---

## 🏢 K-Hive Corp

**Mission** : Marketing & Communication digitale pour Timalaus

**Organisation** :
- **Direction (N+2)** : Pierre (CEO) + Nexus (Superviseur IA)
- **Management (N+1)** : Alpha (Stratégie), Beta (Créatif), Gamma (Social), Delta (Data)
- **Opérationnel (N)** : Planner, Copywriter, Visual Maker, Reply Bot, Trend Hunter, Scraper, Analyst

**Points d'échange** :
- 📬 Reçoit : `K-Hive/DATA_INBOX/FROM_REPORTERS/`
- 📤 Envoie : `K-Hive/DATA_OUTBOX/TO_REPORTERS/`

**Voir** : [K-Hive/MANIFEST.md](K-Hive/MANIFEST.md)

---

## 📡 Reporters Corp

**Mission** : Intelligence Produit, Simulation Gameplay, Production d'Assets

**Organisation** :
- **Direction (N+1)** : Lucas (Chief Reporter)
- **Équipe Technique (N)** : Tom (Simulator), Derush (Video Editor)
- **Équipe Investigation (N)** : Sarah (Data Journalist)

**Points d'échange** :
- 📬 Reçoit : `Reporters/DATA_INBOX/FROM_K_HIVE/`
- 📤 Envoie : `Reporters/DATA_OUTBOX/TO_K_HIVE/`

**Voir** : [Reporters/MANIFEST.md](Reporters/MANIFEST.md)

---

## 🔄 Flux de travail typique

### Exemple : Créer une vidéo TikTok sur Napoléon

1. **K-Hive** (Alpha) identifie une opportunité → Crée `REQUEST_001.md` dans `DATA_OUTBOX/TO_REPORTERS/`
   ```
   Commande #001
   Type: Simulation Gameplay
   Sujet: Napoléon - Bataille d'Austerlitz
   Format: 30s, 9:16, 1080p
   Deadline: 24h
   ```

2. **Reporters** (Lucas) reçoit la commande → Délègue à Tom, Sarah, Derush
   - Tom simule la bataille
   - Sarah extrait le contexte historique
   - Derush monte la vidéo

3. **Reporters** livre dans `DATA_OUTBOX/TO_K_HIVE/DELIVERY_001/`
   - `main_video.mp4`
   - `historical_context.md`
   - `METADATA.json`
   - `DELIVERY_REPORT.md` (avec hooks marketing)

4. **K-Hive** (Beta/Gamma) récupère le livrable
   - Léa (Visual Maker) ajoute les overlays TikTok
   - Gamma (Social) planifie la publication
   - Delta (Data) suit les performances

---

## 📋 Documents clés

### Contrats & Specs
- [SLA Reporters ↔ K-Hive](SHARED/CONTRACTS/SLA_REPORTERS_KHIVE.md) - Niveaux de service
- [Format d'échange](SHARED/API_SPECS/DATA_EXCHANGE_FORMAT.md) - Spécifications techniques

### Manuels d'utilisation
- [Manuel K-Hive](K-Hive/MANUEL_UTILISATION.md) - Comment piloter l'équipe marketing
- [Organigramme K-Hive](K-Hive/ORGANIGRAMME_VISUEL.md) - Structure hiérarchique
- [Organigramme Reporters](Reporters/ORGANIGRAMME.md) - Structure hiérarchique

### Knowledge Base
- [Timalaus Bible](K-Hive/KNOWLEDGE_BASE/TIMALAUS_BIBLE.md) - Source de vérité du jeu
- [Gameplay Mechanics](K-Hive/KNOWLEDGE_BASE/GAMEPLAY_MECHANICS.md) - Mécanique détaillée
- [Roadmap](K-Hive/KNOWLEDGE_BASE/ROADMAP.md) - Vision produit

---

## 🚀 Démarrage rapide

### ⚡ Test Reporters (RECOMMANDÉ - 5 minutes)

**Pour produire de vraies vidéos de gameplay** :

```bash
# 1. Brancher le téléphone
adb devices

# 2. Lancer la production
cd /home/pierre/kiko/Architecture_MD/Reporters/TOOLS/
node workflow_reporter.js --duration 120

# 3. Confirmer et jouer 2 minutes sur le téléphone

# 4. Vérifier les clips
ls -lh ../OUTPUTS/clips/
```

**Résultat** : 8 clips MP4 de 15s prêts pour K-Hive

**Guide détaillé** : [Reporters/README_FIRST.md](Reporters/README_FIRST.md)

---

### Lancer une session K-Hive

```bash
# Dans votre chat IA
"Bonjour K-Hive.
Tu es le système d'exploitation de l'entreprise K-Hive située dans `Architecture_MD/K-Hive/`.
Lis ton MANIFEST.md et fais-moi un brief de la journée."
```

### Commander un asset aux Reporters

```bash
# Dans votre chat IA
"Prends le rôle d'Alpha (K-Hive).
Crée une commande REQUEST_XXX.md pour demander aux Reporters une simulation gameplay
sur la Rome Antique (30s, format TikTok).
Dépose le fichier dans DATA_OUTBOX/TO_REPORTERS/."
```

### Traiter une commande (côté Reporters)

```bash
# Dans votre chat IA
"Tu es maintenant Lucas (Chief Reporter).
Vérifie s'il y a des commandes dans DATA_INBOX/FROM_K_HIVE/.
Si oui, assigne les tâches à ton équipe et produis le livrable."
```

---

## 🏗️ Philosophie d'architecture

### Principes clés

1. **Séparation des responsabilités**
   - K-Hive = Client marketing, ne touche pas à la production brute
   - Reporters = Fournisseur technique, ne fait pas de stratégie marketing

2. **Communication formalisée**
   - Pas d'échange direct agents à agents
   - Passage obligatoire par INBOX/OUTBOX
   - Contrats SLA pour cadrer les attentes

3. **Autonomie**
   - Chaque entreprise peut évoluer indépendamment
   - Reporters peut servir d'autres clients
   - K-Hive peut avoir d'autres fournisseurs

4. **Traçabilité**
   - Tous les échanges sont documentés (REQUEST, DELIVERY, LOGS)
   - Historique des productions
   - Métriques de performance

---

## 📈 Prochaines étapes recommandées

### Court terme (Semaine 1)
- [ ] Tester le flux complet avec une vraie commande REQUEST_001
- [ ] Valider que les agents comprennent leurs rôles via les MANIFEST
- [ ] Créer les premiers scripts d'orchestration dans `WORKSHOP/SCRIPTS/`

### Moyen terme (Mois 1)
- [ ] Connecter les APIs externes (TikTok, YouTube Analytics)
- [ ] Automatiser la création des REQUEST via un bot Planner
- [ ] Mettre en place un dashboard de suivi des KPIs

### Long terme (Trimestre 1)
- [ ] Créer une 3ème entreprise "Analytics Corp" dédiée à la data
- [ ] Implémenter un système de feedback loop automatique
- [ ] Développer des agents plus sophistiqués (fine-tuning)

---

## 🤝 Contribution

Cette architecture est en constante évolution. Pour proposer des améliorations :

1. Documentez votre proposition dans `SHARED/`
2. Créez un fichier `PROPOSAL_XXX.md` avec le contexte et les bénéfices
3. Testez sur un cas d'usage réel
4. Mettez à jour les MANIFEST si validation

---

## 📝 Changelog

### Version 1.0 (2026-01-13)
- Restructuration : Reporters sorti de K-Hive
- Création du dossier SHARED/
- Ajout des MANIFEST.md pour chaque entreprise
- Création du SLA et des specs d'échange
- Mise en place des INBOX/OUTBOX

---

**Architecture maintenue par** : Pierre (CEO K-Hive & Architecture Lead)
**Dernière mise à jour** : 2026-01-13
