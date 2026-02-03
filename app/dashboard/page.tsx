import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import AuthenticatedLayout from "@/components/layout/authenticated-layout"
import { formatCurrency } from "@/lib/utils"
import { 
  FolderOpen, 
  Clock, 
  AlertTriangle, 
  Wrench, 
  FileText,
  Building2,
  Bell,
  DollarSign,
  UserCheck,
  Package,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Calendar,
  Mail,
  MessageSquare,
  Globe,
} from "lucide-react"

// ========== INTERFACES ET TYPES ==========

interface DashboardData {
  // Dossiers
  totalDossiers: number
  repartitionStatuts: Record<string, number>
  dossiersEnAttenteExpert: number
  dossiersRetard15j: number
  dossiersEnReparation: number
  dossiersFactureEnvoyee: number
  
  // Factures assurances
  facturesTotal: number
  facturesEnAttente: number
  facturesRelanceEnCours: number
  facturesMontantTotal: number
  facturesProchainesRelances: number
  
  // Relances
  relancesAujourdhui: number
  relancesCetteSemaine: number
  relancesReussies: number
  relancesEchecs: number
  relancesTotal: number
  repartitionRelances: Record<string, number>
  
  // Experts & Fournisseurs
  expertsRecherchesTotal: number
  expertsRapportsRecus: number
  expertsEnAttente: number
  expertsCetteSemaine: number
  fournisseursRecherchesTotal: number
  fournisseursPiecesTrouvees: number
  fournisseursCetteSemaine: number
  
  // Financier
  montantFacturesAssurances: number
  montantPaiementsEnAttente: number
  montantPaiementsEnRetard: number
  montantTotalEnAttente: number
}

// Valeurs par défaut (pour mode mock ou erreurs)
const defaultDashboardData: DashboardData = {
  totalDossiers: 0,
  repartitionStatuts: {
    NOUVEAU: 0,
    EN_ATTENTE_EXPERT: 0,
    RELANCE_EXPERT: 0,
    RAPPORT_RECU: 0,
    EN_REPARATION: 0,
    FACTURE_ENVOYEE: 0,
    EN_ATTENTE_PAIEMENT: 0,
    PAYE: 0,
    LITIGE: 0,
  },
  dossiersEnAttenteExpert: 0,
  dossiersRetard15j: 0,
  dossiersEnReparation: 0,
  dossiersFactureEnvoyee: 0,
  facturesTotal: 0,
  facturesEnAttente: 0,
  facturesRelanceEnCours: 0,
  facturesMontantTotal: 0,
  facturesProchainesRelances: 0,
  relancesAujourdhui: 0,
  relancesCetteSemaine: 0,
  relancesReussies: 0,
  relancesEchecs: 0,
  relancesTotal: 0,
  repartitionRelances: {},
  expertsRecherchesTotal: 0,
  expertsRapportsRecus: 0,
  expertsEnAttente: 0,
  expertsCetteSemaine: 0,
  fournisseursRecherchesTotal: 0,
  fournisseursPiecesTrouvees: 0,
  fournisseursCetteSemaine: 0,
  montantFacturesAssurances: 0,
  montantPaiementsEnAttente: 0,
  montantPaiementsEnRetard: 0,
  montantTotalEnAttente: 0,
}

// ========== FONCTIONS UTILITAIRES ==========

/**
 * Calcule le début de la semaine (lundi à 00:00:00)
 * CORRECTION: En France, la semaine commence le lundi, pas le dimanche
 */
function getDebutSemaine(): Date {
  const maintenant = new Date()
  const jour = maintenant.getDay()
  // getDay() retourne 0 pour dimanche, 1 pour lundi, etc.
  // On veut le lundi, donc on calcule la différence
  const diff = jour === 0 ? 6 : jour - 1 // Si dimanche (0), on recule de 6 jours
  const lundi = new Date(maintenant)
  lundi.setDate(maintenant.getDate() - diff)
  lundi.setHours(0, 0, 0, 0)
  return lundi
}

