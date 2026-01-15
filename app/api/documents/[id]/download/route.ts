import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient()

  // Vérifier l'authentification
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Récupérer le document
  const { data: document, error } = await supabase
    .from("documents")
    .select("*")
    .eq("id", params.id)
    .single()

  if (error || !document) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 })
  }

  // Télécharger depuis Supabase Storage
  const { data: fileData, error: downloadError } = await supabase.storage
    .from("documents")
    .download(document.chemin_storage)

  if (downloadError || !fileData) {
    return NextResponse.json(
      { error: "Error downloading file" },
      { status: 500 }
    )
  }

  // Convertir en blob et retourner
  const blob = await fileData.blob()
  const headers = new Headers()
  headers.set("Content-Type", document.mime_type || "application/octet-stream")
  headers.set(
    "Content-Disposition",
    `attachment; filename="${document.nom_fichier}"`
  )

  return new NextResponse(blob, { headers })
}
