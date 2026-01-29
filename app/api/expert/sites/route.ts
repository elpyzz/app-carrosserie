import { NextRequest, NextResponse } from 'next/server'
import { createClient } from "@/lib/supabase/server"
import { ExpertSite, ExpertSiteAuthType } from "@/lib/expert/types"

// Sites experts par défaut (fallback si Supabase non configuré)
const DEFAULT_EXPERT_SITES: ExpertSite[] = [
  {
    id: 'experts-groupe',
    nom: 'Experts Groupe',
    url_recherche: 'https://www.experts-groupe.com',
    type_auth: 'form',
    credentials: null,
    selectors: null,
    actif: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'bca-expertise',
    nom: 'BCA Expertise',
    url_recherche: 'https://www.bca-expertise.fr',
    type_auth: 'form',
    credentials: null,
    selectors: null,
    actif: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'ixperience',
    nom: 'iXperience',
    url_recherche: 'https://www.ixperience.fr',
    type_auth: 'form',
    credentials: null,
    selectors: null,
    actif: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'monautoetcie',
    nom: 'Mon Auto & Cie',
    url_recherche: 'https://www.monautoetcie.fr',
    type_auth: 'form',
    credentials: null,
    selectors: null,
    actif: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'idea-expertise',
    nom: 'IDEA Expertise',
    url_recherche: 'https://www.idea-expertise.fr',
    type_auth: 'form',
    credentials: null,
    selectors: null,
    actif: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'vroom',
    nom: 'Vroom',
    url_recherche: 'https://www.vroom.fr',
    type_auth: 'form',
    credentials: null,
    selectors: null,
    actif: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
]

// GET /api/expert/sites - Liste des sites experts
export async function GET(request: NextRequest) {
  try {
    // Essayer de récupérer depuis Supabase
    if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
      const supabase = await createClient()
      
      const { data, error } = await supabase
        .from("expert_sites")
        .select("*")
        .order("nom", { ascending: true })

      if (!error && data && data.length > 0) {
        // Formater les sites pour correspondre au type ExpertSite
        const formattedSites: ExpertSite[] = data.map((s: any) => ({
          id: s.id,
          nom: s.nom,
          url_recherche: s.url_recherche,
          type_auth: (s.type_auth === "none" || s.type_auth === "form" || s.type_auth === "api") 
            ? s.type_auth as ExpertSiteAuthType
            : "none" as ExpertSiteAuthType,
          credentials: s.credentials,
          selectors: s.selectors,
          actif: s.actif ?? true,
          created_at: s.created_at || new Date().toISOString(),
          updated_at: s.updated_at || new Date().toISOString(),
        }))

        return NextResponse.json({
          success: true,
          sites: formattedSites,
        })
      }
      
      // Si erreur ou pas de données, fallback sur les sites par défaut
      console.warn('[API] /api/expert/sites: Fallback sur sites par défaut', error)
    }

    // Fallback : retourner les sites par défaut
    return NextResponse.json({
      success: true,
      sites: DEFAULT_EXPERT_SITES,
    })
  } catch (error: any) {
    console.error('[API] GET /api/expert/sites error:', error)
    // En cas d'erreur, retourner les sites par défaut plutôt qu'une erreur
    return NextResponse.json({
      success: true,
      sites: DEFAULT_EXPERT_SITES,
    })
  }
}

// POST /api/expert/sites - Créer un site expert
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
    const { nom, url_recherche, type_auth, credentials, selectors, actif } = body

    // Validation
    if (!nom || !url_recherche) {
      return NextResponse.json(
        { success: false, error: "Nom et URL sont requis" },
        { status: 400 }
      )
    }

    // Valider l'URL
    try {
      new URL(url_recherche)
    } catch {
      return NextResponse.json(
        { success: false, error: "URL invalide" },
        { status: 400 }
      )
    }

    // Valider le JSON des credentials si fourni
    let parsedCredentials = null
    if (credentials) {
      try {
        parsedCredentials = typeof credentials === "string" 
          ? JSON.parse(credentials) 
          : credentials
      } catch {
        return NextResponse.json(
          { success: false, error: "Format JSON invalide pour credentials" },
          { status: 400 }
        )
      }
    }

    // Valider le JSON des selectors si fourni
    let parsedSelectors = null
    if (selectors) {
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

    // Créer le site
    const { data: newSite, error: insertError } = await supabase
      .from("expert_sites")
      .insert({
        nom,
        url_recherche,
        type_auth: type_auth || "none",
        credentials: parsedCredentials,
        selectors: parsedSelectors,
        actif: actif !== undefined ? actif : true,
      })
      .select()
      .single()

    if (insertError) {
      console.error("[API] Error creating expert site:", insertError)
      return NextResponse.json(
        { success: false, error: insertError.message },
        { status: 500 }
      )
    }

    // Log audit
    await supabase.from("audit_logs").insert({
      action: "EXPERT_SITE_CREATED",
      entity_type: "expert_sites",
      entity_id: newSite.id,
      user_id: user.id,
      details: { nom, url_recherche },
    })

    return NextResponse.json({
      success: true,
      site: newSite,
    })

  } catch (error: any) {
    console.error("[API] POST /api/expert/sites error:", error)
    return NextResponse.json(
      { success: false, error: error.message || "Erreur lors de la création du site" },
      { status: 500 }
    )
  }
}
