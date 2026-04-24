# Manuel du Pipeline Kiko

Ce document sert de guide de référence pour le processus de création, validation et publication des événements historiques dans l'écosystème Kiko.

## Vue d'Ensemble du Pipeline

Le pipeline se compose de plusieurs étapes clés permettant de passer d'une idée thématique à un événement validé en production.

---

## 🟢 Étape 1 : Curateur IA (Génération)
**Localisation :** Page `AdminOptions` (`/admin-options`)

C'est ici que l'IA génère des suggestions d'événements basées sur des thématiques ou des archives.

### Modes de Fonctionnement
1. **Modèle Libre** : Saisie manuelle d'une période, d'un lieu ou d'un thème (ex: "12ème siècle", "Histoire du Japon").
2. **QPUC Live** : Exploitation des archives de "Questions pour un Champion" pour extraire des événements.

### Paramètres de Qualité
- **Quantité** : Nombre de suggestions demandées.
- **Anti-Doublon Sémantique** : Analyse les événements existants en base pour éviter les répétitions.
- **Triple Check Wikipédia** : L'IA effectue plusieurs passes de vérification pour garantir l'exactitude des dates et des faits.
- **Filtrer les "Décès"** : Évite de polluer la base avec de simples dates de mort, privilégiant les actions marquantes.

### Sortie
Les événements apparaissent dans des "Decks".
- **Action Requise** : Cliquer sur **VALIDER VERS SAS** pour envoyer le deck sélectionné vers l'étape suivante.

---

## 🟡 Étape 2 : Le SAS (Antichambre)
*En attente d'analyse...*

---

## 🟠 Étape 3 : Modération & Retouche
*En attente d'analyse...*

---

## 🔴 Étape 4 : Mise en Production
*En attente d'analyse...*