/**
 * Calcule le début d'aujourd'hui (00:00:00)
 */
function getDebutAujourdhui(): Date {
  const aujourdhui = new Date()
  aujourdhui.setHours(0, 0, 0, 0)
  return aujourdhui
}

/**
 * Calcule la date dans X jours
 */
function getDateDansXJours(jours: number): Date {
  const date = new Date()
  date.setDate(date.getDate() + jours)
  date.setHours(23, 59, 59, 999)
  return date
}

/**
 * Convertit une valeur en nombre de manière sécurisée
 */
function toNumber(value: any): number {
  if (value === null || value === undefined) return 0
  const num = Number(value)
  return isNaN(num) ? 0 : num
}

// ========== FONCTION GET DASHBOARD DATA ==========

async function getDashboardData(): Promise<DashboardData> {
  // Mode mock si Supabase non configuré
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.log("[Dashboard] Mode mock activé")
    return getMockDashboardData()
  }

  const supabase = await createClient()
  const data: DashboardData = { ...defaultDashboardData }

  // Dates de référence
  const debutSemaine = getDebutSemaine()
  const debutAujourdhui = getDebutAujourdhui()
  const dans7Jours = getDateDansXJours(7)
  const il15Jours = new Date()
  il15Jours.setDate(il15Jours.getDate() - 15)

  // ========== DOSSIERS ==========
  try {
    const { data: dossiers, error } = await supabase
      .from("dossiers")
      .select("statut, created_at")

    if (!error && dossiers) {
      data.totalDossiers = dossiers.length

      // Répartition par statut
      dossiers.forEach((d: any) => {
        const statut = d.statut as string
        if (data.repartitionStatuts[statut] !== undefined) {
          data.repartitionStatuts[statut]++
        }
      })

      // KPIs spécifiques
      data.dossiersEnAttenteExpert = data.repartitionStatuts["EN_ATTENTE_EXPERT"] || 0
      data.dossiersEnReparation = data.repartitionStatuts["EN_REPARATION"] || 0
      data.dossiersFactureEnvoyee = data.repartitionStatuts["FACTURE_ENVOYEE"] || 0

      // Dossiers en retard (>15 jours en attente expert)
      data.dossiersRetard15j = dossiers.filter((d: any) => {
        if (d.statut !== "EN_ATTENTE_EXPERT") return false
        const dateCreation = new Date(d.created_at)
        return dateCreation < il15Jours
      }).length
    }
  } catch (error) {
    console.error("[Dashboard] Erreur dossiers:", error)
  }

  // ========== FACTURES ASSURANCES ==========
  try {
    const { data: factures, error } = await supabase
      .from("factures_assurance")
      .select("statut, montant, prochaine_relance")
      .neq("statut", "SUPPRIME")

    if (!error && factures) {
      data.facturesTotal = factures.length
      data.facturesEnAttente = factures.filter((f: any) => f.statut === "EN_ATTENTE").length
      data.facturesRelanceEnCours = factures.filter((f: any) => f.statut === "RELANCE_EN_COURS").length
      data.facturesMontantTotal = factures.reduce((sum: number, f: any) => sum + toNumber(f.montant), 0)

      // Prochaines relances (dans les 7 prochains jours)
      data.facturesProchainesRelances = factures.filter((f: any) => {
        if (!f.prochaine_relance) return false
        const dateRelance = new Date(f.prochaine_relance)
        return dateRelance >= debutAujourdhui && dateRelance <= dans7Jours
      }).length
    }
  } catch (error) {
    // Table peut ne pas exister si migration pas encore appliquée
    console.warn("[Dashboard] Factures assurances non disponibles:", error)
  }

  // ========== RELANCES ==========
  try {
    const { data: relances, error } = await supabase
      .from("relance_history")
      .select("sent_at, statut, relance_type")

    if (!error && relances) {
      data.relancesTotal = relances.length

      // Aujourd'hui
      data.relancesAujourdhui = relances.filter((r: any) => {
        const date = new Date(r.sent_at)
        return date >= debutAujourdhui
      }).length

      // Cette semaine
      data.relancesCetteSemaine = relances.filter((r: any) => {
        const date = new Date(r.sent_at)
        return date >= debutSemaine
      }).length

      // Par statut
      data.relancesReussies = relances.filter((r: any) =>
        r.statut === "envoye" || r.statut === "delivre"
      ).length
      data.relancesEchecs = relances.filter((r: any) => r.statut === "echec").length

      // Répartition par type
      relances.forEach((r: any) => {
        const type = r.relance_type as string
        data.repartitionRelances[type] = (data.repartitionRelances[type] || 0) + 1
      })
    }
  } catch (error) {
    console.warn("[Dashboard] Relances non disponibles:", error)
  }

  // ========== EXPERTS ==========
  try {
    const { data: expertSearches, error } = await supabase
      .from("expert_searches")
      .select("statut, created_at")

    if (!error && expertSearches) {
      data.expertsRecherchesTotal = expertSearches.length
      data.expertsRapportsRecus = expertSearches.filter((e: any) => e.statut === "trouve").length
      data.expertsEnAttente = expertSearches.filter((e: any) => e.statut !== "trouve").length
      data.expertsCetteSemaine = expertSearches.filter((e: any) => {
        const date = new Date(e.created_at)
        return date >= debutSemaine
      }).length
    }
  } catch (error) {
    console.warn("[Dashboard] Expert searches non disponibles:", error)
  }

  // ========== FOURNISSEURS ==========
  try {
    const { data: pieceSearches, error } = await supabase
      .from("piece_searches")
      .select("disponible, created_at")

    if (!error && pieceSearches) {
      data.fournisseursRecherchesTotal = pieceSearches.length
      data.fournisseursPiecesTrouvees = pieceSearches.filter((p: any) => p.disponible === true).length
      data.fournisseursCetteSemaine = pieceSearches.filter((p: any) => {
        const date = new Date(p.created_at)
        return date >= debutSemaine
      }).length
    }
  } catch (error) {
    console.warn("[Dashboard] Piece searches non disponibles:", error)
  }

  // ========== FINANCIER (Paiements) ==========
  try {
    const { data: paiements, error } = await supabase
      .from("payments")
      .select("statut, montant")

    if (!error && paiements) {
      data.montantPaiementsEnAttente = paiements
        .filter((p: any) => p.statut === "EN_ATTENTE")
        .reduce((sum: number, p: any) => sum + toNumber(p.montant), 0)

      data.montantPaiementsEnRetard = paiements
        .filter((p: any) => p.statut === "EN_RETARD")
        .reduce((sum: number, p: any) => sum + toNumber(p.montant), 0)
    }
  } catch (error) {
    // Table payments peut ne pas exister
    console.warn("[Dashboard] Paiements non disponibles:", error)
  }

  // Calcul du montant des factures assurances (déjà calculé)
  data.montantFacturesAssurances = data.facturesMontantTotal

  // Total en attente = factures assurances + paiements en attente
  data.montantTotalEnAttente = data.montantFacturesAssurances + data.montantPaiementsEnAttente

  return data
}

