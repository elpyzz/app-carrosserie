"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { createClient } from "@/lib/supabase/client"
import { SupplierSite } from "@/lib/fournisseur/types"
import { Search, Loader2, Package } from "lucide-react"

const searchSchema = z.object({
  reference_piece: z.string().optional(),
  marque: z.string().optional(),
  modele: z.string().optional(),
  annee: z.string().optional(),
  nom_piece: z.string().optional(),
  dossier_id: z.string().optional(),
  sites_ids: z.array(z.string()).min(1, "Sélectionnez au moins un site"),
}).refine(
  (data) => data.reference_piece || (data.marque && data.modele && data.nom_piece),
  {
    message: "Remplissez soit la référence, soit (marque + modèle + nom de la pièce)",
    path: ["reference_piece"],
  }
)

type SearchFormData = z.infer<typeof searchSchema>

interface PieceSearchFormProps {
  onSearch: (criteria: SearchFormData) => void
  loading?: boolean
}

const MARQUES = [
  "Renault", "Peugeot", "Citroën", "Volkswagen", "BMW", "Mercedes", "Audi",
  "Ford", "Opel", "Fiat", "Toyota", "Nissan", "Honda", "Hyundai", "Kia",
  "Volvo", "Skoda", "Seat", "Dacia", "Autre"
]

