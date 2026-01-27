# 🐛 Erreurs à Corriger - Kiko Chrono

**Dernière mise à jour**: 2026-01-27 11:30
**Version**: 1.0

---

## 📋 Guide de Documentation

Chaque erreur doit suivre ce modèle pour être exploitable par l'IA:

### [Catégorie] Titre de l'erreur

**Statut**: [ ] Non corrigée | [x] En cours | [ ] Corrigée

**Priorité**: Haute | Moyenne | Basse

**Fichiers concernés**:
- fichier.ts:ligne
- composant.tsx:ligne

**Contexte**:
Description claire du problème et du moment où il apparaît.

**Logs spécifiques** (from `current_session.json`):
```json
Logs extraits avec timestamps
```

**Reproduction**:
Étapes précises pour reproduire l'erreur.

**Suggestions IA**:
- Hypothèse sur la cause racine
- Logs supplémentaires à ajouter
- Configurations Reactotron à tester
- Points de code à vérifier

---

## 1️⃣ [Publicités] Bannière AdMob ne se charge pas (BANNER_HOME)

**Statut**: [x] Non corrigée | [ ] En cours | [ ] Corrigée

**Priorité**: Haute

**Fichiers concernés**:
- `app/(tabs)/vue1.tsx:376` - Gestion du banner ad
- `lib/config/adConfig.ts` - Configuration des unités publicitaires

**Contexte**:
La bannière AdMob affiche une erreur de connectivité réseau et échoue à se charger. L'erreur s'affiche dans la console mais n'est PAS capturée dans `current_session.json`, ce qui signifie qu'elle n'est pas loggée par le système de Logger.

**Erreur observée en console**:
```
ERROR  [BANNER_HOME] Failed to load ad: [Error: [googleMobileAds/error-code-network-error] The ad request was unsuccessful due to network connectivity.]
```

**Logs spécifiques** (from `current_session.json`):
⚠️ **ABSENCE DE LOGS** - Cette erreur n'apparaît PAS dans current_session.json, seulement en console.

Logs de contexte correspondant au moment:
- Les logs de "Attempting to grant extra play" et mise à jour de profil confirmez que l'app fonctionne
- Les logs de Plays et System continuent normalement après l'erreur

**Reproduction**:
1. Lancer l'application
2. Naviguer sur l'écran "Home" (vue1.tsx)
3. Observer l'espace bannière en haut
4. L'erreur s'affiche dans Metro console entre les autres logs

**Suggestions IA**:
1. **Ajouter logging explicite** : Le `onAdFailedToLoad` callback doit appeler `Logger.error()` pour que l'OBSERVER capture l'erreur
   - Chercher: `app/(tabs)/vue1.tsx:376` ligne du `console.error('[BANNER_HOME]'...)`
   - Ajouter: `Logger.error('Ads', `[BANNER_HOME] Ad loading failed`, {code: error.code, message: error.message})`

2. **Vérifier la configuration réseau**:
   - Cette erreur de "network-error" peut indiquer un problème d'accès à AdMob
   - À tester: Vérifier si c'est spécifique au test ou à la production
   - Vérifier: `lib/config/adConfig.ts` pour les paramètres de requête

3. **Réglages à tester dans Reactotron**:
   - Vérifier que l'adresse IP locale (192.168.1.154:8081) a accès à Internet
   - Tester avec `getAdRequestOptions()` - ajouter des logs debug pour les options de requête

4. **Prochaine étape**:
   - Une fois que le logging est en place, vérifier que les erreurs de bannière apparaissent dans current_session.json
   - Analyser si c'est une fausse bannière, une configuration incorrect ou un problème réseau réel

---

## 2️⃣ [Système de récompense] Double déclenchement - Attempting to grant extra play

**Statut**: [x] Non corrigée | [ ] En cours | [ ] Corrigée

**Priorité**: Haute

**Fichiers concernés**:
- `app/(tabs)/vue1.tsx:234-291` - Gestion du useEffect pour la récompense
- `hooks/useRewardedPlayAd.ts:37, 125-127` - Logique du lock global
- `hooks/usePlays.ts` - Rafraîchissement des infos de jeu

**Contexte**:
Quand un utilisateur regarde une publicité récompensée et la termine, le message "Attempting to grant extra play" s'affiche **deux fois** au lieu d'une seule, avec un délai de ~230ms entre les deux appels. Cela cause une mise à jour doublée du compteur `parties_per_day`.

**Logs spécifiques** (from `current_session.json`):

