# Guide d'Application des Migrations SQL

## Ordre d'exécution des migrations

Les migrations doivent être appliquées dans l'ordre suivant dans Supabase Dashboard > SQL Editor :

### Étape 1 : Tables de base (si pas déjà fait)
```sql
-- Exécuter supabase/schema.sql si premier déploiement
-- Exécuter supabase/expert_tables.sql pour les tables expert
```

### Étape 2 : Migration des types de documents
**Fichier :** `supabase/migrations/20250127_add_document_types.sql`

### Étape 3 : Migration table relance_history
**Fichier :** `supabase/migrations/20250127_create_relance_history.sql`

### Étape 4 : Migration table client_preferences
**Fichier :** `supabase/migrations/20250127_create_client_preferences.sql`

### Étape 5 : Migration des nouveaux settings
**Fichier :** `supabase/migrations/20250127_add_relance_settings.sql`

### Étape 6 : Migration champs dossiers expert (si Plan 2 appliqué)
**Fichier :** `supabase/migrations/20250126_add_expert_dossier_fields.sql`

## Vérification post-migration

```sql
-- Vérifier les types de documents
SELECT DISTINCT type FROM documents;

-- Vérifier les tables créées
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('relance_history', 'client_preferences', 'expert_sites');

-- Vérifier les settings
SELECT key, value FROM settings WHERE key LIKE 'relance%' OR key LIKE 'twilio%';

-- Vérifier les colonnes dossiers
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'dossiers' 
AND column_name IN ('numero_sinistre', 'site_expert_id');
```

## En cas d'erreur

Si une migration échoue :
1. Vérifier le message d'erreur
2. Corriger le problème (souvent une dépendance manquante)
3. Ré-exécuter la migration
4. Les migrations utilisent `IF NOT EXISTS` donc sont idempotentes