export function PieceSearchForm({ onSearch, loading }: PieceSearchFormProps) {
  const supabase = createClient()
  const [sites, setSites] = useState<SupplierSite[]>([])
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
    loadSites()
  }, [])

  const loadSites = async () => {
    try {
      const { data, error } = await supabase
        .from("supplier_sites")
        .select("*")
        .eq("actif", true)
        .order("ordre", { ascending: true })
        .limit(6)

      if (data && !error) {
        setSites(data as SupplierSite[])
        const activeSiteIds = data.map((s) => s.id)
        setSelectedSites(activeSiteIds)
        setValue("sites_ids", activeSiteIds)
      } else {
        // Mode mock : 6 sites de démonstration
        const mockSites = [
          { id: "mock-1", nom: "Pièces Auto Pro", ordre: 1, actif: true },
          { id: "mock-2", nom: "Carrosserie Express", ordre: 2, actif: true },
          { id: "mock-3", nom: "OEM Parts Direct", ordre: 3, actif: true },
          { id: "mock-4", nom: "Auto Pièces 24", ordre: 4, actif: true },
          { id: "mock-5", nom: "Pièces Discount", ordre: 5, actif: true },
          { id: "mock-6", nom: "Expert Carrosserie", ordre: 6, actif: true },
        ].map((s, idx) => ({
          id: s.id,
          nom: s.nom,
          url_recherche: `https://${s.nom.toLowerCase().replace(/\s+/g, "-")}.example.com`,
          type_auth: "none" as const,
          credentials: null,
          selectors: null,
          actif: s.actif,
          ordre: s.ordre,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }))
        setSites(mockSites)
        setSelectedSites(mockSites.map((s) => s.id))
        setValue("sites_ids", mockSites.map((s) => s.id))
      }
    } catch {
      // Mode mock en cas d'erreur
      const mockSites = [
        { id: "mock-1", nom: "Pièces Auto Pro", ordre: 1 },
        { id: "mock-2", nom: "Carrosserie Express", ordre: 2 },
        { id: "mock-3", nom: "OEM Parts Direct", ordre: 3 },
        { id: "mock-4", nom: "Auto Pièces 24", ordre: 4 },
        { id: "mock-5", nom: "Pièces Discount", ordre: 5 },
        { id: "mock-6", nom: "Expert Carrosserie", ordre: 6 },
      ].map((s) => ({
        id: s.id,
        nom: s.nom,
        url_recherche: `https://${s.nom.toLowerCase().replace(/\s+/g, "-")}.example.com`,
        type_auth: "none" as const,
        credentials: null,
        selectors: null,
        actif: true,
        ordre: s.ordre,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }))
      setSites(mockSites)
      setSelectedSites(mockSites.map((s) => s.id))
      setValue("sites_ids", mockSites.map((s) => s.id))
    }
  }

  const toggleSite = (siteId: string) => {
    if (selectedSites.length >= 6 && !selectedSites.includes(siteId)) {
      alert("Maximum 6 sites fournisseurs autorisés")
      return
    }
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
        <CardTitle className="flex items-center space-x-2 text-white">
          <Package className="h-5 w-5 text-bordeaux-400" />
          <span>Recherche de pièces de rechange</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Critères de recherche */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="reference_piece">Référence pièce</Label>
                <Input
                  id="reference_piece"
                  {...register("reference_piece")}
                  placeholder="Ex: 123456789"
                  className="mt-1"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Référence constructeur ou fournisseur
                </p>
              </div>
              <div>
                <Label htmlFor="nom_piece">Nom de la pièce</Label>
                <Input
                  id="nom_piece"
                  {...register("nom_piece")}
                  placeholder="Ex: Aile avant droite"
                  className="mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="marque">Marque véhicule</Label>
                <Select id="marque" {...register("marque")} className="mt-1">
                  <option value="">Sélectionner...</option>
                  {MARQUES.map((marque) => (
                    <option key={marque} value={marque}>
                      {marque}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="modele">Modèle</Label>
                <Input
                  id="modele"
                  {...register("modele")}
                  placeholder="Ex: Clio, Golf, etc."
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="annee">Année</Label>
                <Input
                  id="annee"
                  type="number"
                  min="1990"
                  max={new Date().getFullYear() + 1}
                  {...register("annee")}
                  placeholder="2020"
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="dossier_id">Numéro de dossier (optionnel)</Label>
              <Input
                id="dossier_id"
                {...register("dossier_id")}
                placeholder="DOS-2024-001"
                className="mt-1"
              />
              <p className="text-xs text-gray-400 mt-1">
                Pour associer la recherche à un dossier
              </p>
            </div>
          </div>

          {errors.reference_piece && (
            <div className="text-sm text-bordeaux-200 bg-bordeaux-500/30 border border-bordeaux-500/50 backdrop-blur-sm p-3 rounded-md">
              {errors.reference_piece.message}
            </div>
          )}

          {/* Sélection des sites (max 6) */}
          <div>
            <Label className="mb-3 block font-semibold">
              Sites fournisseurs à interroger (max 6)
            </Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {sites.length === 0 ? (
                <p className="text-sm text-gray-400">Aucun site configuré</p>
              ) : (
                sites.map((site) => (
                  <div
                    key={site.id}
                    className={`flex items-center space-x-3 p-3 border rounded-lg transition-all backdrop-blur-sm ${
                      selectedSites.includes(site.id)
                        ? "border-bordeaux-500/50 bg-bordeaux-500/20"
                        : "border-white/30 hover:bg-white/20"
                    }`}
                  >
                    <Checkbox
                      id={`site-${site.id}`}
                      checked={selectedSites.includes(site.id)}
                      onChange={() => toggleSite(site.id)}
                      disabled={!selectedSites.includes(site.id) && selectedSites.length >= 6}
                    />
                    <Label
                      htmlFor={`site-${site.id}`}
                      className="flex-1 cursor-pointer font-medium"
                    >
                      {site.nom}
                    </Label>
                    {site.ordre && (
                      <span className="text-xs text-gray-200 bg-white/15 border border-white/30 px-2 py-1 rounded backdrop-blur-sm">
                        #{site.ordre}
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
            {selectedSites.length >= 6 && (
              <p className="text-xs text-amber-400 mt-2">
                ⚠️ Maximum 6 sites sélectionnés
              </p>
            )}
            {errors.sites_ids && (
              <p className="text-sm text-bordeaux-300 mt-2">{errors.sites_ids.message}</p>
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
                Rechercher sur {selectedSites.length} site{selectedSites.length > 1 ? "s" : ""}
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
