# Configuration OAuth Google pour Timalaus

## Problème identifié
Les utilisateurs obtenaient une erreur "page non trouvée" lors de la connexion Google car l'URL de callback `juno2://auth/callback` n'avait pas de route correspondante dans l'application.

## Solution appliquée
Création du fichier `mobile_app/app/auth/callback.tsx` pour gérer le callback OAuth.

## Configuration requise dans Supabase

### 1. Activer Google OAuth dans Supabase
- Aller dans le dashboard Supabase : https://supabase.com/dashboard/project/ppxmtnuewcixbbmhnzzc/auth/providers
- Activer le provider "Google"
- Configurer les credentials OAuth de Google Cloud Console

### 2. Configurer les Redirect URLs
Dans les paramètres du provider Google Supabase, ajouter les URLs de redirection suivantes :

**Pour l'application mobile (deep linking) :**
```
juno2://auth/callback
```

**Pour le développement (si nécessaire) :**
```
exp://127.0.0.1:19000/--/auth/callback
exp://192.168.x.x:19000/--/auth/callback
```

### 3. Configuration Google Cloud Console
Dans la Google Cloud Console (OAuth 2.0 Client ID) :
- Ajouter les mêmes redirect URLs dans "Authorized redirect URIs"
- Le scheme `juno2://` doit être autorisé

## Vérification
Après configuration, tester le flux :
1. Cliquer sur "Continuer avec Google"
2. S'authentifier sur Google
3. Vérifier que l'application redirige vers `juno2://auth/callback`
4. Vérifier que le callback traite le code et crée la session
5. Vérifier que l'utilisateur est redirigé vers l'écran principal

## Fichiers modifiés
- `mobile_app/app/auth/callback.tsx` (nouveau fichier créé)
