"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { PieceResult, Disponibilite } from "@/lib/fournisseur/types"
import { CheckCircle2, XCircle, AlertCircle, Loader2, ExternalLink, Save, ShoppingCart } from "lucide-react"
import { formatCurrency } from "@/lib/utils"

interface PieceResultsProps {
  results: PieceResult[]
  loading?: boolean
  onSave?: (result: PieceResult) => void
  onViewSite?: (result: PieceResult) => void
}

export function PieceResults({
  results,
  loading,
  onSave,
  onViewSite,
}: PieceResultsProps) {
  if (loading && results.length === 0) {
    return (
      <Card className="card-gradient">
        <CardContent className="py-12">
          <div className="text-center">
            <Loader2 className="h-12 w-12 text-bordeaux-400 animate-spin mx-auto mb-4" />
            <p className="text-gray-300">Recherche en cours sur les sites fournisseurs...</p>
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
        return <XCircle className="h-5 w-5 text-gray-400" />
      case "erreur":
        return <AlertCircle className="h-5 w-5 text-red-600" />
      case "en_cours":
        return <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
      default:
        return null
    }
  }

  const getStatusBadge = (statut: string) => {
    switch (statut) {
      case "trouve":
        return (
          <Badge className="bg-green-500/20 text-green-300 border border-green-500/30 backdrop-blur-sm">
            Pièce trouvée ✅
          </Badge>
        )
      case "non_trouve":
        return (
          <Badge className="bg-white/15 text-gray-200 border border-white/30 backdrop-blur-sm">
            Non trouvée ❌
          </Badge>
        )
      case "erreur":
        return (
          <Badge className="bg-bordeaux-500/30 text-bordeaux-200 border border-bordeaux-500/50 backdrop-blur-sm">
            Erreur ⚠️
          </Badge>
        )
      case "en_cours":
        return (
          <Badge className="bg-blue-500/20 text-blue-300 border border-blue-500/30 backdrop-blur-sm">
            En cours...
          </Badge>
        )
      default:
        return null
    }
  }

  const getDisponibiliteBadge = (disponibilite?: Disponibilite) => {
    if (!disponibilite) return null

    const badges = {
      en_stock: (
        <Badge className="bg-green-500/20 text-green-300 border border-green-500/30 backdrop-blur-sm">
          En stock
        </Badge>
      ),
      sur_commande: (
        <Badge className="bg-orange-500/20 text-orange-300 border border-orange-500/30 backdrop-blur-sm">
          Sur commande
        </Badge>
      ),
      indisponible: (
        <Badge className="bg-bordeaux-500/20 text-bordeaux-300 border border-bordeaux-500/30 backdrop-blur-sm">
          Indisponible
        </Badge>
      ),
    }
    return badges[disponibilite]
  }

  return (
    <Card className="card-gradient">
      <CardContent className="pt-6">
        <h2 className="text-xl font-bold mb-4">Résultats de la recherche</h2>
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

              {result.statut === "trouve" && (
                <div className="mt-4 p-4 bg-green-500/20 rounded-lg border border-green-500/30 backdrop-blur-sm">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      {result.nom && (
                        <p className="font-semibold text-green-300 mb-1">{result.nom}</p>
                      )}
                      {result.reference && (
                        <p className="text-sm text-green-300">
                          Réf: <span className="font-mono">{result.reference}</span>
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      {result.prix !== undefined && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-300">Prix:</span>
                          <span className="font-bold text-lg text-green-300">
                            {formatCurrency(result.prix)} {result.devise || "EUR"}
                          </span>
                        </div>
                      )}
                      {result.disponibilite && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-300">Disponibilité:</span>
                          {getDisponibiliteBadge(result.disponibilite)}
                        </div>
                      )}
                      {result.delai_jours !== undefined && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-300">Délai:</span>
                          <span className="font-medium text-white">
                            {result.delai_jours} jour{result.delai_jours > 1 ? "s" : ""}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {result.image_url && (
                    <div className="mt-3">
                      <img
                        src={result.image_url}
                        alt={result.nom || "Pièce"}
                        className="h-32 w-32 object-contain border rounded-lg bg-white"
                      />
                    </div>
                  )}

                  <div className="flex space-x-2 mt-4">
                    {result.produit_url && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onViewSite?.(result)}
                        className="border-green-300 hover:bg-green-50"
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Voir sur le site
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onSave?.(result)}
                      className="border-blue-300 hover:bg-blue-50"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Enregistrer
                    </Button>
                    <Button
                      size="sm"
                      className="btn-primary"
                      onClick={() => {
                        if (result.produit_url) {
                          window.open(result.produit_url, "_blank")
                        }
                      }}
                    >
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      Commander
                    </Button>
                  </div>
                </div>
              )}

              {result.statut === "erreur" && result.erreur && (
                <div className="mt-3 p-3 bg-red-50 rounded-lg border border-red-200">
                  <p className="text-sm text-red-700">{result.erreur}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
