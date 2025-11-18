# 🎬 PLAN DE DÉMONSTRATION VIDÉO TIKTOK - TIMALAUS

**Objectif** : Créer une vidéo professionnelle démontrant l'intégration TikTok Share Kit dans l'app Timalaus

**Durée cible** : 60-90 secondes

**Format** : MP4, 1080x1920 (vertical) ou 1920x1080 (horizontal)

---

## 📋 CE QUE TIKTOK VEUT VOIR

### ✅ Exigences obligatoires :
1. **Interface utilisateur clairement visible** - Montrer l'app Timalaus ouverte
2. **Interactions utilisateur** - Cliquer, naviguer, partager
3. **Flux complet d'intégration** - Du début (ouverture app) à la fin (partage sur TikTok)
4. **Sandbox TikTok** (si app pas encore approuvée) - Utiliser le portail développeur
5. **Produits TikTok utilisés** - Share Kit ou Login Kit clairement démontrés
6. **Package name visible** - Montrer que c'est bien `com.pierretulle.juno2`

### 🎯 Produit TikTok recommandé pour Timalaus :
**TikTok Share Kit** - Permet aux utilisateurs de partager leurs scores/résultats sur TikTok

**Pourquoi Share Kit ?**
- ✅ Simple à implémenter
- ✅ Pertinent pour un jeu de quiz (partage de scores)
- ✅ Crée de la viralité
- ✅ Pas besoin d'authentification complexe

---

## 🎥 SCÉNARIO DE VIDÉO (Version Sandbox)

### **SCÈNE 1 : Ouverture de l'app** (0:00 - 0:10)
**Action** :
- Ouvrir le téléphone Android
- Montrer l'écran d'accueil avec l'icône Timalaus visible
- Cliquer sur l'icône Timalaus
- L'app s'ouvre et affiche l'écran d'accueil

**À filmer** :
- ✅ Icône de l'app clairement visible
- ✅ Animation de lancement (splash screen)
- ✅ Interface principale du jeu

**Voix-off / Texte à l'écran** :
> "Timalaus - Un jeu de quiz d'histoire avec partage social TikTok"

---

### **SCÈNE 2 : Jouer une partie** (0:10 - 0:30)
**Action** :
- Démarrer une partie en Mode Classique ou Précision
- Répondre à 2-3 questions rapidement
- Montrer un bon score (par exemple 8/10)
- Arriver à l'écran "Fin de partie" avec le score affiché

**À filmer** :
- ✅ Gameplay fluide et engageant
- ✅ Questions d'histoire visibles
- ✅ Score final bien mis en évidence
- ✅ Bouton de partage visible

**Voix-off / Texte à l'écran** :
> "Répondez aux questions d'histoire et obtenez un score"

---

### **SCÈNE 3 : Clic sur le bouton "Partager sur TikTok"** (0:30 - 0:35)
**Action** :
- Sur l'écran de fin de partie, cliquer sur un bouton "Partager sur TikTok"
- Montrer l'interface de partage qui s'ouvre

**À filmer** :
- ✅ Bouton "Partager sur TikTok" bien visible avec logo TikTok
- ✅ Transition fluide vers l'interface TikTok

**Voix-off / Texte à l'écran** :
> "Partagez votre score sur TikTok avec un clic"

---

### **SCÈNE 4 : Portail Sandbox TikTok (IMPORTANT)** (0:35 - 0:60)
**Action** :
- Montrer le **Portail Développeur TikTok** ouvert dans un navigateur
- Naviguer vers la section "Test Events" ou "Sandbox"
- Montrer que l'événement de partage a été déclenché
- Afficher les logs montrant :
  - Client Key: `awz0h9u8g1no4xah`
  - App ID: `7573939838525638668`
  - Share event réussi
  - Payload JSON avec le contenu partagé (score, texte, image)

**À filmer** :
- ✅ URL du portail développeur TikTok visible
- ✅ Section "Sandbox" ou "Test Environment" ouverte
- ✅ Événement de partage enregistré avec timestamp
- ✅ Détails du payload (texte, image, lien vers app)

**Voix-off / Texte à l'écran** :
> "L'événement de partage est validé dans l'environnement sandbox TikTok"

---

### **SCÈNE 5 : Simulation du post TikTok** (0:60 - 0:75)
**Action** :
- Montrer à quoi ressemblerait le post TikTok (mockup ou vraie capture)
- Afficher :
  - Image du score Timalaus
  - Texte : "Je viens de scorer 8/10 sur Timalaus ! 🎯 Peux-tu faire mieux ?"
  - Hashtags : #Timalaus #QuizTime #Histoire
  - Lien vers l'app : play.google.com/store/apps/details?id=com.pierretulle.juno2

**À filmer** :
- ✅ Mockup de post TikTok ou vraie interface
- ✅ Contenu partagé bien visible
- ✅ Call-to-action clair

**Voix-off / Texte à l'écran** :
> "Le score est partagé sur TikTok avec un lien vers l'app"

---

### **SCÈNE 6 : Retour à l'app** (0:75 - 0:90)
**Action** :
- Retourner à l'app Timalaus
- Montrer un message de confirmation : "Score partagé sur TikTok ✓"
- Afficher l'écran principal du jeu

**À filmer** :
- ✅ Message de succès
- ✅ UX fluide et professionnelle

**Voix-off / Texte à l'écran** :
> "Intégration TikTok Share Kit complète et fonctionnelle"

---

## 🎥 SCÉNARIO ALTERNATIF (Version avec vraie intégration)

Si vous implémentez réellement TikTok Share Kit dans l'app :

