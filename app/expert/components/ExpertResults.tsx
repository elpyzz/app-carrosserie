"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ExpertSearchResult } from "@/lib/expert/types"
import { CheckCircle2, XCircle, AlertCircle, Loader2, Download, Link as LinkIcon, Printer } from "lucide-react"
import { formatDate } from "@/lib/utils"

interface ExpertResultsProps {
  results: ExpertSearchResult[]
  loading?: boolean
  onDownload?: (result: ExpertSearchResult) => void
  onAssociate?: (result: ExpertSearchResult) => void
  dossierId?: string
}

export function ExpertResults({
  results,
  loading,
  onDownload,
  onAssociate,
  dossierId,
}: ExpertResultsProps) {
  if (loading && results.length === 0) {
    return (
      <Card className="card-gradient">
        <CardContent className="py-12">
          <div className="text-center">
            <Loader2 className="h-12 w-12 text-bordeaux-600 animate-spin mx-auto mb-4" />
            <p className="text-gray-900">Recherche en cours...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (results.length === 0 && !loading) {
    return null
  }

  const getStatusIcon = (statut: string) => {
    switch (statut) {
      case "trouve":
        return <CheckCircle2 className="h-5 w-5 text-green-600" />
      case "non_trouve":
        return <XCircle className="h-5 w-5 text-gray-900" />
      case "erreur":
        return <AlertCircle className="h-5 w-5 text-bordeaux-600" />
      case "en_cours":
        return <Loader2 className="h-5 w-5 text-bordeaux-600 animate-spin" />
      default:
        return null
    }
  }

  const getStatusBadge = (statut: string, pdfStored?: boolean) => {
    switch (statut) {
      case "trouve":
        return (
          <Badge className={pdfStored ? "bg-green-100 text-green-800 border border-green-300" : "bg-green-100 text-green-800 border border-green-300"}>
            {pdfStored ? "✅ Téléchargé automatiquement" : "Rapport trouvé ✅"}
          </Badge>
        )
      case "non_trouve":
        return (
          <Badge className="bg-gray-100 text-gray-900 border border-gray-300">
            Non trouvé ❌
          </Badge>
        )
      case "erreur":
        return (
          <Badge className="bg-bordeaux-100 text-bordeaux-800 border border-bordeaux-300">
            Erreur ⚠️
          </Badge>
        )
      case "en_cours":
        return (
          <Badge className="bg-bordeaux-100 text-bordeaux-800 border border-bordeaux-300">
            En cours...
          </Badge>
        )
      default:
        return null
    }
  }

  return (
    <Card className="card-gradient">
      <CardContent className="pt-6">
        <h2 className="text-xl font-semibold mb-6 text-gray-900">Résultats de la recherche</h2>
        <div className="space-y-4">
          {results.map((result, index) => (
            <div
              key={`${result.site_id}-${index}`}
              className="p-4 border border-bordeaux-200 rounded-xl bg-white hover:border-bordeaux-300 hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-3">
                  {getStatusIcon(result.statut)}
                  <div>
                    <h3 className="font-semibold text-lg text-gray-900">{result.site_nom}</h3>
                    {result.message && (
                      <p className="text-sm text-gray-900 mt-1">{result.message}</p>
                    )}
                  </div>
                </div>
                {getStatusBadge(result.statut, result.pdf_stored)}
              </div>

              {result.statut === "trouve" && result.pdf_nom && (
                <div className={`mt-4 p-3 rounded-lg border ${result.pdf_stored ? "bg-green-50 border-green-200" : "bg-green-50 border-green-200"}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-semibold text-green-800">{result.pdf_nom}</p>
                      {result.pdf_taille && (
                        <p className="text-xs mt-1 text-green-700">
                          Taille: {(result.pdf_taille / 1024).toFixed(2)} KB
                        </p>
                      )}
                      {result.pdf_date && (
                        <p className="text-xs text-green-700">
                          Date: {formatDate(result.pdf_date)}
                        </p>
                      )}
                      {result.pdf_stored && (
                        <p className="text-xs text-green-700 mt-1 font-medium">
                          ✓ Disponible localement
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex space-x-2 mt-3">
                    {(result.pdf_download_url || result.pdf_url) && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const url = result.pdf_download_url || result.pdf_url
                          if (url) {
                            window.open(url, "_blank")
                          }
                        }}
                        className="border-green-300 hover:bg-green-100 text-green-800"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Télécharger
                      </Button>
                    )}
                    {(result.pdf_download_url || result.pdf_url) && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const url = result.pdf_download_url || result.pdf_url
                          if (url) {
                            const printWindow = window.open(url, "_blank")
                            if (printWindow) {
                              printWindow.onload = () => {
                                setTimeout(() => {
                                  printWindow.print()
                                }, 500)
                              }
                            }
                          }
                        }}
                        className="border-green-300 hover:bg-green-100 text-green-800"
                      >
                        <Printer className="h-4 w-4 mr-2" />
                        Imprimer
                      </Button>
                    )}
                    {dossierId && !result.pdf_stored && (
                      <Button
                        size="sm"
                        className="btn-primary"
                        onClick={() => onAssociate?.(result)}
                      >
                        <LinkIcon className="h-4 w-4 mr-2" />
                        Associer au dossier
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {result.statut === "erreur" && result.erreur && (
                <div className="mt-3 p-3 bg-bordeaux-100 rounded-lg border border-bordeaux-300">
                  <p className="text-sm text-bordeaux-700">{result.erreur}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