```json
{
  "level": "info",
  "category": "Ads",
  "message": "Attempting to grant extra play",
  "data": {
    "userId": "9d97c5fe-9051-4da5-881a-f4f380cbb6b0"
  },
  "timestamp": "2026-01-27T09:51:54.056Z",
  "source": "app_logger"
},
{
  "level": "debug",
  "category": "Ads",
  "message": "Updating parties_per_day from 4 to 5",
  "timestamp": "2026-01-27T09:51:54.527Z",
  "source": "app_logger"
},
{
  "level": "info",
  "category": "Ads",
  "message": "Attempting to grant extra play",
  "data": {
    "userId": "9d97c5fe-9051-4da5-881a-f4f380cbb6b0"
  },
  "timestamp": "2026-01-27T09:51:54.286Z",
  "source": "app_logger"
},
{
  "level": "debug",
  "category": "Ads",
  "message": "Updating parties_per_day from 4 to 5",
  "timestamp": "2026-01-27T09:51:54.536Z",
  "source": "app_logger"
},
{
  "level": "info",
  "category": "Ads",
  "message": "Successfully updated profile",
  "timestamp": "2026-01-27T09:51:54.617Z",
  "source": "app_logger"
},
{
  "level": "info",
  "category": "Ads",
  "message": "Successfully updated profile",
  "timestamp": "2026-01-27T09:51:54.742Z",
  "source": "app_logger"
}
```

**Reproduction**:
1. Lancer l'application avec le statut Admin désactivé (via Reactotron)
2. Cliquer sur une publicité récompensée
3. Regarder la publicité jusqu'au bout
4. Vérifier les logs dans current_session.json
5. Observer deux messages "Attempting to grant extra play" avec timestamps proches

**Suggestions IA**:

1. **Analyse de la cause racine**:
   - Le délai de 230ms (09:51:54.056Z → 09:51:54.286Z) indique une **re-render React ou StrictMode**
   - `vue1.tsx` contient un useEffect qui dépend de `rewardEarned`, `refreshPlaysInfo`, `resetReward`
   - Ces dépendances peuvent changer entre le premier et le second rendu

2. **Vérifier le code**:
   - `app/(tabs)/vue1.tsx:234-291` - Le useEffect pour `grantExtraPlay()`
   - Vérifier si `adSuccessLoading` lock fonctionne correctement
   - Comparer avec `hooks/useRewardedPlayAd.ts:125-127` où il y a un `globalIsProcessing` lock

3. **Problème identifié**:
   - `useRewardedPlayAd.ts` a un lock `globalIsProcessing` mais il est réinitialisé dans `resetReward()`
   - Si le composant re-rend avant que `resetReward()` soit appelé, le state est perdu
   - `vue1.tsx` dépend de `adSuccessLoading` mais ce state peut être réinitialisé par une re-render

4. **Solution proposée**:
   - Ajouter un véritable **AbortController** ou **flag de montage** pour éviter les double-appels
   - Ou utiliser une **dépendance plus stable** dans le useEffect de vue1.tsx
   - Ajouter des logs de **trace** pour confirmer l'hypothèse (log quand adSuccessLoading change, quand resetReward est appelée)

5. **Réglages à tester dans Reactotron**:
   - Mettre React StrictMode en OFF temporairement pour voir si cela résout le problème
   - Ajouter des logs pour tracer: "adSuccessLoading changé", "resetReward appelée", "useEffect re-déclenché"

6. **Prochaines étapes**:
   - Ajouter les logs de trace proposés dans le point 5
   - Relancer le test et vérifier que nous voyons la séquence exacte
   - Implémente une solution (AbortController ou autre pattern)
   - Re-tester pour confirmer qu'il n'y a qu'un seul appel

---

## 📝 Notes Générales

- **Environnement de test**: Android Emulator (Medium_Phone_API_36.1)
- **Mode Debug**: Simulation mode (Admin désactivé, 4 parties/jour)
- **Système de surveillance**: OBSERVER actif sur port 9091
- **Réactotron**: Connecté et actif

---

## ✅ Checklist pour corriger une erreur

Quand tu commences à corriger une erreur, suis cette checklist:

- [ ] Lire la section correspondante dans ce fichier
- [ ] Extraire les logs spécifiques de `current_session.json`
- [ ] Lire le code dans les fichiers concernés
- [ ] Ajouter les logs de trace proposés
- [ ] Tester avec Reactotron en mode simulation
- [ ] Mettre à jour le statut (En cours → Corrigée)
- [ ] Documenter la solution au bas de la section erreur
