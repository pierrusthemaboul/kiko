---
description: Effectuer un cycle complet d'édition, commit, push et déploiement Vercel sans interruption
---

// turbo-all

1. Ajouter les modifications
```powershell
git add .
```

2. Créer un commit
```powershell
git commit -m "Auto-update environment and styles"
```

3. Pousser vers GitHub
```powershell
git push
```

4. Déclencher le déploiement Vercel
```powershell
vercel --prod --yes
```

5. Vérifier le statut
```powershell
vercel list
```
