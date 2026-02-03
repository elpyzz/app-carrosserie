"use client"

import { useState } from "react"
import AuthenticatedLayout from "@/components/layout/authenticated-layout"
import { PieceSearchForm } from "./components/PieceSearchForm"
import { PieceResults } from "./components/PieceResults"
import { PieceComparisonTable } from "./components/PieceComparisonTable"
import { SearchHistory } from "./components/SearchHistory"
import { PieceSearchCriteria, PieceResult, PieceSearch } from "@/lib/fournisseur/types"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, History, TrendingDown, FileText, Settings } from "lucide-react"
import { QapterUpload } from "./components/QapterUpload"
import { SupplierSitesConfig } from "./components/SupplierSitesConfig"

export const dynamic = 'force-dynamic'

export default function FournisseurPage() {
  // Empêcher le pré-rendu côté serveur
  if (typeof window === 'undefined') return null

  const [results, setResults] = useState<PieceResult[]>([])
  const [loading, setLoading] = useState(false)
  const [searchCriteria, setSearchCriteria] = useState<PieceSearchCriteria | null>(null)

  const handleSearch = async (criteria: PieceSearchCriteria) => {
    setLoading(true)
    setResults([])
    setSearchCriteria(criteria)

    try {
      const response = await fetch("/api/fournisseur/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(criteria),
      })

      if (!response.ok) {
        throw new Error("Erreur lors de la recherche")
      }

      const data = await response.json()
      setResults(data.results || [])
    } catch (error: any) {
      console.error("Search error:", error)
      setResults([
        {
          site_id: "error",
          site_nom: "Erreur",
          statut: "erreur",
          erreur: error.message || "Une erreur est survenue",
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleSave = (result: PieceResult) => {
    // TODO: Enregistrer la recherche
    alert(`Recherche enregistrée pour ${result.site_nom}`)
  }

  const handleViewSite = (result: PieceResult) => {
    if (result.produit_url) {
      window.open(result.produit_url, "_blank")
    }
  }

  const handleReloadSearch = (search: PieceSearch) => {
    const criteria: PieceSearchCriteria = {
      reference_piece: search.reference_piece || undefined,
      marque: search.marque || undefined,
      modele: search.modele || undefined,
      annee: search.annee || undefined,
      nom_piece: search.nom_piece || undefined,
      dossier_id: search.dossier_id || undefined,
      sites_ids: search.sites_interroges,
    }
    handleSearch(criteria)
  }

  const foundResults = results.filter((r) => r.statut === "trouve")

  return (
    <AuthenticatedLayout>
      <div className="space-y-6 relative z-0">
        <div className="space-y-2">
          <h1 className="page-title">
            Fournisseurs
          </h1>
          <p className="text-gray-900 text-lg">
            Recherche et comparaison de pièces de rechange sur 6 sites fournisseurs
          </p>
        </div>

        <Tabs defaultValue="search" className="space-y-6">
          <TabsList className="bg-white border border-gray-300 border-bordeaux-500/30 shadow-md">
            <TabsTrigger value="search" className="flex items-center space-x-2 text-gray-900 data-[state=active]:text-white data-[state=active]:bg-bordeaux-600">
              <Search className="h-4 w-4" />
              <span>Recherche</span>
            </TabsTrigger>
            <TabsTrigger value="comparison" className="flex items-center space-x-2 text-gray-900 data-[state=active]:text-white data-[state=active]:bg-bordeaux-600">
              <TrendingDown className="h-4 w-4" />
              <span>Comparaison</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center space-x-2 text-gray-900 data-[state=active]:text-white data-[state=active]:bg-bordeaux-600">
              <History className="h-4 w-4" />
              <span>Historique</span>
            </TabsTrigger>
            <TabsTrigger value="qapter" className="flex items-center space-x-2 text-gray-900 data-[state=active]:text-white data-[state=active]:bg-bordeaux-600">
              <FileText className="h-4 w-4" />
              <span>Qapter</span>
            </TabsTrigger>
            <TabsTrigger value="config" className="flex items-center space-x-2 text-gray-900 data-[state=active]:text-white data-[state=active]:bg-bordeaux-600">
              <Settings className="h-4 w-4" />
              <span>Configuration</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="search" className="space-y-6">
            <div className="bg-white border border-bordeaux-200 rounded-lg p-4 shadow-md">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Recherche de pièces</h3>
              <p className="text-sm text-gray-900">
                Recherchez des pièces de rechange sur jusqu'à 6 sites fournisseurs différents. 
                Comparez les prix, disponibilités et délais de livraison.
              </p>
            </div>
            <PieceSearchForm onSearch={handleSearch} loading={loading} />
            {(results.length > 0 || loading) && (
              <PieceResults
                results={results}
                loading={loading}
                onSave={handleSave}
                onViewSite={handleViewSite}
              />
            )}
          </TabsContent>

          <TabsContent value="comparison">
            {foundResults.length > 0 ? (
              <PieceComparisonTable results={foundResults} />
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-900">
                  Effectuez une recherche pour voir la comparaison des prix
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="history">
            <SearchHistory onReloadSearch={handleReloadSearch} />
          </TabsContent>

          <TabsContent value="qapter" className="space-y-6">
            <div className="bg-white border border-bordeaux-200 rounded-lg p-4 shadow-md">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Import Qapter</h3>
              <p className="text-sm text-gray-900">
                Importez un dossier Qapter et l'IA identifiera automatiquement les pièces à rechercher 
                sur les 6 sites fournisseurs configurés.
              </p>
            </div>
            <QapterUpload />
          </TabsContent>

          <TabsContent value="config">
            <SupplierSitesConfig />
          </TabsContent>
        </Tabs>
      </div>
    </AuthenticatedLayout>
  )
}
