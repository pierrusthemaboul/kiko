# 🖼️ Guide d'Analyse Rapide des Images Générées

**Pour les IA assistant Pierre dans l'analyse des images générées par la Machine à Événements**

---

## 📋 Contexte

Le système génère des illustrations historiques via:
- **Gemini**: Génération de prompts et validation
- **Flux-Schnell** (4 steps): Génération d'images ultra-rapide
- **Supabase Local** (Docker): Stockage des images et métadonnées

Les images sont stockées dans la table `goju2` de Supabase local (`http://127.0.0.1:54321`).

---

## 🚀 Accès Rapide aux Dernières Images

### Étape 1: Récupérer les URLs

Utiliser le script fourni:

```bash
cd machine_a_evenements
node check_recent_images.mjs
```

**Ce script affiche:**
- Les 6 dernières images générées
- Leurs titres et dates
- Les URLs complètes (format: `http://127.0.0.1:54321/storage/v1/object/public/evenements-image/...`)

### Étape 2: Télécharger les Images

Les images sont accessibles localement via curl:

```bash
cd machine_a_evenements
mkdir -p temp_images

# Exemple pour une image
curl -s "http://127.0.0.1:54321/storage/v1/object/public/evenements-image/[nom_fichier].webp" -o temp_images/image.webp
```

**Téléchargement rapide des 6 dernières:**

```bash
cd machine_a_evenements/temp_images

curl -s "http://127.0.0.1:54321/storage/v1/object/public/evenements-image/[url1].webp" -o image1.webp
curl -s "http://127.0.0.1:54321/storage/v1/object/public/evenements-image/[url2].webp" -o image2.webp
# ... etc
```

### Étape 3: Analyser avec Read

Une fois téléchargées, utiliser l'outil `Read` (supporte les images):

```javascript
Read("c:\Users\Pierre\kiko\machine_a_evenements\temp_images\image1.webp")
```

---

## 🔍 Points d'Analyse Critiques

Lors de l'analyse des images, rechercher:

### ❌ Anachronismes Fréquents de Flux-Schnell

1. **Statues ailées / Anges / Aigles**
   - Flux-Schnell ajoute spontanément des statues décoratives
   - Même avec `NEGATIVES: no winged figures, no statues, no angels`
   - **Problème connu**: Gemini Flash valide parfois ces images avec 9/10!

2. **Objets modernes**
   - Smartphones (fréquent sur événements 1950-1970)
   - Vêtements anachroniques
   - Architecture moderne

3. **Éléments fantastiques**
   - Dragons ailés
   - Créatures mythologiques
   - Effets magiques/surnaturels

4. **Texte visible**
   - Journaux avec texte lisible (interdit par NEGATIVES mais parfois toléré)
   - Panneaux, affiches

### ✅ Éléments à Valider

- **Cohérence stylistique** par époque:
  - Avant 500: Antiquité (marbre, toges)
  - 500-1500: Médiéval (armures, châteaux)
  - 1500-1800: Renaissance/Lumières (costumes élaborés)
  - 1800-1900: Révolution industrielle (sépia, top hats)
  - 1900-1970: Vintage photography (noir & blanc, grain)

- **Précision historique**:
  - Vêtements d'époque
  - Architecture correcte
  - Objets authentiques

- **Variabilité des styles**:
  - Même avec le même "style block", Flux-Schnell varie:
    - Palette de couleurs (N&B, sépia, couleurs)
    - Grain photographique
    - Atmosphère générale

---

## 📊 Structure de la Base de Données

**Table: `goju2`**

Colonnes principales:
- `titre`: Titre de l'événement
- `date`: Date au format ISO (YYYY-MM-DD)
- `illustration_url`: URL de l'image (Supabase Storage)
- `created_at`: Date de création
- `prompt_flux`: Le prompt utilisé pour Flux-Schnell
- `style_info`: Métadonnées de style (JSONB)

---

## 🛠️ Script check_recent_images.mjs

Le script est situé dans `machine_a_evenements/check_recent_images.mjs`.

**Configuration automatique:**
- Charge `.env` depuis le répertoire parent
- Se connecte à Supabase local (127.0.0.1:54321)
- Utilise `SUPABASE_SERVICE_ROLE_KEY`

**Modification rapide:**

Pour changer le nombre d'images:
```javascript
.limit(6)  // ← Changer ici (ex: .limit(10))
```

Pour filtrer par date:
```javascript
.gte('created_at', '2026-01-31')  // ← Ajouter après .from('goju2')
```

---

## 📝 Logs de Génération

Les logs de `sevent` (le générateur d'images) affichent:

```
🔄 [DEBUG] Tentative 1/3
🎨 [DEBUG] Prompt: "1953, historical Politique. STYLE: ..."
⏱️  [PERF] Génération image Replicate: 3705ms
🤖 [DEBUG] [FLASH VERDICT] Score: 9/10 - "..."
✅ [DEBUG] Validation réussie!
```

**Points d'attention dans les logs:**
- Nombre de tentatives (si >1, il y a eu des rejets)
- Raisons de rejet Gemini
- Score de validation (8+ = accepté)

---

## 🚨 Problèmes Connus (Janvier 2026)

### 1. Statues Ailées
- **Fréquence**: ~50% des images
- **Cause**: Flux-Schnell (4 steps) ignore les NEGATIVES
- **Validation**: Gemini Flash tolère trop (score 9/10 malgré statues)

### 2. Variabilité des Styles
- Même "style block" → styles très différents
- Flux-Schnell interprète selon le contenu (jungle → sépia, etc.)
- 4 steps = faible cohérence

### 3. Validation Gemini Permissive
- Accepte parfois des anachronismes évidents
- Seuil actuel: score >= 8/10 (peut-être trop bas)

---

## 💡 Tips pour l'Analyse

1. **Toujours télécharger les images localement** avant analyse
   - WebFetch ne peut pas accéder à localhost
   - Read fonctionne parfaitement avec les images .webp

2. **Comparer avec les logs de validation**
   - Si Gemini dit "no anachronisms" mais vous voyez des statues → noter le problème

3. **Créer un rapport visuel**
   - Lister les anachronismes trouvés
   - Comparer avec les scores Gemini
   - Identifier les patterns d'erreur de Flux-Schnell

4. **Vérifier la cohérence stylistique**
   - Si Pierre demande du "noir & blanc 1960s" → vérifier qu'il n'y a pas de sépia/couleur

---

## 🔗 Fichiers Importants

- `sevent3.mjs`: Générateur principal d'images
- `check_recent_images.mjs`: Script d'inspection rapide
- `AGENTS/ARTISAN/agent.js`: Agent de génération (trop gros pour Read direct)
- `.env`: Variables d'environnement (SUPABASE_SERVICE_ROLE_KEY)

---

**Dernière mise à jour**: 31 janvier 2026
**Auteur**: Claude Sonnet 4.5 (session d'analyse des anges/statues ailées)
