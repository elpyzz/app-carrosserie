"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

export async function signIn(email: string, password: string) {
  // In mock mode, always succeed
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    revalidatePath("/", "layout")
    // Ne pas faire redirect() ici car ça peut causer des problèmes
    // Le client fera le router.push
    return { success: true }
  }

  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/", "layout")
  redirect("/dashboard")
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath("/", "layout")
  redirect("/login")
}

export async function getCurrentUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  // Mock user data if Supabase not configured
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

  const { data: userData } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single()

  return userData
}
