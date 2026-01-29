import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { stopRelancesForDossier } from "@/lib/relance/utils"

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
    const { dossier_id, document_type, document_id } = body

    if (!dossier_id) {
      return NextResponse.json(
        { success: false, error: "dossier_id requis" },
        { status: 400 }
      )
    }

    await stopRelancesForDossier(
      dossier_id,
      "document_uploaded",
      document_type,
      document_id
    )

    return NextResponse.json({
      success: true,
      message: "Relances arrêtées avec succès",
    })

  } catch (error: any) {
    console.error("[API] Stop relance error:", error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
