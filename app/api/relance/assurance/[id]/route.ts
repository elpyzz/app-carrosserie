import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// GET - Récupérer une facture
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const supabase = await createClient()

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

    const { data: facture, error } = await supabase
      .from("factures_assurance")
      .select(`
        *,
        dossier:dossiers(id, dossier_id, clients(nom)),
        document:documents(id, nom_fichier, chemin_storage)
      `)
      .eq("id", id)
      .single()

    if (error || !facture) {
      return NextResponse.json(
        { success: false, error: "Facture non trouvée" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      facture,
    })

  } catch (error: any) {
    console.error("[API] GET facture error:", error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

// PUT - Modifier une facture
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const supabase = await createClient()

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

    const body = await request.json()
    const { 
      nom_assurance, 
      email_assurance, 
      telephone_assurance,
      montant, 
      numero_facture,
      notes 
    } = body

    // Vérifier que la facture existe
    const { data: existingFacture } = await supabase
      .from("factures_assurance")
      .select("id, prochaine_relance, email_assurance")
      .eq("id", id)
      .single()

    if (!existingFacture) {
      return NextResponse.json(
        { success: false, error: "Facture non trouvée" },
        { status: 404 }
      )
    }

    // Construire l'objet de mise à jour
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    }

    if (nom_assurance !== undefined) updateData.nom_assurance = nom_assurance
    if (email_assurance !== undefined) updateData.email_assurance = email_assurance
    if (telephone_assurance !== undefined) updateData.telephone_assurance = telephone_assurance
    if (montant !== undefined) updateData.montant = montant
    if (numero_facture !== undefined) updateData.numero_facture = numero_facture
    if (notes !== undefined) updateData.notes = notes

    // Si email ajouté et pas de prochaine relance, en créer une
    if (email_assurance && email_assurance.trim() && !existingFacture.prochaine_relance) {
      const prochaineRelance = new Date()
      prochaineRelance.setMonth(prochaineRelance.getMonth() + 2)
      updateData.prochaine_relance = prochaineRelance.toISOString()
    }

    // Si email supprimé, retirer la prochaine relance
    if (email_assurance === "" && existingFacture.email_assurance) {
      updateData.prochaine_relance = null
    }

    const { data: facture, error } = await supabase
      .from("factures_assurance")
      .update(updateData)
      .eq("id", id)
      .select()
      .single()

    if (error) {
      console.error("[API] Update facture error:", error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    // Log audit
    await supabase.from("audit_logs").insert({
      action: "FACTURE_ASSURANCE_UPDATED",
      entity_type: "factures_assurance",
      entity_id: id,
      user_id: user.id,
      details: updateData,
    })

    return NextResponse.json({
      success: true,
      facture,
    })

  } catch (error: any) {
    console.error("[API] PUT facture error:", error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

// DELETE - Supprimer (soft delete) une facture
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const supabase = await createClient()

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

    // Vérifier que la facture existe
    const { data: existingFacture } = await supabase
      .from("factures_assurance")
      .select("id, nom_assurance, numero_facture")
      .eq("id", id)
      .single()

    if (!existingFacture) {
      return NextResponse.json(
        { success: false, error: "Facture non trouvée" },
        { status: 404 }
      )
    }

    // Soft delete - mettre le statut à SUPPRIME
    const { error } = await supabase
      .from("factures_assurance")
      .update({ 
        statut: "SUPPRIME",
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)

    if (error) {
      console.error("[API] Delete facture error:", error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    // Log audit
    await supabase.from("audit_logs").insert({
      action: "FACTURE_ASSURANCE_DELETED",
      entity_type: "factures_assurance",
      entity_id: id,
      user_id: user.id,
      details: { 
        nom_assurance: existingFacture.nom_assurance,
        numero_facture: existingFacture.numero_facture,
      },
    })

    return NextResponse.json({
      success: true,
      message: "Facture supprimée",
    })

  } catch (error: any) {
    console.error("[API] DELETE facture error:", error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
