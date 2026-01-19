"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select } from "@/components/ui/select"
import { createClient } from "@/lib/supabase/client"
import { formatDate, getDaysSince } from "@/lib/utils"
import { RelanceAssurance } from "@/lib/relance/types"
import { Mail, MessageSquare, Phone, Search, RefreshCw, FileText, Building2 } from "lucide-react"
import Link from "next/link"

export function RelanceAssurances() {
  const supabase = createClient()
  const [relances, setRelances] = useState<RelanceAssurance[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [filterStatut, setFilterStatut] = useState<string>("all")
  const [filterAssurance, setFilterAssurance] = useState<string>("all")

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
              dossier_id: "DOS-2024-003",
              clients: { nom: "Bernard Pierre", email: "bernard@example.com", telephone: "0611111111" },
              vehicules: { immatriculation: "IJ-789-KL", marque: "Peugeot", modele: "308" },
              statut: "RAPPORT_RECU",
              assureur: "AXA",
              date_entree: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
            },
            nombre_relances: 1,
            date_derniere_relance: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
            jours_depuis_relance: 10,
            raison: "En attente validation rapport",
            created_at: new Date().toISOString(),
          },
        ])
    } catch (error) {
      console.error("Error loading relances assurances:", error)
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
        rel.dossier?.assureur?.toLowerCase().includes(searchLower)
      )
    }
    if (filterStatut !== "all") {
      if (rel.dossier?.statut !== filterStatut) return false
    }
    if (filterAssurance !== "all") {
      if (rel.dossier?.assureur !== filterAssurance) return false
    }
    return true
  })

  const assurances = Array.from(new Set(relances.map((r) => r.dossier?.assureur).filter(Boolean)))

  const handleRelance = async (relance: RelanceAssurance, type: "email" | "sms" | "appel") => {
    const message = `Relance ${type} assurance ${relance.dossier?.assureur} pour ${relance.dossier?.dossier_id}`
    alert(message)
  }

  return (
    <Card className="card-gradient">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2 text-primary drop-shadow-[0_2px_8px_rgba(0,0,0,0.25)]">
            <Building2 className="h-5 w-5 text-bordeaux-400" />
            <span>Relances assurances</span>
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
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-900" />
            <Input
              placeholder="Rechercher (dossier, client, assurance)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-12"
            />
          </div>
          <Select
            value={filterStatut}
            onChange={(e) => setFilterStatut(e.target.value)}
            className="h-12"
          >
            <option value="all">Tous les statuts</option>
            <option value="EN_ATTENTE_EXPERT">En attente expert</option>
            <option value="RAPPORT_RECU">Rapport reçu</option>
            <option value="EN_REPARATION">En réparation</option>
            <option value="FACTURE_ENVOYEE">Facture envoyée</option>
          </Select>
          <Select
            value={filterAssurance}
            onChange={(e) => setFilterAssurance(e.target.value)}
            className="h-12"
          >
            <option value="all">Toutes les assurances</option>
            {assurances.map((ass) => (
              <option key={ass} value={ass}>
                {ass}
              </option>
            ))}
          </Select>
        </div>

        {/* Liste */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-bordeaux-400"></div>
            <p className="text-gray-900 mt-2">Chargement...</p>
          </div>
        ) : filteredRelances.length === 0 ? (
          <div className="text-center py-12">
            <Building2 className="h-12 w-12 text-gray-900 mx-auto mb-4" />
            <p className="text-gray-900">Aucune relance assurance nécessaire</p>
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
                        className="font-bold text-lg text-bordeaux-700 hover:text-bordeaux-800 hover:underline"
                      >
                        {relance.dossier?.dossier_id || "N/A"}
                      </Link>
                      <Badge className="bg-blue-100 text-blue-800 border border-blue-300">
                        {relance.dossier?.statut}
                      </Badge>
                      <Badge className="bg-gray-100 text-gray-900 border border-gray-300">
                        {relance.jours_depuis_relance} jour{relance.jours_depuis_relance > 1 ? "s" : ""} depuis dernière relance
                      </Badge>
                      {relance.nombre_relances > 0 && (
                        <Badge className="bg-gray-100 text-gray-900 border border-gray-300">
                          {relance.nombre_relances} relance{relance.nombre_relances > 1 ? "s" : ""}
                        </Badge>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-gray-900 mb-2">
                      <div>
                        <span className="font-medium">Client:</span> {relance.dossier?.clients?.nom || "-"}
                      </div>
                      <div>
                        <span className="font-medium">Véhicule:</span>{" "}
                        {relance.dossier?.vehicules?.immatriculation || "-"}
                      </div>
                      <div>
                        <span className="font-medium">Assurance:</span> {relance.dossier?.assureur || "-"}
                      </div>
                    </div>
                    <div className="mt-2">
                      <Badge className="bg-amber-500/20 text-amber-300 border border-amber-500/30 backdrop-blur-sm">
                        {relance.raison}
                      </Badge>
                    </div>
                    {relance.date_derniere_relance && (
                      <div className="mt-2 text-sm text-gray-900">
                        Dernière relance: {formatDate(relance.date_derniere_relance)}
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
            <p className="text-sm text-gray-900">
              {filteredRelances.length} dossier{filteredRelances.length > 1 ? "s" : ""} nécessitant une relance
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
