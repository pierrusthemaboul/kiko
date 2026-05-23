# Guide de déploiement - Capture Gameplay

## Architecture

Le système de capture gameplay nécessite:
- **Backend local** (ta machine) - pour ADB/scrcpy/FFmpeg
- **Frontend Vercel** (adminweb-ruddy.vercel.app) - interface web
- **Tunnel ngrok** - pour connecter frontend Vercel → backend local

## Pourquoi un tunnel ?

ADB et scrcpy nécessitent un accès physique à ton téléphone connecté en USB. Le backend DOIT tourner sur ta machine locale. Le frontend sur Vercel ne peut pas accéder directement à localhost:3001.

## Configuration

### 1. Démarrer le backend local

```bash
cd admin_web/server
node index.mjs
```

Le backend sera accessible sur http://localhost:3001

### 2. Démarrer le tunnel ngrok

```bash
cd admin_web
start-tunnel.bat
```

ngrok va créer une URL HTTPS publique comme: `https://xxxx-xx-xx-xx-xx.ngrok-free.app`

### 3. Configurer Vercel

Ajoute la variable d'environnement dans Vercel:
- Nom: `VITE_API_URL`
- Valeur: `https://xxxx-xx-xx-xx-xx.ngrok-free.app` (l'URL ngrok)

### 4. Mettre à jour le frontend

Dans `SocialMediaPage.tsx`, remplace:
```typescript
const response = await fetch('http://localhost:3001/api/gameplay/capture', {
```

Par:
```typescript
const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const response = await fetch(`${apiUrl}/api/gameplay/capture`, {
```

Faire la même chose pour tous les autres appels API.

## Workflow complet

1. **Connecte ton téléphone** via USB avec débogage USB activé
2. **Lance Timalaus** sur ton téléphone
3. **Démarre le backend**: `node admin_web/server/index.mjs`
4. **Démarre ngrok**: `admin_web/start-tunnel.bat`
5. **Va sur adminweb-ruddy.vercel.app**
6. **Clique sur "Capturer Gameplay"**
7. **Télécharge la vidéo** et poste-la

## Limitations

- Ton ordinateur doit être allumé et connecté à internet
- Le tunnel ngrok doit être actif
- Le backend local doit tourner
- Ton téléphone doit être connecté en USB

## Alternative: Déploiement complet sur serveur

Si tu veux éviter ces limitations, il faudrait:
- Un serveur dédié avec accès ADB/scrcpy
- Un appareil Android connecté en permanence au serveur
- Ou utiliser un émulateur Android sur le serveur

C'est plus complexe et coûteux. La solution ngrok est simple et gratuite pour l'instant.
