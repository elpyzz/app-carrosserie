"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Navbar } from "./navbar"
import { Header } from "./header"
import { Loader2 } from "lucide-react"

interface ClientAuthenticatedLayoutProps {
  children: React.ReactNode
}

export default function ClientAuthenticatedLayout({
  children,
}: ClientAuthenticatedLayoutProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Vérifier si Supabase est configuré
        if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
          // Mode mock - autoriser l'accès directement
          console.log("[ClientAuth] Mode mock - accès autorisé")
          setIsAuthenticated(true)
          setIsLoading(false)
          return
        }

        // Vérifier l'authentification via Supabase client
        const supabase = createClient()
        const { data: { user }, error } = await supabase.auth.getUser()

        if (error || !user) {
          console.log("[ClientAuth] Non authentifié, redirection vers /login")
          router.push("/login")
          return
        }

        // Utilisateur authentifié
        setIsAuthenticated(true)
      } catch (error) {
        console.error("[ClientAuth] Erreur:", error)
        // En cas d'erreur, autoriser l'accès (le middleware gérera la vraie auth)
        setIsAuthenticated(true)
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [router])

  // Afficher un loader pendant la vérification
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-bordeaux-600 mx-auto" />
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    )
  }

  // Si non authentifié, ne rien afficher (redirection en cours)
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-bordeaux-600 mx-auto" />
          <p className="mt-4 text-gray-600">Redirection...</p>
        </div>
      </div>
    )
  }

  // Afficher le layout normal
  return (
    <div className="min-h-screen flex">
      <Navbar />
      <div className="flex-1 flex flex-col ml-0 lg:ml-[280px]">
        <Header />
        <main className="flex-1 p-6 overflow-auto bg-gray-50">
          {children}
        </main>
      </div>
    </div>
  )
}
