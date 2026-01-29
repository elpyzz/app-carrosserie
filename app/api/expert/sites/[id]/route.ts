import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { maskSiteCredentials, sanitizeForAuditLog, sanitizeErrorMessage } from "@/lib/security/credentials-masker"
import { isMaskedCredentials } from "@/lib/security/credentials-masker"

// GET /api/expert/sites/[id] - Récupérer un site expert
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
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
      site: maskSiteCredentials(site), // ✅ Masqué
    })

  } catch (error: any) {
    console.error("[API] GET /api/expert/sites/[id] error:", sanitizeErrorMessage(error))
    return NextResponse.json(
      { success: false, error: sanitizeErrorMessage(error) },
      { status: 500 }
    )
  }
}

// PUT /api/expert/sites/[id] - Modifier un site expert
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
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

    // IMPORTANT : Ne pas permettre la modification des credentials via cet endpoint
    // Les credentials doivent être modifiés via /api/expert/sites/[id]/credentials
    if (credentials !== undefined) {
      // Si c'est un credentials masqué ou une tentative de modification
      if (isMaskedCredentials(credentials)) {
        // Ignorer silencieusement les credentials masqués
        delete body.credentials
      } else if (credentials !== null) {
        // Rediriger vers l'endpoint dédié
        return NextResponse.json(
          {
            success: false,
            error: "Pour modifier les credentials, utilisez PUT /api/expert/sites/{id}/credentials",
          },
          { status: 400 }
        )
      }
    }

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

    // Construire l'objet de mise à jour (sans credentials)
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    }

    if (nom !== undefined) updateData.nom = nom
    if (url_recherche !== undefined) updateData.url_recherche = url_recherche
    if (type_auth !== undefined) updateData.type_auth = type_auth
    // Ne pas inclure credentials dans updateData (modifié via endpoint dédié)
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

    // Log audit (sans exposer les credentials)
    await supabase.from("audit_logs").insert({
      action: "EXPERT_SITE_UPDATED",
      entity_type: "expert_sites",
      entity_id: id,
      user_id: user.id,
      details: sanitizeForAuditLog({ 
        previous_nom: existingSite.nom,
        ...updateData 
      }), // ✅ Sanitisé
    })

    return NextResponse.json({
      success: true,
      site: maskSiteCredentials(updatedSite), // ✅ Masqué
    })

  } catch (error: any) {
    console.error("[API] PUT /api/expert/sites/[id] error:", sanitizeErrorMessage(error))
    return NextResponse.json(
      { success: false, error: sanitizeErrorMessage(error) },
      { status: 500 }
    )
  }
}

// DELETE /api/expert/sites/[id] - Supprimer un site expert
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
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
    console.error("[API] DELETE /api/expert/sites/[id] error:", sanitizeErrorMessage(error))
    return NextResponse.json(
      { success: false, error: sanitizeErrorMessage(error) },
      { status: 500 }
    )
  }
}
