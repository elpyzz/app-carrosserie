import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import AuthenticatedLayout from "@/components/layout/authenticated-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatCurrency, getDaysSince, formatDate } from "@/lib/utils"
import { 
  AlertCircle, 
  Clock, 
  DollarSign, 
  FileText, 
  CheckCircle2, 
  UserCheck, 
  Store, 
  Bell,
  TrendingUp,
  Search,
  ArrowRight,
  Activity
} from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

async function getDashboardData() {
  // Mock data if Supabase not configured
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return Promise.resolve({
      // KPIs Dossiers
      dossiersAttenteExpert: 8,
      dossiersRetard: 3,
      dossiersEnReparation: 12,
      dossiersFactureEnvoyee: 5,
      
      // KPIs Financiers
      impayes: 4,
      montantImpayes: 8500.00,
      montantEnAttente: 25000.00,
      montantTotalMois: 45000.00,
      
      // KPIs Experts
      recherchesExperts: 15,
      rapportsRecus: 8,
      rapportsEnAttente: 7,
      
      // KPIs Fournisseurs
      recherchesPieces: 23,
      piecesTrouvees: 18,
      piecesEnComparaison: 5,
      
      // KPIs Relances
      relancesAujourdhui: 3,
      relancesEnAttente: 6,
      relancesReussies: 12,
      
      // Actions à traiter
      aTraiter: [
        {
          id: "mock-1",
          type: "expert",
          dossier_id: "DOS-2024-001",
          client: "Dupont Jean",
          vehicule: "Renault Clio",
          action: "Relance expert nécessaire",
          jours: 5,
          priorite: "haute"
        },
        {
          id: "mock-2",
          type: "impaye",
          dossier_id: "DOS-2024-002",
          client: "Martin Sophie",
          vehicule: "BMW Série 3",
          action: "Facture impayée - 15 jours",
          montant: 2500.00,
          priorite: "haute"
        },
        {
          id: "mock-3",
          type: "assurance",
          dossier_id: "DOS-2024-003",
          client: "Bernard Pierre",
          vehicule: "Peugeot 308",
          action: "Validation assurance en attente",
          jours: 10,
          priorite: "moyenne"
        },
      ],
      
      // Activité récente
      activiteRecente: [
        {
          id: "act-1",
          type: "rapport_recu",
          dossier_id: "DOS-2024-004",
          description: "Rapport expert reçu",
          date: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: "act-2",
          type: "recherche_piece",
          dossier_id: "DOS-2024-005",
          description: "Recherche pièce effectuée",
          date: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: "act-3",
          type: "relance",
          dossier_id: "DOS-2024-001",
          description: "Relance expert envoyée",
          date: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
        },
      ]
    })
  }

  const supabase = await createClient()

  // Dossiers en attente expert
  const { data: dossiersAttenteExpert } = await supabase
    .from("dossiers")
    .select("*")
    .in("statut", ["EN_ATTENTE_EXPERT", "RELANCE_EXPERT"])

  // Dossiers > 15 jours sans rapport
  const { data: dossiersRetard } = await supabase
    .from("dossiers")
    .select("*")
    .in("statut", ["EN_ATTENTE_EXPERT", "RELANCE_EXPERT"])
    .is("date_rapport_recu", null)

  const dossiersRetardFiltres = dossiersRetard?.filter((d) => {
    const jours = getDaysSince(d.date_entree)
    return jours > 15
  })

  // Dossiers en réparation
  const { data: dossiersEnReparation } = await supabase
    .from("dossiers")
    .select("*")
    .eq("statut", "EN_REPARATION")

  // Dossiers facture envoyée
  const { data: dossiersFactureEnvoyee } = await supabase
    .from("dossiers")
    .select("*")
    .eq("statut", "FACTURE_ENVOYEE")

  // Impayés
  const { data: impayes } = await supabase
    .from("payments")
    .select("*, dossiers(*)")
    .in("statut", ["EN_ATTENTE", "EN_RETARD"])

  const montantImpayes = impayes?.reduce((sum, p) => sum + Number(p.montant), 0) || 0

  // Recherches experts
  const { data: recherchesExperts } = await supabase
    .from("expert_searches")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100)

  const rapportsRecus = recherchesExperts?.filter((r: any) => r.statut === "trouve").length || 0

  // Recherches fournisseurs
  const { data: recherchesPieces } = await supabase
    .from("piece_searches")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100)

  return {
    dossiersAttenteExpert: dossiersAttenteExpert?.length || 0,
    dossiersRetard: dossiersRetardFiltres?.length || 0,
    dossiersEnReparation: dossiersEnReparation?.length || 0,
    dossiersFactureEnvoyee: dossiersFactureEnvoyee?.length || 0,
    impayes: impayes?.length || 0,
    montantImpayes,
    recherchesExperts: recherchesExperts?.length || 0,
    rapportsRecus,
    recherchesPieces: recherchesPieces?.length || 0,
    aTraiter: [],
    activiteRecente: [],
  }
}