/**
 * Données mock pour le mode démo
 */
function getMockDashboardData(): DashboardData {
  return {
    totalDossiers: 156,
    repartitionStatuts: {
      NOUVEAU: 12,
      EN_ATTENTE_EXPERT: 28,
      RELANCE_EXPERT: 8,
      RAPPORT_RECU: 15,
      EN_REPARATION: 35,
      FACTURE_ENVOYEE: 22,
      EN_ATTENTE_PAIEMENT: 18,
      PAYE: 14,
      LITIGE: 4,
    },
    dossiersEnAttenteExpert: 28,
    dossiersRetard15j: 5,
    dossiersEnReparation: 35,
    dossiersFactureEnvoyee: 22,
    facturesTotal: 45,
    facturesEnAttente: 30,
    facturesRelanceEnCours: 15,
    facturesMontantTotal: 125680.50,
    facturesProchainesRelances: 8,
    relancesAujourdhui: 12,
    relancesCetteSemaine: 47,
    relancesReussies: 42,
    relancesEchecs: 5,
    relancesTotal: 234,
    repartitionRelances: {
      expert_portail: 45,
      expert_email: 78,
      client_sms: 56,
      client_email: 40,
      assurance_email: 15,
    },
    expertsRecherchesTotal: 89,
    expertsRapportsRecus: 67,
    expertsEnAttente: 22,
    expertsCetteSemaine: 15,
    fournisseursRecherchesTotal: 124,
    fournisseursPiecesTrouvees: 98,
    fournisseursCetteSemaine: 23,
    montantFacturesAssurances: 125680.50,
    montantPaiementsEnAttente: 45230.00,
    montantPaiementsEnRetard: 12500.00,
    montantTotalEnAttente: 170910.50,
  }
}

