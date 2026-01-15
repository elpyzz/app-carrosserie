# App Carrosserie - MVP SaaS

Application web SaaS pour la gestion de sinistres pour carrossiers. Réduit les appels et délais avec experts/assurances, centralise les dossiers, automatise les relances, informe les clients, suit les impayés et aide à trouver des pièces.

## 🚀 Stack Technique

- **Next.js 14** (App Router) + TypeScript
- **TailwindCSS** + shadcn/ui
- **Supabase** (Auth + Postgres + Storage)
- **Resend** (emails sortants)
- **Zod** + React Hook Form
- **Vercel Cron** (relances automatiques)

## 📋 Prérequis

- Node.js 18+
- Compte Supabase
- Compte Resend (pour les emails)
- Compte Vercel (pour le déploiement et les cron jobs)

## 🛠️ Installation

### 1. Cloner et installer les dépendances

```bash
npm install
```

### 2. Configuration Supabase

1. Créer un projet Supabase
2. Exécuter le schéma SQL dans l'éditeur SQL de Supabase :
   ```bash
   # Copier le contenu de supabase/schema.sql et l'exécuter dans Supabase
   ```
3. Créer un bucket Storage nommé `documents` dans Supabase Storage
4. Configurer les policies RLS (déjà incluses dans le schéma)

### 3. Variables d'environnement

Créer un fichier `.env.local` :

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=votre_url_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre_anon_key
SUPABASE_SERVICE_ROLE_KEY=votre_service_role_key

# Resend
RESEND_API_KEY=votre_resend_api_key

# Cron (pour Vercel)
CRON_SECRET=votre_secret_aleatoire

# Twilio (optionnel, pour SMS)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=
```

### 4. Créer un utilisateur admin

1. Dans Supabase Auth, créer un utilisateur
2. Dans la table `users`, insérer une ligne :
   ```sql
   INSERT INTO public.users (id, email, full_name, role)
   VALUES (
     'uuid_de_l_utilisateur_auth',
     'admin@example.com',
     'Admin',
     'admin'
   );
   ```

### 5. Seeds de données (optionnel)

Exécuter `supabase/seeds.sql` dans Supabase pour avoir des données de test.

## 🏃 Démarrage local

```bash
npm run dev
```

L'application sera accessible sur `http://localhost:3000`

## 📦 Déploiement

### Pousser le code vers GitHub

#### Option 1 : Utiliser Git en ligne de commande

1. **Installer Git** (si ce n'est pas déjà fait) :
   - Télécharger depuis : https://git-scm.com/download/win
   - Ou installer via Chocolatey : `choco install git`

2. **Configurer Git** (première fois seulement) :
   ```bash
   git config --global user.name "Votre Nom"
   git config --global user.email "votre@email.com"
   ```

3. **Initialiser le dépôt et pousser** :
   ```bash
   git init
   git remote add origin https://github.com/elpyzz/app-carrosserie.git
   git add .
   git commit -m "Initial commit: App Carrosserie avec design glassmorphism"
   git branch -M main
   git push -u origin main
   ```

   **Note** : Si le dépôt distant n'est pas vide, utilisez :
   ```bash
   git push -u origin main --force
   ```

#### Option 2 : Utiliser GitHub Desktop (Recommandé)

1. Télécharger GitHub Desktop : https://desktop.github.com/
2. Installer et se connecter avec votre compte GitHub
3. Cliquer sur "File" > "Add Local Repository"
4. Sélectionner le dossier du projet
5. Cliquer sur "Publish repository" et choisir le dépôt `elpyzz/app-carrosserie`

#### Option 3 : Utiliser le script PowerShell

Exécuter le script fourni :
```powershell
powershell -ExecutionPolicy Bypass -File "push-to-github.ps1"
```

### Vercel

1. Connecter le repo GitHub à Vercel
2. Configurer les variables d'environnement dans Vercel
3. Déployer

Les cron jobs sont configurés dans `vercel.json` pour s'exécuter toutes les 6 heures.

### Configuration Cron Jobs

Pour tester les cron jobs localement ou manuellement :

```bash
curl -X GET http://localhost:3000/api/cron/relances \
  -H "Authorization: Bearer votre_CRON_SECRET"
```

## 📁 Structure du projet

```
├── app/
│   ├── api/              # API routes (cron, documents)
│   ├── dashboard/        # Dashboard principal
│   ├── dossiers/         # Gestion des dossiers
│   ├── impayes/          # Suivi des impayés
│   ├── fournisseurs/     # Répertoire fournisseurs
│   ├── settings/         # Paramètres (admin)
│   └── login/            # Page de connexion
├── components/
│   ├── ui/               # Composants UI (shadcn)
│   └── layout/           # Layouts (Navbar, etc.)
├── lib/
│   ├── supabase/         # Clients Supabase
│   ├── actions/          # Server actions
│   ├── types.ts          # Types TypeScript
│   └── utils.ts          # Utilitaires
└── supabase/
    ├── schema.sql        # Schéma DB complet
    └── seeds.sql         # Données de test
```

## 🎯 Fonctionnalités

### ✅ Implémentées

- ✅ Authentification avec rôles (Admin, Employé)
- ✅ CRUD dossiers sinistres
- ✅ Upload documents/photos (Supabase Storage)
- ✅ Checklist par dossier avec validation automatique
- ✅ Relances automatiques experts (cron job)
- ✅ Suivi impayés avec relances automatiques
- ✅ Répertoire fournisseurs + recherche pièces
- ✅ Dashboard avec KPIs
- ✅ Audit log (toutes les actions importantes)
- ✅ Paramètres configurables (admin)

### 🔄 Relances automatiques

- **Experts** : Tous les 3 jours (configurable) si rapport manquant
- **Impayés** : À J+30, J+45, J+60 après échéance
- Notifications clients optionnelles

## 🔐 Sécurité

- Row Level Security (RLS) activé sur toutes les tables
- Authentification requise pour toutes les pages
- Vérification des rôles pour les actions sensibles
- Validation des données avec Zod

## 📝 Notes importantes

1. **Storage Supabase** : Créer le bucket `documents` avec les policies appropriées
2. **Cron Jobs** : Configurer `CRON_SECRET` dans Vercel
3. **Emails** : Configurer Resend avec un domaine vérifié
4. **SMS** : Optionnel, nécessite configuration Twilio

## 🐛 Dépannage

### Erreur "Storage bucket not found"
→ Créer le bucket `documents` dans Supabase Storage

### Erreur "Unauthorized" sur les cron jobs
→ Vérifier que `CRON_SECRET` est bien configuré

### Emails non envoyés
→ Vérifier la clé API Resend et que le domaine est vérifié

## 📄 Licence

Propriétaire - Tous droits réservés

## 👥 Support

Pour toute question ou problème, ouvrir une issue sur le repository.
