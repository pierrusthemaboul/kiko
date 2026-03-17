# 📚 Index de la Documentation - Reporters Corporation

**Guide pour retrouver rapidement les informations**

---

## 🎯 Je veux...

### → Tester rapidement (5 minutes)
**Lire** : [README_FIRST.md](README_FIRST.md)

**Commande** :
```bash
cd /home/pierre/kiko/Architecture_MD/Reporters/TOOLS/
node workflow_reporter.js --duration 120
```

---

### → Comprendre la mission de Reporters
**Lire** : [MANIFEST.md](MANIFEST.md)

**Résumé** : Produire matière première brute SANS créativité

---

### → Voir tous les outils disponibles
**Lire** : [TOOLS_MANIFEST.md](TOOLS_MANIFEST.md)

**Principaux outils** :
- `workflow_reporter.js` - Orchestrateur complet
- `tom_simulator_v2.js` - Enregistrement avec progression
- `tom_api_simulator.js` - Simulation sans téléphone

---

### → Produire pour 1 semaine/1 mois
**Lire** : [QUICKSTART_WORKFLOW.md](QUICKSTART_WORKFLOW.md)

**Exemples** :
- 1 semaine : `node workflow_reporter.js --count 5 --duration 180`
- 1 mois : `node workflow_reporter.js --count 15 --duration 180`

---

### → Comprendre les indicateurs de progression
**Lire** : [PROGRESS_INDICATORS_ADDED.md](PROGRESS_INDICATORS_ADDED.md)

**Ce qui a été ajouté** :
- Barres de progression
- Pourcentages
- Temps restant

---

### → Savoir si le téléphone est nécessaire
**Lire** : [REPONSE_TEST_TELEPHONE.md](REPONSE_TEST_TELEPHONE.md)

**Résumé** :
- Avec téléphone → Vraies vidéos MP4
- Sans téléphone (API) → Données JSON

---

### → Utiliser l'API (sans téléphone)
**Lire** : [../../api/README.md](../../api/README.md)

**Commande** :
```bash
cd TOOLS/
node tom_api_simulator.js --count 10
```

---

## 📁 Liste complète des fichiers

### Documentation principale
| Fichier | Description | Quand le lire |
|---------|-------------|---------------|
| [README_FIRST.md](README_FIRST.md) | Guide de démarrage rapide | **PREMIER fichier à lire** |
| [MANIFEST.md](MANIFEST.md) | Identité de Reporters | Pour comprendre la mission |
| [TOOLS_MANIFEST.md](TOOLS_MANIFEST.md) | Catalogue des outils | Pour voir tous les outils |
| [QUICKSTART_WORKFLOW.md](QUICKSTART_WORKFLOW.md) | Guide complet du workflow | Pour production avancée |

---

### Documentation technique
| Fichier | Description | Quand le lire |
|---------|-------------|---------------|
| [PROGRESS_INDICATORS_ADDED.md](PROGRESS_INDICATORS_ADDED.md) | Détails des barres de progression | Pour comprendre les indicateurs |
| [REPONSE_TEST_TELEPHONE.md](REPONSE_TEST_TELEPHONE.md) | FAQ téléphone vs API | Pour choisir la méthode |
| [DOCUMENTATION_INDEX.md](DOCUMENTATION_INDEX.md) | Ce fichier | Pour naviguer la doc |

---

### Outils (dans TOOLS/)
| Fichier | Description | Usage |
|---------|-------------|-------|
| `workflow_reporter.js` | Orchestrateur principal | Production complète |
| `tom_simulator_v2.js` | Enregistrement avec progression | Enregistrement seul |
| `tom_api_simulator.js` | Simulation sans téléphone | Données JSON |
| `progress_bar.js` | Module de progression | Utilisé par autres scripts |
| `derush_clipper.js` | Découpage vidéo | Découpage manuel |
| `lucas_validator.js` | Validation QA | Validation manuelle |

---

## 🚀 Parcours recommandés

### Débutant (jamais testé)
1. Lire [README_FIRST.md](README_FIRST.md) (5 min)
2. Suivre les commandes du test rapide
3. Vérifier les clips générés
4. ✅ Vous savez produire !

---

### Intermédiaire (déjà testé une fois)
1. Lire [QUICKSTART_WORKFLOW.md](QUICKSTART_WORKFLOW.md)
2. Tester différentes configurations
3. Adapter à votre rythme de publication

---

### Avancé (production régulière)
1. Créer des scripts personnalisés
2. Automatiser le workflow hebdomadaire
3. Intégrer avec K-Hive pour post-production

---

## 🔍 Recherche rapide

### Problème : "Téléphone non détecté"
→ [README_FIRST.md](README_FIRST.md) section "Problèmes courants"

---

### Problème : "ffmpeg not found"
→ [README_FIRST.md](README_FIRST.md) section "Checklist"
```bash
sudo apt install ffmpeg -y
```

---

### Question : "Combien de temps pour 100 clips ?"
→ [QUICKSTART_WORKFLOW.md](QUICKSTART_WORKFLOW.md) section "Temps estimés"

**Réponse** : ~35 minutes

---

### Question : "Les clips sont-ils publiables ?"
→ [REPONSE_TEST_TELEPHONE.md](REPONSE_TEST_TELEPHONE.md) section "Est-ce publiable ?"

**Réponse** : Oui techniquement, mais K-Hive doit ajouter overlays

---

## 💡 Pour aller plus loin

### API sans téléphone
- [../../api/README.md](../../api/README.md) - API complète
- [../../api/QUICKSTART.md](../../api/QUICKSTART.md) - Démarrage rapide API
- [../../API_SETUP_COMPLETE.md](../../API_SETUP_COMPLETE.md) - Résumé installation

---

### Architecture complète
- [../README.md](../README.md) - Vue d'ensemble Architecture MD
- [../SHARED/CONTRACTS/SLA_REPORTERS_KHIVE.md](../SHARED/CONTRACTS/SLA_REPORTERS_KHIVE.md) - Contrat B2B

---

## 📞 Support

**Pour reproduire le test dans une nouvelle conversation**, dites simplement :

> "Je veux tester le workflow Reporters avec téléphone"

Ou :

> "Lis le fichier Architecture_MD/Reporters/README_FIRST.md et guide-moi"

---

**Version** : 1.0.0
**Dernière mise à jour** : 2026-01-13
