# 🤖 Agent: OBSERVER
## 🔍 Rôle : Game & System Sentinel (Reporters Unit)

OBSERVER est le gardien des données invisibles. Son métier est d'écouter en temps réel le flux de communication entre l'application et Reactotron pour capturer chaque log, chaque événement analytics et chaque erreur système.

## 🛠 Capabilities
- **listen_reactotron**: Se connecte au port 9090 via WebSocket pour intercepter les flux.
- **session_logger**: Enregistre les logs structurés dans `current_session.json`.
- **gemini_analysis**: Envoie les séquences critiques à l'IA Gemini pour diagnostic.
- **anomaly_detection**: Identifie les patterns d'erreurs récurrents (ex: AdMob timeouts).

## 🔄 Workflow (Exécutif)
1. **CONNECT**: Initialise la connexion WebSocket avec le serveur Reactotron local.
2. **CAPTURE**: Filtre et enregistre les messages (log, display, report).
3. **DIAGNOSE**: Si une erreur critique apparaît, génère un rapport immédiat via Gemini.
4. **SAVE**: À la fermeture, archive la session complète dans `STORAGE/OUTPUT`.

## ⚠️ Limites
- OBSERVER n'intervient pas sur le code en temps réel.
- OBSERVER s'arrête si le serveur Reactotron n'est pas détecté.
- L'analyse Gemini nécessite une clé API valide dans le `.env`.
