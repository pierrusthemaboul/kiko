# Guide d'intégration TikTok OAuth2 pour Timalaus

## Problème actuel : Erreur "client_key"

L'erreur "client_key" lors de l'autorisation OAuth2 indique généralement l'un des problèmes suivants :

### 1. **Client Key incorrecte**
- Vérifiez que la `client_key` dans `tiktok-credentials.json` correspond exactement à celle affichée dans la console développeur TikTok
- La client_key actuelle : `awz0h9u8g1no4xah`

### 2. **Statut de l'application**
- L'application doit être en statut **"Draft"** ou **"Live"**
- Si elle est en statut **"Rejected"**, l'accès API est bloqué
- Vous avez mentionné qu'elle est en "Draft" - c'est correct

### 3. **Login Kit non activé**
- Allez dans la console développeur TikTok
- Section "Apps" → Votre application → "Products"
- Vérifiez que **"Login Kit"** est activé
- Si ce n'est pas le cas, activez-le et sauvegardez

### 4. **Redirect URI incorrecte**
- La Redirect URI doit correspondre **exactement** à celle enregistrée
- **IMPORTANT** : Selon la documentation TikTok, la Redirect URI DOIT se terminer par un slash `/`
- URI correcte : `https://pierrusthemaboul.github.io/kiko/auth/callback/`
- URI incorrecte : `https://pierrusthemaboul.github.io/kiko/auth/callback`
- Vérifiez qu'il n'y a pas de différence de casse

### 5. **Compte de test (Sandbox)**
- Le compte `@timalaus0` doit être configuré comme compte de test
- Vérifiez dans la console développeur : "Apps" → Votre application → "Test Accounts"
- Si le compte n'est pas listé, ajoutez-le

## Processus d'authentification complet

### Étape 1 : Lancer le diagnostic
```bash
node scripts/tiktok_oauth_diagnostic.mjs
```

Ce script génère :
- Une URL d'autorisation OAuth2 avec PKCE
- Un code challenge et code verifier
- Sauvegarde du code verifier dans `tiktok-pkce-temp.json`

### Étape 2 : Autoriser l'application
1. Copiez l'URL générée par le script de diagnostic
2. Ouvrez-la dans un navigateur
3. Connectez-vous avec votre compte TikTok `@timalaus0`
4. Autorisez l'application à accéder à vos données
5. Vous serez redirigé vers : `https://pierrusthemaboul.github.io/kiko/auth/callback?code=XXXXX&state=YYYYY`

### Étape 3 : Échanger le code contre des tokens
```bash
node scripts/tiktok_exchange_tokens.mjs <code_d_autorisation>
```

Remplacez `<code_d_autorisation>` par le code extrait de l'URL de redirection.

Ce script :
- Envoie le code d'autorisation à TikTok
- Utilise le code verifier (PKCE) pour la sécurité
- Reçoit l'access_token et refresh_token
- Sauvegarde les tokens dans `tiktok-tokens.json`

### Étape 4 : Récupérer les statistiques
```bash
node scripts/tiktok_fetch_stats.mjs
```

Ce script :
- Utilise l'access_token pour appeler l'API TikTok
- Récupère les infos utilisateur (nom, avatar, bio)
- Récupère les statistiques (abonnés, likes, vidéos)
- Récupère les dernières vidéos avec leurs stats
- Sauvegarde tout dans `tiktok-stats.json`

### Étape 5 : Rafraîchir le token (optionnel)
```bash
node scripts/tiktok_refresh_token.mjs
```

À utiliser quand l'access_token expire (24h).

## Fichiers générés

- `tiktok-credentials.json` : Identifiants de l'application (déjà existant)
- `tiktok-pkce-temp.json` : Données PKCE temporaires (supprimé après l'échange)
- `tiktok-tokens.json` : Tokens d'accès et refresh
- `tiktok-stats.json` : Statistiques récupérées

## Scopes demandés

Les scopes demandés sont :
- `user.info.basic` : Informations de base de l'utilisateur
- `user.info.profile` : Profil utilisateur
- `user.info.stats` : Statistiques (abonnés, likes, etc.)
- `video.list` : Liste des vidéos

## Dépannage avancé

### Erreur "invalid_client_key"
- Vérifiez que la client_key est correcte
- Vérifiez que l'application n'est pas rejetée

### Erreur "redirect_uri_mismatch"
- Vérifiez que la Redirect URI correspond exactement
- Vérifiez qu'elle est enregistrée en mode Sandbox ET Production

### Erreur "invalid_code"
- Le code d'autorisation a expiré (10 minutes)
- Le code a déjà été utilisé
- Le code verifier ne correspond pas

### Erreur "scope_insufficient"
- Les scopes demandés ne sont pas autorisés
- Vérifiez que les scopes sont activés dans la console développeur

## Intégration dans l'application

Une fois le flux OAuth2 fonctionnel, vous pouvez :

1. **Automatiser la récupération** : Créer un cron job qui lance `tiktok_fetch_stats.mjs` régulièrement
2. **Intégrer dans le backend** : Utiliser les tokens pour appeler l'API depuis votre serveur
3. **Afficher dans l'admin** : Lire `tiktok-stats.json` pour afficher les stats dans votre panel admin

## Sécurité

- **Ne commitez jamais** `tiktok-credentials.json` ou `tiktok-tokens.json` dans Git
- Ces fichiers contiennent des secrets sensibles
- Ajoutez-les à votre `.gitignore` s'ils ne le sont pas déjà
