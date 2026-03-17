# 🧠 AI DEBUGGING CONTEXT - KIKO CHRONO

Ce fichier est le **point d'entrée obligatoire** pour toute IA travaillant sur ce projet. Il contient le contexte technique, les outils et la méthodologie de débogage avancée.

---

## 🚀 1. CONTEXTE DU PROJET
**Kiko Chrono** est un jeu mobile développé avec **Expo/React Native**. 
- **Backend** : Supabase.
- **Architecture** : "Entreprises Virtuelles" (Executive Agents).
- **Philosophie** : Utilisation d'agents spécialisés pour l'automatisation et le monitoring.

---

## 🛠️ 2. LES OUTILS ET ALIAS POWERSHELL

### Démarrage COMPLET (Recommandé):
```powershell
.\startup_complete.ps1
```
Lance automatiquement **Metro + OBSERVER** dans deux fenêtres séparées.

### Ou démarrage manuel:
| Commande | Action |
| :--- | :--- |
| `.\gokiko.ps1` | Lance le serveur Metro Expo + configure les tunnels ADB (amélioré). |
| `node 'entreprises virtuelles/orchestrateur.js' --observer` | Lance l'agent **OBSERVER** (le système de surveillance). |
| `adb devices` | Vérifie que l'émulateur est bien connecté. |
| `adb reverse --list` | Vérifie que les tunnels ADB sont bien établis. |

---

## 🕵️‍♂️ 3. L'AGENT OBSERVER (La Boîte Noire)
L'agent OBSERVER est le pilier du débogage. Il tourne en arrière-plan et capture tout.

- **Ports** : 9091 (HTTP Logs) et 9090 (Reactotron).
- **Fichier Crucial** : `entreprises virtuelles/REPORTERS_UNIT/AGENTS/OBSERVER/STORAGE/INPUT/current_session.json`.
- **Rôle** : C'est ici que sont stockés tous les logs en temps réel envoyés par l'application via le `LoggerService`.
- **Rapports AI** : Les analyses d'erreurs critiques sont générées dans `STORAGE/OUTPUT/`.

---

## ⚛️ 4. REACTOTRON ET COMMANDES DEBUG

L'application intègre des commandes personnalisées accessibles via l'application **Reactotron Desktop** sur le PC:

### Commandes disponibles:
1. **Afficher mes Stats** : Affiche profil et nombre de parties du jour
2. **Simuler Parties Limitées** : Désactive le statut Admin (5 parties/jour) pour tester les pubs et les limites réelles
3. **Ajouter 5 Parties** : Incrémente parties_per_day de 5 dans la DB
4. **Devenir Admin** : Définit is_admin = true (parties illimitées)
5. **Reset Runs du Jour** : Supprime vos parties enregistrées aujourd'hui
6. **Reset Debug** : Réinitialise tous les flags de simulation

### ⚠️ Si les commandes sont grisées:
- Assurez-vous que Reactotron Desktop affiche **"1 connections"** en bas
- Relancez l'app avec `r` dans la fenêtre Metro
- Si ça ne marche pas, utilisez `.\startup_complete.ps1` qui configure tout correctement

*Note : Après avoir utilisé une commande, un `r` (Reload) dans Expo est nécessaire.*

---

## 📂 5. FICHIERS CLÉS À SURVEILLER
- `utils/logger.ts` : Point d'envoi des logs vers l'OBSERVER.
- `hooks/usePlays.ts` : Gestion des limites de parties et statut Admin.
- `hooks/useRewardedPlayAd.ts` : Logique complexe des publicités et récompenses.
- `app/auth/login.tsx` : Point d'entrée utilisateur.

---

## 🤖 INSTRUCTIONS POUR L'IA (TOI)
Avant de proposer une correction, tu **DOIS** suivre ces étapes :

1. **Vérification de l'environnement** :
   - Vérifie si le fichier `current_session.json` est actif et contient des logs récents.
   - Vérifie si les tunnels ADB (port 9090 et 9091) sont configurés (via `gokiko.ps1`).

2. **Analyse de la boîte noire** :
   - Lis les dernières entrées de `current_session.json` pour comprendre la séquence exacte des événements qui a mené au bug.
   - Ne te fie pas uniquement au code source, regarde la donnée réelle qui a transité.

3. **Engagement Utilisateur** :
   - Une fois la vérification faite, pose cette question :
     > *"L'environnement de surveillance (OBSERVER + Reactotron) est prêt. Quel est le problème spécifique que vous souhaitez corriger aujourd'hui ?"*

---

## 🔧 6. CONFIRMATION D'ACCÈS AUX LOGS

Avant de commencer toute analyse ou correction, tu **DOIS** :
1.  Vérifier l'accès au fichier `entreprises virtuelles/REPORTERS_UNIT/AGENTS/OBSERVER/STORAGE/INPUT/current_session.json`.
2.  Confirmer explicitement ici (dans la conversation) que tu as accès à ce fichier.
3.  Citer brièvement les dernières entrées ou l'état du fichier (nombre de lignes, dernier timestamp) pour prouver que la surveillance est active et récente.

---
*Dernière mise à jour : 27 Janvier 2026*
