import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { Resend } from "resend"
import { shouldStopRelances, stopRelancesForDossier, calculateDaysSinceLastRelance } from "@/lib/relance/utils"
import { getRelanceSettings, createEmptyResults, formatMessage } from "@/lib/relance/cron-helpers"
import { sendSMS } from "@/lib/sms/twilio-client"
import { createAutomationHandler, isAutomationAvailable } from "@/lib/expert/automation/site-handlers"
import { RelanceCronResults, RelanceSettings } from "@/lib/relance/types"
import { sanitizeErrorMessage } from "@/lib/security/credentials-masker"

// Configuration Vercel: durée maximale d'exécution de 60 secondes
export const maxDuration = 60

// Types pour les dossiers avec jointures
interface DossierWithRelations {
  id: string
  dossier_id: string
  statut: string
  date_derniere_relance_expert: string | null
  date_entree: string
  date_rapport_recu: string | null
  notifier_client: boolean
  numero_sinistre: string | null
  site_expert_id: string | null
  expert: string | null
  expert_email: string | null
  clients: {
    id: string
    nom: string
    telephone: string | null
    email: string | null
  } | null
  vehicules: {
    immatriculation: string | null
  } | null
  expert_sites: {
    id: string
    nom: string
    url_recherche: string
    type_auth: string
    credentials: any
    selectors: any
    actif: boolean
  } | null
}

export async function GET(request: Request) {
  // Vérification sécurité du cron
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = await createClient()
  const results = createEmptyResults()

  try {
    // Récupérer les settings
    const settings = await getRelanceSettings(supabase)

    // Récupérer les dossiers à relancer
    const { data: dossiersARelancer, error: fetchError } = await supabase
      .from("dossiers")
      .select(`
        id,
        dossier_id,
        statut,
        date_derniere_relance_expert,
        date_entree,
        date_rapport_recu,
        notifier_client,
        numero_sinistre,
        site_expert_id,
        expert,
        expert_email,
        clients (
          id,
          nom,
          telephone,
          email
        ),
        vehicules (
          immatriculation
        ),
        expert_sites (
          id,
          nom,
          url_recherche,
          type_auth,
          credentials,
          selectors,
          actif
        )
      `)
      .in("statut", ["EN_ATTENTE_EXPERT", "RELANCE_EXPERT"])
      .is("date_rapport_recu", null)

    if (fetchError) {
      console.error("[Cron] Error fetching dossiers:", sanitizeErrorMessage(fetchError))
      return NextResponse.json(
        { error: "Error fetching dossiers", details: sanitizeErrorMessage(fetchError) },
        { status: 500 }
      )
    }

    const dossiers = (dossiersARelancer || []) as DossierWithRelations[]

    for (const dossier of dossiers) {
      try {
        // ⚠️ VÉRIFICATION CRITIQUE : Arrêt si document reçu
        const stopCheck = await shouldStopRelances(dossier.id)
        if (stopCheck.shouldStop) {
          await stopRelancesForDossier(
            dossier.id,
            stopCheck.reason || "unknown",
            stopCheck.documentType
          )
          results.stopped++
          continue
        }

        // Calculer jours depuis dernière relance
        const joursDepuisRelance = calculateDaysSinceLastRelance({
          date_derniere_relance_expert: dossier.date_derniere_relance_expert,
          date_entree: dossier.date_entree,
        })

        const frequenceExpert = parseInt(settings.frequence_relance_expert_jours || "2")
        if (joursDepuisRelance < frequenceExpert) {
          results.skipped++
          continue
        }

        // RELANCE EXPERT
        await relanceExpert(dossier, settings, supabase, results)

        // RELANCE CLIENT
        await relanceClient(dossier, settings, supabase, results)

      } catch (dossierError: any) {
        console.error(`[Cron] Error processing dossier ${dossier.dossier_id}:`, sanitizeErrorMessage(dossierError))
        results.errors.push(`Dossier ${dossier.dossier_id}: ${sanitizeErrorMessage(dossierError)}`)
      }
    }

    return NextResponse.json({
      success: true,
      results,
      dossiers_traites: dossiers.length,
      timestamp: new Date().toISOString(),
    })

  } catch (error: any) {
    console.error("[Cron] Fatal error:", sanitizeErrorMessage(error))
    return NextResponse.json(
      { 
        success: false,
        error: sanitizeErrorMessage(error),
        results,
      },
      { status: 500 }
    )
  }
}

/**
 * Relance un expert (portail puis email en fallback)
 */
