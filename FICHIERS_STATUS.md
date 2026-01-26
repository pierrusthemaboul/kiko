# 📊 État des fichiers critiques du projet Kiko

Généré le : 25 janvier 2026

---

## ✅ Fichiers présents sur le nouvel ordi

### Configuration (.env)
- ✅ `.env` - **Présent** avec :
  - ✅ EXPO_PUBLIC_SUPABASE_URL
  - ✅ EXPO_PUBLIC_SUPABASE_ANON_KEY
  - ✅ GEMINI_API_KEY
  - ⚠️ Manque potentiellement :
    - EXPO_PUBLIC_FIREBASE_* (variables Firebase si utilisées)
    - EXPO_PUBLIC_OPENAI_API_KEY (si utilisé)
    - EXPO_PUBLIC_ANTHROPIC_API_KEY (si utilisé)

### Firebase
- ✅ `android/app/google-services.json` - **Présent** (modifié le 18 jan 23:06)
- ❓ `ios/[app]/GoogleService-Info.plist` - **Non vérifié** (si iOS utilisé)

---

## ❌ Fichiers manquants à récupérer de l'ancien ordi

### 🔴 CRITIQUES (bloqueront la publication d'updates)

1. **Keystore Android** (.jks ou .keystore)
   - Nécessaire pour : Publier des mises à jour sur Google Play
   - Localisation probable : `android/app/upload-keystore.jks` ou racine projet
   - **Si perdu** : Impossible de mettre à jour l'app, il faudra republier sous un nouveau package

### 🟡 IMPORTANTS (fonctionnalités limitées sans eux)

2. **credentials.json**
   - Probablement pour : Google API (Analytics, Play Console, etc.)
   - Impact si manquant : Impossible d'utiliser certaines APIs Google

3. **kiko-chrono-*.json**
   - Pour : API Google Play Console
   - Impact si manquant : Impossible de gérer l'app via API

4. **tiktok-credentials.json**
   - Pour : Intégration TikTok (partage, etc.)
   - Impact si manquant : Fonctionnalité partage TikTok ne marchera pas

5. **twitter-credentials.json**
   - Pour : Intégration Twitter/X
   - Impact si manquant : Fonctionnalité Twitter ne marchera pas

6. **discord-webhook.json**
   - Pour : Notifications Discord (probablement pour monitoring)
   - Impact si manquant : Pas de notifications Discord

### 🟢 OPTIONNELS

7. **fix_rls.ts**
   - Script local de fix
   - Impact si manquant : Pas critique, script utilitaire

---

## 🎯 Actions recommandées

### Priorité 1 - URGENT
1. **Récupérer le keystore Android** depuis l'ancien ordi
   - Chercher `*.jks`, `*.keystore` dans le projet
   - C'est LE fichier le plus critique
   - Sans lui, tu ne pourras jamais mettre à jour l'app sur le Play Store

### Priorité 2 - Important
2. **Vérifier et récupérer les credentials**
   - credentials.json
   - kiko-chrono-*.json
   - Ces fichiers permettent l'intégration avec les services externes

### Priorité 3 - Optionnel
3. **Comparer les .env**
   - Ton .env actuel semble complet pour Supabase et Gemini
   - Mais vérifie s'il y avait d'autres clés (Firebase, OpenAI, etc.)

---

## 📋 Checklist de récupération

Utilise le fichier [PROMPT_ANCIEN_ORDI.md](PROMPT_ANCIEN_ORDI.md) sur ton ancien ordi pour récupérer :

- [ ] upload-keystore.jks (ou tout fichier .jks)
- [ ] credentials.json
- [ ] kiko-chrono-*.json
- [ ] tiktok-credentials.json (si feature TikTok utilisée)
- [ ] twitter-credentials.json (si feature Twitter utilisée)
- [ ] discord-webhook.json
- [ ] Comparer .env avec l'ancien (vérifier clés manquantes)

---

## ⚠️ Si le keystore est perdu

Si tu ne retrouves PAS le fichier keystore Android (.jks) :

**Option A** : Vérifier EAS Credentials
```bash
eas credentials
```
Les keystores sont parfois sauvegardés sur Expo EAS.

**Option B** : Contacter Google Play
Vérifier si Google Play a une copie du certificat de signature.

**Option C** : Dernier recours
Si vraiment perdu, tu devras :
- Changer le package name (`com.pierretulle.juno2` → `com.pierretulle.juno3`)
- Republier comme nouvelle app
- Perdre tous les utilisateurs/notes existants

---

## 📞 Support

Si tu as des questions sur ces fichiers, demande à l'IA sur le nouvel ordi.
