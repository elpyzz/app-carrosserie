import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

export async function GET(request: Request) {
  // Vérifier le header de sécurité (Vercel Cron)
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = await createClient()

  try {
    // Récupérer les settings
    const { data: settings } = await supabase
      .from("settings")
      .select("key, value")
      .in("key", [
        "email_expediteur",
        "frequence_relance_expert_jours",
        "modele_message_expert",
        "modele_message_client",
        "sms_enabled",
      ])

    const settingsMap: Record<string, string> = {}
    settings?.forEach((s: { key: string; value: string }) => {
      settingsMap[s.key] = s.value
    })

    const emailExpediteur = settingsMap["email_expediteur"] || "noreply@carrosserie.local"
    const frequenceJours = parseInt(settingsMap["frequence_relance_expert_jours"] || "3")
    const modeleExpert = settingsMap["modele_message_expert"] || "Bonjour, nous relançons concernant le dossier {dossier_id}."
    const modeleClient = settingsMap["modele_message_client"] || "Bonjour, nous avons relancé l'expert concernant votre dossier {dossier_id} aujourd'hui."

    // ============================================
    // RELANCES EXPERTS
    // ============================================
    const { data: dossiersARelancer } = await supabase
      .from("dossiers")
      .select("*, clients(*)")
      .in("statut", ["EN_ATTENTE_EXPERT", "RELANCE_EXPERT"])
      .is("date_rapport_recu", null)

    const dossiersRelances: any[] = []

    for (const dossier of dossiersARelancer || []) {
      const dateDerniereRelance = dossier.date_derniere_relance_expert
        ? new Date(dossier.date_derniere_relance_expert)
        : new Date(dossier.date_entree)
      const joursDepuisRelance = Math.floor(
        (Date.now() - dateDerniereRelance.getTime()) / (1000 * 60 * 60 * 24)
      )

      if (joursDepuisRelance >= frequenceJours && dossier.expert_email) {
        // Vérifier qu'il n'y a pas de document rapport_expert
        const { data: hasRapport } = await supabase
          .from("documents")
          .select("id")
          .eq("dossier_id", dossier.id)
          .eq("type", "rapport_expert")
          .limit(1)

        if (hasRapport && hasRapport.length > 0) {
          // Le rapport existe, mettre à jour le statut
          await supabase
            .from("dossiers")
            .update({
              statut: "RAPPORT_RECU",
              date_rapport_recu: new Date().toISOString(),
            })
            .eq("id", dossier.id)
          continue
        }

        // Envoyer email à l'expert
        const messageExpert = modeleExpert.replace("{dossier_id}", dossier.dossier_id)

        try {
          await resend.emails.send({
            from: emailExpediteur,
            to: dossier.expert_email,
            subject: `Relance - Dossier ${dossier.dossier_id}`,
            text: messageExpert,
          })

          // Enregistrer la communication
          await supabase.from("communications").insert({
            dossier_id: dossier.id,
            type: "relance_auto",
            destinataire: dossier.expert_email,
            sujet: `Relance - Dossier ${dossier.dossier_id}`,
            contenu: messageExpert,
            statut: "envoye",
          })

          // Mettre à jour le dossier
          await supabase
            .from("dossiers")
            .update({
              statut: "RELANCE_EXPERT",
              date_derniere_relance_expert: new Date().toISOString(),
            })
            .eq("id", dossier.id)

          dossiersRelances.push(dossier)

          // Notifier le client si activé
          if (dossier.notifier_client && dossier.clients?.email) {
            const messageClient = modeleClient.replace(
              "{dossier_id}",
              dossier.dossier_id
            )

            try {
              await resend.emails.send({
                from: emailExpediteur,
                to: dossier.clients.email,
                subject: `Mise à jour - Dossier ${dossier.dossier_id}`,
                text: messageClient,
              })

              await supabase.from("communications").insert({
                dossier_id: dossier.id,
                type: "email",
                destinataire: dossier.clients.email,
                sujet: `Mise à jour - Dossier ${dossier.dossier_id}`,
                contenu: messageClient,
                statut: "envoye",
              })
            } catch (err) {
              console.error("Error sending client notification:", err)
            }
          }
        } catch (err) {
          console.error(`Error sending email for dossier ${dossier.dossier_id}:`, err)
        }
      }
    }

    // ============================================
    // RELANCES IMPAYÉS
    // ============================================
    const { data: impayes } = await supabase
      .from("payments")
      .select("*, dossiers(*, clients(*))")
      .in("statut", ["EN_ATTENTE", "EN_RETARD"])

    const { data: modeleImpaye } = await supabase
      .from("settings")
      .select("value")
      .eq("key", "modele_message_impaye")
      .single()

    const modeleImpayeText =
      modeleImpaye?.value ||
      "Bonjour, votre facture {dossier_id} d'un montant de {montant}€ est en attente de paiement depuis {jours} jours."

    const { data: emailPaiements } = await supabase
      .from("settings")
      .select("value")
      .eq("key", "email_paiements")
      .single()

    const emailPaiementsValue = emailPaiements?.value || "paiements@carrosserie.local"

    const impayesRelances: any[] = []

    for (const payment of impayes || []) {
      if (!payment.date_echeance) continue

      const dateEcheance = new Date(payment.date_echeance)
      const joursDepuisEcheance = Math.floor(
        (Date.now() - dateEcheance.getTime()) / (1000 * 60 * 60 * 24)
      )

      // Relances à J+30, J+45, J+60
      const relanceNecessaire =
        (joursDepuisEcheance === 30 ||
          joursDepuisEcheance === 45 ||
          joursDepuisEcheance === 60) &&
        joursDepuisEcheance > 0

      if (relanceNecessaire) {
        const dossier = payment.dossiers
        const client = dossier?.clients

        if (client?.email) {
          const message = modeleImpayeText
            .replace("{dossier_id}", dossier?.dossier_id || "")
            .replace("{montant}", payment.montant.toString())
            .replace("{jours}", joursDepuisEcheance.toString())

          try {
            await resend.emails.send({
              from: emailPaiementsValue,
              to: client.email,
              subject: `Rappel - Facture ${dossier?.dossier_id}`,
              text: message,
            })

            // Enregistrer la communication
            await supabase.from("communications").insert({
              dossier_id: payment.dossier_id,
              type: "relance_auto",
              destinataire: client.email,
              sujet: `Rappel - Facture ${dossier?.dossier_id}`,
              contenu: message,
              statut: "envoye",
            })

            // Mettre à jour le payment
            await supabase
              .from("payments")
              .update({
                date_derniere_relance: new Date().toISOString(),
                nombre_relances: payment.nombre_relances + 1,
                statut: joursDepuisEcheance > 30 ? "EN_RETARD" : payment.statut,
              })
              .eq("id", payment.id)

            impayesRelances.push(payment)
          } catch (err) {
            console.error(`Error sending impaye email for payment ${payment.id}:`, err)
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      relances_experts: dossiersRelances.length,
      relances_impayes: impayesRelances.length,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error("Error in cron job:", error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
