# 🚀 Quick Start - API Timalaus

Guide de démarrage rapide en 5 minutes.

---

## ⚡ Installation rapide

### 1. Installer les dépendances

```bash
cd /home/pierre/kiko
npm install @supabase/supabase-js
```

### 2. Configurer l'environnement

Vérifier que vos variables Supabase sont définies :

```bash
# Afficher les variables
echo $EXPO_PUBLIC_SUPABASE_URL
echo $EXPO_PUBLIC_SUPABASE_ANON_KEY
```

Si elles sont vides, les définir :

```bash
# Linux/Mac
export EXPO_PUBLIC_SUPABASE_URL="https://votre-projet.supabase.co"
export EXPO_PUBLIC_SUPABASE_ANON_KEY="votre_anon_key"

# Ou créer un fichier .env
cat > .env << EOF
EXPO_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=votre_anon_key
EOF
```

### 3. Tester l'API

```bash
node api/test_api.js
```

**Attendu** : Tous les tests en vert ✅

---

## 🎮 Premier test

### Test 1 : Simuler une partie

```bash
cd Architecture_MD/Reporters/TOOLS/
node tom_api_simulator.js --type gagnante
```

**Résultat attendu** :
- ✅ Partie simulée
- 📄 Fichiers créés dans `ASSETS_RAW/`

### Test 2 : Partie thématique

```bash
node tom_api_simulator.js --theme napoleon --best
```

**Résultat attendu** :
- 🔍 Recherche de la meilleure partie sur Napoléon
- 📊 Pourcentage d'événements thématiques affiché

### Test 3 : Générer des screenshots (POC)

```bash
# D'abord simuler une partie
node tom_api_simulator.js --type gagnante

# Puis générer les screenshots
node screenshot_generator.js ../ASSETS_RAW/partie_*.json
```

**Résultat attendu** :
- 📸 Fichiers JSON dans `OUTPUTS/screenshots/`

---

## 🔧 Troubleshooting rapide

### Erreur : "Cannot find module '@supabase/supabase-js'"

```bash
npm install @supabase/supabase-js
```

### Erreur : "Supabase URL not configured"

```bash
# Vérifier les variables
env | grep EXPO_PUBLIC_SUPABASE

# Si vides, les définir
export EXPO_PUBLIC_SUPABASE_URL="..."
export EXPO_PUBLIC_SUPABASE_ANON_KEY="..."
```

### Erreur : "Aucun événement disponible"

Votre table `evenements` est peut-être vide. Vérifier dans Supabase :

```sql
SELECT COUNT(*) FROM evenements;
```

---

## 📚 Prochaines étapes

1. **Lire la doc complète** : [api/README.md](README.md)
2. **Tester différents thèmes** : napoleon, rome, renaissance, etc.
3. **Intégrer à votre workflow Reporters**
4. **(Optionnel) Ajouter des tags** aux événements pour un meilleur filtrage

---

## 🎯 Commandes utiles

```bash
# Partie simple
node tom_api_simulator.js

# Partie perdante
node tom_api_simulator.js --type perdante

# 5 parties sur un thème
node tom_api_simulator.js --theme rome --count 5

# Meilleure partie Renaissance
node tom_api_simulator.js --theme renaissance --periode 1400-1600 --best

# Aide
node tom_api_simulator.js --help
```

---

## ✅ Checklist "API opérationnelle"

- [ ] `npm install @supabase/supabase-js` exécuté
- [ ] Variables d'environnement Supabase définies
- [ ] `node api/test_api.js` → Tous les tests verts
- [ ] `node tom_api_simulator.js` → Fichiers créés dans ASSETS_RAW/
- [ ] (Optionnel) Tags ajoutés aux événements Supabase

**Si tout est coché : 🎉 Vous êtes prêt !**

---

## 💡 Différence clé avec l'ancienne méthode

| Ancienne (ADB + Scrcpy) | Nouvelle (API) |
|--------------------------|----------------|
| Téléphone branché en USB | ❌ Pas de téléphone |
| Vous devez jouer manuellement | ✅ Automatique |
| 30-60 min pour 3 vidéos | ✅ 10 secondes pour 10 parties |
| Qualité variable (bugs, lag) | ✅ Données parfaites |
| 1 partie = 1 vidéo | ✅ 1 partie = JSON exploitable |

---

**Temps estimé pour setup complet** : 5-10 minutes

**Support** : Voir [api/README.md](README.md) pour troubleshooting détaillé
