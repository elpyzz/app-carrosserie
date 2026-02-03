"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useSupabaseClient } from "@/lib/hooks/useSupabaseClient"
import { formatDate } from "@/lib/utils"
import { History, RotateCcw, Trash2 } from "lucide-react"
import { PieceSearch } from "@/lib/fournisseur/types"

interface SearchHistoryProps {
  onReloadSearch?: (search: PieceSearch) => void
}

export function SearchHistory({ onReloadSearch }: SearchHistoryProps) {
  const supabase = useSupabaseClient()
  const [searches, setSearches] = useState<PieceSearch[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadHistory()
  }, [])

  const loadHistory = async () => {
    if (!supabase) return

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from("piece_searches")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20)

      if (data && !error) {
        setSearches(data as PieceSearch[])
      } else {
        // Mode mock
        setSearches([])
      }
    } catch {
      setSearches([])
    } finally {
      setLoading(false)
    }
  }

  const getSearchSummary = (search: PieceSearch) => {
    const parts = []
    if (search.reference_piece) parts.push(`Réf: ${search.reference_piece}`)
    if (search.marque && search.modele) {
      parts.push(`${search.marque} ${search.modele}`)
    }
    if (search.nom_piece) parts.push(search.nom_piece)
    return parts.join(" • ") || "Recherche"
  }

  const getResultsCount = (search: PieceSearch) => {
    if (!search.resultats || !Array.isArray(search.resultats)) return 0
    return search.resultats.filter((r: any) => r.statut === "trouve").length
  }

  if (loading) {
    return (
      <Card className="card-gradient">
        <CardContent className="py-8">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border- param($m) $m -replace 'blue', 'red' "></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (searches.length === 0) {
    return (
      <Card className="card-gradient">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <History className="h-5 w-5 text- param($m) $m -replace 'blue', 'red' " />
            <span>Historique des recherches</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-gray-900">Aucune recherche effectuée</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="card-gradient">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <History className="h-5 w-5 text- param($m) $m -replace 'blue', 'red' " />
          <span>Historique des recherches</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {searches.map((search) => (
            <div
              key={search.id}
              className="flex items-center justify-between p-3 border rounded-lg hover:bg- param($m) $m -replace 'blue', 'red'  transition-colors"
            >
              <div className="flex-1">
                <p className="font-medium">{getSearchSummary(search)}</p>
                <div className="flex items-center space-x-4 mt-1">
                  <p className="text-xs text-gray-900">
                    {formatDate(search.created_at)}
                  </p>
                  <Badge className="bg-blue-100 text-blue-700">
                    {getResultsCount(search)} résultat{getResultsCount(search) > 1 ? "s" : ""}
                  </Badge>
                  {search.dossier_id && (
                    <Badge variant="outline" className="text-xs">
                      Dossier: {search.dossier_id}
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex space-x-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onReloadSearch?.(search)}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Relancer
                </Button>
                <Button size="sm" variant="outline" className="text-red-600">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