async function relanceExpert(
  dossier: DossierWithRelations,
  settings: RelanceSettings,
  supabase: any,
  results: RelanceCronResults
): Promise<void> {
  // 1. Essayer relance via portail si activée et site configuré
  if (
    settings.relance_expert_portail_enabled === "true" &&
    dossier.site_expert_id &&
    dossier.expert_sites &&
    isAutomationAvailable(dossier.expert_sites as any)
  ) {
    const portailSuccess = await relanceExpertViaPortail(dossier, settings, supabase)

    if (portailSuccess) {
      results.experts_portail.success++
      return // Succès portail, on s'arrête là
    } else {
      results.experts_portail.failed++
      // Continue vers email en fallback
    }
  }

  // 2. Relance par email (fallback ou méthode principale)
  if (dossier.expert_email) {
    await relanceExpertViaEmail(dossier, settings, supabase, results)
  }
}

/**
 * Relance expert via portail web
 */
async function relanceExpertViaPortail(
  dossier: DossierWithRelations,
  settings: RelanceSettings,
  supabase: any
): Promise<boolean> {
  if (!dossier.expert_sites) return false

  const automation = createAutomationHandler(dossier.expert_sites as any)

  try {
    const message = formatMessage(settings.modele_message_expert_portail, {
      dossier_id: dossier.dossier_id,
    })

    const result = await automation.executeRelance(
      dossier.numero_sinistre || dossier.dossier_id,
      dossier.vehicules?.immatriculation || "",
      message
    )

    // Enregistrer dans l'historique
    await supabase.from("relance_history").insert({
      dossier_id: dossier.id,
      relance_type: "expert_portail",
      type: "portail_expert",
      destinataire: dossier.expert_sites.nom,
      sujet: `Relance via portail - ${dossier.dossier_id}`,
      contenu: message,
      statut: result.success ? "envoye" : "echec",
      site_expert_id: dossier.site_expert_id,
      portail_action: result.action,
      portail_resultat: result,
      erreur_message: result.erreur || null,
      sent_at: new Date().toISOString(),
    })

    // Si rapport trouvé, arrêter les relances
    if (result.rapport_trouve && result.rapport_url) {
      await stopRelancesForDossier(
        dossier.id,
        "rapport_telecharge_portail",
        "rapport_expert"
      )
    }

    // Mettre à jour le dossier si succès
    if (result.success) {
      await supabase
        .from("dossiers")
        .update({
          statut: "RELANCE_EXPERT",
          date_derniere_relance_expert: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", dossier.id)
    }

    return result.success

  } catch (error: any) {
    console.error(`[Cron] Portail error for ${dossier.dossier_id}:`, sanitizeErrorMessage(error))
    
    // Log l'erreur dans l'historique
    await supabase.from("relance_history").insert({
      dossier_id: dossier.id,
      relance_type: "expert_portail",
      type: "portail_expert",
      destinataire: dossier.expert_sites?.nom || "unknown",
      statut: "echec",
      erreur_message: sanitizeErrorMessage(error),
      sent_at: new Date().toISOString(),
    })

    return false

  } finally {
    // Toujours nettoyer les ressources
    await automation.cleanup()
  }
}

/**
 * Relance expert via email
 */
async function relanceExpertViaEmail(
  dossier: DossierWithRelations,
  settings: RelanceSettings,
  supabase: any,
  results: RelanceCronResults
): Promise<void> {
  if (!dossier.expert_email) return

  const message = formatMessage(settings.modele_message_expert, {
    dossier_id: dossier.dossier_id,
  })

  try {
    // Vérifier que RESEND_API_KEY est configuré
    if (!process.env.RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY not configured")
    }

    const resend = new Resend(process.env.RESEND_API_KEY)

    const emailResult = await resend.emails.send({
      from: settings.email_expediteur,
      to: dossier.expert_email,
      subject: `Relance - Dossier ${dossier.dossier_id}`,
      text: message,
    })

    // Enregistrer dans l'historique
    await supabase.from("relance_history").insert({
      dossier_id: dossier.id,
      relance_type: "expert_email",
      type: "email",
      destinataire: dossier.expert_email,
      sujet: `Relance - Dossier ${dossier.dossier_id}`,
      contenu: message,
      statut: "envoye",
      resend_email_id: emailResult.data?.id || null,
      sent_at: new Date().toISOString(),
    })

    // Mettre à jour le dossier
    await supabase
      .from("dossiers")
      .update({
        statut: "RELANCE_EXPERT",
        date_derniere_relance_expert: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", dossier.id)

    results.experts_email.success++

  } catch (error: any) {
    console.error(`[Cron] Email error for ${dossier.dossier_id}:`, sanitizeErrorMessage(error))
    results.experts_email.failed++

    await supabase.from("relance_history").insert({
      dossier_id: dossier.id,
      relance_type: "expert_email",
      type: "email",
      destinataire: dossier.expert_email,
      sujet: `Relance - Dossier ${dossier.dossier_id}`,
      contenu: message,
      statut: "echec",
      erreur_message: sanitizeErrorMessage(error),
      sent_at: new Date().toISOString(),
    })
  }
}

/**
 * Relance un client (SMS et/ou email)
 */
async function relanceClient(
  dossier: DossierWithRelations,
  settings: RelanceSettings,
  supabase: any,
  results: RelanceCronResults
): Promise<void> {
  const client = dossier.clients
  if (!client) return

  // Vérifier préférences client
  const { data: preferences } = await supabase
    .from("client_preferences")
    .select("*")
    .eq("client_id", client.id)
    .single()

  const smsEnabled = preferences?.sms_enabled !== false
  const emailEnabled = preferences?.email_enabled !== false

  // RELANCE CLIENT PAR SMS
  if (
    settings.relance_client_sms_enabled === "true" &&
    settings.sms_enabled === "true" &&
    client.telephone &&
    smsEnabled
  ) {
    await relanceClientViaSMS(dossier, client, settings, supabase, results)
  }

  // RELANCE CLIENT PAR EMAIL (si notifier_client activé)
  if (dossier.notifier_client && client.email && emailEnabled) {
    await relanceClientViaEmail(dossier, client, settings, supabase, results)
  }
}

/**
 * Relance client par SMS
 */
async function relanceClientViaSMS(
  dossier: DossierWithRelations,
  client: NonNullable<DossierWithRelations["clients"]>,
  settings: RelanceSettings,
  supabase: any,
  results: RelanceCronResults
): Promise<void> {
  if (!client.telephone) return

  const joursAttente = calculateDaysSinceLastRelance({
    date_derniere_relance_expert: dossier.date_derniere_relance_expert,
    date_entree: dossier.date_entree,
  })

  const message = formatMessage(settings.modele_message_client_sms, {
    client_nom: client.nom || "Monsieur/Madame",
    dossier_id: dossier.dossier_id,
    jours_attente: joursAttente,
  })

  try {
    const smsResult = await sendSMS(client.telephone, message)

    // Enregistrer dans l'historique
    await supabase.from("relance_history").insert({
      dossier_id: dossier.id,
      relance_type: "client_sms",
      type: "sms",
      destinataire: client.telephone,
      contenu: message,
      statut: smsResult.success ? "envoye" : "echec",
      twilio_message_sid: smsResult.messageSid || null,
      erreur_message: smsResult.error || null,
      sent_at: new Date().toISOString(),
    })

    if (smsResult.success) {
      results.clients_sms.success++
    } else {
      results.clients_sms.failed++
    }

  } catch (error: any) {
    console.error(`[Cron] SMS error for ${dossier.dossier_id}:`, sanitizeErrorMessage(error))
    results.clients_sms.failed++

    await supabase.from("relance_history").insert({
      dossier_id: dossier.id,
      relance_type: "client_sms",
      type: "sms",
      destinataire: client.telephone,
      contenu: message,
      statut: "echec",
      erreur_message: sanitizeErrorMessage(error),
      sent_at: new Date().toISOString(),
    })
  }
}

/**
 * Relance client par email
 */
async function relanceClientViaEmail(
  dossier: DossierWithRelations,
  client: NonNullable<DossierWithRelations["clients"]>,
  settings: RelanceSettings,
  supabase: any,
  results: RelanceCronResults
): Promise<void> {
  if (!client.email) return

  const message = formatMessage(settings.modele_message_client, {
    dossier_id: dossier.dossier_id,
    client_nom: client.nom,
  })

  try {
    if (!process.env.RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY not configured")
    }

    const resend = new Resend(process.env.RESEND_API_KEY)

    const emailResult = await resend.emails.send({
      from: settings.email_expediteur,
      to: client.email,
      subject: `Mise à jour - Dossier ${dossier.dossier_id}`,
      text: message,
    })

    await supabase.from("relance_history").insert({
      dossier_id: dossier.id,
      relance_type: "client_email",
      type: "email",
      destinataire: client.email,
      sujet: `Mise à jour - Dossier ${dossier.dossier_id}`,
      contenu: message,
      statut: "envoye",
      resend_email_id: emailResult.data?.id || null,
      sent_at: new Date().toISOString(),
    })

    results.clients_email.success++

  } catch (error: any) {
    console.error(`[Cron] Client email error for ${dossier.dossier_id}:`, sanitizeErrorMessage(error))
    results.clients_email.failed++

    await supabase.from("relance_history").insert({
      dossier_id: dossier.id,
      relance_type: "client_email",
      type: "email",
      destinataire: client.email,
      sujet: `Mise à jour - Dossier ${dossier.dossier_id}`,
      contenu: message,
      statut: "echec",
      erreur_message: sanitizeErrorMessage(error),
      sent_at: new Date().toISOString(),
    })
  }
}
