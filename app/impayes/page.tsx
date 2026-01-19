import { createClient } from "@/lib/supabase/server"
import AuthenticatedLayout from "@/components/layout/authenticated-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatCurrency, formatDate, getDaysSince } from "@/lib/utils"
import Link from "next/link"
import { DollarSign, Send, CheckCircle2 } from "lucide-react"
import { ImpayesClient } from "./impayes-client"

async function getImpayes() {
  const supabase = await createClient()

  // Mock data if Supabase not configured
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return []
  }

  const { data: payments, error } = await supabase
    .from("payments")
    .select("*, dossiers(*, clients(*), vehicules(*))")
    .in("statut", ["EN_ATTENTE", "EN_RETARD"])
    .order("date_echeance", { ascending: true })

  if (error) {
    console.error("Error fetching impayes:", error)
    return []
  }

  return payments || []
}

export default async function ImpayesPage() {
  // Allow access in mock mode
  if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return null
    }
  }

  const impayes = await getImpayes()

  const montantTotal = impayes.reduce(
    (sum, p) => sum + Number(p.montant),
    0
  )

  return (
    <AuthenticatedLayout>
      <ImpayesClient initialImpayes={impayes} />
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Impayés</h1>
          <p className="text-gray-900 mt-2">Suivi des factures en attente de paiement</p>
        </div>

        {/* Résumé */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total impayés</CardTitle>
              <DollarSign className="h-4 w-4 text-gray-900" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{impayes.length}</div>
              <p className="text-xs text-gray-900 mt-1">
                {formatCurrency(montantTotal)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">En attente</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {impayes.filter((p) => p.statut === "EN_ATTENTE").length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">En retard</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">
                {impayes.filter((p) => p.statut === "EN_RETARD").length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Liste */}
        <Card>
          <CardHeader>
            <CardTitle>Liste des impayés</CardTitle>
          </CardHeader>
          <CardContent>
            {impayes.length === 0 ? (
              <p className="text-center text-gray-900 py-8">Aucun impayé</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Dossier</th>
                      <th className="text-left p-2">Client</th>
                      <th className="text-left p-2">Montant</th>
                      <th className="text-left p-2">Date facture</th>
                      <th className="text-left p-2">Échéance</th>
                      <th className="text-left p-2">Jours</th>
                      <th className="text-left p-2">Relances</th>
                      <th className="text-left p-2">Statut</th>
                      <th className="text-left p-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {impayes.map((payment: any) => {
                      const jours = payment.date_echeance
                        ? getDaysSince(payment.date_echeance)
                        : 0
                      const dossier = payment.dossiers

                      return (
                        <tr key={payment.id} className="border-b hover:bg-gray-50">
                          <td className="p-2">
                            <Link
                              href={`/dossiers/${dossier?.id}`}
                              className="font-medium text-primary hover:underline"
                            >
                              {dossier?.dossier_id}
                            </Link>
                          </td>
                          <td className="p-2">{dossier?.clients?.nom || "-"}</td>
                          <td className="p-2 font-medium">
                            {formatCurrency(payment.montant)}
                          </td>
                          <td className="p-2">
                            {formatDate(payment.date_facture)}
                          </td>
                          <td className="p-2">
                            {formatDate(payment.date_echeance)}
                          </td>
                          <td className="p-2">
                            {jours > 0 ? (
                              <Badge variant="destructive">{jours} jours</Badge>
                            ) : (
                              <span className="text-gray-900">-</span>
                            )}
                          </td>
                          <td className="p-2">{payment.nombre_relances}</td>
                          <td className="p-2">
                            <Badge
                              variant={
                                payment.statut === "EN_RETARD"
                                  ? "destructive"
                                  : "outline"
                              }
                            >
                              {payment.statut}
                            </Badge>
                          </td>
                          <td className="p-2">
                            <div className="flex space-x-2">
                              <Link href={`/dossiers/${dossier?.id}`}>
                                <Button size="sm" variant="outline">
                                  Voir
                                </Button>
                              </Link>
                            </div>
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
