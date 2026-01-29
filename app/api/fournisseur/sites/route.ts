import { NextRequest, NextResponse } from 'next/server'

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

// POST /api/fournisseur/sites - Créer un site (pour l'instant, retourne juste les sites par défaut)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    // Pour l'instant, on retourne juste les sites par défaut
    // Plus tard, on pourra ajouter la persistance dans SQLite
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
