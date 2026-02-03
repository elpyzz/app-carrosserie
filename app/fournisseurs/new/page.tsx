"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import AuthenticatedLayout from "@/components/layout/authenticated-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useSupabaseClient } from "@/lib/hooks/useSupabaseClient"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export const dynamic = 'force-dynamic'

const supplierSchema = z.object({
  nom: z.string().min(1, "Le nom est requis"),
  contact: z.string().optional(),
  telephone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  site_web: z.string().url().optional().or(z.literal("")),
  notes: z.string().optional(),
})

type SupplierFormData = z.infer<typeof supplierSchema>

export default function NewSupplierPage() {
  // Empêcher le pré-rendu côté serveur
  if (typeof window === 'undefined') return null

  const router = useRouter()
  const supabase = useSupabaseClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SupplierFormData>({
    resolver: zodResolver(supplierSchema),
  })

  const onSubmit = async (data: SupplierFormData) => {
    if (!supabase) {
      setError("Client Supabase non initialisé")
      return
    }

    setLoading(true)
    setError("")

    try {
      const { error: insertError } = await supabase.from("suppliers").insert({
        nom: data.nom,
        contact: data.contact || null,
        telephone: data.telephone || null,
        email: data.email || null,
        site_web: data.site_web || null,
        notes: data.notes || null,
        actif: true,
      })

      if (insertError) throw insertError

      router.push("/fournisseurs")
    } catch (err: any) {
      setError(err.message || "Une erreur est survenue")
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthenticatedLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center space-x-4">
          <Link href="/fournisseurs">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Nouveau fournisseur</h1>
            <p className="text-gray-900 mt-2">Ajouter un fournisseur au répertoire</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Informations fournisseur</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <Label htmlFor="nom">Nom *</Label>
                <Input
                  id="nom"
                  {...register("nom")}
                  placeholder="Nom du fournisseur"
                />
                {errors.nom && (
                  <p className="text-sm text-red-600 mt-1">{errors.nom.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="contact">Contact</Label>
                <Input
                  id="contact"
                  {...register("contact")}
                  placeholder="Nom du contact"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="telephone">Téléphone</Label>
                  <Input
                    id="telephone"
                    {...register("telephone")}
                    placeholder="0145678901"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    {...register("email")}
                    placeholder="contact@fournisseur.fr"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="site_web">Site web</Label>
                <Input
                  id="site_web"
                  type="url"
                  {...register("site_web")}
                  placeholder="https://www.fournisseur.fr"
                />
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  {...register("notes")}
                  placeholder="Notes sur le fournisseur..."
                  rows={4}
                />
              </div>

              {error && (
                <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
                  {error}
                </div>
              )}

              <div className="flex justify-end space-x-4">
                <Link href="/fournisseurs">
                  <Button type="button" variant="outline">
                    Annuler
                  </Button>
                </Link>
                <Button type="submit" disabled={loading}>
                  {loading ? "Création..." : "Créer le fournisseur"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AuthenticatedLayout>
  )
}
