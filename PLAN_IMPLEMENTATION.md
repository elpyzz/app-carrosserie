# Plan d'Implémentation - App Carrosserie MVP

## 📋 Vue d'ensemble

Ce document décrit l'architecture et le plan d'implémentation de l'application SaaS pour carrossiers.

## 🏗️ Architecture

### Stack Technique
- **Frontend**: Next.js 14 (App Router) + TypeScript + TailwindCSS
- **UI**: shadcn/ui (composants réutilisables)
- **Backend**: Supabase (Auth + Postgres + Storage)
- **Emails**: Resend
- **SMS**: Twilio (optionnel, feature flag)
- **Validation**: Zod + React Hook Form
- **Cron Jobs**: Vercel Cron

### Structure des dossiers

```
app/
├── api/
│   ├── cron/relances/      # Cron job relances automatiques
│   └── documents/[id]/     # API téléchargement documents
├── dashboard/              # Dashboard principal
├── dossiers/
│   ├── page.tsx           # Liste dossiers
│   ├── new/               # Création dossier
│   └── [id]/              # Vue détaillée dossier
├── impayes/               # Gestion impayés
├── fournisseurs/          # Répertoire fournisseurs
├── settings/              # Paramètres (admin)
└── login/                 # Authentification

components/
├── ui/                    # Composants UI (shadcn)
└── layout/                # Layouts (Navbar, etc.)

lib/
├── supabase/              # Clients Supabase
├── actions/               # Server actions
├── types.ts              # Types TypeScript
└── utils.ts              # Utilitaires

supabase/
├── schema.sql            # Schéma DB complet
└── seeds.sql             # Données de test
```

## 🗄️ Schéma de Base de Données

### Tables principales

1. **users** - Utilisateurs (étend auth.users)
2. **clients** - Clients
3. **vehicules** - Véhicules
4. **dossiers** - Dossiers sinistres (entité centrale)
5. **documents** - Documents/photos par dossier
6. **checklist_items** - Checklist par dossier
7. **communications** - Historique communications
8. **payments** - Suivi paiements
9. **suppliers** - Fournisseurs
10. **supplier_searches** - Historique recherches pièces
11. **audit_logs** - Logs d'audit
12. **settings** - Paramètres application

### Relations clés

- `dossiers.client_id` → `clients.id`
- `dossiers.vehicule_id` → `vehicules.id`
- `documents.dossier_id` → `dossiers.id`
- `payments.dossier_id` → `dossiers.id`
- `communications.dossier_id` → `dossiers.id`

### Sécurité (RLS)

- Toutes les tables ont RLS activé
- Policies : authentification requise pour toutes les opérations
- Settings : modification réservée aux admins

## 🔄 Flux de données

### Création d'un dossier

1. Formulaire client/véhicule/dossier
2. Création ou récupération client/véhicule
3. Génération automatique `dossier_id` (DOS-YYYY-XXX)
4. Création dossier + checklist items par défaut
5. Log audit

### Upload document

1. Upload vers Supabase Storage (`documents/{dossier_id}/{timestamp}.ext`)
2. Enregistrement en DB
3. Vérification checklist : si document requis → auto-cocher
4. Log audit

### Relances automatiques (Cron)

**Experts** (toutes les 6h via Vercel Cron):
1. Récupérer dossiers `EN_ATTENTE_EXPERT` ou `RELANCE_EXPERT`
2. Vérifier : pas de rapport_expert ET délai >= 3 jours
3. Envoyer email expert (Resend)
4. Enregistrer communication
5. Mettre à jour `date_derniere_relance_expert`
6. Si `notifier_client` → envoyer email client

**Impayés** (même cron):
1. Récupérer payments `EN_ATTENTE` ou `EN_RETARD`
2. Calculer jours depuis échéance
3. Si J+30, J+45, ou J+60 → envoyer email
4. Mettre à jour `nombre_relances` et `statut`

## 📱 Pages et fonctionnalités

### Dashboard (`/dashboard`)
- KPIs : dossiers en attente expert, retards, impayés, montants
- Liste "À traiter aujourd'hui"

### Dossiers (`/dossiers`)
- Liste avec filtres (statut, recherche)
- Création (`/dossiers/new`)
- Vue détaillée (`/dossiers/[id]`) :
  - Informations dossier
  - Checklist (avec validation auto)
  - Documents (upload/téléchargement)
  - Communications (historique)
  - Paiements
  - Actions rapides (changer statut)

### Impayés (`/impayes`)
- Liste des factures en attente
- Filtres par statut
- Actions : marquer payé, voir dossier

### Fournisseurs (`/fournisseurs`)
- Répertoire fournisseurs
- Recherche pièce (`/fournisseurs/recherche`)
- Historique recherches par dossier

### Settings (`/settings`) - Admin uniquement
- Configuration emails
- Fréquence relances
- Modèles de messages
- Toggle SMS

## 🔐 Authentification

- Supabase Auth
- Rôles : `admin`, `employe`
- Middleware Next.js pour protection routes
- RLS pour sécurité DB

## 📧 Emails (Resend)

### Types d'emails

1. **Relance expert** : Template configurable avec `{dossier_id}`
2. **Notification client** : Template configurable
3. **Relance impayé** : Template avec `{dossier_id}`, `{montant}`, `{jours}`

### Configuration

- Email expéditeur : paramètre settings
- Email paiements : paramètre settings (pour thread tracking)
- Templates : modifiables dans settings

## 🚀 Déploiement

### Prérequis

1. Projet Supabase créé
2. Schéma DB exécuté
3. Bucket Storage `documents` créé
4. Compte Resend
5. Compte Vercel

### Étapes

1. Cloner repo
2. `npm install`
3. Configurer `.env.local`
4. Exécuter schéma SQL dans Supabase
5. Créer utilisateur admin
6. Déployer sur Vercel
7. Configurer variables d'environnement Vercel
8. Configurer cron jobs (automatique via `vercel.json`)

## 🧪 Tests

### Données de test

- `supabase/seeds.sql` : clients, véhicules, dossiers, fournisseurs

### Scénarios de test

1. Créer un dossier → vérifier checklist
2. Upload document → vérifier auto-check
3. Changer statut → vérifier audit log
4. Cron job → vérifier relances envoyées

## 📝 Notes importantes

### Limitations MVP

- Pas de scraping portails experts (tout manuel)
- SMS optionnel (non implémenté dans MVP)
- Recherche fournisseurs = base interne (pas d'API externe)

### Évolutions futures (V2)

- Intégrations API fournisseurs
- Scraping portails experts (si nécessaire)
- Notifications push
- Export PDF
- Statistiques avancées

## 🔧 Maintenance

### Cron Jobs

- Fréquence : toutes les 6h (configurable dans Vercel)
- Endpoint : `/api/cron/relances`
- Sécurité : header `Authorization: Bearer CRON_SECRET`

### Logs

- Audit log : toutes les actions importantes
- Communications : historique complet
- Erreurs : console + logs Vercel

## ✅ Checklist de déploiement

- [ ] Schéma DB exécuté
- [ ] Bucket Storage créé
- [ ] Variables d'environnement configurées
- [ ] Utilisateur admin créé
- [ ] Resend configuré (domaine vérifié)
- [ ] Vercel déployé
- [ ] Cron jobs testés
- [ ] Emails testés
- [ ] Upload documents testé
