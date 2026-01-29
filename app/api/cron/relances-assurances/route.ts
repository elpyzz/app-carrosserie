import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { Resend } from "resend"

export async function GET(request: Request) {
  // Vérification sécurité
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
        "relance_assurance_auto_enabled",
        "frequence_relance_assurance_mois",
        "modele_message_assurance",
        "assurance_email_expediteur",
        "email_expediteur", // Fallback
      ])

    const settingsMap: Record<string, string> = {}
    settings?.forEach((s) => {
      settingsMap[s.key] = s.value
    })

    if (settingsMap["relance_assurance_auto_enabled"] !== "true") {
      return NextResponse.json({
        success: true,
        message: "Relances automatiques désactivées",
        results: { skipped: true },
      })
    }

    const emailExpediteur = 
      settingsMap["assurance_email_expediteur"] || 
      settingsMap["email_expediteur"]

    if (!emailExpediteur) {
      return NextResponse.json({
        success: false,
        error: "Email expéditeur non configuré",
      })
    }

    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({
        success: false,
        error: "RESEND_API_KEY non configuré",
      })
    }

    // Récupérer les factures à relancer
    const now = new Date().toISOString()
    const { data: facturesARelancer, error } = await supabase
      .from("factures_assurance")
      .select(`
        *,
        dossier:dossiers(dossier_id, clients(nom))
      `)
      .in("statut", ["EN_ATTENTE", "RELANCE_EN_COURS"])
      .lte("prochaine_relance", now)
      .neq("email_assurance", "")
      .not("email_assurance", "is", null)

    if (error) {
      throw error
    }

    const results = {
      success: 0,
      failed: 0,
      skipped: 0,
      errors: [] as string[],
    }

    const resend = new Resend(process.env.RESEND_API_KEY)
    const messageTemplate = settingsMap["modele_message_assurance"] || 
      "Bonjour, nous relançons concernant la facture {numero_facture} d'un montant de {montant}€. Merci de procéder au règlement."
    const frequenceMois = parseInt(settingsMap["frequence_relance_assurance_mois"] || "2")

    // Relancer chaque facture
    for (const facture of facturesARelancer || []) {
      if (!facture.email_assurance) {
        results.skipped++
        continue
      }

      try {
        const message = formatMessage(messageTemplate, {
          numero_facture: facture.numero_facture || "N/A",
          montant: facture.montant.toString(),
          dossier_id: facture.dossier?.dossier_id || "N/A",
          nom_assurance: facture.nom_assurance,
        })

        const emailResult = await resend.emails.send({
          from: emailExpediteur,
          to: facture.email_assurance,
          subject: `Relance facture ${facture.numero_facture || ""} - ${facture.nom_assurance}`,
          text: message,
        })

        // Calculer la prochaine relance
        const prochaineRelance = new Date()
        prochaineRelance.setMonth(prochaineRelance.getMonth() + frequenceMois)

        // Mettre à jour la facture
        await supabase
          .from("factures_assurance")
          .update({
            statut: "RELANCE_EN_COURS",
            date_derniere_relance: new Date().toISOString(),
            nombre_relances: facture.nombre_relances + 1,
            prochaine_relance: prochaineRelance.toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", facture.id)

        // Log dans relance_history
        await supabase.from("relance_history").insert({
          dossier_id: facture.dossier_id,
          relance_type: "assurance_email",
          type: "email",
          destinataire: facture.email_assurance,
          sujet: `Relance facture ${facture.numero_facture || ""}`,
          contenu: message,
          statut: "envoye",
          resend_email_id: emailResult.data?.id || null,
          sent_at: new Date().toISOString(),
        })

        results.success++

      } catch (err: any) {
        results.failed++
        results.errors.push(`Facture ${facture.id}: ${err.message}`)

        // Log l'erreur
        await supabase.from("relance_history").insert({
          dossier_id: facture.dossier_id,
          relance_type: "assurance_email",
          type: "email",
          destinataire: facture.email_assurance,
          statut: "echec",
          erreur_message: err.message,
          sent_at: new Date().toISOString(),
        })
      }
    }

    return NextResponse.json({
      success: true,
      results,
      factures_traitees: facturesARelancer?.length || 0,
      timestamp: new Date().toISOString(),
    })

  } catch (error: any) {
    console.error("[Cron] Relances assurances error:", error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

function formatMessage(template: string, variables: Record<string, string>): string {
  let message = template
  Object.entries(variables).forEach(([key, value]) => {
    message = message.replace(new RegExp(`\\{${key}\\}`, "g"), value)
  })
  return message
}
