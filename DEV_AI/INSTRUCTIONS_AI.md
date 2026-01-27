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

## 🔧 6. WORKFLOW DE CORRECTION D'ERREURS

**Quand l'utilisateur rapporte une erreur, tu dois suivre ce workflow:**

### Étape 1️⃣ : Consulter le fichier `DEV_AI/erreurs_a_corriger.md`

Ce fichier centralise **toutes les erreurs documentées** avec:
- Logs spécifiques extraits de `current_session.json`
- Contexte et conditions de reproduction
- Suggestions IA pour la correction
- Fichiers concernés et numéros de lignes

**Ton action** :
- Cherche si l'erreur rapportée existe déjà dans ce fichier
- Si oui, utilise les logs et suggestions documentées
- Si non, continue à l'étape 2

### Étape 2️⃣ : Extraire les logs pertinents

Tu **DOIS extraire les logs de `current_session.json`** et **les documenter dans `erreurs_a_corriger.md`** :
- Identifie les timestamps exacts de l'erreur
- Extrais les messages de log pertinents
- Inclus les données associées (userId, timestamps, états)
- Note les patterns (double appels? re-renders? conditions spécifiques?)

### Étape 3️⃣ : Analyser le code + les logs ensemble

**Ne te fie JAMAIS au code seul**. Utilise:
- Les logs réels du fichier `current_session.json` comme source de vérité
- Le code source pour comprendre le "pourquoi"
- Les deux ensemble pour diagnostiquer le problème

Exemple :
```
Log montre: "Attempting to grant extra play" x2 au timestamp 09:51:54
Code indique: Il y a un useEffect avec un lock adSuccessLoading
Diagnostic: Le lock existe mais peut être contourné par une re-render
```

### Étape 4️⃣ : Proposer une correction avec suggestions complètes

Quand tu proposes une correction, **inclus toujours**:
1. **Hypothèse sur la cause** : Basée sur les logs et le code
2. **Logs supplémentaires à ajouter** : Pour mieux tracer le problème
3. **Configurations Reactotron à tester** : (ex: désactiver StrictMode)
4. **Réglages potentiels** : Changements de code proposés
5. **Plan de vérification** : Comment confirmer que la correction fonctionne

### Étape 5️⃣ : Mettre à jour `erreurs_a_corriger.md`

Après chaque session de débogage:
- Mets à jour le statut: `[x] Non corrigée` → `[ ] En cours` → `[ ] Corrigée`
- Documente la solution implémentée
- Ajoute les logs utiles trouvés pour futures références
- Note les découvertes importantes pour le contexte

---

### 📌 Résumé du flux utilisateur → IA → Correction

```
Utilisateur rapporte une erreur
         ↓
IA consulte erreurs_a_corriger.md
         ↓
IA analyse current_session.json pour les logs
         ↓
IA lit le code source concerné
         ↓
IA propose correction avec suggestions complètes
         ↓
Utilisateur implémente la correction
         ↓
IA met à jour erreurs_a_corriger.md avec statut "Corrigée"
```

### 🎯 Erreurs documentées à ce jour:

1. **[Publicités] Bannière AdMob ne se charge pas (BANNER_HOME)** - Non corrigée
2. **[Système de récompense] Double déclenchement** - Non corrigée

Consulte `DEV_AI/erreurs_a_corriger.md` pour les détails complets de chaque erreur.

---
*Dernière mise à jour : 27 Janvier 2026*
