import { SupabaseClient } from "@supabase/supabase-js"
import { RelanceSettings, RelanceCronResults } from "./types"

/**
 * Récupère les settings de relance depuis la base de données
 */
export async function getRelanceSettings(
  supabase: SupabaseClient
): Promise<RelanceSettings> {
  const { data: settings } = await supabase
    .from("settings")
    .select("key, value")
    .in("key", [
      "email_expediteur",
      "frequence_relance_expert_jours",
      "frequence_relance_client_jours",
      "modele_message_expert",
      "modele_message_expert_portail",
      "modele_message_client",
      "modele_message_client_sms",
      "sms_enabled",
      "relance_expert_portail_enabled",
      "relance_client_sms_enabled",
    ])

  const settingsMap: Record<string, string> = {}
  settings?.forEach((s: { key: string; value: string }) => {
    settingsMap[s.key] = s.value
  })

  return {
    email_expediteur: settingsMap["email_expediteur"] || "noreply@carrosserie.local",
    frequence_relance_expert_jours: settingsMap["frequence_relance_expert_jours"] || "2",
    frequence_relance_client_jours: settingsMap["frequence_relance_client_jours"] || "2",
    modele_message_expert: settingsMap["modele_message_expert"] || "Bonjour, nous relançons concernant le dossier {dossier_id}. Merci de nous faire parvenir le rapport d'expertise au plus vite.",
    modele_message_expert_portail: settingsMap["modele_message_expert_portail"] || "Bonjour, nous relançons concernant le dossier {dossier_id}. Merci de nous faire parvenir le rapport d'expertise au plus vite.",
    modele_message_client: settingsMap["modele_message_client"] || "Bonjour, nous avons relancé l'expert concernant votre dossier {dossier_id} aujourd'hui. Nous vous tiendrons informé dès réception du rapport.",
    modele_message_client_sms: settingsMap["modele_message_client_sms"] || "Bonjour {client_nom}, nous avons relancé l'expert concernant votre dossier {dossier_id} aujourd'hui. Nous vous tiendrons informé dès réception du rapport. Cordialement.",
    sms_enabled: settingsMap["sms_enabled"] || "false",
    relance_expert_portail_enabled: settingsMap["relance_expert_portail_enabled"] || "true",
    relance_client_sms_enabled: settingsMap["relance_client_sms_enabled"] || "true",
  }
}

/**
 * Crée un objet de résultats vide
 */
export function createEmptyResults(): RelanceCronResults {
  return {
    experts_portail: { success: 0, failed: 0 },
    experts_email: { success: 0, failed: 0 },
    clients_sms: { success: 0, failed: 0 },
    clients_email: { success: 0, failed: 0 },
    stopped: 0,
    skipped: 0,
    errors: [],
  }
}

/**
 * Formate un message avec les variables du dossier
 */
export function formatMessage(
  template: string,
  variables: {
    dossier_id?: string
    client_nom?: string
    jours_attente?: number
    expert_nom?: string
  }
): string {
  let message = template

  if (variables.dossier_id) {
    message = message.replace(/{dossier_id}/g, variables.dossier_id)
  }
  if (variables.client_nom) {
    message = message.replace(/{client_nom}/g, variables.client_nom)
  }
  if (variables.jours_attente !== undefined) {
    message = message.replace(/{jours_attente}/g, variables.jours_attente.toString())
  }
  if (variables.expert_nom) {
    message = message.replace(/{expert_nom}/g, variables.expert_nom)
  }

  return message
}
