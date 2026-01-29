import { NextRequest, NextResponse } from 'next/server'
import { createClient } from "@/lib/supabase/server"
import { maskSitesCredentials, maskSiteCredentials } from "@/lib/security/credentials-masker"
import { validateAndSanitizeCredentials } from "@/lib/security/credentials-validator"

// Sites fournisseurs par défaut
const DEFAULT_SUPPLIER_SITES = [
  {
    id: 'autodoc',
    nom: 'AutoDoc',
    url_recherche: 'https://www.autodoc.fr',
    type_auth: 'none',
    credentials: null,
    selectors: null,
    actif: true,
    ordre: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'chok-auto',
    nom: 'Chok Auto',
    url_recherche: 'https://www.chok-auto.fr',
    type_auth: 'none',
    credentials: null,
    selectors: null,
    actif: true,
    ordre: 2,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'cora',
    nom: 'Cora',
    url_recherche: 'https://www.cora.fr',
    type_auth: 'none',
    credentials: null,
    selectors: null,
    actif: true,
    ordre: 3,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'renault',
    nom: 'Renault',
    url_recherche: 'https://www.renault.fr',
    type_auth: 'form',
    credentials: null,
    selectors: null,
    actif: true,
    ordre: 4,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'stellantis',
    nom: 'Stellantis',
    url_recherche: 'https://www.stellantis.com',
    type_auth: 'form',
    credentials: null,
    selectors: null,
    actif: true,
    ordre: 5,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
]

// GET /api/fournisseur/sites - Liste des sites fournisseurs
export async function GET(request: NextRequest) {
  try {
    // Si Supabase connecté, récupérer depuis la base de données
    if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
      const supabase = await createClient()
      const { data, error } = await supabase
        .from("supplier_sites")
        .select("*")
        .order("ordre", { ascending: true })

      if (!error && data) {
        return NextResponse.json({
          success: true,
          sites: maskSitesCredentials(data), // ✅ Masqué
        })
      }
    }

    // Fallback : retourner les sites par défaut
    return NextResponse.json({
      success: true,
      sites: DEFAULT_SUPPLIER_SITES,
    })
  } catch (error: any) {
    console.error('[API] GET /api/fournisseur/sites error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Erreur lors de la récupération des sites' },
      { status: 500 }
    )
  }
}

// POST /api/fournisseur/sites - Créer un site
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Si Supabase connecté, créer dans la base de données
    if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
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

      // Valider les credentials si fournis
      let validatedCredentials: Record<string, any> | null = null
      if (body.credentials) {
        validatedCredentials = validateAndSanitizeCredentials(body.credentials)
      }

      const { data: newSite, error: insertError } = await supabase
        .from("supplier_sites")
        .insert({
          nom: body.nom,
          url_recherche: body.url_recherche,
          type_auth: body.type_auth || "none",
          credentials: validatedCredentials,
          selectors: body.selectors || {},
          actif: body.actif !== undefined ? body.actif : true,
          ordre: body.ordre || 0,
        })
        .select()
        .single()

      if (insertError) {
        console.error("[API] Error creating supplier site:", insertError)
        return NextResponse.json(
          { success: false, error: insertError.message },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        site: maskSiteCredentials(newSite), // ✅ Masqué
      })
    }

    // Fallback : mode démo
    return NextResponse.json({
      success: true,
      sites: DEFAULT_SUPPLIER_SITES,
      message: 'Site créé avec succès (mode démo)',
    })
  } catch (error: any) {
    console.error('[API] POST /api/fournisseur/sites error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Erreur lors de la création du site' },
      { status: 500 }
    )
  }
}