// ========== COMPOSANTS AUXILIAIRES ==========

interface DashboardCardProps {
  title: string
  value: string | number
  icon: React.ReactNode
  color: "blue" | "green" | "amber" | "red" | "gray" | "purple" | "indigo"
  isAmount?: boolean
  highlight?: boolean
}

function DashboardCard({ title, value, icon, color, isAmount, highlight }: DashboardCardProps) {
  const colorClasses = {
    blue: "bg-blue-50 text-blue-600 border-blue-200",
    green: "bg-green-50 text-green-600 border-green-200",
    amber: "bg-amber-50 text-amber-600 border-amber-200",
    red: "bg-red-50 text-red-600 border-red-200",
    gray: "bg-gray-50 text-gray-600 border-gray-200",
    purple: "bg-purple-50 text-purple-600 border-purple-200",
    indigo: "bg-indigo-50 text-indigo-600 border-indigo-200",
  }

  const iconColorClasses = {
    blue: "text-blue-500",
    green: "text-green-500",
    amber: "text-amber-500",
    red: "text-red-500",
    gray: "text-gray-500",
    purple: "text-purple-500",
    indigo: "text-indigo-500",
  }

  return (
    <div className={`rounded-lg border p-4 ${highlight ? "ring-2 ring-bordeaux-500" : ""} ${colorClasses[color]}`}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{title}</span>
        <span className={iconColorClasses[color]}>{icon}</span>
      </div>
      <div className={`mt-2 text-2xl font-bold ${isAmount ? "text-lg" : ""}`}>
        {value}
      </div>
    </div>
  )
}

interface StatItemProps {
  label: string
  value: string | number
  color?: "blue" | "green" | "amber" | "red" | "indigo"
}

function StatItem({ label, value, color }: StatItemProps) {
  const colorClass = color ? {
    blue: "text-blue-600",
    green: "text-green-600",
    amber: "text-amber-600",
    red: "text-red-600",
    indigo: "text-indigo-600",
  }[color] : "text-gray-900"

  return (
    <div className="p-2 bg-gray-50 rounded">
      <div className={`text-lg font-bold ${colorClass}`}>{value}</div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
  )
}

// ========== FONCTIONS DE FORMATAGE ==========

function formatStatutLabel(statut: string): string {
  const labels: Record<string, string> = {
    NOUVEAU: "Nouveau",
    EN_ATTENTE_EXPERT: "Attente exp.",
    RELANCE_EXPERT: "Relance exp.",
    RAPPORT_RECU: "Rapport reçu",
    EN_REPARATION: "Réparation",
    FACTURE_ENVOYEE: "Facture env.",
    EN_ATTENTE_PAIEMENT: "Attente paie.",
    PAYE: "Payé",
    LITIGE: "Litige",
  }
  return labels[statut] || statut
}

function formatRelanceTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    expert_portail: "Expert portail",
    expert_email: "Expert email",
    client_sms: "Client SMS",
    client_email: "Client email",
    assurance_email: "Assurance",
    auto_stop: "Arrêt auto",
  }
  return labels[type] || type
}

