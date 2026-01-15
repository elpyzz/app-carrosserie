# Mode Mock - Application sans Supabase

L'application fonctionne maintenant en mode mock, ce qui signifie qu'elle peut être lancée sans configuration Supabase.

## ✅ Ce qui fonctionne

- ✅ Navigation entre les pages
- ✅ Interface utilisateur complète
- ✅ Formulaires (mais données non persistées)
- ✅ Authentification simplifiée (n'importe quel email/mot de passe)

## ⚠️ Limitations en mode mock

- ❌ Les données ne sont pas sauvegardées
- ❌ Les dossiers créés ne persistent pas
- ❌ Les documents uploadés ne sont pas stockés
- ❌ Les relances automatiques ne fonctionnent pas

## 🚀 Pour activer Supabase

1. Suivez les instructions dans `SUPABASE_SETUP.md`
2. Créez un fichier `.env.local` avec vos clés Supabase
3. L'application utilisera automatiquement Supabase au lieu du mock

## 📝 Pages disponibles

- `/login` - Connexion (n'importe quel email/mot de passe fonctionne)
- `/dashboard` - Dashboard avec KPIs (vides en mode mock)
- `/dossiers` - Liste des dossiers (vide en mode mock)
- `/dossiers/new` - Créer un nouveau dossier
- `/impayes` - Gestion des impayés
- `/fournisseurs` - Répertoire fournisseurs
- `/settings` - Paramètres (admin)
