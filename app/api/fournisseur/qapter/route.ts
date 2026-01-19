import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { PieceResult } from "@/lib/fournisseur/types"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json(
        { error: "Aucun fichier fourni" },
        { status: 400 }
      )
    }

    // Lire le contenu du fichier
    let fileContent: string
    try {
      fileContent = await file.text()
    } catch (error) {
      // Si le fichier n'est pas du texte (PDF, DOCX), retourner une erreur pour l'instant
      return NextResponse.json(
        { error: "Format de fichier non supporté. Utilisez un fichier texte (.txt) pour l'instant." },
        { status: 400 }
      )
    }

    // Extraire les pièces du contenu Qapter
    const extractedPieces = extractPiecesFromQapter(fileContent)

    if (extractedPieces.length === 0) {
      return NextResponse.json(
        { error: "Aucune pièce identifiée dans le document" },
        { status: 400 }
      )
    }

    // Récupérer les sites fournisseurs actifs
    const supabase = await createClient()
    let sites

    if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
      const { data, error } = await supabase
        .from("supplier_sites")
        .select("*")
        .eq("actif", true)
        .order("ordre", { ascending: true })
        .limit(6)

      if (error) throw error
      sites = data || []
    } else {
      // Mode mock : 6 sites de démonstration
      sites = [
        { id: "mock-1", nom: "Pièces Auto Pro", ordre: 1 },
        { id: "mock-2", nom: "AutoParts Direct", ordre: 2 },
        { id: "mock-3", nom: "CarParts Express", ordre: 3 },
        { id: "mock-4", nom: "MecaParts", ordre: 4 },
        { id: "mock-5", nom: "Pièces Discount", ordre: 5 },
        { id: "mock-6", nom: "AutoSupply", ordre: 6 },
      ]
    }

    if (!sites || sites.length === 0) {
      return NextResponse.json(
        { error: "Aucun site fournisseur configuré" },
        { status: 400 }
      )
    }

    // Pour chaque pièce identifiée, créer des résultats de recherche pour tous les sites
    const allResults: PieceResult[] = []

    for (const piece of extractedPieces) {
      for (const site of sites) {
        // TODO: Appeler réellement l'API de recherche existante (/api/fournisseur/search) pour chaque pièce
        // Pour l'instant, créer des résultats avec statut "en_cours"
        allResults.push({
          site_id: site.id,
          site_nom: site.nom,
          reference: piece,
          statut: "en_cours",
          message: `Recherche en cours pour ${piece}`,
        })
      }
    }

    return NextResponse.json({
      extractedPieces,
      results: allResults,
    })
  } catch (error: any) {
    console.error("Error processing Qapter file:", error)
    return NextResponse.json(
      { error: error.message || "Erreur lors du traitement" },
      { status: 500 }
    )
  }
}

/**
 * Extrait les références de pièces d'un document Qapter
 * TODO: Remplacer par une intégration IA réelle (OpenAI, Claude, etc.)
 */
function extractPiecesFromQapter(content: string): string[] {
  const pieces: string[] = []
  
  // Recherche de références de pièces (patterns communs)
  // Format 1: Codes alphanumériques de 6+ caractères (ex: "REF123456", "ABC1234")
  const refPattern1 = /\b[A-Z0-9]{6,}\b/g
  const matches1 = content.match(refPattern1)
  
  if (matches1) {
    pieces.push(...matches1)
  }

  // Format 2: Codes avec tirets (ex: "REF-123456", "ABC-1234")
  const refPattern2 = /\b[A-Z]{2,}-[0-9]{4,}\b/g
  const matches2 = content.match(refPattern2)
  
  if (matches2) {
    pieces.push(...matches2)
  }

  // Format 3: Codes avec underscores (ex: "REF_123456")
  const refPattern3 = /\b[A-Z]{2,}_[0-9]{4,}\b/g
  const matches3 = content.match(refPattern3)
  
  if (matches3) {
    pieces.push(...matches3)
  }

  // Supprimer les doublons et limiter à 20 pièces maximum
  const uniquePieces = Array.from(new Set(pieces)).slice(0, 20)

  return uniquePieces.length > 0 ? uniquePieces : []
}
