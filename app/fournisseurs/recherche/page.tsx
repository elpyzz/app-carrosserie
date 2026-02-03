"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import AuthenticatedLayout from "@/components/layout/authenticated-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useSupabaseClient } from "@/lib/hooks/useSupabaseClient"
import { formatCurrency } from "@/lib/utils"
import { ArrowLeft, Save } from "lucide-react"
import Link from "next/link"

export const dynamic = 'force-dynamic'

const rechercheSchema = z.object({
  dossier_id: z.string().optional(),
  vehicule_marque: z.string().optional(),
  vehicule_modele: z.string().optional(),
  piece: z.string().min(1, "La pièce est requise"),
  reference: z.string().optional(),
  supplier_id: z.string().optional(),
  prix: z.string().optional(),
  delai_jours: z.string().optional(),
  disponible: z.string().optional(),
  notes: z.string().optional(),
})

type RechercheFormData = z.infer<typeof rechercheSchema>

function RecherchePiecePageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = useSupabaseClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [historique, setHistorique] = useState<any[]>([])

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<RechercheFormData>({
    resolver: zodResolver(rechercheSchema),
    defaultValues: {
      supplier_id: "",
      dossier_id: "",
    },
  })

  // Mettre à jour les valeurs du formulaire avec les paramètres d'URL après le montage
  useEffect(() => {
    const supplier = searchParams.get("supplier")
    const dossier = searchParams.get("dossier")
    if (supplier) setValue("supplier_id", supplier)
    if (dossier) setValue("dossier_id", dossier)
  }, [searchParams, setValue])

  useEffect(() => {
    if (!supabase) return // Attendre que le client soit initialisé

    // Charger les fournisseurs
    supabase
      .from("suppliers")
      .select("*")
      .eq("actif", true)
      .then(({ data }: { data: any[] | null }) => {
        if (data) setSuppliers(data)
      })

    // Charger l'historique si dossier_id
    const dossierId = searchParams.get("dossier")
    if (dossierId) {
      supabase
        .from("supplier_searches")
        .select("*, suppliers(*)")
        .eq("dossier_id", dossierId)
        .order("created_at", { ascending: false })
        .then(({ data }: { data: any[] | null }) => {
          if (data) setHistorique(data)
        })
    }
  }, [searchParams, supabase])

  const onSubmit = async (data: RechercheFormData) => {
    if (!supabase) {
      setError("Client Supabase non initialisé")
      return
    }

    setLoading(true)
    setError("")

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setError("Vous devez être connecté")
        return
      }

      // Enregistrer la recherche
      const { error: searchError } = await supabase
        .from("supplier_searches")
        .insert({
          dossier_id: data.dossier_id || null,
          vehicule_marque: data.vehicule_marque || null,
          vehicule_modele: data.vehicule_modele || null,
          piece: data.piece,
          reference: data.reference || null,
          supplier_id: data.supplier_id || null,
          prix: data.prix ? parseFloat(data.prix.replace(",", ".")) : null,
          delai_jours: data.delai_jours ? parseInt(data.delai_jours) : null,
          disponible: data.disponible === "true" ? true : data.disponible === "false" ? false : null,
          notes: data.notes || null,
          searched_by: user.id,
        })

      if (searchError) throw searchError

      // Rediriger ou recharger
      if (data.dossier_id) {
        router.push(`/dossiers/${data.dossier_id}`)
      } else {
        router.push("/fournisseurs")
      }
    } catch (err: any) {
      setError(err.message || "Une erreur est survenue")
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthenticatedLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center space-x-4">
          <Link href="/fournisseurs">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Recherche de pièce</h1>
            <p className="text-gray-900 mt-2">
              Enregistrer une recherche de pièce chez un fournisseur
            </p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Nouvelle recherche</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <Label htmlFor="piece">Pièce recherchée *</Label>
                  <Input
                    id="piece"
                    {...register("piece")}
                    placeholder="Ex: Aile avant droite"
                  />
                  {errors.piece && (
                    <p className="text-sm text-red-600 mt-1">
                      {errors.piece.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="reference">Référence (optionnel)</Label>
                  <Input
                    id="reference"
                    {...register("reference")}
                    placeholder="Référence pièce"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="vehicule_marque">Marque</Label>
                    <Input
                      id="vehicule_marque"
                      {...register("vehicule_marque")}
                      placeholder="Renault"
                    />
                  </div>
                  <div>
                    <Label htmlFor="vehicule_modele">Modèle</Label>
                    <Input
                      id="vehicule_modele"
                      {...register("vehicule_modele")}
                      placeholder="Clio"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="supplier_id">Fournisseur</Label>
                  <Select id="supplier_id" {...register("supplier_id")}>
                    <option value="">Sélectionner un fournisseur</option>
                    {suppliers.map((supplier) => (
                      <option key={supplier.id} value={supplier.id}>
                        {supplier.nom}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="prix">Prix (€)</Label>
                    <Input
                      id="prix"
                      type="number"
                      step="0.01"
                      {...register("prix")}
                      placeholder="250.00"
                    />
                  </div>
                  <div>
                    <Label htmlFor="delai_jours">Délai (jours)</Label>
                    <Input
                      id="delai_jours"
                      type="number"
                      {...register("delai_jours")}
                      placeholder="5"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="disponible">Disponibilité</Label>
                  <Select id="disponible" {...register("disponible")}>
                    <option value="">Non renseigné</option>
                    <option value="true">Disponible</option>
                    <option value="false">Non disponible</option>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    {...register("notes")}
                    placeholder="Notes sur la recherche..."
                    rows={3}
                  />
                </div>

                {error && (
                  <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
                    {error}
                  </div>
                )}

                <Button type="submit" disabled={loading} className="w-full">
                  <Save className="h-4 w-4 mr-2" />
                  {loading ? "Enregistrement..." : "Enregistrer la recherche"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Historique si dossier_id */}
          {searchParams.get("dossier") && historique.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Historique des recherches</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {historique.map((search: any) => (
                    <div
                      key={search.id}
                      className="p-3 border rounded-md bg-gray-50"
                    >
                      <p className="font-medium">{search.piece}</p>
                      {search.suppliers && (
                        <p className="text-sm text-gray-900">
                          {search.suppliers.nom}
                        </p>
                      )}
                      {search.prix && (
                        <p className="text-sm">
                          Prix: {formatCurrency(search.prix)}
                        </p>
                      )}
                      {search.delai_jours && (
                        <p className="text-sm">Délai: {search.delai_jours} jours</p>
                      )}
                      {search.disponible !== null && (
                        <p className="text-sm">
                          {search.disponible ? "✓ Disponible" : "✗ Non disponible"}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AuthenticatedLayout>
  )
}

export default function RecherchePiecePage() {
  return (
    <Suspense fallback={
      <AuthenticatedLayout>
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center justify-center py-12">
            <p className="text-gray-600">Chargement...</p>
          </div>
        </div>
      </AuthenticatedLayout>
    }>
      <RecherchePiecePageContent />
    </Suspense>
  )
}