function getRelanceTypeIcon(type: string): React.ReactNode {
  const icons: Record<string, React.ReactNode> = {
    expert_portail: <Globe className="h-4 w-4 text-indigo-500" />,
    expert_email: <Mail className="h-4 w-4 text-blue-500" />,
    client_sms: <MessageSquare className="h-4 w-4 text-green-500" />,
    client_email: <Mail className="h-4 w-4 text-cyan-500" />,
    assurance_email: <Building2 className="h-4 w-4 text-amber-500" />,
    auto_stop: <XCircle className="h-4 w-4 text-red-500" />,
  }
  return icons[type] || <Bell className="h-4 w-4 text-gray-500" />
}

// ========== COMPOSANT PRINCIPAL ==========

export default async function DashboardPage() {
  // Allow access in mock mode
  if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    try {
      const supabase = await createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        redirect("/login")
      }
    } catch (error: any) {
      // Error handling
    }
  }
  
  const data = await getDashboardData()

  return (
    <AuthenticatedLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="page-title">Tableau de bord</h1>
          <p className="text-gray-600">Vue d'ensemble de votre activité</p>
        </div>

        {/* ========== SECTION DOSSIERS ========== */}
        <section>
          <h2 className="section-title flex items-center gap-2 mb-4">
            <FolderOpen className="h-5 w-5 text-bordeaux-500" />
            <span>Dossiers Sinistres</span>
            <span className="ml-2 text-sm font-normal text-gray-500">
              ({data.totalDossiers} total)
            </span>
          </h2>

          {/* KPIs principaux */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
            <DashboardCard
              title="En attente expert"
              value={data.dossiersEnAttenteExpert}
              icon={<Clock className="h-5 w-5" />}
              color="blue"
            />
            <DashboardCard
              title="Retard > 15 jours"
              value={data.dossiersRetard15j}
              icon={<AlertTriangle className="h-5 w-5" />}
              color="red"
            />
            <DashboardCard
              title="En réparation"
              value={data.dossiersEnReparation}
              icon={<Wrench className="h-5 w-5" />}
              color="amber"
            />
            <DashboardCard
              title="Facture envoyée"
              value={data.dossiersFactureEnvoyee}
              icon={<FileText className="h-5 w-5" />}
              color="green"
            />
          </div>

          {/* Répartition par statut */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Répartition par statut</h3>
            <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-2">
              {Object.entries(data.repartitionStatuts).map(([statut, count]) => (
                <div key={statut} className="text-center p-2 bg-gray-50 rounded">
                  <div className="text-lg font-bold text-gray-900">{count}</div>
                  <div className="text-xs text-gray-500 truncate" title={statut}>
                    {formatStatutLabel(statut)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ========== SECTION FACTURES ASSURANCES ========== */}
        <section>
          <h2 className="section-title flex items-center gap-2 mb-4">
            <Building2 className="h-5 w-5 text-bordeaux-500" />
            <span>Factures Assurances</span>
          </h2>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <DashboardCard
              title="Total impayées"
              value={data.facturesTotal}
              icon={<FileText className="h-5 w-5" />}
              color="gray"
            />
            <DashboardCard
              title="En attente"
              value={data.facturesEnAttente}
              icon={<Clock className="h-5 w-5" />}
              color="blue"
            />
            <DashboardCard
              title="Relance en cours"
              value={data.facturesRelanceEnCours}
              icon={<Bell className="h-5 w-5" />}
              color="amber"
            />
            <DashboardCard
              title="Montant total"
              value={formatCurrency(data.facturesMontantTotal)}
              icon={<DollarSign className="h-5 w-5" />}
              color="green"
              isAmount
            />
            <DashboardCard
              title="Relances à venir (7j)"
              value={data.facturesProchainesRelances}
              icon={<Calendar className="h-5 w-5" />}
              color="purple"
            />
          </div>
        </section>

        {/* ========== SECTION RELANCES ========== */}
        <section>
          <h2 className="section-title flex items-center gap-2 mb-4">
            <Bell className="h-5 w-5 text-bordeaux-500" />
            <span>Relances</span>
            <span className="ml-2 text-sm font-normal text-gray-500">
              ({data.relancesTotal} total)
            </span>
          </h2>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5 mb-6">
            <DashboardCard
              title="Aujourd'hui"
              value={data.relancesAujourdhui}
              icon={<Calendar className="h-5 w-5" />}
              color="blue"
            />
            <DashboardCard
              title="Cette semaine"
              value={data.relancesCetteSemaine}
              icon={<TrendingUp className="h-5 w-5" />}
              color="indigo"
            />
            <DashboardCard
              title="Réussies"
              value={data.relancesReussies}
              icon={<CheckCircle2 className="h-5 w-5" />}
              color="green"
            />
            <DashboardCard
              title="Échecs"
              value={data.relancesEchecs}
              icon={<XCircle className="h-5 w-5" />}
              color="red"
            />
            <DashboardCard
              title="Total"
              value={data.relancesTotal}
              icon={<Bell className="h-5 w-5" />}
              color="gray"
            />
          </div>

          {/* Répartition par type */}
          {Object.keys(data.repartitionRelances).length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Répartition par type</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                {Object.entries(data.repartitionRelances).map(([type, count]) => (
                  <div key={type} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                    {getRelanceTypeIcon(type)}
                    <div>
                      <div className="text-sm font-bold text-gray-900">{count}</div>
                      <div className="text-xs text-gray-500">{formatRelanceTypeLabel(type)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* ========== SECTION EXPERTS & FOURNISSEURS ========== */}
        <section>
          <h2 className="section-title flex items-center gap-2 mb-4">
            <UserCheck className="h-5 w-5 text-bordeaux-500" />
            <span>Experts & Fournisseurs</span>
          </h2>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Experts */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                <UserCheck className="h-4 w-4" />
                Recherches Experts
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <StatItem label="Total" value={data.expertsRecherchesTotal} />
                <StatItem label="Rapports reçus" value={data.expertsRapportsRecus} color="green" />
                <StatItem label="En attente" value={data.expertsEnAttente} color="amber" />
                <StatItem label="Cette semaine" value={data.expertsCetteSemaine} color="blue" />
              </div>
            </div>

            {/* Fournisseurs */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                <Package className="h-4 w-4" />
                Recherches Pièces
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <StatItem label="Total" value={data.fournisseursRecherchesTotal} />
                <StatItem label="Pièces trouvées" value={data.fournisseursPiecesTrouvees} color="green" />
                <StatItem label="Cette semaine" value={data.fournisseursCetteSemaine} color="blue" />
                <StatItem 
                  label="Taux de succès" 
                  value={`${data.fournisseursRecherchesTotal > 0 ? Math.round((data.fournisseursPiecesTrouvees / data.fournisseursRecherchesTotal) * 100) : 0}%`} 
                  color="indigo" 
                />
              </div>
            </div>
          </div>
        </section>

        {/* ========== SECTION FINANCIER ========== */}
        <section>
          <h2 className="section-title flex items-center gap-2 mb-4">
            <DollarSign className="h-5 w-5 text-bordeaux-500" />
            <span>Financier</span>
          </h2>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <DashboardCard
              title="Factures assurances"
              value={formatCurrency(data.montantFacturesAssurances)}
              icon={<Building2 className="h-5 w-5" />}
              color="blue"
              isAmount
            />
            <DashboardCard
              title="Paiements en attente"
              value={formatCurrency(data.montantPaiementsEnAttente)}
              icon={<Clock className="h-5 w-5" />}
              color="amber"
              isAmount
            />
            <DashboardCard
              title="Paiements en retard"
              value={formatCurrency(data.montantPaiementsEnRetard)}
              icon={<AlertTriangle className="h-5 w-5" />}
              color="red"
              isAmount
            />
            <DashboardCard
              title="Total en attente"
              value={formatCurrency(data.montantTotalEnAttente)}
              icon={<DollarSign className="h-5 w-5" />}
              color="purple"
              isAmount
              highlight
            />
          </div>
        </section>
      </div>
    </AuthenticatedLayout>
  )
}
