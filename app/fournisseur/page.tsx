"use client"

import { useState } from "react"
import AuthenticatedLayout from "@/components/layout/authenticated-layout"
import { PieceSearchForm } from "./components/PieceSearchForm"
import { PieceResults } from "./components/PieceResults"
import { PieceComparisonTable } from "./components/PieceComparisonTable"
import { SearchHistory } from "./components/SearchHistory"
import { PieceSearchCriteria, PieceResult, PieceSearch } from "@/lib/fournisseur/types"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, History, TrendingDown } from "lucide-react"

export default function FournisseurPage() {
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
          <h1 className="text-4xl font-bold bg-gradient-to-r from-bordeaux-400 via-bordeaux-300 to-bordeaux-500 bg-clip-text text-transparent drop-shadow-sm">
            Fournisseurs
          </h1>
          <p className="text-gray-400 text-lg">
            Recherche et comparaison de pièces de rechange sur 6 sites fournisseurs
          </p>
        </div>

        <Tabs defaultValue="search" className="space-y-6">
          <TabsList className="bg-white/10 backdrop-blur-lg border border-white/20 border-bordeaux-500/30 shadow-xl">
            <TabsTrigger value="search" className="flex items-center space-x-2 text-white data-[state=active]:text-white data-[state=active]:bg-bordeaux-500/30">
              <Search className="h-4 w-4" />
              <span>Recherche</span>
            </TabsTrigger>
            <TabsTrigger value="comparison" className="flex items-center space-x-2 text-white data-[state=active]:text-white data-[state=active]:bg-bordeaux-500/30">
              <TrendingDown className="h-4 w-4" />
              <span>Comparaison</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center space-x-2 text-white data-[state=active]:text-white data-[state=active]:bg-bordeaux-500/30">
              <History className="h-4 w-4" />
              <span>Historique</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="search" className="space-y-6">
            <div className="bg-white/10 backdrop-blur-lg border border-white/20 border-bordeaux-500/30 rounded-lg p-4 shadow-xl">
              <h3 className="font-bold text-white mb-2">Recherche de pièces</h3>
              <p className="text-sm text-gray-300">
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
                <p className="text-gray-400">
                  Effectuez une recherche pour voir la comparaison des prix
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="history">
            <SearchHistory onReloadSearch={handleReloadSearch} />
          </TabsContent>
        </Tabs>
      </div>
    </AuthenticatedLayout>
  )
}
