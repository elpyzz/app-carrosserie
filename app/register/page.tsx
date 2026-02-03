"use client"

import { useState } from "react"
import Link from "next/link"
import { signUp } from "@/lib/actions/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react"

export default function RegisterPage() {
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    if (!fullName || !email || !password || !confirmPassword) {
      setError("Veuillez remplir tous les champs")
      return
    }

    // Validation format email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setError("Format d'email invalide")
      return
    }

    // Validation longueur mot de passe
    if (password.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères")
      return
    }

    // Validation correspondance mots de passe
    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas")
      return
    }

    setError("")
    setLoading(true)

    try {
      const result = await signUp(email, password, fullName)

      if (result?.error) {
        setError(result.error)
        setLoading(false)
        return
      }

      // Succès
      setSuccess(true)
      setLoading(false)
    } catch (err: any) {
      console.error("[Register] Error:", err?.message || err)
      setError("Une erreur est survenue lors de l'inscription")
      setLoading(false)
    }
  }

  // Afficher le message de succès
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <CardTitle className="text-2xl">Inscription réussie !</CardTitle>
            <CardDescription>
              Votre compte a été créé avec succès.
              {process.env.NEXT_PUBLIC_SUPABASE_URL && (
                <span className="block mt-2">
                  Vérifiez votre email pour confirmer votre compte.
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/login">
              <Button className="w-full btn-primary">
                Se connecter
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-bordeaux-700">
            Créer un compte
          </CardTitle>
          <CardDescription>
            Remplissez le formulaire pour créer votre compte
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Message d'erreur */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2 text-red-700 text-sm">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Nom complet */}
            <div className="space-y-2">
              <Label htmlFor="fullName">Nom complet</Label>
              <Input
                id="fullName"
                type="text"
                placeholder="Jean Dupont"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                disabled={loading}
                required
              />
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="jean.dupont@exemple.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                required
              />
            </div>

            {/* Mot de passe */}
            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                required
                minLength={6}
              />
              <p className="text-xs text-gray-500">Minimum 6 caractères</p>
            </div>

            {/* Confirmation mot de passe */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
                required
                minLength={6}
              />
            </div>

            {/* Bouton submit */}
            <Button
              type="submit"
              className="w-full btn-primary"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Inscription...
                </>
              ) : (
                "Créer mon compte"
              )}
            </Button>

            {/* Lien vers login */}
            <p className="text-center text-sm text-gray-600">
              Déjà un compte ?{" "}
              <Link
                href="/login"
                className="text-bordeaux-600 hover:text-bordeaux-700 font-medium"
              >
                Se connecter
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
