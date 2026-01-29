"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  History, 
  Search, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Mail, 
  MessageSquare, 
  Globe,
  RefreshCw,
  ChevronDown,
  ChevronUp
} from "lucide-react"
import { RelanceHistory as RelanceHistoryType, RelanceStatut, RelanceType } from "@/lib/types"

interface RelanceHistoryProps {
  dossierId?: string // Optionnel: filtrer par dossier
  relanceType?: string // Un seul type (rétrocompatibilité)
  relanceTypes?: string[] // Plusieurs types
  title?: string
}

export function RelanceHistory({ 
  dossierId, 
  relanceType,
  relanceTypes,
  title = "Historique des relances"
}: RelanceHistoryProps) {
  const [history, setHistory] = useState<RelanceHistoryType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterType, setFilterType] = useState<string>("")
  const [filterStatut, setFilterStatut] = useState<string>("")
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  const loadHistory = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const params = new URLSearchParams()
      if (dossierId) params.set("dossier_id", dossierId)
      
      // Gérer relanceTypes (plusieurs) ou relanceType (un seul)
      if (relanceTypes && relanceTypes.length > 0) {
        params.set("relance_types", relanceTypes.join(","))
      } else if (relanceType) {
        params.set("relance_type", relanceType)
      }
      
      // Le filtre local filterType peut encore être utilisé pour affiner
      if (filterType) params.set("relance_type", filterType)
      if (filterStatut) params.set("statut", filterStatut)

      const response = await fetch(`/api/relance/history?${params.toString()}`)
      const data = await response.json()

      if (data.success) {
        setHistory(data.history || [])
      } else {
        setError(data.error || "Erreur lors du chargement")
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadHistory()
  }, [dossierId, relanceType, relanceTypes, filterType, filterStatut])

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "email":
        return <Mail className="h-4 w-4 text-blue-500" />
      case "sms":
        return <MessageSquare className="h-4 w-4 text-green-500" />
      case "portail_expert":
        return <Globe className="h-4 w-4 text-purple-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatutBadge = (statut: RelanceStatut) => {
    const styles: Record<RelanceStatut, string> = {
      en_attente: "bg-yellow-100 text-yellow-700",
      envoye: "bg-blue-100 text-blue-700",
      delivre: "bg-green-100 text-green-700",
      lu: "bg-green-200 text-green-800",
      echec: "bg-red-100 text-red-700",
      annule: "bg-gray-100 text-gray-700",
    }
    const labels: Record<RelanceStatut, string> = {
      en_attente: "En attente",
      envoye: "Envoyé",
      delivre: "Délivré",
      lu: "Lu",
      echec: "Échec",
      annule: "Annulé",
    }
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[statut]}`}>
        {labels[statut]}
      </span>
    )
  }

  const toggleRow = (id: string) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedRows(newExpanded)
  }

  const filteredHistory = history.filter((item) => {
    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      return (
        item.destinataire.toLowerCase().includes(search) ||
        item.dossier?.dossier_id?.toLowerCase().includes(search) ||
        item.contenu?.toLowerCase().includes(search)
      )
    }
    return true
  })

  return (
    <Card className="card-gradient">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-bordeaux-400" />
            {title}
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={loadHistory}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Actualiser
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Filtres */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Rechercher..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="h-10 px-3 rounded-md border border-gray-300 bg-white"
          >
            <option value="">Tous les types</option>
            <option value="expert_portail">Expert (Portail)</option>
            <option value="expert_email">Expert (Email)</option>
            <option value="client_sms">Client (SMS)</option>
            <option value="client_email">Client (Email)</option>
            <option value="assurance_email">Assurance (Email)</option>
            <option value="auto_stop">Arrêt auto</option>
          </select>
          <select
            value={filterStatut}
            onChange={(e) => setFilterStatut(e.target.value)}
            className="h-10 px-3 rounded-md border border-gray-300 bg-white"
          >
            <option value="">Tous les statuts</option>
            <option value="envoye">Envoyé</option>
            <option value="delivre">Délivré</option>
            <option value="echec">Échec</option>
            <option value="annule">Annulé</option>
          </select>
          <div className="text-sm text-gray-500 flex items-center">
            {filteredHistory.length} résultat{filteredHistory.length > 1 ? "s" : ""}
          </div>
        </div>

        {/* Liste */}
        {loading ? (
          <div className="flex justify-center py-8">
            <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : error ? (
          <div className="text-center py-8 text-red-600">{error}</div>
        ) : filteredHistory.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            Aucune relance trouvée
          </div>
        ) : (
          <div className="space-y-2">
            {filteredHistory.map((item) => (
              <div
                key={item.id}
                className="border rounded-lg bg-white overflow-hidden"
              >
                {/* Ligne principale */}
                <div
                  className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50"
                  onClick={() => toggleRow(item.id)}
                >
                  <div className="flex items-center gap-3">
                    {getTypeIcon(item.type)}
                    <div>
                      <div className="font-medium text-sm">
                        {item.dossier?.dossier_id || "N/A"}
                      </div>
                      <div className="text-xs text-gray-500">
                        {item.destinataire}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {getStatutBadge(item.statut)}
                    <span className="text-xs text-gray-500">
                      {new Date(item.sent_at).toLocaleString("fr-FR")}
                    </span>
                    {expandedRows.has(item.id) ? (
                      <ChevronUp className="h-4 w-4 text-gray-400" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-gray-400" />
                    )}
                  </div>
                </div>

                {/* Détails expandables */}
                {expandedRows.has(item.id) && (
                  <div className="border-t bg-gray-50 p-3 text-sm space-y-2">
                    {item.sujet && (
                      <div>
                        <span className="font-medium">Sujet:</span> {item.sujet}
                      </div>
                    )}
                    {item.contenu && (
                      <div>
                        <span className="font-medium">Contenu:</span>
                        <p className="mt-1 text-gray-600 whitespace-pre-wrap">
                          {item.contenu}
                        </p>
                      </div>
                    )}
                    {item.erreur_message && (
                      <div className="text-red-600">
                        <span className="font-medium">Erreur:</span> {item.erreur_message}
                      </div>
                    )}
                    {item.portail_action && (
                      <div>
                        <span className="font-medium">Action portail:</span> {item.portail_action}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
