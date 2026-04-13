# Configuration MCP pour Supabase

## Fichiers créés

1. **mcp-supabase-server.mjs** - Serveur MCP personnalisé pour Supabase
2. **.claude/mcp-config.json** - Configuration du serveur MCP
3. **supabase-env.txt** - Variables d'environnement exemple

## Étapes pour finaliser la configuration

### 1. Installer les dépendances
```bash
npm install @supabase/supabase-js
```

### 2. Démarrer Supabase localement
```bash
npx supabase start
```

### 3. Tester le serveur MCP
```bash
node mcp-supabase-server.mjs
```

## Ressources MCP disponibles

- `supabase://config` - Configuration du projet
- `supabase://database/status` - Statut de la base de données
- `supabase://tables/list` - Liste des tables
- `supabase://functions/list` - Liste des fonctions edge

## Outils MCP disponibles

- `supabase_query` - Exécuter des requêtes SQL
- `supabase_function_invoke` - Invoquer des fonctions edge
- `supabase_storage_upload` - Uploader des fichiers

## Variables d'environnement

Les clés utilisées sont celles du projet de démonstration Supabase. Pour un projet réel, remplacez-les par vos clés depuis le dashboard Supabase.
