import { createClient } from "@/lib/supabase/server"
import { StopRelancesCheck } from "./types"

/**
 * Vérifie si les relances doivent s'arrêter pour un dossier
 */
export async function shouldStopRelances(
  dossierId: string
): Promise<StopRelancesCheck> {
  const supabase = await createClient()

  // 1. Vérifier les documents existants (rapport, PV, règlement direct)
  const { data: documents, error: docError } = await supabase
    .from("documents")
    .select("type, created_at")
    .eq("dossier_id", dossierId)
    .in("type", ["rapport_expert", "pv", "reglement_direct"])

  if (!docError && documents && documents.length > 0) {
    return {
      shouldStop: true,
      reason: "document_recu",
      documentType: documents[0].type,
      details: {
        documents_count: documents.length,
        document_types: documents.map((d) => d.type),
        first_document_date: documents[0].created_at,
      },
    }
  }

  // 2. Vérifier le statut du dossier
  const { data: dossier, error: dossierError } = await supabase
    .from("dossiers")
    .select("statut, date_rapport_recu")
    .eq("id", dossierId)
    .single()

  if (!dossierError && dossier) {
    // Si statut avancé (après EN_ATTENTE_EXPERT/RELANCE_EXPERT)
    const statutsAvances = [
      "RAPPORT_RECU",
      "EN_REPARATION",
      "FACTURE_ENVOYEE",
      "EN_ATTENTE_PAIEMENT",
      "PAYE",
    ]
    
    if (statutsAvances.includes(dossier.statut)) {
      return {
        shouldStop: true,
        reason: "statut_avance",
        details: {
          statut: dossier.statut,
        },
      }
    }

    // Si date_rapport_recu renseignée
    if (dossier.date_rapport_recu) {
      return {
        shouldStop: true,
        reason: "date_rapport_recu",
        details: {
          date_rapport_recu: dossier.date_rapport_recu,
        },
      }
    }
  }

  return { shouldStop: false }
}

/**
 * Arrête les relances pour un dossier et enregistre dans l'historique
 */
export async function stopRelancesForDossier(
  dossierId: string,
  reason: string,
  documentType?: string,
  documentId?: string
): Promise<void> {
  const supabase = await createClient()

  // Enregistrer dans l'historique
  await supabase.from("relance_history").insert({
    dossier_id: dossierId,
    relance_type: "auto_stop",
    type: "system",
    destinataire: "system",
    sujet: "Arrêt automatique des relances",
    contenu: `Raison: ${reason}${documentType ? ` - Type document: ${documentType}` : ""}`,
    statut: "annule",
    statut_details: {
      reason,
      document_type: documentType,
      document_id: documentId,
      stopped_at: new Date().toISOString(),
    },
    sent_at: new Date().toISOString(),
  })

  // Mettre à jour le dossier si nécessaire
  const { data: dossier } = await supabase
    .from("dossiers")
    .select("statut, date_rapport_recu")
    .eq("id", dossierId)
    .single()

  if (dossier && !dossier.date_rapport_recu) {
    const newStatut = 
      dossier.statut === "EN_ATTENTE_EXPERT" || dossier.statut === "RELANCE_EXPERT"
        ? "RAPPORT_RECU"
        : dossier.statut

    await supabase
      .from("dossiers")
      .update({
        date_rapport_recu: new Date().toISOString(),
        statut: newStatut,
        updated_at: new Date().toISOString(),
      })
      .eq("id", dossierId)
  }
}

/**
 * Calcule le nombre de jours depuis la dernière relance
 */
export function calculateDaysSinceLastRelance(dossier: {
  date_derniere_relance_expert: string | null
  date_entree: string
}): number {
  const dateReference = dossier.date_derniere_relance_expert
    ? new Date(dossier.date_derniere_relance_expert)
    : new Date(dossier.date_entree)
  
  const now = new Date()
  const diffTime = now.getTime() - dateReference.getTime()
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
  
  return diffDays
}