### **SCÈNE 1-2** : Identiques (Ouverture + Gameplay)

### **SCÈNE 3** : Partage réel sur TikTok
- Cliquer sur "Partager sur TikTok"
- L'app TikTok s'ouvre réellement (deep link)
- Interface de création de post TikTok s'affiche avec le contenu pré-rempli
- Publier le post
- Retour à Timalaus avec confirmation

**Avantage** : Plus convaincant et authentique

---

## 🛠️ OUTILS NÉCESSAIRES

### Pour l'enregistrement :
1. **Téléphone Android** avec Timalaus installé
2. **ADB Screen Recording** ou **Screen Recorder Android**
   ```bash
   adb shell screenrecord /sdcard/tiktok_demo.mp4
   adb pull /sdcard/tiktok_demo.mp4 ./
   ```
3. **OBS Studio** (gratuit) pour capturer le portail développeur TikTok
4. **DaVinci Resolve** (gratuit) ou **CapCut** pour montage

### Pour le montage :
1. **Transitions fluides** entre scènes
2. **Texte à l'écran** pour expliquer chaque étape
3. **Zoom sur éléments importants** (boutons, logs, etc.)
4. **Musique de fond** (optionnelle, discrète)

---

## 📝 CHECKLIST AVANT ENREGISTREMENT

### Préparation de l'app :
- [ ] Timalaus installé et fonctionnel sur téléphone
- [ ] Bouton "Partager sur TikTok" visible (même si mockup temporaire)
- [ ] Interface propre et sans bugs
- [ ] Bon éclairage pour filmer l'écran

### Préparation du Sandbox TikTok :
- [ ] Compte développeur TikTok créé
- [ ] App enregistrée avec Client Key et App ID
- [ ] Environnement sandbox accessible
- [ ] Webhooks ou logs configurés pour capturer les événements

### Enregistrement :
- [ ] Batterie téléphone chargée à 100%
- [ ] Mode avion activé (pas de notifications)
- [ ] Luminosité écran au maximum
- [ ] Son désactivé (sauf si besoin de voix-off live)

---

## 🎬 INSTRUCTIONS D'ENREGISTREMENT DÉTAILLÉES

### Étape 1 : Enregistrer l'écran du téléphone
```bash
# Démarrer l'enregistrement
adb shell screenrecord --bit-rate 8000000 --size 1080x1920 /sdcard/timalaus_gameplay.mp4

# Jouer la partie et partager
# (Actions manuelles sur le téléphone)

# Arrêter l'enregistrement (Ctrl+C dans le terminal)
# Récupérer la vidéo
adb pull /sdcard/timalaus_gameplay.mp4 ./videos/
```

### Étape 2 : Enregistrer le portail développeur TikTok
- Ouvrir OBS Studio
- Capturer la fenêtre du navigateur avec le portail TikTok
- Enregistrer en 1920x1080, 30fps

### Étape 3 : Montage final
1. Importer les 2 vidéos dans DaVinci Resolve ou CapCut
2. Synchroniser les moments clés (clic sur bouton = apparition dans logs)
3. Ajouter des annotations textuelles
4. Ajouter des zooms sur éléments importants
5. Exporter en MP4, H.264, 1080p, 30fps

---

## 📤 FORMAT D'EXPORT FINAL

**Spécifications techniques** :
- Format : MP4 (H.264)
- Résolution : 1920x1080 (ou 1080x1920 si vertical)
- Frame rate : 30 fps
- Bitrate : 8-10 Mbps
- Taille maximale : 50 Mo (compresser si nécessaire)
- Durée : 60-120 secondes

---

## ✅ VALIDATION AVANT SOUMISSION

Vérifiez que la vidéo montre clairement :
- [ ] L'app Timalaus s'ouvrant depuis l'écran d'accueil Android
- [ ] Le package name `com.pierretulle.juno2` visible quelque part
- [ ] Une partie de jeu jouée du début à la fin
- [ ] Le bouton de partage TikTok cliqué
- [ ] L'environnement sandbox TikTok avec l'événement capturé
- [ ] Les identifiants TikTok (Client Key, App ID) visibles dans les logs
- [ ] Une simulation ou vraie interface de post TikTok
- [ ] Le flux complet sans coupures ni bugs

---

## 🚀 PROCHAINES ÉTAPES

1. **OPTION A : Démo Sandbox (Rapide - 2-3h)** ✅ RECOMMANDÉ
   - Créer un mockup de bouton "Partager sur TikTok" dans l'app
   - Configurer un webhook ou log dans le portail TikTok
   - Enregistrer la vidéo suivant le scénario ci-dessus

2. **OPTION B : Vraie intégration (Complet - 1-2 jours)**
   - Implémenter TikTok Share Kit SDK dans Timalaus
   - Tester en environnement sandbox
   - Enregistrer la vraie intégration fonctionnelle

**Recommandation** : Commencez par l'Option A pour valider rapidement votre demande TikTok, puis implémentez réellement (Option B) après approbation.

---

## 📞 BESOIN D'AIDE ?

Je peux vous aider avec :
1. ✅ **Créer le mockup UI du bouton TikTok** dans l'app
2. ✅ **Implémenter réellement TikTok Share Kit** (code React Native)
3. ✅ **Générer un script de voix-off** pour la vidéo
4. ✅ **Créer des sous-titres** pour chaque scène
5. ✅ **Configurer le sandbox TikTok** avec webhooks

**Quelle option préférez-vous ?**
- Option A (Mockup sandbox - rapide) ?
- Option B (Vraie implémentation - complète) ?

Je peux commencer immédiatement ! 🚀
