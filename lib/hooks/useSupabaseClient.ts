"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import type { SupabaseClient } from "@supabase/supabase-js"

/**
 * Hook personnalisé pour créer le client Supabase uniquement côté client
 * après le montage du composant. Évite les erreurs de pré-rendu.
 */
export function useSupabaseClient() {
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null)

  useEffect(() => {
    // Ne créer le client que côté client, après le montage
    // Cela évite l'erreur "Server Functions cannot be called during initial render"
    setSupabase(createClient())
  }, [])

  return supabase
}
