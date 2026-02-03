import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import AuthenticatedLayout from "@/components/layout/authenticated-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatCurrency, formatDate, formatDateTime, getDaysSince } from "@/lib/utils"
import { DossierStatut } from "@/lib/types"
import Link from "next/link"
import { ArrowLeft, Upload, Send, CheckCircle2, Circle } from "lucide-react"
import { DossierDetailClient } from "./dossier-detail-client"
import { ClientPreferences } from "@/app/clients/components/ClientPreferences"

async function getDossier(id: string) {
  const supabase = await createClient()

  // Mock data if Supabase not configured
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return {
      dossier: {
        id: id,
        dossier_id: "DOS-2024-001",
        client_id: "mock-client-id",
        vehicule_id: "mock-vehicule-id",
        assureur: "AXA",
        expert: "Expert Martin",
        expert_email: "expert@example.com",
        statut: "EN_ATTENTE_EXPERT" as DossierStatut,
        montant_estime: 2500.00,
        notes: "Dossier de démonstration",
        date_entree: new Date().toISOString(),
        date_derniere_relance_expert: null,
        date_rapport_recu: null,
        date_facture_envoyee: null,
        notifier_client: true,
        created_by: "mock-user-id",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        clients: {
          id: "mock-client-id",
          nom: "Dupont Jean",
          telephone: "0612345678",
          email: "jean.dupont@example.com",
          adresse: "123 Rue de la Paix, 75001 Paris",
        },
        vehicules: {
          id: "mock-vehicule-id",
          immatriculation: "AB-123-CD",
          vin: "WVWZZZ1KZCW123456",
          marque: "Volkswagen",
          modele: "Golf",
          annee: 2020,
        },
      },
      documents: [],
      checklist: [
        {
          id: "mock-checklist-1",
          dossier_id: id,
          libelle: "Carte grise reçue",
          est_obligatoire: true,
          est_coche: false,
          document_requis: "carte_grise",
          checked_by: null,
          checked_at: null,
        },
        {
          id: "mock-checklist-2",
          dossier_id: id,
          libelle: "Photos avant réparation",
          est_obligatoire: true,
          est_coche: false,
          document_requis: "photos_avant",
          checked_by: null,
          checked_at: null,
        },
      ],
      communications: [],
      payments: [],
    }
  }

  const { data: dossier, error } = await supabase
    .from("dossiers")
    .select("*, clients(*), vehicules(*)")
    .eq("id", id)
    .single()

  if (error || !dossier) {
    return null
  }

  // Récupérer les documents
  const { data: documents } = await supabase
    .from("documents")
    .select("*")
    .eq("dossier_id", id)
    .order("created_at", { ascending: false })

  // Récupérer la checklist
  const { data: checklist } = await supabase
    .from("checklist_items")
    .select("*")
    .eq("dossier_id", id)
    .order("created_at", { ascending: true })

  // Récupérer les communications
  const { data: communications } = await supabase
    .from("communications")
    .select("*, users:sent_by(full_name)")
    .eq("dossier_id", id)
    .order("sent_at", { ascending: false })

  // Récupérer les paiements
  const { data: payments } = await supabase
    .from("payments")
    .select("*")
    .eq("dossier_id", id)
    .order("created_at", { ascending: false })

  return {
    dossier,
    documents: documents || [],
    checklist: checklist || [],
    communications: communications || [],
    payments: payments || [],
  }
}

