export type SupplierSiteAuthType = "none" | "form" | "api"

export type PieceSearchStatus = "en_cours" | "trouve" | "non_trouve" | "erreur"

export type Disponibilite = "en_stock" | "sur_commande" | "indisponible"

export interface SupplierSite {
  id: string
  nom: string
  url_recherche: string
  type_auth: SupplierSiteAuthType
  credentials: Record<string, any> | null
  selectors: Record<string, string> | null
  actif: boolean
  ordre: number
  created_at: string
  updated_at: string
}

export interface PieceSearchCriteria {
  reference_piece?: string
  marque?: string
  modele?: string
  annee?: number
  nom_piece?: string
  dossier_id?: string
  sites_ids: string[]
}

export interface PieceResult {
  site_id: string
  site_nom: string
  statut: PieceSearchStatus
  message?: string
  reference?: string
  nom?: string
  prix?: number
  devise?: string
  disponibilite?: Disponibilite
  delai_jours?: number
  image_url?: string
  produit_url?: string
  erreur?: string
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
