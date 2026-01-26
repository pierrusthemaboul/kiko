# 🏭 Timalaus Corp - Cahier des Besoins V1

Pour que l'entreprise virtuelle fonctionne et génère du résultat, voici les briques manquantes à construire.

## 1. L'Intelligence Produit (Le "Cerveau Commun")
Tous les agents (surtout Marc et Léa) doivent comprendre intimement le jeu pour ne pas vendre du rêve.
*   **Besoin :** Un document "Bible du Jeu" (Lore, règles, mécanique précise du mode Classique vs Précision).
*   **Action :** Créer `KNOWLEDGE_BASE/TIMALAUS_BIBLE.md` que chaque agent devra lire en "System Prompt".

## 2. Le Circuit de Feedback (Les "Yeux")
Il nous faut des métriques réelles pour piloter la stratégie.
*   **Besoin :** Connecteurs automatiques vers les sources de données.
    *   *YouTube/TikTok API* : Récupérer "Vues", "Likes", "Shares" par vidéo.
    *   *Play Store* : Récupérer "Nouveaux téléchargements" (via le script GCS existant).
*   **Outil nécessaire :** Un tableau de bord unifié (dans un fichier JSON ou MD mis à jour quotidiennement) que **Jade** (Data) peut lire.

## 3. L'Atelier de Production (Les "Mains")
Passer de l'idée au fichier mp4/jpg.
*   **Besoin :** Une chaîne de montage automatisée.
    *   *Générateur d'images* : Scripts connectés à DALL-E/Midjourney/Flux (déjà partiellement fait avec `sayon8.mjs`).
    *   *Monteur Vidéo* : Un script `ffmpeg` qui prend (Audio + Images + Sous-titres) -> Sortie `.mp4`.
    *   *Voix Off* : Un connecteur TTS (Text-to-Speech) type ElevenLabs ou OpenAI Audio.

## 4. Le Bureau des Ordres (Le "Système Nerveux")
Comment vous (Pierre) parlez à l'équipe.
*   **Besoin :** Une interface simple.
    *   Fichier `COMMAND_CENTER.md` où vous écrivez : "Léa, fais-moi une vidéo sur la Rome Antique".
    *   Un script "Manager" qui lit ce fichier et active le bon agent.

---
**Priorité Immédiate :** Intégrer la "Culture Timalaus" (Point 1) pour que les premiers tests soient pertinents.
