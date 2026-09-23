# Guide Configuration Google Cloud OAuth pour Timalaus

## Étape 1 : Accéder à Google Cloud Console

1. Aller sur https://console.cloud.google.com/
2. Sélectionner votre projet (ou en créer un nouveau)
3. Dans le menu de gauche, aller dans **APIs & Services** > **Credentials**

## Étape 2 : Créer ou modifier l'OAuth 2.0 Client ID

### Si vous n'avez pas encore de Client ID :
1. Cliquer sur **+ CREATE CREDENTIALS** > **OAuth client ID**
2. Choisir **Application type** : **Web application**
3. Donner un nom (ex: "Timalaus Mobile App")
4. Dans la section **Authorized redirect URIs**, cliquer sur **ADD URI**
5. Ajouter : `juno2://auth/callback`
6. Cliquer sur **CREATE**

### Si vous avez déjà un Client ID :
1. Cliquer sur l'icône crayon (✏️) à côté de votre OAuth 2.0 Client ID existant
2. Dans la section **Authorized redirect URIs**, cliquer sur **ADD URI**
3. Ajouter : `juno2://auth/callback`
4. Cliquer sur **SAVE**

## Étape 3 : Configurer Supabase avec les credentials Google

1. Aller sur https://supabase.com/dashboard/project/ppxmtnuewcixbbmhnzzc/auth/providers
2. Cliquer sur **Google**
3. Activer le provider
4. Copier le **Client ID** et **Client Secret** depuis Google Cloud Console
5. Les coller dans les champs correspondants dans Supabase
6. Dans la section **Redirect URL**, ajouter : `juno2://auth/callback`
7. Cliquer sur **Save**

## Résumé des URLs à configurer

**Google Cloud Console (Authorized redirect URIs) :**
```
juno2://auth/callback
```

**Supabase (Redirect URL) :**
```
juno2://auth/callback
```

## Pourquoi `juno2://` ?

C'est le **deep linking scheme** de votre application, défini dans `app.config.js` :
```javascript
scheme: "juno2"
```

Quand Google redirige après l'authentification, il utilise ce scheme pour rouvrir votre application mobile.

## Test

Après configuration :
1. Lancez l'application
2. Cliquez sur "Continuer avec Google"
3. Après authentification Google, l'application doit s'ouvrir automatiquement
4. Vous devez être connecté
