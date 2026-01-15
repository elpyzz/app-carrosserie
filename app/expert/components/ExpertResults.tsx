"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ExpertSearchResult } from "@/lib/expert/types"
import { CheckCircle2, XCircle, AlertCircle, Loader2, Download, Link as LinkIcon } from "lucide-react"
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
            <Loader2 className="h-12 w-12 text-bordeaux-400 animate-spin mx-auto mb-4" />
            <p className="text-gray-300">Recherche en cours...</p>
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
        return <CheckCircle2 className="h-5 w-5 text-green-400" />
      case "non_trouve":
        return <XCircle className="h-5 w-5 text-gray-400" />
      case "erreur":
        return <AlertCircle className="h-5 w-5 text-bordeaux-400" />
      case "en_cours":
        return <Loader2 className="h-5 w-5 text-bordeaux-400 animate-spin" />
      default:
        return null
    }
  }

  const getStatusBadge = (statut: string) => {
    switch (statut) {
      case "trouve":
        return (
          <Badge className="bg-green-500/20 text-green-300 border border-green-500/30 backdrop-blur-sm">
            Rapport trouvé ✅
          </Badge>
        )
      case "non_trouve":
        return (
          <Badge className="bg-gray-500/20 text-gray-300 border border-gray-500/30 backdrop-blur-sm">
            Non trouvé ❌
          </Badge>
        )
      case "erreur":
        return (
          <Badge className="bg-bordeaux-500/20 text-bordeaux-300 border border-bordeaux-500/30 backdrop-blur-sm">
            Erreur ⚠️
          </Badge>
        )
      case "en_cours":
        return (
          <Badge className="bg-bordeaux-500/20 text-bordeaux-300 border border-bordeaux-500/30 backdrop-blur-sm">
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
        <h2 className="text-xl font-bold mb-4 text-white">Résultats de la recherche</h2>
        <div className="space-y-4">
          {results.map((result, index) => (
            <div
              key={`${result.site_id}-${index}`}
              className="p-4 border border-white/30 border-bordeaux-500/40 rounded-xl bg-white/20 backdrop-blur-sm hover:border-bordeaux-500/60 hover:bg-white/30 transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-3">
                  {getStatusIcon(result.statut)}
                  <div>
                    <h3 className="font-bold text-lg text-white">{result.site_nom}</h3>
                    {result.message && (
                      <p className="text-sm text-gray-300 mt-1">{result.message}</p>
                    )}
                  </div>
                </div>
                {getStatusBadge(result.statut)}
              </div>

              {result.statut === "trouve" && result.pdf_nom && (
                <div className="mt-4 p-3 bg-green-500/20 rounded-lg border border-green-500/30 backdrop-blur-sm">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-semibold text-green-300">{result.pdf_nom}</p>
                      {result.pdf_taille && (
                        <p className="text-xs text-green-400 mt-1">
                          Taille: {(result.pdf_taille / 1024).toFixed(2)} KB
                        </p>
                      )}
                      {result.pdf_date && (
                        <p className="text-xs text-green-400">
                          Date: {formatDate(result.pdf_date)}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex space-x-2 mt-3">
                    {result.pdf_url && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onDownload?.(result)}
                        className="border-green-500/30 hover:bg-green-500/20 text-green-300"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Télécharger
                      </Button>
                    )}
                    {dossierId && (
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
                <div className="mt-3 p-3 bg-bordeaux-500/20 rounded-lg border border-bordeaux-500/30 backdrop-blur-sm">
                  <p className="text-sm text-bordeaux-300">{result.erreur}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
