import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { PieceSearchCriteria, PieceResult } from "@/lib/fournisseur/types"
import { searchOnSupplierSite } from "@/lib/fournisseur/scraper"

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const criteria: PieceSearchCriteria = await request.json()

    // Validation
    if (!criteria.sites_ids || criteria.sites_ids.length === 0) {
      return NextResponse.json(
        { error: "Aucun site sélectionné" },
        { status: 400 }
      )
    }

    if (criteria.sites_ids.length > 6) {
      return NextResponse.json(
        { error: "Maximum 6 sites autorisés" },
        { status: 400 }
      )
    }

    if (
      !criteria.reference_piece &&
      !(criteria.marque && criteria.modele && criteria.nom_piece)
    ) {
      return NextResponse.json(
        { error: "Remplissez soit la référence, soit (marque + modèle + nom de la pièce)" },
        { status: 400 }
      )
    }

    // Récupérer les sites configurés
    let sites
    if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
      const { data, error } = await supabase
        .from("supplier_sites")
        .select("*")
        .in("id", criteria.sites_ids)
        .eq("actif", true)
        .order("ordre", { ascending: true })

      if (error) throw error
      sites = data || []
    } else {
      // Mode mock : 6 sites de démonstration
      sites = [
        { id: "mock-1", nom: "Pièces Auto Pro", ordre: 1 },
        { id: "mock-2", nom: "Carrosserie Express", ordre: 2 },
        { id: "mock-3", nom: "OEM Parts Direct", ordre: 3 },
        { id: "mock-4", nom: "Auto Pièces 24", ordre: 4 },
        { id: "mock-5", nom: "Pièces Discount", ordre: 5 },
        { id: "mock-6", nom: "Expert Carrosserie", ordre: 6 },
      ]
    }

    // Créer l'enregistrement de recherche
    let searchId: string | null = null
    if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
      const { data: search, error } = await supabase
        .from("piece_searches")
        .insert({
          dossier_id: criteria.dossier_id || null,
          reference_piece: criteria.reference_piece || null,
          marque: criteria.marque || null,
          modele: criteria.modele || null,
          annee: criteria.annee || null,
          nom_piece: criteria.nom_piece || null,
          sites_interroges: criteria.sites_ids,
          resultats: [],
        })
        .select()
        .single()

      if (error) throw error
      searchId = search.id
    }

    // Recherche sur chaque site
    const results: PieceResult[] = await Promise.all(
      sites.map(async (site: any) => {
        try {
          const result = await searchOnSupplierSite(site, criteria)
          return result
        } catch (error: any) {
          console.error(`[API] Error searching on site ${site.nom}:`, error)
          return {
            site_id: site.id,
            site_nom: site.nom,
            statut: "erreur",
            message: "Erreur lors de la recherche",
            erreur: error.message || "Erreur inconnue",
          } as PieceResult
        }
      })
    )

    // Mettre à jour l'enregistrement de recherche
    const hasFound = results.some((r) => r.statut === "trouve")
    if (searchId && process.env.NEXT_PUBLIC_SUPABASE_URL) {
      await supabase
        .from("piece_searches")
        .update({
          resultats: results,
        })
        .eq("id", searchId)
    }

    return NextResponse.json({
      success: true,
      search_id: searchId,
      results,
    })
  } catch (error: any) {
    console.error("Error in fournisseur search:", error)
    return NextResponse.json(
      { error: error.message || "Erreur lors de la recherche" },
      { status: 500 }
    )
  }
}