const STATUT_COLORS: Record<DossierStatut, string> = {
  NOUVEAU: "bg-blue-100 text-blue-800",
  EN_ATTENTE_EXPERT: "bg-yellow-100 text-yellow-800",
  RELANCE_EXPERT: "bg-orange-100 text-orange-800",
  RAPPORT_RECU: "bg-green-100 text-green-800",
  EN_REPARATION: "bg-purple-100 text-purple-800",
  FACTURE_ENVOYEE: "bg-indigo-100 text-indigo-800",
  EN_ATTENTE_PAIEMENT: "bg-pink-100 text-pink-800",
  PAYE: "bg-green-100 text-green-800",
  LITIGE: "bg-red-100 text-red-800",
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

export default async function DossierDetailPage({
  params,
}: {
  params: { id: string }
}) {
  // Allow access in mock mode
  if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      redirect("/login")
    }
  }

  const data = await getDossier(params.id)

  if (!data) {
    return (
      <AuthenticatedLayout>
        <div className="text-center py-12">
          <p className="text-gray-900">Dossier introuvable</p>
          <Link href="/dossiers">
            <Button className="mt-4">Retour à la liste</Button>
          </Link>
        </div>
      </AuthenticatedLayout>
    )
  }

  const { dossier, documents, checklist, communications, payments } = data
  const jours = getDaysSince(dossier.date_entree)
  const joursSansRapport = dossier.date_rapport_recu
    ? 0
    : getDaysSince(dossier.date_entree)
  const isRetard = joursSansRapport > 15

  return (
    <AuthenticatedLayout>
      <DossierDetailClient dossierId={params.id} initialDossier={dossier} />
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/dossiers">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold">{dossier.dossier_id}</h1>
              <p className="text-gray-900 mt-1">
                {dossier.clients?.nom} - {dossier.vehicules?.marque}{" "}
                {dossier.vehicules?.modele}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Badge className={STATUT_COLORS[dossier.statut as DossierStatut]}>
              {getStatutLabel(dossier.statut as DossierStatut)}
            </Badge>
            {isRetard && (
              <Badge variant="destructive">Retard {joursSansRapport} jours</Badge>
            )}
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Informations principales */}
          <Card>
            <CardHeader>
              <CardTitle>Informations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-gray-900">Client</p>
                <p className="font-medium">{dossier.clients?.nom || "-"}</p>
                {dossier.clients?.telephone && (
                  <p className="text-sm text-gray-900">
                    {dossier.clients.telephone}
                  </p>
                )}
                {dossier.clients?.email && (
                  <p className="text-sm text-gray-900">{dossier.clients.email}</p>
                )}
              </div>
              <div>
                <p className="text-sm text-gray-900">Véhicule</p>
                <p className="font-medium">
                  {dossier.vehicules?.marque} {dossier.vehicules?.modele}
                </p>
                {dossier.vehicules?.immatriculation && (
                  <p className="text-sm text-gray-900">
                    {dossier.vehicules.immatriculation}
                  </p>
                )}
              </div>
              <div>
                <p className="text-sm text-gray-900">Assureur</p>
                <p className="font-medium">{dossier.assureur || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-900">Expert</p>
                <p className="font-medium">{dossier.expert || "-"}</p>
                {dossier.expert_email && (
                  <p className="text-sm text-gray-900">{dossier.expert_email}</p>
                )}
              </div>
              <div>
                <p className="text-sm text-gray-900">Montant estimé</p>
                <p className="font-medium text-lg">
                  {formatCurrency(dossier.montant_estime)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-900">Date d'entrée</p>
                <p className="font-medium">{formatDate(dossier.date_entree)}</p>
              </div>
              {dossier.notes && (
                <div>
                  <p className="text-sm text-gray-900">Notes</p>
                  <p className="text-sm">{dossier.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Checklist */}
          <Card>
            <CardHeader>
              <CardTitle>Checklist</CardTitle>
            </CardHeader>
            <CardContent>
              {checklist.length === 0 ? (
                <p className="text-sm text-gray-900">Aucun élément de checklist</p>
              ) : (
                <div className="space-y-2">
                  {checklist.map((item: any) => (
                    <div
                      key={item.id}
                      className="flex items-center space-x-2 p-2 rounded hover:bg-gray-50"
                    >
                      {item.est_coche ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      ) : (
                        <Circle className="h-5 w-5 text-gray-900" />
                      )}
                      <div className="flex-1">
                        <p className="text-sm font-medium">{item.libelle}</p>
                        {item.document_requis && (
                          <p className="text-xs text-gray-900">
                            Document requis: {item.document_requis}
                          </p>
                        )}
                      </div>
                      {item.est_obligatoire && (
                        <Badge variant="outline" className="text-xs">
                          Obligatoire
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Préférences client */}
        {dossier.clients?.id && (
          <ClientPreferences clientId={dossier.clients.id} />
        )}

        {/* Documents */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Documents</CardTitle>
            <Link href={`/dossiers/${params.id}/documents`}>
              <Button size="sm">
                <Upload className="h-4 w-4 mr-2" />
                Ajouter
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {documents.length === 0 ? (
              <p className="text-sm text-gray-900">Aucun document</p>
            ) : (
              <div className="space-y-2">
                {documents.map((doc: any) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-3 border rounded-md"
                  >
                    <div>
                      <p className="font-medium">{doc.nom_fichier}</p>
                      <p className="text-sm text-gray-900">
                        {doc.type} • {formatDate(doc.created_at)}
                      </p>
                    </div>
                    <a
                      href={`/api/documents/${doc.id}/download`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button size="sm" variant="outline">
                        Télécharger
                      </Button>
                    </a>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Communications */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Communications</CardTitle>
            <Link href={`/dossiers/${params.id}/communications`}>
              <Button size="sm">
                <Send className="h-4 w-4 mr-2" />
                Nouvelle communication
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {communications.length === 0 ? (
              <p className="text-sm text-gray-900">Aucune communication</p>
            ) : (
              <div className="space-y-3">
                {communications.map((comm: any) => (
                  <div
                    key={comm.id}
                    className="p-3 border rounded-md bg-gray-50"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline">{comm.type}</Badge>
                        <span className="text-sm text-gray-900">
                          {comm.destinataire}
                        </span>
                      </div>
                      <span className="text-xs text-gray-900">
                        {formatDateTime(comm.sent_at)}
                      </span>
                    </div>
                    {comm.sujet && (
                      <p className="font-medium text-sm mb-1">{comm.sujet}</p>
                    )}
                    <p className="text-sm text-white">{comm.contenu}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Paiements */}
        {payments.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Paiements</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {payments.map((payment: any) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between p-3 border rounded-md"
                  >
                    <div>
                      <p className="font-medium">
                        {formatCurrency(payment.montant)}
                      </p>
                      <p className="text-sm text-gray-900">
                        Statut: {payment.statut} •{" "}
                        {payment.date_facture && formatDate(payment.date_facture)}
                      </p>
                    </div>
                    <Badge
                      variant={
                        payment.statut === "PAYE"
                          ? "default"
                          : payment.statut === "EN_RETARD"
                          ? "destructive"
                          : "outline"
                      }
                    >
                      {payment.statut}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AuthenticatedLayout>
  )
}
