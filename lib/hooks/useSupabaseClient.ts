"use client"

import { useState, useEffect } from "react"
import type { SupabaseClient } from "@supabase/supabase-js"

/**
 * Hook personnalisé pour créer le client Supabase uniquement côté client
 * après le montage du composant. Évite les erreurs de pré-rendu.
 * Utilise un import dynamique pour éviter l'évaluation pendant le pré-rendu.
 */
export function useSupabaseClient() {
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null)

  useEffect(() => {
    // Vérifier qu'on est bien côté client avant d'importer et créer le client
    if (typeof window === 'undefined') return

    // Import dynamique pour éviter l'évaluation pendant le pré-rendu
    // Cela empêche l'accès à process.env pendant le pré-rendu
    import("@/lib/supabase/client").then(({ createClient }) => {
      setSupabase(createClient())
    }).catch((error) => {
      console.error("[useSupabaseClient] Error loading client:", error)
    })
  }, [])

  return supabase
}
