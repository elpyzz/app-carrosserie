"use client"

import { useState } from "react"
import Link from "next/link"
import { signIn } from "@/lib/actions/auth"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2 } from "lucide-react"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    e.stopPropagation()

    // Validation basique
    if (!email || !password) {
      setError("Veuillez remplir tous les champs")
      return
    }

    // Validation format email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setError("Format d'email invalide")
      return
    }

    setError("")
    setLoading(true)

    try {
      // Utiliser une Server Action pour la connexion
      // Cela garantit que les cookies sont correctement synchronisés avec Next.js
      const result = await signIn(email, password)

      // Si erreur retournée, afficher le message
      if (result?.error) {
        setError(result.error)
        setLoading(false)
        return
      }

      // Si succès, rediriger directement
      // Le middleware rafraîchira la session lors de la prochaine requête
      if (result?.success) {
        // Rediriger immédiatement - le middleware rafraîchira la session
        window.location.href = "/dashboard"
        return
      }

      // Si aucun résultat (ne devrait pas arriver)
      setError("Une erreur inattendue est survenue")
      setLoading(false)

    } catch (err: any) {
      console.error("[Login] Error:", err?.message || err)
      setError("Une erreur est survenue lors de la connexion")
      setLoading(false)
    }
  }


  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 relative" style={{ zIndex: 1000 }}>
      <Card className="w-full max-w-md bg-white shadow-lg border border-bordeaux-200 relative" style={{ zIndex: 1001 }}>
        <CardHeader className="space-y-4 pb-6">
          <div className="flex justify-center">
            <div className="bg-bordeaux-600 p-4 rounded-2xl shadow-md">
              <svg className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
          </div>
          <div className="text-center space-y-2">
            <CardTitle className="text-3xl font-bold text-bordeaux-800">
              App Carrosserie
            </CardTitle>
            <CardDescription className="text-base text-gray-900">
              Connectez-vous à votre compte
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5" style={{ position: 'relative', zIndex: 1002 }}>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-semibold text-gray-900">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="votre@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                className="h-12 border-2 focus:border-bordeaux-500 focus:ring-2 focus:ring-bordeaux-200"
                style={{ position: 'relative', zIndex: 1003 }}
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-semibold text-gray-900">
                Mot de passe
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                className="h-12 border-2 focus:border-bordeaux-500 focus:ring-2 focus:ring-bordeaux-200"
                style={{ position: 'relative', zIndex: 1003 }}
                autoComplete="current-password"
              />
            </div>
            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 p-4 rounded-lg">
                {error}
              </div>
            )}
            <button
              type="submit"
              className="w-full h-12 btn-primary text-base font-semibold flex items-center justify-center rounded-lg"
              disabled={loading}
              style={{ position: 'relative', zIndex: 1003 }}
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  Connexion...
                </>
              ) : (
                "Se connecter"
              )}
            </button>
            {/* Lien vers inscription */}
            <p className="text-center text-sm text-gray-600 mt-4">
              Pas encore de compte ?{" "}
              <Link
                href="/register"
                className="text-bordeaux-600 hover:text-bordeaux-700 font-medium"
              >
                Créer un compte
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
