"use client"

import { useState } from "react"
import AuthenticatedLayout from "@/components/layout/authenticated-layout"
import { ExpertSearchForm } from "./components/ExpertSearchForm"
import { ExpertResults } from "./components/ExpertResults"
import { ExpertSitesConfig } from "./components/ExpertSitesConfig"
import { ExpertRapportsList } from "./components/ExpertRapportsList"
import { ExpertSearchCriteria, ExpertSearchResult } from "@/lib/expert/types"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, Settings, FileText } from "lucide-react"

export default function ExpertPage() {
  const [results, setResults] = useState<ExpertSearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [searchCriteria, setSearchCriteria] = useState<ExpertSearchCriteria | null>(null)

  const handleSearch = async (criteria: ExpertSearchCriteria) => {
    setLoading(true)
    setResults([])
    setSearchCriteria(criteria)

    try {
      const response = await fetch("/api/expert/search", {
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

  const handleDownload = (result: ExpertSearchResult) => {
    if (result.pdf_url) {
      window.open(result.pdf_url, "_blank")
    }
  }

  const handleAssociate = async (result: ExpertSearchResult) => {
    if (searchCriteria?.dossier_id && result.pdf_url) {
      // TODO: Associer le PDF au dossier
      alert(`PDF associé au dossier ${searchCriteria.dossier_id}`)
    }
  }

  return (
    <AuthenticatedLayout>
      <div className="space-y-6 relative z-0">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-bordeaux-400 via-bordeaux-300 to-bordeaux-500 bg-clip-text text-transparent drop-shadow-sm">
            Experts
          </h1>
          <p className="text-gray-400 text-lg">
            Recherche et gestion des rapports d'experts, procès-verbaux et règlements directs
          </p>
        </div>

        <Tabs defaultValue="search" className="space-y-6">
          <TabsList className="bg-white/10 backdrop-blur-lg border border-white/20 border-bordeaux-500/30 shadow-xl">
            <TabsTrigger value="search" className="flex items-center space-x-2 text-white data-[state=active]:text-white data-[state=active]:bg-bordeaux-500/30">
              <Search className="h-4 w-4" />
              <span>Recherche rapports</span>
            </TabsTrigger>
            <TabsTrigger value="rapports" className="flex items-center space-x-2 text-white data-[state=active]:text-white data-[state=active]:bg-bordeaux-500/30">
              <FileText className="h-4 w-4" />
              <span>Rapports reçus</span>
            </TabsTrigger>
            <TabsTrigger value="config" className="flex items-center space-x-2 text-white data-[state=active]:text-white data-[state=active]:bg-bordeaux-500/30">
              <Settings className="h-4 w-4" />
              <span>Configuration</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="search" className="space-y-6">
            <div className="bg-white/10 backdrop-blur-lg border border-white/20 border-bordeaux-500/30 rounded-lg p-4 mb-4 shadow-xl">
              <h3 className="font-bold text-white mb-2">Recherche automatique</h3>
              <p className="text-sm text-gray-300">
                Recherchez automatiquement les rapports d'experts, procès-verbaux ou règlements directs sur les sites d'experts configurés.
              </p>
            </div>
            <ExpertSearchForm onSearch={handleSearch} loading={loading} />
            {(results.length > 0 || loading) && (
              <ExpertResults
                results={results}
                loading={loading}
                onDownload={handleDownload}
                onAssociate={handleAssociate}
                dossierId={searchCriteria?.dossier_id}
              />
            )}
          </TabsContent>

          <TabsContent value="rapports">
            <div className="bg-white/10 backdrop-blur-lg border border-white/20 border-bordeaux-500/30 rounded-lg p-4 mb-4 shadow-xl">
              <h3 className="font-bold text-white mb-2">Rapports reçus</h3>
              <p className="text-sm text-gray-300">
                Liste de tous les rapports d'experts, procès-verbaux et règlements directs déjà reçus et associés aux dossiers.
              </p>
            </div>
            <ExpertRapportsList />
          </TabsContent>

          <TabsContent value="config">
            <ExpertSitesConfig />
          </TabsContent>
        </Tabs>
      </div>
    </AuthenticatedLayout>
  )
}
