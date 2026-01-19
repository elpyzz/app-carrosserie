"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select } from "@/components/ui/select"
import { createClient } from "@/lib/supabase/client"
import { formatCurrency, formatDate, getDaysSince } from "@/lib/utils"
import { RelanceImpaye } from "@/lib/relance/types"
import { Mail, MessageSquare, Phone, Search, AlertCircle, RefreshCw, FileText } from "lucide-react"
import Link from "next/link"

export function RelanceImpayes() {
  const supabase = createClient()
  const [impayes, setImpayes] = useState<RelanceImpaye[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [filterStatut, setFilterStatut] = useState<string>("all")
  const [filterRetard, setFilterRetard] = useState<string>("all")

  useEffect(() => {
    loadImpayes()
  }, [])

  const loadImpayes = async () => {
    setLoading(true)
    try {
      // Pour l'instant, toujours utiliser les données mock pour garantir l'affichage
      await new Promise((resolve) => setTimeout(resolve, 500)) // Simuler un délai
      setImpayes([
          {
            id: "mock-1",
            payment_id: "mock-1",
            dossier_id: "mock-dossier-1",
            dossier: {
              dossier_id: "DOS-2024-001",
              clients: { nom: "Dupont Jean", email: "dupont@example.com", telephone: "0612345678" },
              vehicules: { immatriculation: "AB-123-CD", marque: "Renault", modele: "Clio" },
            },
            montant: 2500.00,
            date_facture: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
            date_echeance: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
            statut: "EN_RETARD",
            nombre_relances: 2,
            date_derniere_relance: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
            jours_retard: 15,
            created_at: new Date().toISOString(),
          },
          {
            id: "mock-2",
            payment_id: "mock-2",
            dossier_id: "mock-dossier-2",
            dossier: {
              dossier_id: "DOS-2024-002",
              clients: { nom: "Martin Sophie", email: "martin@example.com", telephone: "0698765432" },
              vehicules: { immatriculation: "EF-456-GH", marque: "BMW", modele: "Série 3" },
            },
            montant: 1800.00,
            date_facture: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
            date_echeance: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
            statut: "EN_ATTENTE",
            nombre_relances: 0,
            date_derniere_relance: null,
            jours_retard: 0,
            created_at: new Date().toISOString(),
          },
        ])
    } catch (error) {
      console.error("Error loading impayes:", error)
    } finally {
      setLoading(false)
    }
  }

  const filteredImpayes = impayes.filter((imp) => {
    if (search) {
      const searchLower = search.toLowerCase()
      return (
        imp.dossier?.dossier_id?.toLowerCase().includes(searchLower) ||
        imp.dossier?.clients?.nom?.toLowerCase().includes(searchLower) ||
        imp.dossier?.vehicules?.immatriculation?.toLowerCase().includes(searchLower)
      )
    }
    if (filterStatut !== "all") {
      if (imp.statut !== filterStatut) return false
    }
    if (filterRetard === "retard") {
      if (imp.jours_retard === 0) return false
    }
    return true
  })

  const handleRelance = async (impaye: RelanceImpaye, type: "email" | "sms" | "appel") => {
    // TODO: Implémenter la relance
    const message = `Relance ${type} pour ${impaye.dossier?.clients?.nom} - ${formatCurrency(impaye.montant)}`
    alert(message)
  }

  return (
    <Card className="card-gradient">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2 text-primary drop-shadow-[0_2px_8px_rgba(0,0,0,0.25)]">
            <AlertCircle className="h-5 w-5 icon-primary" />
            <span>Relances clients - Impayés</span>
          </CardTitle>
          <Button
            size="sm"
            variant="outline"
            onClick={loadImpayes}
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
              placeholder="Rechercher (dossier, client, immatriculation)..."
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
            <option value="EN_ATTENTE">En attente</option>
            <option value="EN_RETARD">En retard</option>
          </Select>
          <Select
            value={filterRetard}
            onChange={(e) => setFilterRetard(e.target.value)}
            className="h-12"
          >
            <option value="all">Tous</option>
            <option value="retard">Avec retard uniquement</option>
          </Select>
        </div>

        {/* Liste */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-bordeaux-400"></div>
            <p className="text-gray-900 mt-2">Chargement...</p>
          </div>
        ) : filteredImpayes.length === 0 ? (
          <div className="text-center py-12">
            <AlertCircle className="h-12 w-12 text-gray-900 mx-auto mb-4" />
            <p className="text-gray-900">Aucun impayé trouvé</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredImpayes.map((impaye) => (
              <div
                key={impaye.id}
                className="p-4 bg-white/20 backdrop-blur-sm border border-white/30 border-bordeaux-500/40 rounded-xl hover:border-bordeaux-500/60 hover:bg-white/30 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <Link
                        href={`/dossiers/${impaye.dossier_id}`}
                        className="font-bold text-lg text-bordeaux-700 hover:text-bordeaux-800 hover:underline"
                      >
                        {impaye.dossier?.dossier_id || "N/A"}
                      </Link>
                      <Badge
                        className={
                          impaye.statut === "EN_RETARD"
                            ? "bg-bordeaux-100 text-bordeaux-800 border border-bordeaux-300"
                            : "bg-amber-100 text-amber-800 border border-amber-300"
                        }
                      >
                        {impaye.statut === "EN_RETARD" ? "En retard" : "En attente"}
                      </Badge>
                      {impaye.jours_retard > 0 && (
                        <Badge className="bg-bordeaux-100 text-bordeaux-800 border border-bordeaux-300">
                          {impaye.jours_retard} jour{impaye.jours_retard > 1 ? "s" : ""} de retard
                        </Badge>
                      )}
                      {impaye.nombre_relances > 0 && (
                        <Badge className="bg-gray-100 text-gray-900 border border-gray-300">
                          {impaye.nombre_relances} relance{impaye.nombre_relances > 1 ? "s" : ""}
                        </Badge>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-gray-900 mb-2">
                      <div>
                        <span className="font-medium">Client:</span> {impaye.dossier?.clients?.nom || "-"}
                      </div>
                      <div>
                        <span className="font-medium">Véhicule:</span>{" "}
                        {impaye.dossier?.vehicules?.immatriculation || "-"}
                      </div>
                      <div>
                        <span className="font-medium">Échéance:</span>{" "}
                        {impaye.date_echeance ? formatDate(impaye.date_echeance) : "-"}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-900">
                      <div>
                        <span className="font-medium">Email:</span> {impaye.dossier?.clients?.email || "-"}
                      </div>
                      <div>
                        <span className="font-medium">Téléphone:</span> {impaye.dossier?.clients?.telephone || "-"}
                      </div>
                    </div>
                    <div className="mt-3 flex items-center space-x-4">
                      <div className="text-xl font-bold text-bordeaux-700">
                        {formatCurrency(impaye.montant)}
                      </div>
                      {impaye.date_derniere_relance && (
                        <div className="text-sm text-gray-900">
                          Dernière relance: {formatDate(impaye.date_derniere_relance)}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col space-y-2 ml-4">
                    <Button
                      size="sm"
                      className="btn-primary"
                      onClick={() => handleRelance(impaye, "email")}
                    >
                      <Mail className="h-4 w-4 mr-2" />
                      Email
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRelance(impaye, "sms")}
                    >
                      <MessageSquare className="h-4 w-4 mr-2" />
                      SMS
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRelance(impaye, "appel")}
                    >
                      <Phone className="h-4 w-4 mr-2" />
                      Appel
                    </Button>
                    <Link href={`/dossiers/${impaye.dossier_id}`}>
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
        {!loading && filteredImpayes.length > 0 && (
          <div className="pt-4 border-t border-white/30">
            <p className="text-sm text-gray-900">
              {filteredImpayes.length} impayé{filteredImpayes.length > 1 ? "s" : ""} affiché{filteredImpayes.length > 1 ? "s" : ""}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