export default async function DashboardPage() {
  // #region agent log
  await fetch('http://127.0.0.1:7242/ingest/dd01c13f-3adb-44dd-ab15-9d28649f71ca',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/dashboard/page.tsx:187',message:'DashboardPage entry',data:{hasSupabase:!!process.env.NEXT_PUBLIC_SUPABASE_URL},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'G'})}).catch(()=>{});
  // #endregion

  // Allow access in mock mode
  if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    // #region agent log
    await fetch('http://127.0.0.1:7242/ingest/dd01c13f-3adb-44dd-ab15-9d28649f71ca',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/dashboard/page.tsx:190',message:'Before createClient',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H'})}).catch(()=>{});
    // #endregion
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    // #region agent log
    await fetch('http://127.0.0.1:7242/ingest/dd01c13f-3adb-44dd-ab15-9d28649f71ca',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/dashboard/page.tsx:197',message:'After getUser',data:{hasUser:!!user},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H'})}).catch(()=>{});
    // #endregion

    if (!user) {
      redirect("/login")
    }
  }

  // #region agent log
  await fetch('http://127.0.0.1:7242/ingest/dd01c13f-3adb-44dd-ab15-9d28649f71ca',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/dashboard/page.tsx:200',message:'Before getDashboardData',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'I'})}).catch(()=>{});
  // #endregion

  const data = await getDashboardData()

  // #region agent log
  await fetch('http://127.0.0.1:7242/ingest/dd01c13f-3adb-44dd-ab15-9d28649f71ca',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/dashboard/page.tsx:203',message:'Before rendering AuthenticatedLayout',data:{hasData:!!data},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'J'})}).catch(()=>{});
  // #endregion

  return (
    <AuthenticatedLayout>
      <div className="space-y-10">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <h1 className="page-title">
              Dashboard
            </h1>
            <p className="text-gray-900 text-lg">Vue d'ensemble de votre activité</p>
          </div>
          <div className="flex items-center space-x-2">
            <Badge className="bg-green-600 text-white border-0 px-4 py-1.5 shadow-md">
              <Activity className="h-3 w-3 mr-1.5 text-white" />
              Système opérationnel
            </Badge>
          </div>
        </div>

        {/* KPIs Principaux - Dossiers */}
        <div>
          <h2 className="section-title">
            <FileText className="h-5 w-5 icon-primary" />
            <span>Dossiers Sinistres</span>
          </h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card className="stat-card border-l-4 border-l-bordeaux-600 hover:border-l-bordeaux-500 transition-colors">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <CardTitle className="text-sm font-semibold text-primary uppercase tracking-wide">
                  En attente expert
                </CardTitle>
                <div className="bg-bordeaux-100 p-2.5 rounded-xl shadow-sm border border-bordeaux-200">
                  <Clock className="h-5 w-5 icon-primary" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="kpi-number kpi-number-bordeaux">
                  {data.dossiersAttenteExpert}
                </div>
                <p className="text-sm text-gray-900 mt-3 font-medium">Dossiers en cours</p>
              </CardContent>
            </Card>

            <Card className="stat-card border-l-4 border-l-orange-500 hover:border-l-orange-400 transition-colors">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <CardTitle className="text-sm font-semibold text-primary uppercase tracking-wide">
                  Retard > 15 jours
                </CardTitle>
                <div className="bg-orange-100 p-2.5 rounded-xl shadow-sm border border-orange-200">
                  <AlertCircle className="h-5 w-5 text-orange-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="kpi-number kpi-number-orange">
                  {data.dossiersRetard}
                </div>
                <p className="text-sm text-gray-900 mt-3 font-medium">Action requise</p>
              </CardContent>
            </Card>

            <Card className="stat-card border-l-4 border-l-blue-500 hover:border-l-blue-400 transition-colors">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <CardTitle className="text-sm font-semibold text-primary uppercase tracking-wide">
                  En réparation
                </CardTitle>
                <div className="bg-blue-100 p-2.5 rounded-xl shadow-sm border border-blue-200">
                  <Activity className="h-5 w-5 text-blue-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="kpi-number kpi-number-blue">
                  {data.dossiersEnReparation || 0}
                </div>
                <p className="text-sm text-gray-900 mt-3 font-medium">En atelier</p>
              </CardContent>
            </Card>

            <Card className="stat-card border-l-4 border-l-bordeaux-500 hover:border-l-bordeaux-400 transition-colors">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <CardTitle className="text-sm font-semibold text-primary uppercase tracking-wide">
                  Facture envoyée
                </CardTitle>
                <div className="bg-gradient-to-br from-bordeaux-500/20 to-bordeaux-600/20 p-2.5 rounded-xl shadow-sm border border-bordeaux-500/30 backdrop-blur-sm">
                  <FileText className="h-5 w-5 icon-primary" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="kpi-number kpi-number-bordeaux">
                  {data.dossiersFactureEnvoyee || 0}
                </div>
                <p className="text-sm text-gray-900 mt-3 font-medium">En attente paiement</p>
              </CardContent>
            </Card>
          </div>
        </div>


        {/* KPIs Experts et Fournisseurs */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Experts */}
          <Card className="card-gradient">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl font-semibold text-primary flex items-center space-x-2">
                  <UserCheck className="h-5 w-5 icon-primary" />
                  <span>Experts</span>
                </CardTitle>
                <Link href="/expert">
                  <Button variant="ghost" size="sm" className="text-bordeaux-600 hover:text-bordeaux-700 hover:bg-gray-50">
                    Voir tout <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-bordeaux-50 rounded-lg border border-bordeaux-200 hover:shadow-md hover:border-bordeaux-300 transition-all">
                  <div className="mini-kpi-number kpi-number-bordeaux">{data.recherchesExperts}</div>
                  <p className="text-sm text-gray-900 mt-2 font-medium">Recherches</p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200 hover:shadow-md hover:border-green-300 transition-all">
                  <div className="mini-kpi-number kpi-number-green">{data.rapportsRecus}</div>
                  <p className="text-sm text-gray-900 mt-2 font-medium">Rapports reçus</p>
                </div>
                <div className="text-center p-4 bg-amber-50 rounded-lg border border-amber-200 hover:shadow-md hover:border-amber-300 transition-all">
                  <div className="mini-kpi-number kpi-number-amber">{data.rapportsEnAttente || 0}</div>
                  <p className="text-sm text-gray-900 mt-2 font-medium">En attente</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Fournisseurs */}
          <Card className="card-gradient">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl font-semibold text-primary flex items-center space-x-2">
                  <Store className="h-5 w-5 icon-primary" />
                  <span>Fournisseurs</span>
                </CardTitle>
                <Link href="/fournisseur">
                  <Button variant="ghost" size="sm" className="text-bordeaux-600 hover:text-bordeaux-700 hover:bg-gray-50">
                    Voir tout <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-bordeaux-50 rounded-lg border border-bordeaux-200 hover:shadow-md hover:border-bordeaux-300 transition-all">
                  <div className="mini-kpi-number kpi-number-bordeaux">{data.recherchesPieces}</div>
                  <p className="text-sm text-gray-900 mt-2 font-medium">Recherches</p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200 hover:shadow-md hover:border-green-300 transition-all">
                  <div className="mini-kpi-number kpi-number-green">{data.piecesTrouvees || 0}</div>
                  <p className="text-sm text-gray-900 mt-2 font-medium">Pièces trouvées</p>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200 hover:shadow-md hover:border-blue-300 transition-all">
                  <div className="mini-kpi-number kpi-number-blue">{data.piecesEnComparaison || 0}</div>
                  <p className="text-sm text-gray-900 mt-2 font-medium">En comparaison</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions à traiter et Activité récente */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* À traiter aujourd'hui */}
          <Card className="card-gradient">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl font-semibold text-primary flex items-center space-x-2">
                  <Bell className="h-5 w-5 icon-primary" />
                  <span>À traiter aujourd'hui</span>
                </CardTitle>
                <Link href="/relance">
                  <Button variant="ghost" size="sm" className="text-bordeaux-600 hover:text-bordeaux-700 hover:bg-gray-50">
                    Voir tout <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {data.aTraiter.length === 0 ? (
                <div className="text-center py-12">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4 border border-green-200">
                    <CheckCircle2 className="h-8 w-8 text-green-600" />
                  </div>
                  <p className="text-gray-900 text-lg">Aucune action requise</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {data.aTraiter.map((item: any) => (
                    <div
                      key={item.id}
                      className="flex items-start justify-between p-4 bg-white border border-bordeaux-200 rounded-xl hover:border-bordeaux-300 hover:shadow-md transition-all"
                    >
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <Badge 
                            className={
                              item.priorite === "haute" 
                                ? "bg-bordeaux-100 text-bordeaux-800 border border-bordeaux-300"
                                : "bg-amber-100 text-amber-800 border border-amber-300"
                            }
                          >
                            {item.type === "expert" && <UserCheck className="h-3 w-3 mr-1" />}
                            {item.type === "impaye" && <DollarSign className="h-3 w-3 mr-1" />}
                            {item.type === "assurance" && <FileText className="h-3 w-3 mr-1" />}
                            {item.type}
                          </Badge>
                          {item.priorite === "haute" && (
                            <Badge className="bg-bordeaux-600 text-white border border-bordeaux-700">Urgent</Badge>
                          )}
                        </div>
                        <Link
                          href={`/dossiers/${item.dossier_id}`}
                          className="font-bold text-bordeaux-700 hover:text-bordeaux-800 hover:underline text-lg block"
                        >
                          {item.dossier_id}
                        </Link>
                        <p className="text-sm text-gray-900 mt-1">
                          {item.client} - {item.vehicule}
                        </p>
                        <p className="text-sm text-primary mt-2 font-medium">{item.action}</p>
                        {item.montant && (
                          <p className="text-sm font-bold text-bordeaux-600 mt-1">
                            {formatCurrency(item.montant)}
                          </p>
                        )}
                      </div>
                      <Link href={`/dossiers/${item.dossier_id}`}>
                        <Button size="sm" className="btn-primary">
                          Voir
                        </Button>
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Activité récente */}
          <Card className="card-gradient">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl font-semibold text-primary flex items-center space-x-2">
                <Activity className="h-5 w-5 icon-primary" />
                <span>Activité récente</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.activiteRecente.length === 0 ? (
                <div className="text-center py-12">
                  <Activity className="h-12 w-12 text-gray-900 mx-auto mb-4" />
                  <p className="text-gray-900">Aucune activité récente</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {data.activiteRecente.map((act: any) => (
                    <div
                      key={act.id}
                      className="flex items-start space-x-3 p-4 bg-white border border-bordeaux-200 rounded-lg hover:border-bordeaux-300 hover:shadow-sm transition-all"
                    >
                      <div className="mt-1">
                        {act.type === "rapport_recu" && (
                          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center border border-green-200">
                            <FileText className="h-4 w-4 text-green-600" />
                          </div>
                        )}
                        {act.type === "recherche_piece" && (
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center border border-blue-200">
                            <Search className="h-4 w-4 text-blue-600" />
                          </div>
                        )}
                        {act.type === "relance" && (
                          <div className="w-8 h-8 bg-bordeaux-100 rounded-full flex items-center justify-center border border-bordeaux-200">
                            <Bell className="h-4 w-4 icon-primary" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-primary">{act.description}</p>
                        <Link
                          href={`/dossiers/${act.dossier_id}`}
                          className="text-sm text-bordeaux-600 hover:text-bordeaux-700 hover:underline"
                        >
                          {act.dossier_id}
                        </Link>
                        <p className="text-xs text-gray-900 mt-1">
                          {(() => {
                            const date = new Date(act.date)
                            const now = new Date()
                            const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
                            if (diffHours < 1) return "Il y a moins d'une heure"
                            if (diffHours < 24) return `Il y a ${diffHours} heure${diffHours > 1 ? 's' : ''}`
                            return formatDate(act.date)
                          })()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AuthenticatedLayout>
  )
}
