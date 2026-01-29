# Guide de Configuration Complète

## 1. Configuration Supabase

### 1.1 Créer le projet
1. Aller sur https://supabase.com
2. Créer un nouveau projet
3. Noter l'URL et les clés API

### 1.2 Appliquer le schéma
1. Aller dans SQL Editor
2. Exécuter `supabase/schema.sql`
3. Appliquer les migrations dans l'ordre (voir GUIDE_MIGRATIONS.md)

### 1.3 Créer le bucket Storage
1. Aller dans Storage
2. Créer un bucket nommé `documents`
3. Configurer les policies pour authenticated users

## 2. Configuration Twilio (SMS)

### 2.1 Créer un compte Twilio
1. Aller sur https://www.twilio.com
2. Créer un compte (essai gratuit disponible)
3. Noter le Account SID et Auth Token

### 2.2 Obtenir un numéro
1. Dans Twilio Console > Phone Numbers
2. Acheter un numéro français (ou utiliser le numéro d'essai)
3. Noter le numéro au format international (+33...)

### 2.3 Configurer dans l'app
1. Aller dans Settings
2. Cocher "Activer les SMS (Twilio)"
3. Remplir les champs Twilio

## 3. Configuration Resend (Emails)

### 3.1 Créer un compte Resend
1. Aller sur https://resend.com
2. Créer un compte
3. Générer une API Key

### 3.2 Vérifier un domaine
1. Dans Resend Dashboard > Domains
2. Ajouter votre domaine
3. Configurer les DNS selon les instructions

## 4. Configuration Vercel Cron

### 4.1 Variables d'environnement
Dans Vercel Project Settings > Environment Variables, ajouter :
- `CRON_SECRET` : Générer un secret aléatoire (min 32 caractères)
- `RESEND_API_KEY` : Votre clé Resend
- Toutes les variables Supabase

### 4.2 Vérifier le cron
Le cron est configuré dans `vercel.json` pour s'exécuter 3 fois par jour (8h, 14h, 20h).

## 5. Configuration Sites Experts

### 5.1 Ajouter un site expert
1. Aller dans Expert > Configuration
2. Cliquer sur "Ajouter un site"
3. Remplir tous les champs requis

### 5.2 Format des identifiants
Pour authentification "form" :
```json
{
  "login": "votre_login",
  "password": "votre_password"
}
```

### 5.3 Format des sélecteurs
```json
{
  "login_username": "#username",
  "login_password": "#password",
  "login_submit": "button[type='submit']",
  "search_input": "#search-dossier",
  "search_submit": ".btn-search",
  "message_textarea": "#message",
  "message_submit": ".send-message",
  "rapport_link": "a.pdf-download"
}
```

## 6. Créer un utilisateur admin

Dans Supabase SQL Editor :
```sql
INSERT INTO public.users (id, email, full_name, role)
VALUES (
  'uuid_de_votre_utilisateur_auth',
  'admin@example.com',
  'Administrateur',
  'admin'
);
```
