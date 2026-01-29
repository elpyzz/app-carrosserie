import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// Type pour le contexte de route Next.js 15
type RouteContext = {
  params: Promise<{ id: string }>
}

// GET /api/expert/sites/[id] - Récupérer un site expert
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params
    const supabase = await createClient()

    const { data: site, error } = await supabase
      .from("expert_sites")
      .select("*")
      .eq("id", id)
      .single()

    if (error || !site) {
      return NextResponse.json(
        { success: false, error: "Site non trouvé" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      site,
    })

  } catch (error: any) {
    console.error("[API] GET /api/expert/sites/[id] error:", error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

// PUT /api/expert/sites/[id] - Modifier un site expert
export async function PUT(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params
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
    const { nom, url_recherche, type_auth, credentials, selectors, actif } = body

    // Vérifier que le site existe
    const { data: existingSite, error: fetchError } = await supabase
      .from("expert_sites")
      .select("id, nom")
      .eq("id", id)
      .single()

    if (fetchError || !existingSite) {
      return NextResponse.json(
        { success: false, error: "Site non trouvé" },
        { status: 404 }
      )
    }

    // Valider l'URL si fournie
    if (url_recherche) {
      try {
        new URL(url_recherche)
      } catch {
        return NextResponse.json(
          { success: false, error: "URL invalide" },
          { status: 400 }
        )
      }
    }

    // Valider le JSON des credentials si fourni
    let parsedCredentials: any = undefined
    if (credentials !== undefined) {
      if (credentials === null || credentials === "") {
        parsedCredentials = null
      } else {
        try {
          parsedCredentials = typeof credentials === "string" 
            ? JSON.parse(credentials) 
            : credentials
        } catch {
          return NextResponse.json(
            { success: false, error: "Format JSON invalide pour credentials" },
            { status: 400 }
          )
        }
      }
    }

    // Valider le JSON des selectors si fourni
    let parsedSelectors: any = undefined
    if (selectors !== undefined) {
      if (selectors === null || selectors === "") {
        parsedSelectors = null
      } else {
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
      }
    }

    // Construire l'objet de mise à jour
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    }

    if (nom !== undefined) updateData.nom = nom
    if (url_recherche !== undefined) updateData.url_recherche = url_recherche
    if (type_auth !== undefined) updateData.type_auth = type_auth
    if (parsedCredentials !== undefined) updateData.credentials = parsedCredentials
    if (parsedSelectors !== undefined) updateData.selectors = parsedSelectors
    if (actif !== undefined) updateData.actif = actif

    // Mettre à jour le site
    const { data: updatedSite, error: updateError } = await supabase
      .from("expert_sites")
      .update(updateData)
      .eq("id", id)
      .select()
      .single()

    if (updateError) {
      console.error("[API] Error updating expert site:", updateError)
      return NextResponse.json(
        { success: false, error: updateError.message },
        { status: 500 }
      )
    }

    // Log audit
    await supabase.from("audit_logs").insert({
      action: "EXPERT_SITE_UPDATED",
      entity_type: "expert_sites",
      entity_id: id,
      user_id: user.id,
      details: { 
        previous_nom: existingSite.nom,
        ...updateData 
      },
    })

    return NextResponse.json({
      success: true,
      site: updatedSite,
    })

  } catch (error: any) {
    console.error("[API] PUT /api/expert/sites/[id] error:", error)
    return NextResponse.json(
      { success: false, error: error.message || "Erreur lors de la modification du site" },
      { status: 500 }
    )
  }
}

// DELETE /api/expert/sites/[id] - Supprimer un site expert
export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params
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

    // Vérifier que le site existe
    const { data: existingSite } = await supabase
      .from("expert_sites")
      .select("id, nom")
      .eq("id", id)
      .single()

    if (!existingSite) {
      return NextResponse.json(
        { success: false, error: "Site non trouvé" },
        { status: 404 }
      )
    }

    // Vérifier qu'il n'y a pas de dossiers liés
    const { count: dossiersCount } = await supabase
      .from("dossiers")
      .select("id", { count: "exact", head: true })
      .eq("site_expert_id", id)

    if (dossiersCount && dossiersCount > 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Ce site est lié à ${dossiersCount} dossier(s). Désactivez-le plutôt que de le supprimer.` 
        },
        { status: 400 }
      )
    }

    // Supprimer le site
    const { error: deleteError } = await supabase
      .from("expert_sites")
      .delete()
      .eq("id", id)

    if (deleteError) {
      console.error("[API] Error deleting expert site:", deleteError)
      return NextResponse.json(
        { success: false, error: deleteError.message },
        { status: 500 }
      )
    }

    // Log audit
    await supabase.from("audit_logs").insert({
      action: "EXPERT_SITE_DELETED",
      entity_type: "expert_sites",
      entity_id: id,
      user_id: user.id,
      details: { nom: existingSite.nom },
    })

    return NextResponse.json({
      success: true,
      message: "Site supprimé avec succès",
    })

  } catch (error: any) {
    console.error("[API] DELETE /api/expert/sites/[id] error:", error)
    return NextResponse.json(
      { success: false, error: error.message || "Erreur lors de la suppression du site" },
      { status: 500 }
    )
  }
}
