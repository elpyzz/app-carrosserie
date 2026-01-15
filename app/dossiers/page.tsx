import { createClient } from "@/lib/supabase/server"
import AuthenticatedLayout from "@/components/layout/authenticated-layout"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { formatCurrency, formatDate, getDaysSince } from "@/lib/utils"
import Link from "next/link"
import { Plus, Search } from "lucide-react"
import { DossierStatut } from "@/lib/types"

const STATUTS: DossierStatut[] = [
  "NOUVEAU",
  "EN_ATTENTE_EXPERT",
  "RELANCE_EXPERT",
  "RAPPORT_RECU",
  "EN_REPARATION",
  "FACTURE_ENVOYEE",
  "EN_ATTENTE_PAIEMENT",
  "PAYE",
  "LITIGE",
]

const STATUT_COLORS: Record<DossierStatut, string> = {
  NOUVEAU: "bg-blue-500/20 text-blue-300 border border-blue-500/30 backdrop-blur-sm",
  EN_ATTENTE_EXPERT: "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 backdrop-blur-sm",
  RELANCE_EXPERT: "bg-orange-500/20 text-orange-300 border border-orange-500/30 backdrop-blur-sm",
  RAPPORT_RECU: "bg-green-500/20 text-green-300 border border-green-500/30 backdrop-blur-sm",
  EN_REPARATION: "bg-purple-500/20 text-purple-300 border border-purple-500/30 backdrop-blur-sm",
  FACTURE_ENVOYEE: "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 backdrop-blur-sm",
  EN_ATTENTE_PAIEMENT: "bg-pink-500/20 text-pink-300 border border-pink-500/30 backdrop-blur-sm",
  PAYE: "bg-green-500/20 text-green-300 border border-green-500/30 backdrop-blur-sm",
  LITIGE: "bg-bordeaux-500/30 text-bordeaux-200 border border-bordeaux-500/50 backdrop-blur-sm",
}

function getStatutLabel(statut: DossierStatut): string {
  const labels: Record<DossierStatut, string> = {
    NOUVEAU: "Nouveau",
    EN_ATTENTE_EXPERT: "En attente expert",
    RELANCE_EXPERT: "Relance expert",
    RAPPORT_RECU: "Rapport reçu",
    EN_REPARATION: "En réparation",
    FACTURE_ENVOYEE: "Facture envoyée",
    EN_ATTENTE_PAIEMENT: "En attente paiement",
    PAYE: "Payé",
    LITIGE: "Litige",
  }
  return labels[statut]
}

async function getDossiers(filters?: { statut?: string; search?: string }) {
  const supabase = await createClient()

  // Mock data if Supabase not configured
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    // Return empty array for now - can add mock data later if needed
    return Promise.resolve([])
  }

  let query = supabase
    .from("dossiers")
    .select("*, clients(*), vehicules(*)")
    .order("date_entree", { ascending: false })

  if (filters?.statut && filters.statut !== "all") {
    query = query.eq("statut", filters.statut)
  }

  if (filters?.search) {
    query = query.or(
      `dossier_id.ilike.%${filters.search}%,clients.nom.ilike.%${filters.search}%,vehicules.immatriculation.ilike.%${filters.search}%`
    )
  }

  const result = await query

  if (result.error) {
    console.error("Error fetching dossiers:", result.error)
    return []
  }

  return result.data || []
}

