"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { PieceResult, Disponibilite } from "@/lib/fournisseur/types"
import { formatCurrency } from "@/lib/utils"
import { ArrowUpDown, ExternalLink, ShoppingCart, TrendingDown, Clock } from "lucide-react"
import { useState } from "react"

interface PieceComparisonTableProps {
  results: PieceResult[]
}

type SortField = "prix" | "delai" | "site"
type SortOrder = "asc" | "desc"

export function PieceComparisonTable({ results }: PieceComparisonTableProps) {
  const [sortField, setSortField] = useState<SortField>("prix")
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc")
  const [filterStock, setFilterStock] = useState(false)

  const foundResults = results.filter((r) => r.statut === "trouve" && r.prix !== undefined)

  if (foundResults.length === 0) {
    return null
  }

  const sortedResults = [...foundResults].sort((a, b) => {
    if (sortField === "prix") {
      const aVal = a.prix || 0
      const bVal = b.prix || 0
      return sortOrder === "asc" ? aVal - bVal : bVal - aVal
    } else if (sortField === "delai") {
      const aVal = a.delai_jours || 999
      const bVal = b.delai_jours || 999
      return sortOrder === "asc" ? aVal - bVal : bVal - aVal
    }
    return 0
  })

  const filteredResults = filterStock
    ? sortedResults.filter((r) => r.disponibilite === "en_stock")
    : sortedResults

  const bestPrice = Math.min(...filteredResults.map((r) => r.prix || Infinity))
  const bestDelai = Math.min(...filteredResults.map((r) => r.delai_jours || 999))

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortOrder("asc")
    }
  }

  const getDisponibiliteBadge = (disponibilite?: Disponibilite) => {
    if (!disponibilite) return null

    const badges = {
      en_stock: (
        <Badge className="bg-green-100 text-green-700 border border-green-200">
          En stock
        </Badge>
      ),
      sur_commande: (
        <Badge className="bg-orange-100 text-orange-700 border border-orange-200">
          Sur commande
        </Badge>
      ),
      indisponible: (
        <Badge className="bg-red-100 text-red-700 border border-red-200">
          Indisponible
        </Badge>
      ),
    }
    return badges[disponibilite]
  }

  return (
    <Card className="card-gradient">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <TrendingDown className="h-5 w-5 text-blue-600" />
            <span>Comparaison des prix</span>
          </CardTitle>
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="filter-stock"
              checked={filterStock}
              onChange={(e) => setFilterStock(e.target.checked)}
              className="h-4 w-4"
            />
            <label htmlFor="filter-stock" className="text-sm font-medium">
              En stock uniquement
            </label>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-white/15 backdrop-blur-sm border-b border-white/30">
              <tr>
                <th className="text-left p-3 font-semibold text-white">Site</th>
                <th className="text-left p-3 font-semibold text-white">Référence</th>
                <th
                  className="text-left p-3 font-semibold text-white cursor-pointer hover:text-bordeaux-300"
                  onClick={() => toggleSort("prix")}
                >
                  <div className="flex items-center space-x-2">
                    <span>Prix</span>
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </th>
                <th className="text-left p-3 font-semibold text-white">Disponibilité</th>
                <th
                  className="text-left p-3 font-semibold text-white cursor-pointer hover:text-bordeaux-300"
                  onClick={() => toggleSort("delai")}
                >
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4" />
                    <span>Délai</span>
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </th>
                <th className="text-left p-3 font-semibold text-white">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {filteredResults.map((result, index) => {
                const isBestPrice = result.prix === bestPrice
                const isBestDelai = result.delai_jours === bestDelai

                return (
                  <tr
                    key={`${result.site_id}-${index}`}
                    className="hover:bg-white/20 transition-colors"
                  >
                    <td className="p-3 font-medium text-gray-200">{result.site_nom}</td>
                    <td className="p-3">
                      <span className="font-mono text-sm text-gray-300">{result.reference || "-"}</span>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center space-x-2">
                        <span
                          className={`font-bold ${
                            isBestPrice ? "text-green-400 text-lg" : "text-white"
                          }`}
                        >
                          {formatCurrency(result.prix)} {result.devise || "EUR"}
                        </span>
                        {isBestPrice && (
                          <Badge className="bg-green-500/20 text-green-300 border border-green-500/30 backdrop-blur-sm text-xs">
                            Meilleur prix
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="p-3">
                      {getDisponibiliteBadge(result.disponibilite)}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center space-x-2">
                        <span className={isBestDelai ? "font-bold text-green-400" : "text-gray-200"}>
                          {result.delai_jours !== undefined
                            ? `${result.delai_jours} jour${result.delai_jours > 1 ? "s" : ""}`
                            : "-"}
                        </span>
                        {isBestDelai && (
                          <Badge className="bg-green-500/20 text-green-300 border border-green-500/30 backdrop-blur-sm text-xs">
                            Plus rapide
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex space-x-2">
                        {result.produit_url && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(result.produit_url, "_blank")}
                          >
                            <ExternalLink className="h-3 w-3 mr-1" />
                            Voir
                          </Button>
                        )}
                        <Button
                          size="sm"
                          className="btn-primary"
                          onClick={() => {
                            if (result.produit_url) {
                              window.open(result.produit_url, "_blank")
                            }
                          }}
                        >
                          <ShoppingCart className="h-3 w-3 mr-1" />
                          Commander
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {filteredResults.length === 0 && filterStock && (
          <div className="text-center py-8">
            <p className="text-gray-300">Aucune pièce en stock trouvée</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
