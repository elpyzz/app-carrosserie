"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select } from "@/components/ui/select"
import { createClient } from "@/lib/supabase/client"
import { formatDate, getDaysSince } from "@/lib/utils"
import { RelanceExpert } from "@/lib/relance/types"
import { Mail, MessageSquare, Phone, Search, RefreshCw, FileText, UserCheck, AlertCircle } from "lucide-react"
import Link from "next/link"

export function RelanceExperts() {
  const supabase = createClient()
  const [relances, setRelances] = useState<RelanceExpert[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [filterExpert, setFilterExpert] = useState<string>("all")
  const [filterRetard, setFilterRetard] = useState<string>("all")

  useEffect(() => {
    loadRelances()
  }, [])

  const loadRelances = async () => {
    setLoading(true)
    try {
      // Pour l'instant, toujours utiliser les données mock pour garantir l'affichage
      await new Promise((resolve) => setTimeout(resolve, 500))
      setRelances([
          {
            id: "mock-1",
            dossier_id: "mock-dossier-1",
            dossier: {
              dossier_id: "DOS-2024-004",
              clients: { nom: "Dubois Marie", email: "dubois@example.com", telephone: "0622222222" },
              vehicules: { immatriculation: "MN-111-OP", marque: "Citroën", modele: "C3" },
              expert: "Expert Martin",
              expert_email: "expert.martin@example.com",
              date_entree: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
              date_rapport_recu: null,
              date_derniere_relance_expert: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
            },
            nombre_relances: 1,
            jours_depuis_relance: 5,
            jours_depuis_entree: 20,
            raison: "Rapport en retard > 15 jours",
            created_at: new Date().toISOString(),
          },
        ])
    } catch (error) {
      console.error("Error loading relances experts:", error)
    } finally {
      setLoading(false)
    }
  }

  const filteredRelances = relances.filter((rel) => {
    if (search) {
      const searchLower = search.toLowerCase()
      return (
        rel.dossier?.dossier_id?.toLowerCase().includes(searchLower) ||
        rel.dossier?.clients?.nom?.toLowerCase().includes(searchLower) ||
        rel.dossier?.expert?.toLowerCase().includes(searchLower)
      )
    }
    if (filterExpert !== "all") {
      if (rel.dossier?.expert !== filterExpert) return false
    }
    if (filterRetard === "retard") {
      if (rel.jours_depuis_entree <= 15) return false
    }
    return true
  })

  const experts = Array.from(new Set(relances.map((r) => r.dossier?.expert).filter(Boolean)))

  const handleRelance = async (relance: RelanceExpert, type: "email" | "sms" | "appel") => {
    const message = `Relance ${type} expert ${relance.dossier?.expert} pour ${relance.dossier?.dossier_id}`
    alert(message)
  }

  return (
    <Card className="card-gradient">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2 text-white">
            <UserCheck className="h-5 w-5 text-bordeaux-400" />
            <span>Relances experts</span>
          </CardTitle>
          <Button
            size="sm"
            variant="outline"
            onClick={loadRelances}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Actualiser
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filtres */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-300" />
            <Input
              placeholder="Rechercher (dossier, client, expert)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-12"
            />
          </div>
          <Select
            value={filterExpert}
            onChange={(e) => setFilterExpert(e.target.value)}
            className="h-12"
          >
            <option value="all">Tous les experts</option>
            {experts.map((exp) => (
              <option key={exp} value={exp}>
                {exp}
              </option>
            ))}
          </Select>
          <Select
            value={filterRetard}
            onChange={(e) => setFilterRetard(e.target.value)}
            className="h-12"
          >
            <option value="all">Tous</option>
            <option value="retard">Retard > 15 jours uniquement</option>
          </Select>
        </div>

        {/* Liste */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-bordeaux-400"></div>
            <p className="text-gray-300 mt-2">Chargement...</p>
          </div>
        ) : filteredRelances.length === 0 ? (
          <div className="text-center py-12">
            <UserCheck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-300">Aucune relance expert nécessaire</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredRelances.map((relance) => (
              <div
                key={relance.id}
                className="p-4 bg-white/20 backdrop-blur-sm border border-white/30 border-bordeaux-500/40 rounded-xl hover:border-bordeaux-500/60 hover:bg-white/30 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <Link
                        href={`/dossiers/${relance.dossier_id}`}
                        className="font-bold text-lg text-bordeaux-300 hover:text-bordeaux-200 hover:underline"
                      >
                        {relance.dossier?.dossier_id || "N/A"}
                      </Link>
                      {relance.jours_depuis_entree > 15 && (
                        <Badge className="bg-bordeaux-500/30 text-bordeaux-200 border border-bordeaux-500/50 backdrop-blur-sm">
                          Retard > 15 jours
                        </Badge>
                      )}
                      <Badge className="bg-white/15 text-gray-200 border border-white/30 backdrop-blur-sm">
                        {relance.jours_depuis_relance} jour{relance.jours_depuis_relance > 1 ? "s" : ""} depuis dernière relance
                      </Badge>
                      {relance.nombre_relances > 0 && (
                        <Badge className="bg-white/15 text-gray-200 border border-white/30 backdrop-blur-sm">
                          {relance.nombre_relances} relance{relance.nombre_relances > 1 ? "s" : ""}
                        </Badge>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-gray-300 mb-2">
                      <div>
                        <span className="font-medium">Client:</span> {relance.dossier?.clients?.nom || "-"}
                      </div>
                      <div>
                        <span className="font-medium">Véhicule:</span>{" "}
                        {relance.dossier?.vehicules?.immatriculation || "-"}
                      </div>
                      <div>
                        <span className="font-medium">Expert:</span> {relance.dossier?.expert || "-"}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-300 mb-2">
                      <div>
                        <span className="font-medium">Email expert:</span> {relance.dossier?.expert_email || "-"}
                      </div>
                      <div>
                        <span className="font-medium">Date entrée:</span>{" "}
                        {relance.dossier?.date_entree ? formatDate(relance.dossier.date_entree) : "-"}
                      </div>
                    </div>
                    <div className="mt-2">
                      <Badge className="bg-amber-500/20 text-amber-300 border border-amber-500/30 backdrop-blur-sm">
                        {relance.raison}
                      </Badge>
                    </div>
                    {relance.dossier?.date_derniere_relance_expert && (
                      <div className="mt-2 text-sm text-gray-400">
                        Dernière relance: {formatDate(relance.dossier.date_derniere_relance_expert)}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col space-y-2 ml-4">
                    <Button
                      size="sm"
                      className="btn-primary"
                      onClick={() => handleRelance(relance, "email")}
                    >
                      <Mail className="h-4 w-4 mr-2" />
                      Email
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRelance(relance, "sms")}
                    >
                      <MessageSquare className="h-4 w-4 mr-2" />
                      SMS
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRelance(relance, "appel")}
                    >
                      <Phone className="h-4 w-4 mr-2" />
                      Appel
                    </Button>
                    <Link href={`/dossiers/${relance.dossier_id}`}>
                      <Button size="sm" variant="outline" className="w-full">
                        <FileText className="h-4 w-4 mr-2" />
                        Voir dossier
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Résumé */}
        {!loading && filteredRelances.length > 0 && (
          <div className="pt-4 border-t border-white/30">
            <p className="text-sm text-gray-300">
              {filteredRelances.length} dossier{filteredRelances.length > 1 ? "s" : ""} nécessitant une relance expert
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
