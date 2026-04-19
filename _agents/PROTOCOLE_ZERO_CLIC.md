# 🛡️ PROTOCOLE "ZÉRO CLIC" (ALLOW LIST)

Ce protocole définit les commandes que l'agent Antigravity est autorisé à exécuter avec `SafeToAutoRun: true`, supprimant ainsi le besoin de cliquer sur "Run" pour chaque action.

## 📋 Liste Blanche des Commandes (SafeToAutoRun)

L'agent utilisera systématiquement `SafeToAutoRun: true` pour :

| Catégorie | Commandes Whitelisted |
| :--- | :--- |
| **Gestion de Code** | `git add`, `git commit`, `git push`, `git pull`, `git status`, `git diff`, `git rm` |
| **Dépendances & Build** | `npm`, `pnpm`, `npx` (install, run, build, etc.) |
| **Déploiement** | `vercel`, `vercel --prod` |
| **Système (PS)** | `ls`, `dir`, `echo`, `cat`, `type`, `Get-ChildItem`, `Select-Object` |
| **Fichiers** | `New-Item`, `Remove-Item`, `Add-Content`, `Set-Content`, `rm`, `del` |
| **Mobile** | `adb`, `am`, `pm` |
| **Scripts** | `node <script.js>` |

## 🚨 Règles d'Exécution

1.  **Priorité aux Outils IA** : Pour la recherche de texte (`grep_search`) ou de fichiers (`list_dir`), l'agent utilise les outils natifs qui ne demandent jamais de confirmation.
2.  **Syntaxe Windows** : Toutes les commandes utilisent la syntaxe PowerShell.
3.  **Workflows Turbo** : Les slash commands (`/app-start`, `/vercel-sync`) s'exécutent de manière fluide sans interruption.
4.  **Auto-Correction** : Si une commande échoue, l'agent tente une correction automatique sans solliciter l'utilisateur.

---
*Dernière mise à jour : 17/04/2026*
