"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"
import { formatCurrency, formatDate, getDaysSince } from "@/lib/utils"
import Link from "next/link"
import { Search, FileText, Download, Calendar, AlertCircle, CheckCircle2 } from "lucide-react"

type RapportType = "rapport_expert" | "proces_verbal" | "reglement_direct"

interface RapportDocument {
  id: string
  dossier_id: string
  dossier?: {
    dossier_id: string
    clients?: { nom: string }
    vehicules?: { marque: string; modele: string; immatriculation: string }
    statut: string
  }
  type: RapportType
  nom_fichier: string
  chemin_storage: string
  created_at: string
}

export function ExpertRapportsList() {
  const supabase = createClient()
  const [rapports, setRapports] = useState<RapportDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [filterType, setFilterType] = useState<string>("all")
  const [filterStatut, setFilterStatut] = useState<string>("all")

  useEffect(() => {
    loadRapports()
  }, [])

  const loadRapports = async () => {
    setLoading(true)
    try {
      if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
        // Charger les documents de type rapport_expert
        const { data: documents, error } = await supabase
          .from("documents")
          .select("*, dossiers(*, clients(*), vehicules(*))")
          .in("type", ["rapport_expert"])
          .order("created_at", { ascending: false })

        if (error) throw error

        // Transformer les données
        const rapportsData = (documents || []).map((doc: any) => ({
          id: doc.id,
          dossier_id: doc.dossier_id,
          dossier: doc.dossiers,
          type: "rapport_expert" as RapportType,
          nom_fichier: doc.nom_fichier,
          chemin_storage: doc.chemin_storage,
          created_at: doc.created_at,
        }))

        setRapports(rapportsData)
      } else {
        // Mode mock : données de démonstration
        setRapports([
          {
            id: "mock-1",
            dossier_id: "mock-dossier-1",
            dossier: {
              dossier_id: "DOS-2024-001",
              clients: { nom: "Dupont Jean" },
              vehicules: {
                marque: "Renault",
                modele: "Clio",
                immatriculation: "AB-123-CD",
              },
              statut: "RAPPORT_RECU",
            },
            type: "rapport_expert",
            nom_fichier: "rapport_expert_DOS-2024-001.pdf",
            chemin_storage: "documents/mock-1/rapport.pdf",
            created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          },
          {
            id: "mock-2",
            dossier_id: "mock-dossier-2",
            dossier: {
              dossier_id: "DOS-2024-002",
              clients: { nom: "Martin Sophie" },
              vehicules: {
                marque: "BMW",
                modele: "Série 3",
                immatriculation: "EF-456-GH",
              },
              statut: "RAPPORT_RECU",
            },
            type: "rapport_expert",
            nom_fichier: "proces_verbal_DOS-2024-002.pdf",
            chemin_storage: "documents/mock-2/pv.pdf",
            created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          },
        ])
      }
    } catch (error) {
      console.error("Error loading rapports:", error)
    } finally {
      setLoading(false)
    }
  }

  const filteredRapports = rapports.filter((rapport) => {
    // Filtre recherche
    if (search) {
      const searchLower = search.toLowerCase()
      return (
        rapport.dossier?.dossier_id?.toLowerCase().includes(searchLower) ||
        rapport.dossier?.clients?.nom?.toLowerCase().includes(searchLower) ||
        rapport.dossier?.vehicules?.immatriculation?.toLowerCase().includes(searchLower) ||
        rapport.nom_fichier?.toLowerCase().includes(searchLower)
      )
    }
    return true
  })

  const getTypeLabel = (type: RapportType) => {
    const labels = {
      rapport_expert: "Rapport d'expert",
      proces_verbal: "Procès-verbal",
      reglement_direct: "Règlement direct",
    }
    return labels[type] || type
  }

  const getTypeBadgeColor = (type: RapportType) => {
    const colors = {
      rapport_expert: "bg-bordeaux-500/30 text-bordeaux-200 border border-bordeaux-500/50 backdrop-blur-sm",
      proces_verbal: "bg-purple-500/20 text-purple-300 border border-purple-500/30 backdrop-blur-sm",
      reglement_direct: "bg-green-500/20 text-green-300 border border-green-500/30 backdrop-blur-sm",
    }
    return colors[type] || "bg-white/15 text-gray-200 border border-white/30 backdrop-blur-sm"
  }

  return (
    <Card className="card-gradient">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2 text-white">
          <FileText className="h-5 w-5 text-bordeaux-400" />
          <span>Rapports d'experts reçus</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filtres */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-300" />
            <Input
              placeholder="Rechercher (dossier, client, fichier)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-12"
            />
          </div>
          <Select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="h-12"
          >
            <option value="all">Tous les types</option>
            <option value="rapport_expert">Rapport d'expert</option>
            <option value="proces_verbal">Procès-verbal</option>
            <option value="reglement_direct">Règlement direct</option>
          </Select>
        </div>

        {/* Liste des rapports */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-bordeaux-400"></div>
            <p className="text-gray-300 mt-2">Chargement...</p>
          </div>
        ) : filteredRapports.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-300">Aucun rapport trouvé</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredRapports.map((rapport) => (
              <div
                key={rapport.id}
                className="p-4 bg-white/20 backdrop-blur-sm border border-white/30 border-bordeaux-500/40 rounded-xl hover:border-bordeaux-500/60 hover:bg-white/30 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <CheckCircle2 className="h-5 w-5 text-green-400" />
                      <Link
                        href={`/dossiers/${rapport.dossier_id}`}
                        className="font-bold text-lg text-bordeaux-300 hover:text-bordeaux-200 hover:underline"
                      >
                        {rapport.dossier?.dossier_id || "N/A"}
                      </Link>
                      <Badge className={getTypeBadgeColor(rapport.type)}>
                        {getTypeLabel(rapport.type)}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-gray-300">
                      <div>
                        <span className="font-medium">Client:</span>{" "}
                        {rapport.dossier?.clients?.nom || "-"}
                      </div>
                      <div>
                        <span className="font-medium">Véhicule:</span>{" "}
                        {rapport.dossier?.vehicules?.marque}{" "}
                        {rapport.dossier?.vehicules?.modele} (
                        {rapport.dossier?.vehicules?.immatriculation})
                      </div>
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4" />
                        <span>{formatDate(rapport.created_at)}</span>
                      </div>
                    </div>
                    <div className="mt-2">
                      <p className="text-sm font-medium text-white">
                        📄 {rapport.nom_fichier}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col space-y-2 ml-4">
                    <Link href={`/dossiers/${rapport.dossier_id}`}>
                      <Button size="sm" variant="outline" className="w-full">
                        Voir dossier
                      </Button>
                    </Link>
                    <Button
                      size="sm"
                      className="btn-primary w-full"
                      onClick={() => {
                        window.open(`/api/documents/${rapport.id}/download`, "_blank")
                      }}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Télécharger
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Résumé */}
        {!loading && filteredRapports.length > 0 && (
          <div className="pt-4 border-t border-white/30">
            <p className="text-sm text-gray-300">
              {filteredRapports.length} rapport{filteredRapports.length > 1 ? "s" : ""} affiché{filteredRapports.length > 1 ? "s" : ""}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
