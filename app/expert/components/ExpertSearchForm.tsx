"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { createClient } from "@/lib/supabase/client"
import { ExpertSite, ExpertSiteAuthType } from "@/lib/expert/types"
import { Search, Loader2 } from "lucide-react"

const searchSchema = z.object({
  numero_dossier: z.string().optional(),
  immatriculation: z.string().optional(),
  date_sinistre: z.string().optional(),
  sites_ids: z.array(z.string()).min(1, "Sélectionnez au moins un site"),
}).refine(
  (data) => data.numero_dossier || data.immatriculation || data.date_sinistre,
  {
    message: "Remplissez au moins un critère de recherche",
    path: ["numero_dossier"],
  }
)

type SearchFormData = z.infer<typeof searchSchema>

interface ExpertSearchFormProps {
  onSearch: (criteria: SearchFormData) => void
  loading?: boolean
}

export function ExpertSearchForm({ onSearch, loading }: ExpertSearchFormProps) {
  const supabase = createClient()
  const [sites, setSites] = useState<ExpertSite[]>([])
  const [selectedSites, setSelectedSites] = useState<string[]>([])

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<SearchFormData>({
    resolver: zodResolver(searchSchema),
    defaultValues: {
      sites_ids: [],
    },
  })

  useEffect(() => {
    // Charger les sites d'experts
    const loadSites = async () => {
      try {
        const { data, error } = await supabase
          .from("expert_sites")
          .select("*")
          .eq("actif", true)
        
        if (data && !error) {
          // Convertir type_auth string en ExpertSiteAuthType
          // Convertir type_auth string en ExpertSiteAuthType
          const formattedSites: ExpertSite[] = (data as any[]).map((s: any) => ({
            ...s,
            type_auth: (s.type_auth === "none" || s.type_auth === "form" || s.type_auth === "api") 
              ? s.type_auth as ExpertSiteAuthType
              : "none" as ExpertSiteAuthType
          }))
          setSites(formattedSites)
          const activeSiteIds = formattedSites.map((s: ExpertSite) => s.id)
          setSelectedSites(activeSiteIds)
          setValue("sites_ids", activeSiteIds)
        } else {
          // Mode mock : sites de démonstration
          const mockSites = [
            {
              id: "mock-1",
              nom: "Expert Auto",
              url_recherche: "https://expert-auto.example.com",
              type_auth: "none",
              credentials: null,
              selectors: null,
              actif: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            {
              id: "mock-2",
              nom: "Expert Pro",
              url_recherche: "https://expert-pro.example.com",
              type_auth: "form",
              credentials: null,
              selectors: null,
              actif: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          ]
          setSites(mockSites as ExpertSite[])
          setSelectedSites(["mock-1", "mock-2"])
          setValue("sites_ids", ["mock-1", "mock-2"])
        }
      } catch {
        // Mode mock en cas d'erreur
        const mockSites = [
          {
            id: "mock-1",
            nom: "Expert Auto",
            url_recherche: "https://expert-auto.example.com",
            type_auth: "none",
            credentials: null,
            selectors: null,
            actif: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ]
        setSites(mockSites as ExpertSite[])
        setSelectedSites(["mock-1"])
        setValue("sites_ids", ["mock-1"])
      }
    }
    
    loadSites()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const toggleSite = (siteId: string) => {
    const newSelected = selectedSites.includes(siteId)
      ? selectedSites.filter((id) => id !== siteId)
      : [...selectedSites, siteId]
    setSelectedSites(newSelected)
    setValue("sites_ids", newSelected)
  }

  const onSubmit = (data: SearchFormData) => {
    onSearch({ ...data, sites_ids: selectedSites })
  }

  return (
    <Card className="card-gradient">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2 text-primary drop-shadow-[0_2px_8px_rgba(0,0,0,0.25)]">
          <Search className="h-5 w-5 text-bordeaux-400" />
          <span>Recherche de rapports d'experts</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="numero_dossier">Numéro de sinistre</Label>
              <Input
                id="numero_dossier"
                {...register("numero_dossier")}
                placeholder="DOS-2024-001"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="immatriculation">Immatriculation</Label>
              <Input
                id="immatriculation"
                {...register("immatriculation")}
                placeholder="AB-123-CD"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="date_sinistre">Date du sinistre</Label>
              <Input
                id="date_sinistre"
                type="date"
                {...register("date_sinistre")}
                className="mt-1"
              />
            </div>
          </div>

          {errors.numero_dossier && (
            <p className="text-sm text-bordeaux-700">{errors.numero_dossier.message}</p>
          )}

          <div>
            <Label className="mb-3 block font-semibold">Sites à interroger</Label>
            <div className="space-y-2">
              {sites.length === 0 ? (
                <p className="text-sm text-gray-900">Aucun site configuré</p>
              ) : (
                sites.map((site) => (
                  <div
                    key={site.id}
                    className="flex items-center space-x-3 p-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <Checkbox
                      id={`site-${site.id}`}
                      checked={selectedSites.includes(site.id)}
                      onChange={() => toggleSite(site.id)}
                    />
                    <Label
                      htmlFor={`site-${site.id}`}
                      className="flex-1 cursor-pointer font-medium"
                    >
                      {site.nom}
                    </Label>
                    <span className="text-xs text-gray-900">{site.type_auth}</span>
                  </div>
                ))
              )}
            </div>
            {errors.sites_ids && (
              <p className="text-sm text-bordeaux-700 mt-2">{errors.sites_ids.message}</p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full btn-primary h-12"
            disabled={loading || selectedSites.length === 0}
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Recherche en cours...
              </>
            ) : (
              <>
                <Search className="h-5 w-5 mr-2" />
                Rechercher
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
