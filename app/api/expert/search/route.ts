import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { ExpertSearchCriteria, ExpertSearchResult } from "@/lib/expert/types"

export async function POST(request: Request) {
  try {
    console.log('[DEBUG API] POST /api/expert/search - Début')
    const supabase = await createClient()
    const criteria: ExpertSearchCriteria = await request.json()
    console.log('[DEBUG API] Critères reçus:', criteria)

    // Validation
    if (!criteria.sites_ids || criteria.sites_ids.length === 0) {
      console.log('[DEBUG API] Erreur: Aucun site sélectionné')
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
      console.log('[DEBUG API] Erreur: Aucun critère de recherche')
      return NextResponse.json(
        { error: "Au moins un critère de recherche est requis" },
        { status: 400 }
      )
    }

    // Récupérer les sites configurés
    let sites
    if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
      console.log('[DEBUG API] Récupération des sites depuis Supabase, IDs:', criteria.sites_ids)
      const { data, error } = await supabase
        .from("expert_sites")
        .select("*")
        .in("id", criteria.sites_ids)
        .eq("actif", true)

      if (error) {
        console.error('[DEBUG API] Erreur récupération sites:', error)
        throw error
      }
      sites = data || []
      console.log('[DEBUG API] Sites récupérés:', sites.length, sites.map((s: any) => ({ id: s.id, nom: s.nom })))
      
      if (sites.length === 0) {
        console.log('[DEBUG API] Aucun site actif trouvé pour les IDs:', criteria.sites_ids)
        return NextResponse.json(
          { error: "Aucun site actif trouvé" },
          { status: 400 }
        )
      }
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
      console.log('[DEBUG API] Création enregistrement de recherche')
      try {
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

        if (error) {
          console.error('[DEBUG API] Erreur création recherche:', error)
          throw error
        }
        searchId = search.id
        console.log('[DEBUG API] Recherche créée avec ID:', searchId)
      } catch (insertError: any) {
        console.error('[DEBUG API] Erreur lors de la création de la recherche:', insertError)
        // Continuer même si la création échoue (pour le débogage)
        console.warn('[DEBUG API] Continuation sans enregistrement de recherche')
      }
    }

    // Fonction pour télécharger automatiquement un PDF
    const downloadAndStorePDF = async (
      result: ExpertSearchResult,
      site: any
    ): Promise<ExpertSearchResult> => {
      if (result.statut === "trouve" && result.pdf_url) {
        try {
          // Vérifier si c'est une URL absolue ou relative
          const pdfUrl = result.pdf_url.startsWith("http")
            ? result.pdf_url
            : `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}${result.pdf_url}`

          // Télécharger le PDF
          const pdfResponse = await fetch(pdfUrl)
          if (!pdfResponse.ok) {
            throw new Error(`Erreur téléchargement PDF: ${pdfResponse.status}`)
          }

          const pdfBuffer = await pdfResponse.arrayBuffer()
          const pdfBlob = new Blob([pdfBuffer], { type: "application/pdf" })

          // Générer un nom de fichier unique
          const fileName = result.pdf_nom || `rapport_${Date.now()}.pdf`
          const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_")
          const filePath = `expert-reports/${criteria.dossier_id || "general"}/${Date.now()}-${sanitizedFileName}`

          // Upload vers Supabase Storage
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from("documents")
            .upload(filePath, pdfBlob, {
              contentType: "application/pdf",
              upsert: false,
            })

          if (!uploadError && uploadData) {
            // Récupérer l'utilisateur pour uploaded_by
            const {
              data: { user },
            } = await supabase.auth.getUser()

            // Créer l'enregistrement dans la table documents
            const { data: docData, error: docError } = await supabase
              .from("documents")
              .insert({
                dossier_id: criteria.dossier_id || null,
                type: "rapport_expert",
                nom_fichier: result.pdf_nom || sanitizedFileName,
                chemin_storage: filePath,
                taille_bytes: pdfBlob.size,
                mime_type: "application/pdf",
                uploaded_by: user?.id || null,
              })
              .select()
              .single()

            if (!docError && docData) {
              // Mettre à jour le résultat avec les infos de stockage
              result.pdf_stored_id = docData.id
              result.pdf_download_url = `/api/documents/${docData.id}/download`
              result.pdf_stored = true
              result.message = "Rapport téléchargé et stocké automatiquement"
            } else {
              console.error("Erreur création document:", docError)
              result.pdf_stored = false
            }
          } else {
            console.error("Erreur upload storage:", uploadError)
            result.pdf_stored = false
          }
        } catch (error: any) {
          console.error("Erreur téléchargement automatique:", error)
          // Continuer avec pdf_url original
          result.pdf_stored = false
          if (!result.message || result.message === "Rapport trouvé avec succès") {
            result.message = "Rapport trouvé (téléchargement automatique échoué)"
          }
        }
      } else {
        result.pdf_stored = false
      }

      return result
    }

    // Simuler la recherche sur chaque site (mock pour l'instant)
    console.log('[DEBUG API] Début simulation recherche sur', sites.length, 'site(s)')
    const results: ExpertSearchResult[] = await Promise.all(
      sites.map(async (site: any) => {
        console.log('[DEBUG API] Traitement site:', site.nom, site.id)
        try {
          // Simuler un délai de recherche
          await new Promise((resolve) => setTimeout(resolve, 1000 + Math.random() * 2000))

          // Simuler différents résultats
          const random = Math.random()
          let result: ExpertSearchResult

          if (random > 0.6) {
            // Rapport trouvé
            result = {
              site_id: site.id,
              site_nom: site.nom,
              statut: "trouve",
              message: "Rapport trouvé avec succès",
              pdf_url: `/api/expert/download/mock-${site.id}.pdf`,
              pdf_nom: `rapport_${criteria.numero_dossier || "expert"}_${site.id}.pdf`,
              pdf_taille: 250000 + Math.random() * 500000,
              pdf_date: new Date().toISOString(),
            } as ExpertSearchResult

            // Télécharger automatiquement le PDF
            result = await downloadAndStorePDF(result, site)
          } else if (random > 0.3) {
            // Non trouvé
            result = {
              site_id: site.id,
              site_nom: site.nom,
              statut: "non_trouve",
              message: "Aucun rapport trouvé pour ces critères",
              pdf_stored: false,
            } as ExpertSearchResult
          } else {
            // Erreur
            result = {
              site_id: site.id,
              site_nom: site.nom,
              statut: "erreur",
              message: "Erreur lors de la recherche",
              erreur: "Site temporairement indisponible",
              pdf_stored: false,
            } as ExpertSearchResult
          }

          console.log('[DEBUG API] Résultat pour', site.nom, ':', result.statut)
          return result
        } catch (siteError: any) {
          console.error('[DEBUG API] Erreur traitement site', site.nom, ':', siteError)
          return {
            site_id: site.id,
            site_nom: site.nom,
            statut: "erreur",
            message: "Erreur lors de la recherche",
            erreur: siteError.message || "Erreur inconnue",
            pdf_stored: false,
          } as ExpertSearchResult
        }
      })
    )

    console.log('[DEBUG API] Résultats générés:', results.length)

    // Mettre à jour l'enregistrement de recherche
    const hasFound = results.some((r) => r.statut === "trouve")
    if (searchId && process.env.NEXT_PUBLIC_SUPABASE_URL) {
      console.log('[DEBUG API] Mise à jour enregistrement de recherche:', searchId)
      try {
        await supabase
          .from("expert_searches")
          .update({
            statut: hasFound ? "trouve" : "non_trouve",
            resultats: results,
          })
          .eq("id", searchId)
        console.log('[DEBUG API] Enregistrement mis à jour avec succès')
      } catch (updateError: any) {
        console.error('[DEBUG API] Erreur mise à jour recherche:', updateError)
        // Ne pas bloquer la réponse même si la mise à jour échoue
      }
    }

    console.log('[DEBUG API] Retour des résultats')
    return NextResponse.json({
      success: true,
      search_id: searchId,
      results,
    })
  } catch (error: any) {
    console.error('[DEBUG API] Erreur générale dans expert search:', error)
    console.error('[DEBUG API] Stack:', error.stack)
    return NextResponse.json(
      { error: error.message || "Erreur lors de la recherche" },
      { status: 500 }
    )
  }
}
