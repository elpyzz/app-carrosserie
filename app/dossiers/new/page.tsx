"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
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
import { DossierStatut } from "@/lib/types"

export const dynamic = 'force-dynamic'

const dossierSchema = z.object({
  client_nom: z.string().min(1, "Le nom est requis"),
  client_telephone: z.string().optional(),
  client_email: z.string().email().optional().or(z.literal("")),
  client_adresse: z.string().optional(),
  vehicule_immatriculation: z.string().optional(),
  vehicule_vin: z.string().optional(),
  vehicule_marque: z.string().optional(),
  vehicule_modele: z.string().optional(),
  vehicule_annee: z.string().optional(),
  assureur: z.string().optional(),
  expert: z.string().optional(),
  expert_email: z.string().email().optional().or(z.literal("")),
  statut: z.enum([
    "NOUVEAU",
    "EN_ATTENTE_EXPERT",
    "RELANCE_EXPERT",
    "RAPPORT_RECU",
    "EN_REPARATION",
    "FACTURE_ENVOYEE",
    "EN_ATTENTE_PAIEMENT",
    "PAYE",
    "LITIGE",
  ]),
  montant_estime: z.string().optional(),
  notes: z.string().optional(),
  notifier_client: z.boolean().default(false),
})

type DossierFormData = z.infer<typeof dossierSchema>

