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
      
      // Vérifier si des PDFs ont été téléchargés automatiquement
      const autoDownloaded = (data.results || []).filter((r: ExpertSearchResult) => r.pdf_stored === true)
      if (autoDownloaded.length > 0) {
        console.log(`${autoDownloaded.length} rapport(s) téléchargé(s) automatiquement`)
      }
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
    const url = result.pdf_download_url || result.pdf_url
    if (url) {
      window.open(url, "_blank")
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
          <h1 className="page-title">
            Experts
          </h1>
          <p className="text-gray-900 text-lg">
            Recherche et gestion des rapports d'experts, procès-verbaux et règlements directs
          </p>
        </div>

        <Tabs defaultValue="search" className="space-y-6">
          <TabsList className="bg-white border border-gray-300 border-bordeaux-500/30 shadow-md">
            <TabsTrigger value="search" className="flex items-center space-x-2 text-gray-900 data-[state=active]:text-white data-[state=active]:bg-bordeaux-600">
              <Search className="h-4 w-4" />
              <span>Recherche rapports</span>
            </TabsTrigger>
            <TabsTrigger value="rapports" className="flex items-center space-x-2 text-gray-900 data-[state=active]:text-white data-[state=active]:bg-bordeaux-600">
              <FileText className="h-4 w-4" />
              <span>Rapports reçus</span>
            </TabsTrigger>
            <TabsTrigger value="config" className="flex items-center space-x-2 text-gray-900 data-[state=active]:text-white data-[state=active]:bg-bordeaux-600">
              <Settings className="h-4 w-4" />
              <span>Configuration</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="search" className="space-y-6">
            <div className="bg-white border border-bordeaux-200 rounded-lg p-4 mb-4 shadow-md">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Recherche automatique</h3>
              <p className="text-sm text-gray-900">
                Recherchez automatiquement les rapports d'experts, procès-verbaux ou règlements directs sur les sites d'experts configurés. Les rapports trouvés seront automatiquement téléchargés et stockés.
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
            <div className="bg-white border border-bordeaux-200 rounded-lg p-4 mb-4 shadow-md">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Rapports reçus</h3>
              <p className="text-sm text-gray-900">
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
