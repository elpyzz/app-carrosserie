# Plan : Authentification complète et sans erreur (CORRIGÉ)

## Corrections apportées au plan original

### ❌ Problème 1 : Rôle par défaut incorrect
- **Plan original** : Utilise `'secretaire'` comme rôle par défaut
- **Problème** : Le schéma SQL n'accepte que `'admin'` ou `'employe'`
- **Correction** : Utiliser `'employe'` comme rôle par défaut

### ❌ Problème 2 : signOut modifié incorrectement
- **Plan original** : signOut retourne `{ success?: boolean; error?: string }`
- **Problème** : La navbar utilise `<form action={signOut}>` qui nécessite un redirect
- **Correction** : Garder le comportement redirect() existant pour signOut

### ❌ Problème 3 : getCurrentUser format de retour
- **Plan original** : Retourne un format simplifié
- **Problème** : Peut casser le code existant qui utilise getCurrentUser
- **Correction** : Garder le format existant ou s'assurer de la compatibilité

## Plan corrigé

### 1. Modifier lib/actions/auth.ts

**Corrections à apporter** :
- Remplacer `'secretaire'` par `'employe'` dans signUp
- Garder signOut avec redirect() (ne pas changer)
- S'assurer que getCurrentUser reste compatible

**Code corrigé pour signUp** :
```typescript
// Dans signUp, ligne où on crée l'entrée dans users :
role: "employe",  // ✅ CORRIGÉ : 'employe' au lieu de 'secretaire'
```

**Code corrigé pour signOut** :
```typescript
// Garder le comportement existant avec redirect
export async function signOut() {
  // Mode mock
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    redirect("/login")
    return
  }

  try {
    const supabase = await createClient()
    await supabase.auth.signOut()
    revalidatePath("/", "layout")
    redirect("/login")
  } catch (error: any) {
    console.error("[Auth] SignOut error:", error)
    redirect("/login") // Rediriger même en cas d'erreur
  }
}
```

**Code corrigé pour getCurrentUser** :
```typescript
// Garder le format existant pour compatibilité
export async function getCurrentUser() {
  // Mode mock
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return {
      id: "mock-user-id",
      email: "admin@example.com",
      full_name: "Admin",
      role: "admin",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  }

  try {
    const supabase = await createClient()
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (error || !user) {
      return null
    }

    // Récupérer les infos supplémentaires depuis public.users
    const { data: userData } = await supabase
      .from("users")
      .select("*")
      .eq("id", user.id)
      .single()

    // Retourner le format existant pour compatibilité
    return userData || {
      id: user.id,
      email: user.email,
      full_name: user.user_metadata?.full_name || "",
      role: "employe", // Par défaut si non trouvé
      created_at: user.created_at,
      updated_at: new Date().toISOString(),
    }
  } catch (error) {
    console.error("[Auth] GetCurrentUser error:", error)
    return null
  }
}
```

### 2. Migration SQL corrigée

**Fichier** : `supabase/migrations/20250203_create_users_trigger.sql`

**Correction** : Rôle par défaut
```sql
-- Fonction appelée par le trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, role, created_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'employe',  -- ✅ CORRIGÉ : 'employe' au lieu de 'secretaire'
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 3. Autres fichiers (pas de correction nécessaire)

- `app/register/page.tsx` : ✅ Correct
- `app/settings/password/page.tsx` : ✅ Correct
- `app/login/page.tsx` : ✅ Correct (ajout du lien vers register)
- `app/settings/page.tsx` : ✅ Correct (ajout section sécurité)

## Résumé des corrections

| Élément | Plan original | Correction |
|---------|---------------|------------|
| Rôle par défaut | `'secretaire'` | `'employe'` ✅ |
| signOut | Retourne objet | Garde redirect() ✅ |
| getCurrentUser | Format simplifié | Garde compatibilité ✅ |
| Trigger SQL | `'secretaire'` | `'employe'` ✅ |

## Points à vérifier avant implémentation

1. ✅ Rôle par défaut : `'employe'` (valide dans le schéma)
2. ✅ signOut : Garde le comportement redirect() pour compatibilité avec navbar
3. ✅ getCurrentUser : Format compatible avec le code existant
4. ✅ Tous les imports sont corrects
5. ✅ Tous les composants référencés existent (ClientAuthenticatedLayout, Button, etc.)

## Fichiers à modifier/créer (liste finale)

- [lib/actions/auth.ts](lib/actions/auth.ts) - MODIFIER (avec corrections)
- [app/register/page.tsx](app/register/page.tsx) - CRÉER
- [app/settings/password/page.tsx](app/settings/password/page.tsx) - CRÉER
- [app/login/page.tsx](app/login/page.tsx) - MODIFIER (ajouter lien)
- [app/settings/page.tsx](app/settings/page.tsx) - MODIFIER (ajouter section sécurité)
- [supabase/migrations/20250203_create_users_trigger.sql](supabase/migrations/20250203_create_users_trigger.sql) - CRÉER (avec correction rôle)
