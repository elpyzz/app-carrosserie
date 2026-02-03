"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { updatePassword } from "@/lib/actions/auth"
import ClientAuthenticatedLayout from "@/components/layout/client-authenticated-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Loader2,
  CheckCircle2,
  AlertCircle,
  Lock,
  ArrowLeft,
} from "lucide-react"
import Link from "next/link"

export default function PasswordPage() {
  const router = useRouter()
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    if (!newPassword || !confirmPassword) {
      setError("Veuillez remplir tous les champs")
      return
    }

    // Validation longueur
    if (newPassword.length < 6) {
      setError("Le nouveau mot de passe doit contenir au moins 6 caractères")
      return
    }

    // Validation correspondance
    if (newPassword !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas")
      return
    }

    setError("")
    setLoading(true)

    try {
      const result = await updatePassword(newPassword)

      if (result?.error) {
        setError(result.error)
        setLoading(false)
        return
      }

      // Succès
      setSuccess(true)
      setLoading(false)

      // Redirection après 2 secondes
      setTimeout(() => {
        router.push("/settings")
      }, 2000)
    } catch (err: any) {
      console.error("[Password] Error:", err?.message || err)
      setError("Une erreur est survenue lors de la modification")
      setLoading(false)
    }
  }

  return (
    <ClientAuthenticatedLayout>
      <div className="max-w-md mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/settings">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="page-title flex items-center gap-2">
              <Lock className="h-6 w-6" />
              Modifier le mot de passe
            </h1>
            <p className="text-gray-600">
              Choisissez un nouveau mot de passe sécurisé
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Nouveau mot de passe</CardTitle>
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

              {/* Message de succès */}
              {success && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2 text-green-700 text-sm">
                  <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                  <span>
                    Mot de passe modifié avec succès ! Redirection...
                  </span>
                </div>
              )}

              {/* Nouveau mot de passe */}
              <div className="space-y-2">
                <Label htmlFor="newPassword">Nouveau mot de passe</Label>
                <Input
                  id="newPassword"
                  type="password"
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={loading || success}
                  required
                  minLength={6}
                />
                <p className="text-xs text-gray-500">Minimum 6 caractères</p>
              </div>

              {/* Confirmation */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">
                  Confirmer le nouveau mot de passe
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={loading || success}
                  required
                  minLength={6}
                />
              </div>

              {/* Bouton submit */}
              <Button
                type="submit"
                className="w-full btn-primary"
                disabled={loading || success}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Modification...
                  </>
                ) : (
                  "Modifier le mot de passe"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </ClientAuthenticatedLayout>
  )
}
