# Recommandations pour votre nouvel ordinateur

Puisque vous avez une machine puissante et que vous travaillez sur un projet **Expo / React Native** avec des intégrations **IA**, **Firebase** et **AdMob**, voici une sélection d'outils et d'extensions qui boosteront votre productivité et exploiteront pleinement votre nouveau matériel.

## 🛠 Outils Système Indispensables

### 1. Git (Priorité Haute)
Comme nous l'avons vu, Git n'est pas encore installé. C'est la base pour tout développeur.
- **Lien :** [git-scm.com](https://git-scm.com/download/win)

### 2. Node Version Manager (fnm ou nvm-windows)
Pour gérer plusieurs versions de Node.js sans conflit. **fnm** est extrêmement rapide (écrit en Rust).
- **Lien :** [github.com/Schniz/fnm](https://github.com/Schniz/fnm)

### 3. PNPM (Déjà utilisé dans votre projet)
Votre projet possède un `pnpm-lock.yaml`. Installez-le globalement : `npm install -g pnpm`.
- **Pourquoi :** C'est beaucoup plus rapide et efficace que npm/yarn, surtout sur une machine puissante.

---

## 💻 Environnement de Développement (VS Code)

### Extensions VS Code Recommandées
- **ES7+ React/Redux/React-Native snippets :** Pour coder plus vite.
- **Expo Tools :** Support officiel pour vos fichiers `app.json` et la navigation.
- **Tailwind CSS IntelliSense :** (Si vous l'utilisez) Pour l'auto-complétion.
- **Prettier & ESLint :** Pour un code propre et sans erreurs.
- **Console Ninja :** Affiche vos `console.log` directement dans votre éditeur (très utile avec Expo).
- **Error Lens :** Affiche les erreurs et avertissements directement sur la ligne de code.

---

## 📱 Développement Mobile (Expo / React Native)

### 1. Android Studio & Emulateur
Avec votre machine puissante, vous pouvez faire tourner des émulateurs Android fluides.
- **Astuce :** Donnez 8 Go ou plus de RAM à votre émulateur pour une fluidité parfaite.

### 2. Vysor ou Scrcpy
Si vous préférez tester sur un vrai téléphone, ces outils permettent d'afficher et de contrôler votre téléphone depuis votre PC.
- **Scrcpy (Open Source) :** [github.com/Genymobile/scrcpy](https://github.com/Genymobile/scrcpy)

### 3. React Native Debugger
Un outil standalone pour débugger vos applications React Native (Inspecteur, Redux, Network).
- **Lien :** [github.com/jhen0409/react-native-debugger](https://github.com/jhen0409/react-native-debugger)

---

## 🤖 Intelligence Artificielle (IA)

Puisque votre projet utilise `Anthropic SDK`, `Google Generative AI` et `OpenAI`, voici quelques outils pour vous aider :

### 1. Cursor (Éditeur de code)
Un fork de VS Code avec l'IA intégrée nativement. C'est actuellement l'outil le plus puissant pour coder avec l'IA.
- **Lien :** [cursor.com](https://cursor.com/)

### 2. Ollama
Pour faire tourner des modèles d'IA (Llama 3, Mistral) **localement** sur votre machine puissante sans payer d'API.
- **Lien :** [ollama.com](https://ollama.com/)

---

## 🔍 Débogage & Simulation (Nouveau)

Pour simuler des parties et vérifier vos événements/publicités, voici les meilleures options :

### 1. Reactotron (Configuration en cours)
C'est l'outil parfait pour ce que vous demandez. On peut y ajouter des **Custom Commands**.
- **Usage :** Vous cliquez sur un bouton dans Reactotron (ex: "Simuler Victoire") et l'application réagit instantanément.
- **Visualisation :** Toutes vos Analytics Firebase s'afficheront en temps réel dans l'onglet "Timeline".

### 2. Firebase DebugView
Un outil intégré à la console Firebase qui permet de voir les événements arriver seconde par seconde.
- **Lien :** Console Firebase > Analytics > DebugView.
- **Activation :** Nécessite une petite commande `adb shell` sur Android pour l'activer.

### 3. Google Mobile Ads Inspector
AdMob possède un inspecteur intégré pour tester vos publicités récompensées sans dépenser d'argent réel.
- **Comment :** En secouant l'appareil ou via un bouton de débogage, il montre l'état des SDK d'annonces et pourquoi une pub ne se charge pas.

### 4. Création d'un "Menu Debug" Interne
On peut créer un overlay (bouton invisible ou appui long) qui n'apparaît qu'en développement pour :
- Se donner des vies infinies.
- Sauter des niveaux.
- Forcer l'affichage d'une publicité.

> [!TIP]
> Avec **Reactotron**, on peut même "mocker" (simuler) les réponses de votre API IA pour tester comment l'interface réagit à différentes réponses sans consommer vos crédits Anthropic/OpenAI.
