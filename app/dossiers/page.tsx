import { createClient } from "@/lib/supabase/server"
import AuthenticatedLayout from "@/components/layout/authenticated-layout"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { formatCurrency, formatDate, getDaysSince } from "@/lib/utils"
import Link from "next/link"
import { Plus, Search, FileText } from "lucide-react"
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
  NOUVEAU: "bg-blue-100 text-blue-800 border border-blue-300",
  EN_ATTENTE_EXPERT: "bg-yellow-100 text-yellow-800 border border-yellow-300",
  RELANCE_EXPERT: "bg-orange-100 text-orange-800 border border-orange-300",
  RAPPORT_RECU: "bg-green-100 text-green-800 border border-green-300",
  EN_REPARATION: "bg-purple-100 text-purple-800 border border-purple-300",
  FACTURE_ENVOYEE: "bg-indigo-100 text-indigo-800 border border-indigo-300",
  EN_ATTENTE_PAIEMENT: "bg-pink-100 text-pink-800 border border-pink-300",
  PAYE: "bg-green-100 text-green-800 border border-green-300",
  LITIGE: "bg-bordeaux-100 text-bordeaux-800 border border-bordeaux-300",
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
            <p className="text-gray-900">Vous devez être connecté</p>
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
            <h1 className="page-title">
              Dossiers sinistres
            </h1>
            <p className="text-gray-900 text-lg">Gérez tous vos dossiers</p>
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
                <div className="inline-flex items-center justify-center w-20 h-20 bg-bordeaux-100 rounded-full mb-4 border border-bordeaux-300">
                  <FileText className="h-10 w-10 text-bordeaux-600" />
                </div>
                <p className="text-primary text-lg font-medium">
                  Aucun dossier trouvé
                </p>
                <p className="text-gray-900 text-sm mt-2">
                  Créez votre premier dossier pour commencer
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-100 border-b border-bordeaux-200">
                    <tr>
                      <th className="text-left p-4 font-semibold text-gray-900">Dossier</th>
                      <th className="text-left p-4 font-semibold text-gray-900">Client</th>
                      <th className="text-left p-4 font-semibold text-gray-900">Véhicule</th>
                      <th className="text-left p-4 font-semibold text-gray-900">Assureur</th>
                      <th className="text-left p-4 font-semibold text-gray-900">Statut</th>
                      <th className="text-left p-4 font-semibold text-gray-900">Montant</th>
                      <th className="text-left p-4 font-semibold text-gray-900">Date entrée</th>
                      <th className="text-left p-4 font-semibold text-gray-900">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {dossiers.map((dossier: any) => {
                      const jours = getDaysSince(dossier.date_entree)
                      const isRetard =
                        (dossier.statut === "EN_ATTENTE_EXPERT" ||
                          dossier.statut === "RELANCE_EXPERT") &&
                        !dossier.date_rapport_recu &&
                        jours > 15

                      return (
                        <tr key={dossier.id} className="hover:bg-gray-50 transition-colors">
                          <td className="p-4">
                            <div className="flex items-center space-x-2">
                              <Link
                                href={`/dossiers/${dossier.id}`}
                                className="font-bold text-bordeaux-600 hover:text-bordeaux-700 hover:underline"
                              >
                                {dossier.dossier_id}
                              </Link>
                              {isRetard && (
                                <Badge className="bg-bordeaux-100 text-bordeaux-800 border border-bordeaux-300">
                                  Retard
                                </Badge>
                              )}
                            </div>
                          </td>
                          <td className="p-4 font-medium text-primary">{dossier.clients?.nom || "-"}</td>
                          <td className="p-4">
                            <div>
                              <span className="font-medium text-primary">{dossier.vehicules?.marque} {dossier.vehicules?.modele}</span>
                              {dossier.vehicules?.immatriculation && (
                                <span className="text-gray-900 text-sm ml-2">
                                  ({dossier.vehicules.immatriculation})
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-4 text-gray-900">{dossier.assureur || "-"}</td>
                          <td className="p-4">
                            <Badge className={`${STATUT_COLORS[dossier.statut]} font-semibold px-3 py-1`}>
                              {getStatutLabel(dossier.statut)}
                            </Badge>
                          </td>
                          <td className="p-4 font-bold text-primary">
                            {formatCurrency(dossier.montant_estime)}
                          </td>
                          <td className="p-4 text-gray-900">{formatDate(dossier.date_entree)}</td>
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
