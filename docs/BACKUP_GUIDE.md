# 🛡️ Guide de Backup Anti-Perte

## 🚨 RÈGLE D'OR : TOUJOURS BACKUPER AVANT

**Avant TOUTE manipulation de base :**
```powershell
node backup_daily.mjs
```

## 📋 Scripts disponibles

### 1. Backup quotidien automatique
```powershell
# Installation (une fois, en admin)
./setup_backup_task.ps1

# Manuel
node backup_daily.mjs
```

### 2. Restauration
```powershell
# Depuis aujourd'hui
node restore_from_backup.mjs

# Depuis une date spécifique
node restore_from_backup.mjs 2025-03-04
```

### 3. Backup illustrations Supabase
```powershell
# Configurer d'abord vos clés dans backup_storage.mjs
node backup_storage.mjs
```

## 📂 Structure des backups

```
backups/
├── labo_backup_2025-03-04.json    # Données brutes
├── labo_backup_2025-03-04.csv     # Import Excel
├── full_backup_2025-03-04.sql     # Backup SQL complet
└── storage/                       # Illustrations
    ├── illustration1.jpg
    └── illustration2.jpg
```

## ⚡ Commandes de survie

### AVANT `supabase db reset`
```powershell
node backup_daily.mjs
node backup_storage.mjs
```

### APRÈS une perte
```powershell
# Voir les backups disponibles
ls backups/

# Restaurer
node restore_from_backup.mjs [date]
```

## 🔧 Vérification hebdomadaire
```powershell
# Vérifier que les backups se créent
ls backups/ | Where-Object { $_ -like "*$(Get-Date -Format yyyy-MM-dd)*" }

# Tester une restauration (sans écraser)
node restore_from_backup.mjs --dry-run
```

## 💡 Conseils pro

1. **Double backup** : Local + Cloud (Google Drive/Dropbox)
2. **Git tracking** : Ajouter les backups dans un repo séparé
3. **Monitoring** : Vérifier que la tâche planifiée tourne
4. **Test mensuel** : Faire une restauration test

## 🚨 En cas de problème

1. **Ne paniquez pas** : Les backups sont là
2. **Vérifier les dates** : Prendre le backup le plus récent
3. **Restaurer par étapes** : D'abord les données, puis les embeddings

---

**Rappel :** 15€ d'illustrations = 15 cafés. Mieux vaut perdre 5 minutes à backuper que 15€ ! ☕
