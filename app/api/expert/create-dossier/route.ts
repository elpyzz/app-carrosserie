import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { z } from "zod"

// Schéma de validation côté serveur
const createDossierSchema = z.object({
  numero_sinistre: z
    .string()
    .min(1, "Le numéro de sinistre est requis")
    .max(100, "Numéro de sinistre trop long"),
  immatriculation: z
    .string()
    .min(1, "L'immatriculation est requise")
    .max(20, "Immatriculation trop longue")
    .transform((val) => val.toUpperCase().replace(/\s+/g, "")), // Normalisation
  site_expert_id: z
    .string()
    .uuid("ID de site expert invalide"),
  numero_client: z
    .string()
    .min(1, "Le numéro client est requis")
    .max(50, "Numéro client trop long"),
  client_nom: z
    .string()
    .max(200)
    .optional(),
  client_telephone: z
    .string()
    .max(20)
    .optional()
    .transform((val) => val ? val.replace(/\s+/g, "").replace(/\./g, "") : val),
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // 1. Vérifier l'authentification
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "Non authentifié" },
        { status: 401 }
      )
    }

    // 2. Parser et valider les données
    const body = await request.json()
    const validation = createDossierSchema.safeParse(body)

    if (!validation.success) {
      const errors = validation.error.errors.map((e) => e.message).join(", ")
      return NextResponse.json(
        { success: false, error: `Validation échouée: ${errors}` },
        { status: 400 }
      )
    }

    const data = validation.data

    // 3. Vérifier que le site expert existe et est actif
    const { data: siteExpert, error: siteError } = await supabase
      .from("expert_sites")
      .select("id, nom, actif")
      .eq("id", data.site_expert_id)
      .single()

    if (siteError || !siteExpert) {
      return NextResponse.json(
        { success: false, error: "Site expert non trouvé" },
        { status: 404 }
      )
    }

    if (!siteExpert.actif) {
      return NextResponse.json(
        { success: false, error: "Ce site expert est désactivé" },
        { status: 400 }
      )
    }

    // 4. Vérifier si un dossier avec ce numéro de sinistre existe déjà pour ce site
    const { data: existingDossier } = await supabase
      .from("dossiers")
      .select("id, dossier_id")
      .eq("site_expert_id", data.site_expert_id)
      .eq("numero_sinistre", data.numero_sinistre)
      .single()

    if (existingDossier) {
      return NextResponse.json(
        {
          success: false,
          error: `Un dossier existe déjà avec ce numéro de sinistre (${existingDossier.dossier_id})`,
          existing_dossier_id: existingDossier.id,
        },
        { status: 409 }
      )
    }

    // 5. Récupérer ou créer le client
    let clientId: string
    let clientCreated = false

    const { data: existingClient } = await supabase
      .from("clients")
      .select("id")
      .eq("numero_client", data.numero_client)
      .single()

    if (existingClient) {
      clientId = existingClient.id
    } else {
      // Créer un nouveau client
      const clientNom = data.client_nom || `Client ${data.numero_client}`
      const { data: newClient, error: clientError } = await supabase
        .from("clients")
        .insert({
          nom: clientNom,
          numero_client: data.numero_client,
          telephone: data.client_telephone || null,
        })
        .select("id")
        .single()

      if (clientError) {
        console.error("[API] Erreur création client:", clientError)
        return NextResponse.json(
          { success: false, error: "Erreur lors de la création du client" },
          { status: 500 }
        )
      }

      clientId = newClient.id
      clientCreated = true
    }

    // 6. Récupérer ou créer le véhicule
    let vehiculeId: string
    let vehiculeCreated = false

    const { data: existingVehicule } = await supabase
      .from("vehicules")
      .select("id")
      .eq("immatriculation", data.immatriculation)
      .single()

    if (existingVehicule) {
      vehiculeId = existingVehicule.id
    } else {
      const { data: newVehicule, error: vehiculeError } = await supabase
        .from("vehicules")
        .insert({
          immatriculation: data.immatriculation,
        })
        .select("id")
        .single()

      if (vehiculeError) {
        console.error("[API] Erreur création véhicule:", vehiculeError)
        return NextResponse.json(
          { success: false, error: "Erreur lors de la création du véhicule" },
          { status: 500 }
        )
      }

      vehiculeId = newVehicule.id
      vehiculeCreated = true
    }

    // 7. Générer le dossier_id via la fonction SQL
    const { data: dossierIdData, error: dossierIdError } = await supabase.rpc(
      "generate_dossier_id"
    )

    if (dossierIdError) {
      console.error("[API] Erreur génération dossier_id:", dossierIdError)
    }

    const dossierId = dossierIdData || `DOS-${new Date().getFullYear()}-${Date.now().toString().slice(-3)}`

    // 8. Créer le dossier
    const { data: newDossier, error: dossierError } = await supabase
      .from("dossiers")
      .insert({
        dossier_id: dossierId,
        client_id: clientId,
        vehicule_id: vehiculeId,
        numero_sinistre: data.numero_sinistre,
        site_expert_id: data.site_expert_id,
        expert: siteExpert.nom, // Nom du site expert comme champ "expert"
        statut: "EN_ATTENTE_EXPERT",
        created_by: user.id,
      })
      .select("id, dossier_id")
      .single()

    if (dossierError) {
      console.error("[API] Erreur création dossier:", dossierError)
      return NextResponse.json(
        { success: false, error: "Erreur lors de la création du dossier" },
        { status: 500 }
      )
    }

    // 9. Créer les checklist items par défaut
    const checklistItems = [
      { libelle: "Carte grise reçue", est_obligatoire: true, document_requis: "carte_grise" },
      { libelle: "Photos avant réparation", est_obligatoire: true, document_requis: "photos_avant" },
      { libelle: "Rapport expert reçu", est_obligatoire: true, document_requis: "rapport_expert" },
      { libelle: "Devis validé", est_obligatoire: false, document_requis: "devis" },
    ]

    const { error: checklistError } = await supabase.from("checklist_items").insert(
      checklistItems.map((item) => ({
        dossier_id: newDossier.id,
        ...item,
      }))
    )

    if (checklistError) {
      console.error("[API] Erreur création checklist:", checklistError)
      // Non bloquant - on continue
    }

    // 10. Log audit
    await supabase.from("audit_logs").insert({
      action: "DOSSIER_CREATED_FROM_EXPERT",
      entity_type: "dossiers",
      entity_id: newDossier.id,
      user_id: user.id,
      details: {
        dossier_id: newDossier.dossier_id,
        numero_sinistre: data.numero_sinistre,
        site_expert_id: data.site_expert_id,
        site_expert_nom: siteExpert.nom,
        client_created: clientCreated,
        vehicule_created: vehiculeCreated,
      },
    })

    // 11. Retourner le succès
    return NextResponse.json({
      success: true,
      dossier_id: newDossier.dossier_id,
      dossier_uuid: newDossier.id,
      details: {
        client_id: clientId,
        vehicule_id: vehiculeId,
        client_created: clientCreated,
        vehicule_created: vehiculeCreated,
      },
    })
  } catch (error: any) {
    console.error("[API] Erreur inattendue:", error)
    return NextResponse.json(
      { success: false, error: error.message || "Erreur serveur inattendue" },
      { status: 500 }
    )
  }
}
