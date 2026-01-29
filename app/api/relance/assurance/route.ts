import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
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

    const { searchParams } = new URL(request.url)
    const statut = searchParams.get("statut")
    const assurance = searchParams.get("assurance")

    let query = supabase
      .from("factures_assurance")
      .select(`
        *,
        dossier:dossiers(
          id,
          dossier_id,
          clients(nom),
          vehicules(immatriculation)
        ),
        document:documents(id, nom_fichier, chemin_storage)
      `)
      .neq("statut", "SUPPRIME")
      .order("created_at", { ascending: false })

    if (statut && statut !== "all") {
      query = query.eq("statut", statut)
    }
    if (assurance && assurance !== "all") {
      query = query.eq("nom_assurance", assurance)
    }

    const { data, error } = await query

    if (error) {
      console.error("[API] Factures fetch error:", error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      factures: data || [],
    })

  } catch (error: any) {
    console.error("[API] Factures error:", error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
