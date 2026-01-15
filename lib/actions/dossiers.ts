"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function createPayment(dossierId: string, montant: number) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Non authentifié" }
  }

  // Récupérer le dossier pour la date de facture
  const { data: dossier } = await supabase
    .from("dossiers")
    .select("date_facture_envoyee")
    .eq("id", dossierId)
    .single()

  const dateFacture = dossier?.date_facture_envoyee || new Date().toISOString()
  const dateEcheance = new Date(dateFacture)
  dateEcheance.setDate(dateEcheance.getDate() + 30) // 30 jours après facture

  const { data: payment, error } = await supabase
    .from("payments")
    .insert({
      dossier_id: dossierId,
      montant,
      date_facture: dateFacture,
      date_echeance: dateEcheance.toISOString(),
      statut: "EN_ATTENTE",
    })
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  // Log audit
  await supabase.from("audit_logs").insert({
    action: "PAYMENT_CREATED",
    entity_type: "payments",
    entity_id: payment.id,
    user_id: user.id,
    details: { montant, dossier_id: dossierId },
  })

  revalidatePath(`/dossiers/${dossierId}`)
  revalidatePath("/impayes")

  return { data: payment }
}

export async function updateChecklistItem(
  itemId: string,
  checked: boolean,
  dossierId: string
) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Non authentifié" }
  }

  const { error } = await supabase
    .from("checklist_items")
    .update({
      est_coche: checked,
      checked_by: checked ? user.id : null,
      checked_at: checked ? new Date().toISOString() : null,
    })
    .eq("id", itemId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/dossiers/${dossierId}`)

  return { success: true }
}
