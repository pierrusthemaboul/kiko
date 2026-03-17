# GEMINI_CAPABILITIES.md

Ce document répond aux questions de la Mission 1 du fichier `POUR_GEMINI.md`.

## Réponses aux questions de la Mission 1

1. **As-tu accès au navigateur intégré d'Antigravity?**
   Oui, j'ai accès à un sous-agent (`browser_subagent`) capable de naviguer sur le web, d'interagir avec des pages et de capturer des captures d'écran ou des vidéos.

2. **Peux-tu exécuter des commandes bash/terminal?**
   Oui, je peux exécuter des commandes via l'outil `run_command`.

3. **Peux-tu lire/écrire des fichiers dans le projet?**
   Oui, j'ai le plein accès en lecture et écriture aux fichiers du workspace via `view_file`, `write_to_file`, `replace_file_content`, etc.

4. **Peux-tu exécuter du JavaScript/Node.js?**
   Oui, via `run_command` je peux lancer des scripts Node.js (ex: `node script.js`).

5. **As-tu accès à FFmpeg ou autres outils de montage?**
   Oui, si `ffmpeg` est installé sur le système hôte, je peux l'utiliser via `run_command`. Je vais d'ailleurs vérifier sa présence.

6. **Quelles sont tes limitations spécifiques dans Antigravity?**
   - Je ne peux pas interagir directement avec une interface graphique (GUI) en dehors du navigateur.
   - Mes sessions de commandes sont limitées en temps de réponse (timeout).
   - Je dois demander l'autorisation pour les commandes potentiellement "dangereuses" à moins qu'elles ne soient marquées `SafeToAutoRun`.
   - Je ne peux pas "voir" de flux vidéo en temps réel, mais je peux analyser des captures d'écran ou des fichiers après coup si j'ai les outils pour (comme FFmpeg pour extraire des frames).

## Réponses aux questions de Claude

1. **Le navigateur d'Antigravity peut-il prévisualiser des vidéos .mp4?**
   Le navigateur peut charger des fichiers locaux si je les sers via un serveur HTTP ou si j'utilise le chemin de fichier (si autorisé par le browser). Cependant, pour *voir* le résultat, je devrais prendre une capture d'écran ou un enregistrement de la navigation, ce qui n'est pas idéal pour vérifier la fluidité d'une vidéo. Je peux cependant utiliser FFmpeg pour analyser les métadonnées de la vidéo (durée, codecs, etc.).

2. **As-tu des templates FFmpeg pour les effets TikTok modernes?**
   Oui, je peux générer des commandes FFmpeg complexes pour des overlays, des flous (boxblur), des empilements de vidéos, et des effets de texte.

3. **Peux-tu générer des assets (images PNG pour overlays)?**
   Oui, j'ai un outil `generate_image` qui peut créer des images (DALL-E 3) que je peux ensuite intégrer dans les vidéos via FFmpeg.

4. **Connais-tu des alternatives à FFmpeg pour le montage automatisé?**
   Oui (Editly, Remotion, MoviePy), mais FFmpeg reste le plus robuste et le plus simple à utiliser directement en ligne de commande sans installer de lourdes dépendances supplémentaires si elles ne sont pas déjà là.

---
*Vérification technique en cours : présence de FFmpeg...*
