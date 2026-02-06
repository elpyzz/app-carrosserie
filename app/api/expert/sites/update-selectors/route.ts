import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// POST /api/expert/sites/update-selectors - Mettre à jour les sélecteurs d'un site
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Vérifier l'authentification
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
    const { site_nom, selectors } = body

    if (!site_nom || !selectors) {
      return NextResponse.json(
        { success: false, error: "site_nom et selectors sont requis" },
        { status: 400 }
      )
    }

    // Parser les sélecteurs si c'est une string
    let parsedSelectors: any
    try {
      parsedSelectors = typeof selectors === "string" 
        ? JSON.parse(selectors) 
        : selectors
    } catch {
      return NextResponse.json(
        { success: false, error: "Format JSON invalide pour selectors" },
        { status: 400 }
      )
    }

    // Trouver le site par nom
    const { data: sites, error: fetchError } = await supabase
      .from("expert_sites")
      .select("id, nom")
      .ilike("nom", `%${site_nom}%`)

    if (fetchError || !sites || sites.length === 0) {
      return NextResponse.json(
        { success: false, error: `Site "${site_nom}" non trouvé` },
        { status: 404 }
      )
    }

    // Si plusieurs sites trouvés, prendre le premier
    const site = sites[0]

    // Mettre à jour les sélecteurs
    const { data: updatedSite, error: updateError } = await supabase
      .from("expert_sites")
      .update({
        selectors: parsedSelectors,
        updated_at: new Date().toISOString(),
      })
      .eq("id", site.id)
      .select()
      .single()

    if (updateError) {
      console.error("[API] Error updating selectors:", updateError)
      return NextResponse.json(
        { success: false, error: updateError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `Sélecteurs mis à jour pour "${site.nom}"`,
      site: {
        id: updatedSite.id,
        nom: updatedSite.nom,
        selectors: updatedSite.selectors,
      },
    })

  } catch (error: any) {
    console.error("[API] POST /api/expert/sites/update-selectors error:", error)
    return NextResponse.json(
      { success: false, error: error.message || "Erreur lors de la mise à jour" },
      { status: 500 }
    )
  }
}
