# 📘 Manuel de Pilotage : K-Hive Corp

> **Bienvenue, CEO.**
> Votre équipe marketing virtuelle est prête. Voici comment la piloter.

---

## 📅 La Routine Matinale (Le "Daily")

Pour commencer une session de travail, copiez-collez simplement ce prompt dans votre chat IA :

> **Prompt de Démarrage :**
> "Bonjour K-Hive.
> Tu es maintenant le système d'exploitation de mon entreprise virtuelle située dans `Architecture_MD/K-Hive/`.
> Tes employés sont définis dans le dossier `AGENTS/`.
> Tes outils sont dans `WORKSHOP/TOOLS_MANIFEST.md`.
>
> 1. Lis `AGENTS/N2/LOUIS.md` et `AGENTS/N2/SERGE.md`.
> 2. Lance la **Réunion au Sommet** (`WORKSHOP/SCRIPTS/simulation_meeting.js`).
> 3. Fais-moi un rapport."

---

## 🛠️ Actions Spécifiques

### 1. Chercher une idée de contenu (Marc)
Si vous voulez une campagne sur un sujet précis :
> "Demande à Marc de chercher des événements sur 'Napoléon' dans la BDD (`get_game_events.js`)."

### 2. Créer un visuel TikTok (Léa + Visual Bot)
> "Demande à Léa de prendre l'image `X` et de la passer dans le `visual_bot.js` pour en faire un fond TikTok."

### 3. Monter une vidéo de gameplay (Hugo + Video Editor)
1.  Branchez votre téléphone par USB.
2.  > "Lance le Cameraman (`cameraman_bot.js`) en mode Manuel."
3.  Jouez 30s.
4.  > "Passe le fichier mp4 au Video Editor (`video_editor.js`) pour ajouter le logo."

### 4. Vérifier la qualité (Jade + Video Critic)
> "Demande à L'Œil de Léa (`video_critic.mjs`) d'analyser la vidéo `edited_...mp4` et donne-moi la note."

---

## ⚠️ En cas de pépin

*   **Erreur API Gemini (429)** : Attendez 1 minute et réessayez.
*   **Erreur ADB** : Vérifiez que le téléphone est branché et que le débogage USB est actif.
*   **Erreur ffmpeg** : Vérifiez que `oklogo.png` est bien dans `assets/images/`.

---
*K-Hive v1.0 - Janvier 2026*
