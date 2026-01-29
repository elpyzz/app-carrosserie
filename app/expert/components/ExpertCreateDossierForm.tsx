"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ExpertSite, ExpertSiteAuthType } from "@/lib/expert/types"
import { 
  FilePlus, 
  Loader2, 
  AlertCircle, 
  CheckCircle2,
  Car,
  User,
  FileText,
  Building2
} from "lucide-react"

// Schéma de validation Zod
const createDossierSchema = z.object({
  numero_sinistre: z
    .string()
    .min(1, "Le numéro de sinistre est requis"),
  immatriculation: z
    .string()
    .min(1, "L'immatriculation est requise")
    .regex(
      /^[A-Za-z0-9\-\s]+$/,
      "Format d'immatriculation invalide"
    ),
  site_expert_id: z
    .string()
    .min(1, "Sélectionnez un site expert"),
  numero_client: z
    .string()
    .min(1, "Le numéro client est requis"),
  client_nom: z
    .string()
    .optional(),
  client_telephone: z
    .string()
    .optional(),
})

type CreateDossierFormData = z.infer<typeof createDossierSchema>

export function ExpertCreateDossierForm() {
  const router = useRouter()
  const [sites, setSites] = useState<ExpertSite[]>([])
  const [sitesLoading, setSitesLoading] = useState(true)
  const [submitLoading, setSubmitLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<{ dossier_id: string; uuid: string } | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<CreateDossierFormData>({
    resolver: zodResolver(createDossierSchema),
    defaultValues: {
      numero_sinistre: "",
      immatriculation: "",
      site_expert_id: "",
      numero_client: "",
      client_nom: "",
      client_telephone: "",
    },
  })

  // Charger les sites experts actifs
  useEffect(() => {
    const loadSites = async () => {
      setSitesLoading(true)
      try {
        const response = await fetch("/api/expert/sites")
        const data = await response.json()

        if (data.success && data.sites) {
          const activeSites = data.sites.filter((s: ExpertSite) => s.actif)
          const formattedSites: ExpertSite[] = activeSites.map((s: any) => ({
            ...s,
            type_auth: (s.type_auth === "none" || s.type_auth === "form" || s.type_auth === "api") 
              ? s.type_auth as ExpertSiteAuthType
              : "none" as ExpertSiteAuthType
          }))
          setSites(formattedSites)
        } else {
          setSites([])
        }
      } catch (err) {
        console.error("Erreur chargement sites:", err)
        setSites([])
      } finally {
        setSitesLoading(false)
      }
    }

    loadSites()
  }, [])

  const onSubmit = async (data: CreateDossierFormData) => {
    setSubmitLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch("/api/expert/create-dossier", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        setError(result.error || "Erreur lors de la création du dossier")
        return
      }

      setSuccess({
        dossier_id: result.dossier_id,
        uuid: result.dossier_uuid,
      })

      // Reset du formulaire après succès
      reset()

    } catch (err: any) {
      setError(err.message || "Une erreur inattendue est survenue")
    } finally {
      setSubmitLoading(false)
    }
  }

  const handleGoToDossier = () => {
    if (success?.uuid) {
      router.push(`/dossiers/${success.uuid}`)
    }
  }

  const handleCreateAnother = () => {
    setSuccess(null)
    setError(null)
  }

  // Affichage succès
  if (success) {
    return (
      <Card className="card-gradient max-w-2xl mx-auto">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <CheckCircle2 className="h-16 w-16 text-green-500" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900">
              Dossier créé avec succès !
            </h3>
            <p className="text-gray-600">
              Le dossier <span className="font-mono font-bold">{success.dossier_id}</span> a été créé 
              et est prêt pour le suivi automatique.
            </p>
            <div className="flex justify-center gap-4 pt-4">
              <Button variant="outline" onClick={handleCreateAnother}>
                Créer un autre dossier
              </Button>
              <Button onClick={handleGoToDossier} className="btn-primary">
                Voir le dossier
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="card-gradient max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2 text-primary">
          <FilePlus className="h-5 w-5 text-bordeaux-400" />
          <span>Créer un dossier pour suivi expert</span>
        </CardTitle>
        <p className="text-sm text-gray-600 mt-2">
          Créez un dossier simplifié après avoir envoyé l'AED ou effectué l'expertise terrain. 
          Le système pourra ensuite récupérer automatiquement les rapports.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Numéro de sinistre */}
          <div className="space-y-2">
            <Label htmlFor="numero_sinistre" className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-gray-500" />
              Numéro de sinistre <span className="text-red-500">*</span>
            </Label>
            <Input
              id="numero_sinistre"
              {...register("numero_sinistre")}
              placeholder="Ex: 2024-ABC-123456"
              className={errors.numero_sinistre ? "border-red-500" : ""}
            />
            {errors.numero_sinistre && (
              <p className="text-sm text-red-600">{errors.numero_sinistre.message}</p>
            )}
          </div>

          {/* Immatriculation */}
          <div className="space-y-2">
            <Label htmlFor="immatriculation" className="flex items-center gap-2">
              <Car className="h-4 w-4 text-gray-500" />
              Plaque d'immatriculation <span className="text-red-500">*</span>
            </Label>
            <Input
              id="immatriculation"
              {...register("immatriculation")}
              placeholder="Ex: AB-123-CD"
              className={`uppercase ${errors.immatriculation ? "border-red-500" : ""}`}
              style={{ textTransform: "uppercase" }}
            />
            {errors.immatriculation && (
              <p className="text-sm text-red-600">{errors.immatriculation.message}</p>
            )}
          </div>

          {/* Site expert */}
          <div className="space-y-2">
            <Label htmlFor="site_expert_id" className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-gray-500" />
              Site expert <span className="text-red-500">*</span>
            </Label>
            {sitesLoading ? (
              <div className="flex items-center gap-2 text-gray-500 py-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Chargement des sites...</span>
              </div>
            ) : sites.length === 0 ? (
              <div className="text-amber-600 text-sm py-2">
                Aucun site expert configuré. Configurez d'abord un site dans l'onglet Configuration.
              </div>
            ) : (
              <select
                id="site_expert_id"
                {...register("site_expert_id")}
                className={`w-full h-10 px-3 rounded-md border bg-white text-gray-900 ${
                  errors.site_expert_id ? "border-red-500" : "border-gray-300"
                } focus:outline-none focus:ring-2 focus:ring-bordeaux-500`}
              >
                <option value="">Sélectionnez un site expert...</option>
                {sites.map((site) => (
                  <option key={site.id} value={site.id}>
                    {site.nom}
                  </option>
                ))}
              </select>
            )}
            {errors.site_expert_id && (
              <p className="text-sm text-red-600">{errors.site_expert_id.message}</p>
            )}
          </div>

          {/* Numéro client */}
          <div className="space-y-2">
            <Label htmlFor="numero_client" className="flex items-center gap-2">
              <User className="h-4 w-4 text-gray-500" />
              Numéro client <span className="text-red-500">*</span>
            </Label>
            <Input
              id="numero_client"
              {...register("numero_client")}
              placeholder="Ex: CLI-2024-001"
            />
            {errors.numero_client && (
              <p className="text-sm text-red-600">{errors.numero_client.message}</p>
            )}
            <p className="text-xs text-gray-500">
              Si ce numéro client existe déjà, le dossier sera associé au client existant.
            </p>
          </div>

          {/* Champs optionnels (collapsible ou toujours visible) */}
          <div className="border-t pt-4 space-y-4">
            <p className="text-sm font-medium text-gray-700">
              Informations optionnelles (pour nouveau client)
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="client_nom">Nom du client</Label>
                <Input
                  id="client_nom"
                  {...register("client_nom")}
                  placeholder="Jean Dupont"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="client_telephone">Téléphone</Label>
                <Input
                  id="client_telephone"
                  {...register("client_telephone")}
                  placeholder="06 12 34 56 78"
                />
              </div>
            </div>
          </div>

          {/* Message d'erreur global */}
          {error && (
            <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-red-700 font-medium">Erreur</p>
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            </div>
          )}

          {/* Bouton de soumission */}
          <Button
            type="submit"
            className="w-full btn-primary h-12"
            disabled={submitLoading || sitesLoading || sites.length === 0}
          >
            {submitLoading ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Création en cours...
              </>
            ) : (
              <>
                <FilePlus className="h-5 w-5 mr-2" />
                Créer le dossier
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
