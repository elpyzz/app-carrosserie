"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

/**
 * Traduction des erreurs Supabase en français
 */
function translateSupabaseError(error: string): string {
  const translations: Record<string, string> = {
    "Invalid login credentials": "Email ou mot de passe incorrect",
    "Email not confirmed": "Veuillez confirmer votre email avant de vous connecter",
    "User already registered": "Un compte existe déjà avec cet email",
    "Password should be at least 6 characters": "Le mot de passe doit contenir au moins 6 caractères",
    "New password should be different from the old password": "Le nouveau mot de passe doit être différent de l'ancien",
    "Auth session missing": "Session expirée, veuillez vous reconnecter",
    "Invalid email": "Format d'email invalide",
    "Signup requires a valid password": "Un mot de passe valide est requis",
  }

  // Chercher une traduction partielle
  for (const [key, value] of Object.entries(translations)) {
    if (error.toLowerCase().includes(key.toLowerCase())) {
      return value
    }
  }

  return error
}

/**
 * Connexion d'un utilisateur
 */
export async function signIn(
  email: string,
  password: string
): Promise<{ success?: boolean; error?: string }> {
  // Validation basique
  if (!email || !password) {
    return { error: "Email et mot de passe requis" }
  }

  // Validation format email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return { error: "Format d'email invalide" }
  }

  // Mode mock (sans Supabase)
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    console.log("[Auth] Mode mock - connexion autorisée")
    revalidatePath("/", "layout")
    return { success: true }
  }

  try {
    const supabase = await createClient()

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    })

    if (error) {
      console.error("[Auth] SignIn error:", error.message)
      return { error: translateSupabaseError(error.message) }
    }

    if (!data.user) {
      return { error: "Erreur lors de la connexion" }
    }

    // Succès - NE PAS utiliser redirect() ici
    // Retourner success et laisser le client gérer la redirection
    // Cela permet aux cookies de se synchroniser correctement avec le middleware
    revalidatePath("/", "layout")
    return { success: true }
  } catch (error: any) {
    console.error("[Auth] SignIn unexpected error:", error)
    return { error: "Une erreur est survenue lors de la connexion" }
  }
}

/**
 * Inscription d'un nouvel utilisateur
 */
export async function signUp(
  email: string,
  password: string,
  fullName: string
): Promise<{ success?: boolean; error?: string }> {
  // Validation basique
  if (!email || !password || !fullName) {
    return { error: "Tous les champs sont requis" }
  }

  // Validation format email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return { error: "Format d'email invalide" }
  }

  // Validation longueur mot de passe (minimum Supabase = 6)
  if (password.length < 6) {
    return { error: "Le mot de passe doit contenir au moins 6 caractères" }
  }

  // Validation nom
  if (fullName.trim().length < 2) {
    return { error: "Le nom doit contenir au moins 2 caractères" }
  }

  // Mode mock (sans Supabase)
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    console.log("[Auth] Mode mock - inscription simulée")
    return { success: true }
  }

  try {
    const supabase = await createClient()

    // Créer l'utilisateur dans Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: {
          full_name: fullName.trim(),
        },
      },
    })

    if (error) {
      console.error("[Auth] SignUp error:", error.message)
      return { error: translateSupabaseError(error.message) }
    }

    if (!data.user) {
      return { error: "Erreur lors de la création du compte" }
    }

    // Note: Le trigger Supabase crée automatiquement l'entrée dans public.users
    // Mais si le trigger n'existe pas encore, on le fait manuellement
    try {
      const { error: insertError } = await supabase.from("users").upsert(
        {
          id: data.user.id,
          email: data.user.email,
          full_name: fullName.trim(),
          role: "employe", // ✅ CORRIGÉ : 'employe' au lieu de 'secretaire'
          created_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      )

      if (insertError) {
        console.warn("[Auth] User insert warning:", insertError.message)
        // Ne pas bloquer l'inscription si l'insert échoue (le trigger peut l'avoir fait)
      }
    } catch (insertErr) {
      console.warn("[Auth] User insert failed:", insertErr)
    }

    return { success: true }
  } catch (error: any) {
    console.error("[Auth] SignUp unexpected error:", error)
    return { error: "Une erreur est survenue lors de l'inscription" }
  }
}

/**
 * Modification du mot de passe
 * Note: L'utilisateur doit être connecté (session active)
 * ✅ CORRIGÉ : Pas de vérification du mot de passe actuel (Supabase gère automatiquement)
 */
export async function updatePassword(
  newPassword: string
): Promise<{ success?: boolean; error?: string }> {
  // Validation longueur mot de passe
  if (!newPassword || newPassword.length < 6) {
    return { error: "Le nouveau mot de passe doit contenir au moins 6 caractères" }
  }

  // Mode mock (sans Supabase)
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    console.log("[Auth] Mode mock - modification mot de passe simulée")
    return { success: true }
  }

  try {
    const supabase = await createClient()

    // Vérifier que l'utilisateur est connecté
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return { error: "Vous devez être connecté pour modifier votre mot de passe" }
    }

    // Mettre à jour le mot de passe
    // ✅ CORRIGÉ : Supabase vérifie automatiquement que l'utilisateur est authentifié
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    })

    if (error) {
      console.error("[Auth] UpdatePassword error:", error.message)
      return { error: translateSupabaseError(error.message) }
    }

    return { success: true }
  } catch (error: any) {
    console.error("[Auth] UpdatePassword unexpected error:", error)
    return { error: "Une erreur est survenue lors de la modification du mot de passe" }
  }
}

/**
 * Déconnexion
 * ✅ CORRIGÉ : Garder le comportement redirect() existant pour compatibilité avec navbar
 */
export async function signOut() {
  // Mode mock
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    revalidatePath("/", "layout")
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

/**
 * Récupérer l'utilisateur courant
 * ✅ CORRIGÉ : Garder le format existant pour compatibilité
 */
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

    // ✅ CORRIGÉ : Retourner le format existant pour compatibilité
    return userData
  } catch (error) {
    console.error("[Auth] GetCurrentUser error:", error)
    return null
  }
}
