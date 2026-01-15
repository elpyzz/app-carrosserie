# Configuration Supabase

## 1. Créer le projet Supabase

1. Aller sur [supabase.com](https://supabase.com)
2. Créer un nouveau projet
3. Noter l'URL et les clés API

## 2. Exécuter le schéma SQL

1. Dans Supabase Dashboard, aller dans **SQL Editor**
2. Copier le contenu de `supabase/schema.sql`
3. Exécuter le script
4. Vérifier que toutes les tables sont créées

## 3. Créer le bucket Storage

1. Aller dans **Storage** dans le dashboard Supabase
2. Cliquer sur **New bucket**
3. Nom : `documents`
4. Public : **Non** (privé)
5. Cliquer sur **Create bucket**

### Configurer les policies du bucket

Dans **Storage** > **Policies** pour le bucket `documents` :

```sql
-- Policy: Authenticated users can upload
CREATE POLICY "Authenticated users can upload documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'documents');

-- Policy: Authenticated users can view documents
CREATE POLICY "Authenticated users can view documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'documents');

-- Policy: Authenticated users can delete documents
CREATE POLICY "Authenticated users can delete documents"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'documents');
```

## 4. Créer un utilisateur admin

### Via Supabase Auth

1. Aller dans **Authentication** > **Users**
2. Cliquer sur **Add user** > **Create new user**
3. Entrer email et mot de passe
4. Noter l'UUID de l'utilisateur créé

### Ajouter dans la table users

Dans **SQL Editor**, exécuter :

```sql
INSERT INTO public.users (id, email, full_name, role)
VALUES (
  'UUID_DE_L_UTILISATEUR_AUTH',
  'admin@example.com',
  'Admin',
  'admin'
);
```

Remplacez `UUID_DE_L_UTILISATEUR_AUTH` par l'UUID noté précédemment.

## 5. Charger les données de test (optionnel)

1. Dans **SQL Editor**, copier le contenu de `supabase/seeds.sql`
2. Exécuter le script
3. Vérifier que les données sont créées

## 6. Vérifier les RLS policies

Toutes les tables doivent avoir RLS activé. Vérifier dans **Authentication** > **Policies** que les policies sont bien créées.

## 7. Configuration des variables d'environnement

Dans votre fichier `.env.local` :

```env
NEXT_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre_anon_key
SUPABASE_SERVICE_ROLE_KEY=votre_service_role_key
```

Les clés se trouvent dans **Settings** > **API** du projet Supabase.

## ✅ Vérification

1. Tables créées : `users`, `clients`, `vehicules`, `dossiers`, `documents`, etc.
2. Bucket `documents` créé avec policies
3. Utilisateur admin créé dans `users`
4. RLS activé sur toutes les tables
5. Variables d'environnement configurées

## 🐛 Dépannage

### Erreur "bucket not found"
→ Vérifier que le bucket `documents` existe et est bien nommé

### Erreur "permission denied"
→ Vérifier les policies RLS et Storage

### Erreur "user not found"
→ Vérifier que l'utilisateur existe dans `auth.users` ET `public.users`
