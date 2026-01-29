import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url)
    const dossierId = searchParams.get("dossier_id")
    const relanceType = searchParams.get("relance_type")
    const relanceTypesParam = searchParams.get("relance_types") // ← NOUVEAU
    const statut = searchParams.get("statut")
    const limit = parseInt(searchParams.get("limit") || "100")

    let query = supabase
      .from("relance_history")
      .select(`
        *,
        dossier:dossiers(id, dossier_id)
      `)
      .order("sent_at", { ascending: false })
      .limit(limit)

    if (dossierId) {
      query = query.eq("dossier_id", dossierId)
    }

    // Gérer relance_types (plusieurs) ou relance_type (un seul)
    if (relanceTypesParam) {
      const types = relanceTypesParam.split(",").filter(t => t.trim())
      if (types.length > 0) {
        query = query.in("relance_type", types)
      }
    } else if (relanceType) {
      query = query.eq("relance_type", relanceType)
    }

    if (statut) {
      query = query.eq("statut", statut)
    }

    const { data: history, error } = await query

    if (error) {
      console.error("[API] History fetch error:", error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      history: history || [],
      count: history?.length || 0,
    })

  } catch (error: any) {
    console.error("[API] History error:", error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
