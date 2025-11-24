# 🎬 GUIDE COMPLET - VIDÉO DÉMONSTRATION TIKTOK

**App** : Timalaus (Quiz d'histoire)
**Objectif** : Créer une vidéo de démonstration pour l'approbation TikTok Developers
**Durée estimée** : 2-3 heures (setup + enregistrement)
**Format final** : MP4, 1080p, 60-120 secondes

---

## 📋 TABLE DES MATIÈRES

1. [Préparation (30 min)](#1-préparation)
2. [Build et Installation (30 min)](#2-build-et-installation)
3. [Configuration Sandbox TikTok (15 min)](#3-configuration-sandbox-tiktok)
4. [Enregistrement Vidéo (45 min)](#4-enregistrement-vidéo)
5. [Montage Final (30 min)](#5-montage-final)
6. [Soumission à TikTok](#6-soumission-à-tiktok)

---

## 1. PRÉPARATION (30 min)

### ✅ Checklist matériel

- [ ] **Téléphone Android** avec USB debugging activé
- [ ] **Câble USB** pour connecter au PC
- [ ] **Ordinateur** avec :
  - Node.js installé
  - Android SDK/ADB configuré
  - Navigateur web (Chrome/Firefox)

### ✅ Checklist logicielle

```bash
# Vérifier que tout est installé
node --version    # Doit afficher v18+ ou v20+
adb --version     # Doit afficher Android Debug Bridge
npx --version     # Doit afficher 9.0.0+
```

### ✅ Activer USB Debugging sur Android

1. **Paramètres** → **À propos du téléphone**
2. Appuyer 7 fois sur **"Numéro de build"**
3. Revenir → **Options pour développeurs**
4. Activer **"Débogage USB"**
5. Connecter le téléphone au PC via USB
6. Accepter **"Autoriser le débogage USB"** sur le téléphone

### ✅ Vérifier la connexion ADB

```bash
# Lister les appareils connectés
adb devices

# Devrait afficher quelque chose comme :
# List of devices attached
# 4ab67f26    device
```

---

## 2. BUILD ET INSTALLATION (30 min)

### Étape 1 : Installer les dépendances manquantes

Le serveur webhook a besoin de `express` et `cors` :

```bash
cd /home/pierre/kiko

# Installer les dépendances pour le webhook
pnpm add -D express cors @types/express @types/cors
```

### Étape 2 : Build de l'APK de démonstration

**Option A : Build rapide (Debug APK)** ⚡ RECOMMANDÉ

```bash
# Nettoyer les anciens builds
cd android
./gradlew clean
cd ..

# Build APK debug
npx expo run:android --variant debug --no-install

# Ou directement avec Gradle :
cd android
./gradlew assembleDebug
cd ..
```

L'APK sera généré dans :
```
android/app/build/outputs/apk/debug/app-debug.apk
```

**Option B : Build optimisé (Release APK)** (Plus long, plus propre)

```bash
# Build APK release
cd android
./gradlew assembleRelease
cd ..
```

L'APK sera dans :
```
android/app/build/outputs/apk/release/app-release.apk
```

### Étape 3 : Installer l'APK sur le téléphone

```bash
# Installer l'APK debug
adb install -r android/app/build/outputs/apk/debug/app-debug.apk

# OU l'APK release si vous avez choisi l'option B
adb install -r android/app/build/outputs/apk/release/app-release.apk
```

Si vous voyez `Success`, c'est bon ! ✅

### Étape 4 : Vérifier que l'app est installée

```bash
# Lancer l'app
adb shell am start -n com.pierretulle.juno2/.MainActivity
```

L'app Timalaus devrait s'ouvrir sur le téléphone !

---

## 3. CONFIGURATION SANDBOX TIKTOK (15 min)

### Étape 1 : Démarrer le serveur webhook

Ouvrir un **nouveau terminal** et exécuter :

```bash
cd /home/pierre/kiko

# Démarrer le serveur webhook
npx tsx scripts/tiktok-webhook-server.ts
```

Vous devriez voir :
```
🚀 TikTok Sandbox Webhook Server is running!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Dashboard: http://localhost:3000/dashboard
📡 Webhook URL: http://localhost:3000/webhook/tiktok/share
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

⚠️ **IMPORTANT** : Gardez ce terminal ouvert pendant toute la durée de l'enregistrement !

### Étape 2 : Ouvrir le Dashboard

Dans votre **navigateur**, ouvrir :

```
http://localhost:3000/dashboard
```

Vous verrez un beau dashboard avec :
- App ID : `7573939838525638668`
- Client Key : `awz0h9u8g1no4xah`
- Package : `com.pierretulle.juno2`
- Compteur d'événements
- Liste des événements de partage

### Étape 3 : Tester le webhook

Dans le dashboard, cliquer sur **"🎭 Simuler un partage TikTok"**

Un événement de test devrait apparaître dans la liste ! ✅

---

## 4. ENREGISTREMENT VIDÉO (45 min)

### 📱 Partie 1 : Écran du téléphone (30 sec)

#### Préparation du téléphone :

```bash
# Mode avion (pour pas de notifications)
adb shell cmd connectivity airplane-mode enable

# Luminosité au max
adb shell settings put system screen_brightness 255

# Volume au minimum (optionnel)
adb shell media volume --stream 3 --set 0
```

#### Enregistrer l'écran :

```bash
# Démarrer l'enregistrement (max 180 secondes = 3 minutes)
adb shell screenrecord --bit-rate 8000000 --size 1080x1920 --time-limit 180 /sdcard/timalaus_demo.mp4
```

⚠️ **IMPORTANT** : L'enregistrement démarre immédiatement !

#### Actions à faire sur le téléphone (dans l'ordre) :

1. **[0-5 sec]** Écran d'accueil Android, icône Timalaus visible
2. **[5-10 sec]** Cliquer sur l'icône Timalaus, l'app s'ouvre
3. **[10-15 sec]** Écran d'accueil du jeu, cliquer sur "Mode Précision"
4. **[15-30 sec]** Jouer rapidement 2-3 questions (répondre bien ou mal, peu importe)
5. **[30-35 sec]** Perdre volontairement (ne pas répondre) pour arriver au Game Over
6. **[35-40 sec]** Modal de fin de partie s'affiche avec le score
7. **[40-42 sec]** **CLIQUER SUR "PARTAGER SUR TIKTOK"** (bouton rose/noir) 🎯
8. **[42-45 sec]** L'alerte "Score partagé sur TikTok !" apparaît
9. **[45-50 sec]** Cliquer "OK" et montrer le retour au jeu

#### Arrêter l'enregistrement :

Appuyer sur **Ctrl+C** dans le terminal, puis :

```bash
# Récupérer la vidéo
adb pull /sdcard/timalaus_demo.mp4 ~/Videos/tiktok_demo_phone.mp4
```

### 💻 Partie 2 : Dashboard Sandbox (30 sec)

Utiliser **OBS Studio** ou un screen recorder pour capturer votre écran d'ordinateur.

#### Configuration OBS Studio (gratuit) :

1. **Télécharger** : https://obsproject.com/
2. **Installer** et ouvrir OBS
3. **Sources** → **+** → **"Capture d'écran"**
4. Sélectionner la fenêtre du navigateur avec le dashboard
5. **Démarrer l'enregistrement**

#### Actions à faire (synchronisées avec le téléphone) :

1. **[0-10 sec]** Montrer le dashboard vide, en attente d'événements
2. **[10-15 sec]** Naviguer vers la section "Événements Récents"
3. **[15-20 sec]** (Moment où vous cliquez "Partager" sur le téléphone)
4. **[20-25 sec]** **L'ÉVÉNEMENT APPARAÎT !** 🎉
   - Timestamp visible
   - Type : "share"
   - Données JSON avec score, niveau, lien Play Store
5. **[25-30 sec]** Zoomer légèrement sur les détails de l'événement

#### Arrêter l'enregistrement OBS :

**Fichier** → **Arrêter l'enregistrement**

Le fichier sera dans `~/Videos/` par défaut.

---

## 5. MONTAGE FINAL (30 min)

### Option A : DaVinci Resolve (gratuit, professionnel)

**Télécharger** : https://www.blackmagicdesign.com/products/davinciresolve

#### Étapes de montage :

1. **Nouveau projet** → "TikTok Demo Timalaus"
2. **Importer** les 2 vidéos :
   - `tiktok_demo_phone.mp4` (écran téléphone)
   - `tiktok_demo_dashboard.mp4` (écran ordinateur)

3. **Timeline** :
   ```
   [0-10s]  PHONE : Ouverture app + gameplay
   [10-15s] PHONE : Game Over + clic "Partager sur TikTok"
   [15-25s] SPLIT SCREEN : Phone (gauche) + Dashboard (droite)
   [25-30s] DASHBOARD : Zoom sur événement reçu
   [30-40s] PHONE : Retour au jeu
   ```

4. **Ajouter du texte** sur chaque scène :
   - "Timalaus - Quiz d'histoire"
   - "Clic sur Partager sur TikTok"
   - "Événement capturé dans le Sandbox TikTok"
   - "Intégration TikTok Share Kit complète"

5. **Transition** : Crossfade entre les scènes (0.5 sec)

6. **Export** :
   - Format : MP4
   - Codec : H.264
   - Résolution : 1920x1080 (ou 1080x1920 si vertical)
   - Framerate : 30 fps
   - Bitrate : 8-10 Mbps
   - Nom : `timalaus_tiktok_demo_final.mp4`

### Option B : CapCut (gratuit, simple)

**Télécharger** : https://www.capcut.com/

1. **Nouveau projet**
2. **Importer** les 2 vidéos
3. **Glisser** sur la timeline
4. **Ajouter texte** avec les annotations
5. **Exporter** en 1080p, MP4

---

## 6. SOUMISSION À TIKTOK

### Checklist avant soumission :

- [ ] Vidéo dure entre 60-120 secondes
- [ ] Format MP4, moins de 50 Mo
- [ ] On voit clairement l'app s'ouvrir depuis l'écran Android
- [ ] Le bouton "Partager sur TikTok" est visible et cliqué
- [ ] Le dashboard sandbox TikTok montre l'événement reçu
- [ ] Les identifiants TikTok (App ID, Client Key) sont visibles
- [ ] Le flux complet est montré sans coupures

### Téléchargement sur TikTok Developers :

1. Aller sur : https://developers.tiktok.com/apps/
2. Sélectionner votre app (App ID: `7573939838525638668`)
3. Section **"Review"** ou **"Submit for Review"**
4. **Upload Demo Video** → Choisir `timalaus_tiktok_demo_final.mp4`
5. Remplir les champs requis :
   - **Product sélectionné** : Share Kit
   - **Description** : "Demonstration of TikTok Share Kit integration in Timalaus quiz game. Users can share their scores on TikTok with one click."
   - **Sandbox environment** : Yes
6. **Submit**

---

## 🎯 RÉSUMÉ DES FICHIERS MODIFIÉS

### Fichiers modifiés pour la démo :

1. **`/components/modals/PrecisionGameOverModal.tsx`**
   - Ajout du bouton "Partager sur TikTok" (lignes 120-134)
   - Styles TikTok (lignes 196-198)

2. **`/scripts/tiktok-webhook-server.ts`** (NOUVEAU)
   - Serveur webhook pour capturer les événements
   - Dashboard HTML en temps réel

3. **`/TIKTOK_VIDEO_DEMO_PLAN.md`** (NOUVEAU)
   - Plan détaillé du scénario vidéo

4. **`/TIKTOK_DEMO_GUIDE_COMPLET.md`** (CE FICHIER)
   - Instructions complètes étape par étape

### ⚠️ IMPORTANT : Après l'approbation TikTok

Ces modifications sont **temporaires** pour la vidéo de démonstration.

**NE PAS PUBLIER** ce build sur Play Store !

Après approbation TikTok, vous pourrez :
1. Implémenter réellement TikTok Share Kit SDK
2. Remplacer le mockup par une vraie intégration
3. Publier la version 1.5.8 avec TikTok fonctionnel

---

## 🆘 DÉPANNAGE

### Problème : `adb: device not found`

```bash
# Redémarrer le serveur ADB
adb kill-server
adb start-server
adb devices
```

### Problème : L'app ne s'installe pas

```bash
# Désinstaller l'ancienne version
adb uninstall com.pierretulle.juno2

# Réinstaller
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

### Problème : Le webhook ne reçoit rien

1. Vérifier que le serveur tourne : http://localhost:3000/dashboard
2. Essayer le bouton "Simuler un partage"
3. Regarder les logs du terminal où tourne le serveur

### Problème : Vidéo trop lourde (> 50 Mo)

```bash
# Compresser avec ffmpeg
ffmpeg -i timalaus_tiktok_demo_final.mp4 -vcodec h264 -b:v 5000k timalaus_tiktok_demo_compressed.mp4
```

---

## 🎉 FÉLICITATIONS !

Si vous avez suivi ce guide, vous avez maintenant :

✅ Un build de Timalaus avec bouton TikTok
✅ Un serveur webhook sandbox fonctionnel
✅ Une vidéo de démonstration professionnelle
✅ Tout ce qu'il faut pour soumettre à TikTok !

**Prochaine étape** : Attendre l'approbation TikTok (3-7 jours), puis implémenter la vraie intégration TikTok Share Kit ! 🚀

---

## 📞 AIDE SUPPLÉMENTAIRE

Si vous avez des questions ou rencontrez des problèmes :

1. Vérifier les logs du terminal
2. Relire la section dépannage
3. Me demander de l'aide pour une étape spécifique

**Bonne chance avec votre soumission TikTok ! 🎯**
