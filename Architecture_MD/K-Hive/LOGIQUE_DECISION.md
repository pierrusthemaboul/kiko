# 🧠 Logique de Décision - K-Hive Corp

Ce document explique comment les agents et les scripts décident quel contenu est "Premium" (Social Ready).

## 1. 🎯 Sélection des Événements (Highlight Logic)
Le script `derush_clipper_v2.js` utilise la métadonnée `event_notoriete` (score de 1 à 100) pour prioriser le contenu.

*   **Notoriété > 90 (VIP)** : Ces événements (ex: **Jeanne d'Arc**, **Reine Victoria**) sont considérés comme des aimants à clics.
    *   **Action** : Le clipper ajoute un "Padding de Victoire" de **15 secondes** après le choix du joueur (au lieu de 4s).
    *   **Stockage** : Ils sont isolés dans `OUTPUTS/clips/VIP_HIGHLIGHTS`.
*   **Notoriété <= 90** : Clips standard.

## 2. 🎬 Montage Narratif (Sequence Mode)
Au lieu de clips de 10s, nous privilégions désormais des sequences de **25-40s** regroupant 3 à 5 tours.
*   **Pourquoi ?** Pour montrer la progression, les hésitations et les écrans de victoire.
*   **Trigger** : Si le repos entre deux événements est < 8 secondes, ils sont fusionnés dans une "Séquence Narrative".

## 3. 📱 Stratégie TikTok (ZOE)
*   **Le Hook** : Doit apparaître dans les 6 premières secondes pour capter l'attention.
*   **Safe Zone** : Le texte est placé au centre (Y=450) pour éviter les boutons TikTok.
*   **Call to Action** : La caption rédigée par ZOE incite à l'action immédiate ("Lien en bio").

## 4. 👁️ Validation QA (Louis + Critic)
Aucune vidéo ne sort sans un score **Critic IA Vision >= 8/10**. 
*   **Critères** : Visibilité du logo, clarté de l'action, présence d'un écran de succès.

---
*Document de transparence stratégique - K-Hive Corp.*
