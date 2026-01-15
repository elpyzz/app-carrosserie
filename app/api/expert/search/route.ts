import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { ExpertSearchCriteria, ExpertSearchResult } from "@/lib/expert/types"

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const criteria: ExpertSearchCriteria = await request.json()

    // Validation
    if (!criteria.sites_ids || criteria.sites_ids.length === 0) {
      return NextResponse.json(
        { error: "Aucun site sélectionné" },
        { status: 400 }
      )
    }

    if (
      !criteria.numero_dossier &&
      !criteria.immatriculation &&
      !criteria.date_sinistre
    ) {
      return NextResponse.json(
        { error: "Au moins un critère de recherche est requis" },
        { status: 400 }
      )
    }

    // Récupérer les sites configurés
    let sites
    if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
      const { data, error } = await supabase
        .from("expert_sites")
        .select("*")
        .in("id", criteria.sites_ids)
        .eq("actif", true)

      if (error) throw error
      sites = data || []
    } else {
      // Mode mock : sites de démonstration
      sites = [
        {
          id: "mock-1",
          nom: "Expert Auto",
          url_recherche: "https://expert-auto.example.com",
          type_auth: "none",
          actif: true,
        },
        {
          id: "mock-2",
          nom: "Expert Pro",
          url_recherche: "https://expert-pro.example.com",
          type_auth: "form",
          actif: true,
        },
      ]
    }

    // Créer l'enregistrement de recherche
    let searchId: string | null = null
    if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
      const { data: search, error } = await supabase
        .from("expert_searches")
        .insert({
          dossier_id: criteria.dossier_id || null,
          numero_dossier: criteria.numero_dossier || null,
          immatriculation: criteria.immatriculation || null,
          date_sinistre: criteria.date_sinistre || null,
          sites_interroges: criteria.sites_ids,
          statut: "en_cours",
          resultats: [],
        })
        .select()
        .single()

      if (error) throw error
      searchId = search.id
    }

    // Simuler la recherche sur chaque site (mock pour l'instant)
    const results: ExpertSearchResult[] = await Promise.all(
      sites.map(async (site: any) => {
        // Simuler un délai de recherche
        await new Promise((resolve) => setTimeout(resolve, 1000 + Math.random() * 2000))

        // Simuler différents résultats
        const random = Math.random()
        if (random > 0.6) {
          // Rapport trouvé
          return {
            site_id: site.id,
            site_nom: site.nom,
            statut: "trouve",
            message: "Rapport trouvé avec succès",
            pdf_url: `/api/expert/download/mock-${site.id}.pdf`,
            pdf_nom: `rapport_${criteria.numero_dossier || "expert"}_${site.id}.pdf`,
            pdf_taille: 250000 + Math.random() * 500000,
            pdf_date: new Date().toISOString(),
          } as ExpertSearchResult
        } else if (random > 0.3) {
          // Non trouvé
          return {
            site_id: site.id,
            site_nom: site.nom,
            statut: "non_trouve",
            message: "Aucun rapport trouvé pour ces critères",
          } as ExpertSearchResult
        } else {
          // Erreur
          return {
            site_id: site.id,
            site_nom: site.nom,
            statut: "erreur",
            message: "Erreur lors de la recherche",
            erreur: "Site temporairement indisponible",
          } as ExpertSearchResult
        }
      })
    )

    // Mettre à jour l'enregistrement de recherche
    const hasFound = results.some((r) => r.statut === "trouve")
    if (searchId && process.env.NEXT_PUBLIC_SUPABASE_URL) {
      await supabase
        .from("expert_searches")
        .update({
          statut: hasFound ? "trouve" : "non_trouve",
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
    console.error("Error in expert search:", error)
    return NextResponse.json(
      { error: error.message || "Erreur lors de la recherche" },
      { status: 500 }
    )
  }
}