export default function NewDossierPage() {
  const [mounted, setMounted] = useState(false)
  const router = useRouter()
  const supabase = useSupabaseClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  // Attendre que le composant soit monté côté client
  useEffect(() => {
    setMounted(true)
  }, [])

  // Afficher un loader pendant le montage
  if (!mounted) {
    return (
      <AuthenticatedLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-bordeaux-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Chargement...</p>
          </div>
        </div>
      </AuthenticatedLayout>
    )
  }

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<DossierFormData>({
    resolver: zodResolver(dossierSchema),
    defaultValues: {
      statut: "NOUVEAU",
      notifier_client: false,
    },
  })

  const onSubmit = async (data: DossierFormData) => {
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

      // Créer ou récupérer le client
      let clientId = null
      if (data.client_nom) {
        const { data: existingClient } = await supabase
          .from("clients")
          .select("id")
          .eq("nom", data.client_nom)
          .eq("email", data.client_email || "")
          .single()

        if (existingClient) {
          clientId = existingClient.id
        } else {
          const { data: newClient, error: clientError } = await supabase
            .from("clients")
            .insert({
              nom: data.client_nom,
              telephone: data.client_telephone || null,
              email: data.client_email || null,
              adresse: data.client_adresse || null,
            })
            .select()
            .single()

          if (clientError) throw clientError
          clientId = newClient.id
        }
      }

      // Créer ou récupérer le véhicule
      let vehiculeId = null
      if (data.vehicule_immatriculation || data.vehicule_vin) {
        const { data: existingVehicule } = await supabase
          .from("vehicules")
          .select("id")
          .or(
            `immatriculation.eq.${data.vehicule_immatriculation},vin.eq.${data.vehicule_vin}`
          )
          .single()

        if (existingVehicule) {
          vehiculeId = existingVehicule.id
        } else {
          const { data: newVehicule, error: vehiculeError } = await supabase
            .from("vehicules")
            .insert({
              immatriculation: data.vehicule_immatriculation || null,
              vin: data.vehicule_vin || null,
              marque: data.vehicule_marque || null,
              modele: data.vehicule_modele || null,
              annee: data.vehicule_annee ? parseInt(data.vehicule_annee) : null,
            })
            .select()
            .single()

          if (vehiculeError) throw vehiculeError
          vehiculeId = newVehicule.id
        }
      }

      // Générer le dossier_id
      const { data: dossierIdData } = await supabase.rpc("generate_dossier_id")
      const dossierId = dossierIdData || `DOS-${new Date().getFullYear()}-001`

      // Créer le dossier
      const { data: dossier, error: dossierError } = await supabase
        .from("dossiers")
        .insert({
          dossier_id: dossierId,
          client_id: clientId,
          vehicule_id: vehiculeId,
          assureur: data.assureur || null,
          expert: data.expert || null,
          expert_email: data.expert_email || null,
          statut: data.statut,
          montant_estime: data.montant_estime
            ? parseFloat(data.montant_estime.replace(",", "."))
            : null,
          notes: data.notes || null,
          notifier_client: data.notifier_client,
          created_by: user.id,
        })
        .select()
        .single()

      if (dossierError) throw dossierError

      // Créer les checklist items par défaut
      const checklistItems = [
        { libelle: "Carte grise reçue", est_obligatoire: true, document_requis: "carte_grise" },
        { libelle: "Photos avant réparation", est_obligatoire: true, document_requis: "photos_avant" },
        { libelle: "Rapport expert reçu", est_obligatoire: true, document_requis: "rapport_expert" },
        { libelle: "Devis validé", est_obligatoire: false, document_requis: "devis" },
      ]

      await supabase.from("checklist_items").insert(
        checklistItems.map((item) => ({
          dossier_id: dossier.id,
          ...item,
        }))
      )

      // Log audit
      await supabase.from("audit_logs").insert({
        action: "DOSSIER_CREATED",
        entity_type: "dossiers",
        entity_id: dossier.id,
        user_id: user.id,
        details: { dossier_id: dossier.dossier_id },
      })

      router.push(`/dossiers/${dossier.id}`)
    } catch (err: any) {
      setError(err.message || "Une erreur est survenue")
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthenticatedLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Nouveau dossier</h1>
          <p className="text-gray-900 mt-2">Créer un nouveau dossier sinistre</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-6">
            {/* Client */}
            <Card>
              <CardHeader>
                <CardTitle>Client</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="client_nom">Nom *</Label>
                  <Input
                    id="client_nom"
                    {...register("client_nom")}
                    placeholder="Nom du client"
                  />
                  {errors.client_nom && (
                    <p className="text-sm text-red-600 mt-1">
                      {errors.client_nom.message}
                    </p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="client_telephone">Téléphone</Label>
                    <Input
                      id="client_telephone"
                      {...register("client_telephone")}
                      placeholder="0612345678"
                    />
                  </div>
                  <div>
                    <Label htmlFor="client_email">Email</Label>
                    <Input
                      id="client_email"
                      type="email"
                      {...register("client_email")}
                      placeholder="client@example.com"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="client_adresse">Adresse</Label>
                  <Input
                    id="client_adresse"
                    {...register("client_adresse")}
                    placeholder="Adresse complète"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Véhicule */}
            <Card>
              <CardHeader>
                <CardTitle>Véhicule</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="vehicule_immatriculation">Immatriculation</Label>
                    <Input
                      id="vehicule_immatriculation"
                      {...register("vehicule_immatriculation")}
                      placeholder="AB-123-CD"
                    />
                  </div>
                  <div>
                    <Label htmlFor="vehicule_vin">VIN</Label>
                    <Input
                      id="vehicule_vin"
                      {...register("vehicule_vin")}
                      placeholder="Numéro VIN"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
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
                  <div>
                    <Label htmlFor="vehicule_annee">Année</Label>
                    <Input
                      id="vehicule_annee"
                      type="number"
                      {...register("vehicule_annee")}
                      placeholder="2020"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Dossier */}
            <Card>
              <CardHeader>
                <CardTitle>Informations dossier</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="assureur">Assureur</Label>
                    <Input
                      id="assureur"
                      {...register("assureur")}
                      placeholder="AXA, Allianz, etc."
                    />
                  </div>
                  <div>
                    <Label htmlFor="statut">Statut</Label>
                    <Select id="statut" {...register("statut")}>
                      <option value="NOUVEAU">Nouveau</option>
                      <option value="EN_ATTENTE_EXPERT">En attente expert</option>
                      <option value="RELANCE_EXPERT">Relance expert</option>
                      <option value="RAPPORT_RECU">Rapport reçu</option>
                      <option value="EN_REPARATION">En réparation</option>
                      <option value="FACTURE_ENVOYEE">Facture envoyée</option>
                      <option value="EN_ATTENTE_PAIEMENT">En attente paiement</option>
                      <option value="PAYE">Payé</option>
                      <option value="LITIGE">Litige</option>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="expert">Expert</Label>
                    <Input
                      id="expert"
                      {...register("expert")}
                      placeholder="Nom de l'expert"
                    />
                  </div>
                  <div>
                    <Label htmlFor="expert_email">Email expert</Label>
                    <Input
                      id="expert_email"
                      type="email"
                      {...register("expert_email")}
                      placeholder="expert@assureur.fr"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="montant_estime">Montant estimé (€)</Label>
                  <Input
                    id="montant_estime"
                    type="number"
                    step="0.01"
                    {...register("montant_estime")}
                    placeholder="2500.00"
                  />
                </div>
                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    {...register("notes")}
                    placeholder="Notes supplémentaires..."
                    rows={4}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="notifier_client"
                    {...register("notifier_client")}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="notifier_client">
                    Notifier le client lors des relances
                  </Label>
                </div>
              </CardContent>
            </Card>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
                {error}
              </div>
            )}

            <div className="flex justify-end space-x-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Création..." : "Créer le dossier"}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </AuthenticatedLayout>
  )
}
