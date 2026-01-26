# Guide de Sécurité Système - Anti-Freeze

Ce document récapitule les limites techniques de cet ordinateur (Ubuntu 24.04, 8Go RAM, 4 CPU) pour éviter les blocages rencontrés précédemment.

## ⚠️ Règles d'Utilisation (Navigateur)

Pour éviter que le système ne sature (Swap 3.2Go/4Go déjà utilisé), appliquez strictement ces règles :

1.  **Strictement 1 onglet à la fois** : N'ouvrez jamais plusieurs pages simultanément.
2.  **Fermeture Immédiate** : Fermez l'onglet/le navigateur dès que l'information est obtenue.
3.  **Autorisation Automatique** : L'utilisateur accepte par défaut les commandes de navigation pour accélérer le processus et limiter le temps d'ouverture des fenêtres.
3.  **Privilégier le Terminal** : Utilisez `curl`, `wget` ou `adb` au lieu du navigateur quand c'est possible.
4.  **Éviter les sites lourds** : TikTok et YouTube saturent rapidement la RAM. Utilisez-les avec parcimonie.

## 🧪 Spécifications du Système (Audit du 17/01/2026)

- **CPU** : 4 Coeurs
- **RAM** : 8 Go (Disponible : ~2 Go sous charge normale)
- **OS** : Ubuntu 24.04 LTS
- **Charge (Load)** : Souvent élevée (> 3.5), attention aux pics lors de l'encodage vidéo FFmpeg.

## 🔄 Persistance pour les discussions futures

> [!TIP]
> **À copier dans votre premier message lors d'une nouvelle session :**
> "Rappel : Respecte le SYSTEM_SAFETY_GUIDE.md pour éviter les freezes (1 onglet max, pas de sites lourds inutiles)."

---
*Ce guide a été rédigé suite aux freezes de la Phase 4 pour garantir une collaboration fluide.*