export default async function DossiersPage({
  searchParams,
}: {
  searchParams: { statut?: string; search?: string }
}) {
  // Allow access in mock mode
  if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return (
        <AuthenticatedLayout>
          <div className="text-center py-12">
            <p className="text-gray-300">Vous devez être connecté</p>
          </div>
        </AuthenticatedLayout>
      )
    }
  }

  const dossiers = await getDossiers({
    statut: searchParams.statut,
    search: searchParams.search,
  })

  return (
    <AuthenticatedLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-bordeaux-400 via-bordeaux-300 to-bordeaux-500 bg-clip-text text-transparent">
              Dossiers sinistres
            </h1>
            <p className="text-gray-300 text-lg">Gérez tous vos dossiers</p>
          </div>
          <Link href="/dossiers/new">
            <Button className="btn-primary shadow-lg">
              <Plus className="h-5 w-5 mr-2" />
              Nouveau dossier
            </Button>
          </Link>
        </div>

        {/* Filtres */}
        <Card className="card-gradient">
          <CardContent className="pt-6">
            <form method="get" className="flex gap-4">
              <div className="flex-1">
                <Input
                  name="search"
                  placeholder="Rechercher (dossier, client, immatriculation)..."
                  defaultValue={searchParams.search}
                  className="h-12"
                />
              </div>
              <div className="w-64">
                <Select name="statut" defaultValue={searchParams.statut || "all"} className="h-12 border-2">
                  <option value="all">Tous les statuts</option>
                  {STATUTS.map((statut) => (
                    <option key={statut} value={statut}>
                      {getStatutLabel(statut)}
                    </option>
                  ))}
                </Select>
              </div>
              <Button type="submit" className="btn-primary h-12 px-6">
                <Search className="h-5 w-5 mr-2" />
                Filtrer
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Liste */}
        <Card className="card-gradient overflow-hidden">
          <CardContent className="p-0">
            {dossiers.length === 0 ? (
              <div className="text-center py-16">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-bordeaux-500/30 rounded-full mb-4 backdrop-blur-sm border border-bordeaux-500/50">
                  <FileText className="h-10 w-10 text-bordeaux-400" />
                </div>
                <p className="text-gray-300 text-lg font-medium">
                  Aucun dossier trouvé
                </p>
                <p className="text-gray-400 text-sm mt-2">
                  Créez votre premier dossier pour commencer
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-white/10 backdrop-blur-sm border-b border-white/20">
                    <tr>
                      <th className="text-left p-4 font-semibold text-white">Dossier</th>
                      <th className="text-left p-4 font-semibold text-white">Client</th>
                      <th className="text-left p-4 font-semibold text-white">Véhicule</th>
                      <th className="text-left p-4 font-semibold text-white">Assureur</th>
                      <th className="text-left p-4 font-semibold text-white">Statut</th>
                      <th className="text-left p-4 font-semibold text-white">Montant</th>
                      <th className="text-left p-4 font-semibold text-white">Date entrée</th>
                      <th className="text-left p-4 font-semibold text-white">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {dossiers.map((dossier: any) => {
                      const jours = getDaysSince(dossier.date_entree)
                      const isRetard =
                        (dossier.statut === "EN_ATTENTE_EXPERT" ||
                          dossier.statut === "RELANCE_EXPERT") &&
                        !dossier.date_rapport_recu &&
                        jours > 15

                      return (
                        <tr key={dossier.id} className="hover:bg-white/10 transition-colors">
                          <td className="p-4">
                            <div className="flex items-center space-x-2">
                              <Link
                                href={`/dossiers/${dossier.id}`}
                                className="font-bold text-bordeaux-300 hover:text-bordeaux-200 hover:underline"
                              >
                                {dossier.dossier_id}
                              </Link>
                              {isRetard && (
                                <Badge className="bg-bordeaux-500/30 text-bordeaux-200 border border-bordeaux-500/50 backdrop-blur-sm">
                                  Retard
                                </Badge>
                              )}
                            </div>
                          </td>
                          <td className="p-4 font-medium text-gray-200">{dossier.clients?.nom || "-"}</td>
                          <td className="p-4">
                            <div>
                              <span className="font-medium text-gray-200">{dossier.vehicules?.marque} {dossier.vehicules?.modele}</span>
                              {dossier.vehicules?.immatriculation && (
                                <span className="text-gray-400 text-sm ml-2">
                                  ({dossier.vehicules.immatriculation})
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-4 text-gray-300">{dossier.assureur || "-"}</td>
                          <td className="p-4">
                            <Badge className={`${STATUT_COLORS[dossier.statut]} font-semibold px-3 py-1`}>
                              {getStatutLabel(dossier.statut)}
                            </Badge>
                          </td>
                          <td className="p-4 font-bold text-white">
                            {formatCurrency(dossier.montant_estime)}
                          </td>
                          <td className="p-4 text-gray-300">{formatDate(dossier.date_entree)}</td>
                          <td className="p-4">
                            <Link href={`/dossiers/${dossier.id}`}>
                              <Button size="sm" variant="outline">
                                Voir
                              </Button>
                            </Link>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AuthenticatedLayout>
  )
}
