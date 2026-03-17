# 🔧 Panneau d'Administration Timalaus

Guide d'utilisation du panneau d'administration intégré à l'application mobile Timalaus.

---

## 📱 Accès au Panneau Admin

### Méthode d'Accès
1. **Connectez-vous** avec votre email `pierre.cousin7@gmail.com`
2. **Maintenez un appui long** (3 secondes) sur le titre de bienvenue sur l'écran d'accueil
3. **Le panneau admin s'ouvrira** automatiquement

### Sécurité
- ✅ Uniquement accessible avec `pierre.cousin7@gmail.com`
- ✅ Vérification automatique de l'email
- ✅ Accès refusé pour tout autre utilisateur

---

## 🚀 Démarrage du Backend

### 1. Démarrer l'API Backend
```bash
npm run admin-api
```

L'API démarrera sur `http://localhost:3001`

### 2. Vérifier le fonctionnement
```bash
curl http://localhost:3001/health
```

Réponse attendue:
```json
{
  "status": "OK",
  "timestamp": "2026-03-15T...",
  "service": "Timalaus Admin API"
}
```

---

## 🎯 Fonctionnalités du Panneau Admin

### 📋 Liste des Événements
- **Affichage** de tous les événements avec illustrations
- **Filtres** par catégorie, recherche texte
- **Pagination** pour gérer grand nombre d'événements
- **Pull-to-refresh** pour recharger les données

### 🔍 Filtres Disponibles
- **Recherche texte**: Titre, description
- **Catégorie**: Toutes les catégories disponibles
- **Statut**: Actif, en cours de régénération, etc.

### ⚡ Actions Rapides

#### 1. Regénérer Titre
- **Bouton bleu** "Titre"
- Génère automatiquement un nouveau titre
- Met à jour le statut de l'événement

#### 2. Regénérer Illustration  
- **Bouton orange** "Image"
- Génère une nouvelle illustration
- Met à jour l'URL de l'image

#### 3. Vérifier Date
- **Bouton corail** "Date"
- Valide la cohérence de la date
- Marque comme vérifiée/invalide

### 📊 Modal Détails
- **Tap sur une carte** pour voir les détails
- Informations complètes de l'événement
- Statut actuel et métadonnées

---

## 🔌 API Endpoints

### Authentification
Toutes les requêtes doivent inclure:
```http
X-Admin-Email: pierre.cousin7@gmail.com
```

### Endpoints Principaux

#### GET /api/events
Liste des événements avec filtres
```http
GET /api/events?search=napoleon&categorie=guerre&limit=20&offset=0
```

#### GET /api/events/:id
Détail d'un événement spécifique
```http
GET /api/events/123e4567-e89b-12d3-a456-426614174000
```

#### POST /api/events/:id/regenerate-title
Regénérer le titre d'un événement
```http
POST /api/events/123e4567-e89b-12d3-a456-426614174000/regenerate-title
```

#### POST /api/events/:id/regenerate-illustration
Regénérer l'illustration d'un événement
```http
POST /api/events/123e4567-e89b-12d3-a456-426614174000/regenerate-illustration
```

#### POST /api/events/:id/verify-date
Vérifier la date d'un événement
```http
POST /api/events/123e4567-e89b-12d3-a456-426614174000/verify-date
```

#### POST /api/events/batch
Traitement par lot
```http
POST /api/events/batch
{
  "eventIds": ["id1", "id2", "id3"],
  "action": "regenerate-titles"
}
```

#### GET /api/categories
Liste des catégories disponibles
```http
GET /api/categories
```

---

## 🛠️ Configuration

### Variables d'Environnement Requises
```env
EXPO_PUBLIC_SUPABASE_URL=votre_url_supabase
SUPABASE_SERVICE_ROLE_KEY=votre_cle_service_supabase
ADMIN_API_PORT=3001
```

### Structure de la Table `evenements`
```sql
CREATE TABLE evenements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titre TEXT NOT NULL,
  description TEXT,
  date DATE,
  illustration_url TEXT,
  categorie TEXT,
  tags TEXT[],
  statut TEXT DEFAULT 'actif',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## 📱 Interface Mobile

### Design
- **Thème clair** avec couleurs cohérentes
- **Cartes modernes** avec ombres et coins arrondis
- **Boutons action** colorés et intuitifs
- **Scroll fluide** avec pull-to-refresh

### Navigation
- **Swipe down** pour rafraîchir
- **Tap sur carte** pour détails
- **Boutons action** directement accessibles
- **Modal** pour vue détaillée

### Responsive
- **Adapté mobile** (iOS/Android)
- **Scroll horizontal** pour filtres catégories
- **Optimisé** pour écrans tactiles

---

## 🔧 Dépannage

### Problèmes Communs

#### "Accès refusé"
- ✅ Vérifiez que vous êtes bien connecté avec `pierre.cousin7@gmail.com`
- ✅ Assurez-vous que le backend est démarré (`npm run admin-api`)

#### "Impossible de charger les événements"
- ✅ Vérifiez la connexion à Supabase
- ✅ Vérifiez les variables d'environnement
- ✅ Consultez les logs du backend

#### "Erreur API"
- ✅ Vérifiez que le backend tourne sur le port 3001
- ✅ Testez avec `curl http://localhost:3001/health`
- ✅ Consultez la console du backend

### Logs Utiles
```bash
# Logs du backend
npm run admin-api

# Logs de l'app mobile
npx expo start --clear
```

---

## 🚀 Déploiement

### Production
1. **Déployer l'API** sur Vercel/Heroku
2. **Mettre à jour l'URL** dans le code mobile
3. **Configurer les variables** d'environnement
4. **Tester l'accès** en production

### Sécurité
- ✅ **Email hardcodé** pour accès admin
- ✅ **Middleware** de vérification
- ✅ **Pas d'exposition** publique des endpoints
- ✅ **Logs** des accès admin

---

## 📈 Évolutions Futures

### Fonctionnalités Planifiées
- [ ] **Batch processing** avancé
- [ ] **Export CSV** des événements filtrés
- [ ] **Preview images** en plein écran
- [ ] **Historique** des modifications
- [ ] **Stats** et analytics
- [ ] **Mode offline** partiel

### Améliorations Techniques
- [ ] **WebSocket** pour mises à jour temps réel
- [ ] **Cache** intelligent des données
- [ ] **Pagination** infinie
- [ ] **Search** avancée avec fuzziness

---

## 📞 Support

En cas de problème:
1. **Consultez les logs** du backend
2. **Vérifiez la connexion** Supabase
3. **Testez les endpoints** avec curl
4. **Contactez** le développeur

---

**Créé le**: 2026-03-15  
**Version**: 1.0.0  
**Auteur**: Cascade AI Assistant
