# Structure du Projet

Ce document détaille le rôle de chaque répertoire dans le projet Kiko.

## 📱 `mobile_app/`
C'est le **cœur du projet**. Il contient l'application mobile Expo / React Native.
- **Règle de sécurité** : Aucun pipeline ou script de data-processing ne doit s'y trouver.
- **Maintenance** : Toute modification ici doit faire l'objet d'un test de build Expo.

## 🛠️ `tools/`
Contient les "usines" à contenu. Ce sont des micro-projets indépendants de l'application mobile.
- `machine_a_evenements` : Prépare les données pour la base de données.
- `usine_a_images` : Génère les illustrations historiques.
- `galerie_dart` : Outils de correction et d'audit des visuels.

## 📜 `scripts/`
Dossier des scripts utilitaires classés par usage.
- `maintenance/` : Scripts de "chirurgie" sur la base de données ou le code.
- `data/` : Scripts de transformation de fichiers JSON/CSV.
- `mobile_app/` : Scripts techniques pour contourner les bugs d'Expo/Android.
- **`sandbox/`** : L'espace de jeu des agents. C'est ici que l'IA doit tester ses idées avant de les intégrer.

## 🔑 `credentials/`
Dossier critique contenant les secrets (clés API, fichiers de configuration sensibles).
- **Interdiction de commiter** : Ce dossier est dans le `.gitignore`.
- Les agents ne doivent jamais copier ces fichiers ailleurs.

## 📊 `data/`
Centralise les fichiers de données trop volumineux pour être trackés par Git (fichiers de 5Mo à 100Mo).

## 📚 `docs/`
Toute la connaissance du projet : guides audio, manuels d'utilisation des outils, rapports d'audit et arborescence.

## ⚡ `supabase/`
Migrations SQL et snippets pour la base de données. Toute modification du schéma doit passer par ici.
