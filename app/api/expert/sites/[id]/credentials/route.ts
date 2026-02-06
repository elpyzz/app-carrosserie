import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import {
  validateAndSanitizeCredentials,
  mergeCredentials,
} from "@/lib/security/credentials-validator"
import { sanitizeForAuditLog } from "@/lib/security/credentials-masker"

/**
 * PUT /api/expert/sites/[id]/credentials
 * Met à jour les credentials d'un site expert
 * Les credentials existants sont fusionnés avec les nouveaux
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    console.log('[DEBUG API] PUT /api/expert/sites/[id]/credentials - ID:', id)

    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID du site requis" },
        { status: 400 }
      )
    }

    // Mode mock
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      return NextResponse.json({
        success: true,
        message: "Credentials mis à jour (mock)",
      })
    }

    const supabase = await createClient()

    // Vérifier l'authentification
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      console.log('[DEBUG API] Erreur authentification:', authError)
      return NextResponse.json(
        { success: false, error: "Non authentifié" },
        { status: 401 }
      )
    }
    
    console.log('[DEBUG API] Utilisateur authentifié:', user.id)

    // Récupérer le site existant
    const { data: existingSite, error: fetchError } = await supabase
      .from("expert_sites")
      .select("id, nom, credentials")
      .eq("id", id)
      .single()

    console.log('[DEBUG API] Résultat requête site:', { 
      hasData: !!existingSite, 
      error: fetchError?.message,
      errorCode: fetchError?.code,
      errorDetails: fetchError
    })

    if (fetchError || !existingSite) {
      console.error('[DEBUG API] Site non trouvé - ID:', id, 'Error:', fetchError)
      return NextResponse.json(
        { success: false, error: "Site non trouvé" },
        { status: 404 }
      )
    }

    // Parser le body
    const body = await request.json()
    const { credentials, merge = true } = body

    // Valider et nettoyer les nouveaux credentials
    let newCredentials: Record<string, any> | null

    try {
      if (merge) {
        // Fusionner avec les credentials existants
        newCredentials = mergeCredentials(existingSite.credentials, credentials)
      } else {
        // Remplacer complètement
        newCredentials = validateAndSanitizeCredentials(credentials)
      }
    } catch (validationError: any) {
      return NextResponse.json(
        { success: false, error: validationError.message },
        { status: 400 }
      )
    }

    // Mettre à jour les credentials
    const { error: updateError } = await supabase
      .from("expert_sites")
      .update({
        credentials: newCredentials,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)

    if (updateError) {
      console.error("[API] Error updating credentials:", updateError)
      return NextResponse.json(
        { success: false, error: "Erreur lors de la mise à jour" },
        { status: 500 }
      )
    }

    // Log d'audit (sans exposer les credentials)
    await supabase.from("audit_logs").insert({
      action: "EXPERT_SITE_CREDENTIALS_UPDATED",
      entity_type: "expert_sites",
      entity_id: id,
      user_id: user.id,
      details: sanitizeForAuditLog({
        site_nom: existingSite.nom,
        credentials_updated: true,
        merge_mode: merge,
      }),
    }).catch((err: any) => {
      console.warn("[API] Audit log failed:", err)
    })

    return NextResponse.json({
      success: true,
      message: "Credentials mis à jour avec succès",
      has_credentials: newCredentials !== null,
    })
  } catch (error: any) {
    console.error("[API] Credentials update error:", error)
    return NextResponse.json(
      { success: false, error: "Erreur serveur" },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/expert/sites/[id]/credentials
 * Supprime tous les credentials d'un site
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID du site requis" },
        { status: 400 }
      )
    }

    // Mode mock
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      return NextResponse.json({
        success: true,
        message: "Credentials supprimés (mock)",
      })
    }

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

    // Mettre à jour (supprimer credentials)
    const { error: updateError } = await supabase
      .from("expert_sites")
      .update({
        credentials: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)

    if (updateError) {
      console.error("[API] Error deleting credentials:", updateError)
      return NextResponse.json(
        { success: false, error: "Erreur lors de la suppression" },
        { status: 500 }
      )
    }

    // Log d'audit
    await supabase.from("audit_logs").insert({
      action: "EXPERT_SITE_CREDENTIALS_DELETED",
      entity_type: "expert_sites",
      entity_id: id,
      user_id: user.id,
      details: { credentials_deleted: true },
    }).catch((err: any) => {
      console.warn("[API] Audit log failed:", err)
    })

    return NextResponse.json({
      success: true,
      message: "Credentials supprimés avec succès",
    })
  } catch (error: any) {
    console.error("[API] Credentials delete error:", error)
    return NextResponse.json(
      { success: false, error: "Erreur serveur" },
      { status: 500 }
    )
  }
}
