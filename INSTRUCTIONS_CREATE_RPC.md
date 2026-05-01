# Instructions pour créer la fonction RPC execute_sql

Pour avoir un accès complet à la base de données via MCP, vous devez créer manuellement la fonction RPC `execute_sql` dans votre base Supabase de production.

## Étapes:

1. **Ouvrez le dashboard Supabase**
   - Allez sur: https://app.supabase.com/project/ppxmtnuewcixbbmhnzzc/sql

2. **Exécutez ce SQL**
```sql
CREATE OR REPLACE FUNCTION execute_sql(query text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result json;
BEGIN
    EXECUTE format('SELECT json_agg(t) FROM (%s) t', query) INTO result;
    RETURN COALESCE(result, '[]'::json);
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'error', SQLERRM,
        'sqlstate', SQLSTATE
    );
END;
$$;

GRANT EXECUTE ON FUNCTION execute_sql TO service_role;
```

3. **Une fois créé, redémarrez votre IDE** pour que le serveur MCP utilise cette nouvelle fonction

## Sécurité

Cette fonction utilise `SECURITY DEFINER` et s'exécute avec les droits du service role, ce qui permet d'exécuter n'importe quelle requête SQL. Assurez-vous que:
- Seul le service role a accès à cette fonction
- La clé service role est protégée
- Vous comprenez les implications de sécurité
