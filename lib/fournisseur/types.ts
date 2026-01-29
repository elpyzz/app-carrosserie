export type SupplierSiteAuthType = "none" | "form" | "api_key" | "oauth" | "api"

export type PieceSearchStatus = "en_cours" | "trouve" | "non_trouve" | "erreur"

export type Disponibilite = "en_stock" | "sur_commande" | "indisponible"

// Types pour les sites fournisseurs
export interface SupplierSite {
  id: string
  nom: string
  url_base?: string
  url_recherche: string
  type_auth: SupplierSiteAuthType
  credentials: Record<string, any> | string | null
  selectors: Record<string, any> | string | null
  actif: boolean
  ordre?: number
  created_at?: string
  updated_at?: string
}

// Critères de recherche
export interface PieceSearchCriteria {
  reference_piece?: string
  nom_piece?: string
  marque?: string
  modele?: string
  annee?: string | number
  immatriculation?: string
  dossier_id?: string
  sites_ids: string[]
}

// Résultat de recherche
export interface PieceResult {
  site_id: string
  site_nom: string
  statut: PieceSearchStatus
  message?: string
  erreur?: string
  reference?: string
  nom?: string
  prix?: number
  devise?: string
  disponibilite?: Disponibilite
  delai_jours?: number
  image_url?: string
  produit_url?: string
  quantite_disponible?: number
  pdf_stored?: boolean
}

// Résultat de recherche globale
export interface SearchResult {
  success: boolean
  criteria: PieceSearchCriteria
  results: PieceResult[]
  total_sites: number
  sites_avec_resultats: number
  timestamp: string
}

export interface PieceSearch {
  id: string
  dossier_id: string | null
  reference_piece: string | null
  marque: string | null
  modele: string | null
  annee: number | null
  nom_piece: string | null
  sites_interroges: string[]
  resultats: PieceResult[]
  created_at: string
  updated_at: string
}
