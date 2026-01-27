# 🚀 Guide de Démarrage Rapide - Kiko Chrono

## Commande unique pour tout lancer

```powershell
.\startup_complete.ps1
```

**C'est tout!** Cette commande va:
1. ✅ Nettoyer tous les anciens processus Node.js
2. ✅ Vérifier/Lancer l'émulateur Android
3. ✅ Configurer les tunnels ADB (ports 8081, 9090, 9091)
4. ✅ Lancer Metro Bundler dans une fenêtre séparée
5. ✅ Lancer OBSERVER dans une fenêtre séparée
6. ✅ Tout est prêt pour Reactotron Desktop

---

## Workflow quotidien recommandé

### 1. Première fois (installation de l'alias)

```powershell
.\install-alias.ps1
```

Cela crée un alias `kiko` que vous pourrez utiliser depuis n'importe où.

### 2. Ensuite, chaque jour

```powershell
# Option 1: Depuis le dossier du projet
kiko

# Option 2: Depuis n'importe où
kiko c:\Users\Pierre\kiko
```

### 3. Lancer Reactotron Desktop

Ouvrez Reactotron Desktop manuellement (ou ajoutez-le au démarrage Windows).

### 4. Utiliser l'app

Dans la fenêtre Metro qui s'ouvre:
- Appuyez sur `a` pour lancer l'app sur Android
- Appuyez sur `r` pour recharger l'app
- Appuyez sur `j` pour ouvrir le debugger

---

## Arrêter proprement

**Appuyez sur Ctrl+C** dans la fenêtre Metro principale. Cela arrête:
- Metro Bundler
- OBSERVER (automatiquement)

Ou fermez simplement les fenêtres PowerShell.

---

## Vérifier que tout fonctionne

```powershell
.\diagnose.ps1
```

Ce script vérifie:
- Émulateur actif
- Processus Node.js
- Tunnels ADB
- Metro répond
- OBSERVER écoute
- App installée

---

## Problèmes courants

### "L'émulateur ne démarre pas"

```powershell
# Lancer manuellement
emulator -avd Medium_Phone_API_36.1
```

Puis relancez `.\startup_complete.ps1`

### "Reactotron affiche 0 connections"

Dans le terminal Metro, appuyez sur `r` pour recharger l'app.

### "Les Custom Commands sont grisées"

C'est un bug visuel de Reactotron Desktop. Les commandes **fonctionnent quand même**.
Cliquez dessus et vérifiez les logs Metro pour voir le résultat.

---

## Fichiers importants

- `startup_complete.ps1` - Lance tout automatiquement
- `diagnose.ps1` - Diagnostic complet
- `gokiko.ps1` - Lance uniquement Metro
- `ReactotronConfig.ts` - Configuration Reactotron
- `entreprises virtuelles/REPORTERS_UNIT/AGENTS/OBSERVER/STORAGE/INPUT/current_session.json` - Logs en temps réel

---

*Dernière mise à jour: 2026-01-27*
