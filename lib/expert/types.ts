export type ExpertSiteAuthType = "none" | "form" | "api"

export type ExpertSearchStatus = "en_cours" | "trouve" | "non_trouve" | "erreur"

export interface ExpertSite {
  id: string
  nom: string
  url_recherche: string
  type_auth: ExpertSiteAuthType
  credentials: Record<string, any> | null
  selectors: Record<string, string> | null
  actif: boolean
  created_at: string
  updated_at: string
}

export interface ExpertSearchCriteria {
  numero_dossier?: string
  immatriculation?: string
  date_sinistre?: string
  sites_ids: string[]
  dossier_id?: string
}

export interface ExpertSearchResult {
  site_id: string
  site_nom: string
  statut: ExpertSearchStatus
  message?: string
  pdf_url?: string
  pdf_nom?: string
  pdf_taille?: number
  pdf_date?: string
  erreur?: string
  pdf_stored?: boolean
  pdf_stored_id?: string
  pdf_download_url?: string
}

export interface ExpertSearch {
  id: string
  dossier_id: string | null
  numero_dossier: string | null
  immatriculation: string | null
  date_sinistre: string | null
  sites_interroges: string[]
  statut: ExpertSearchStatus
  resultats: ExpertSearchResult[]
  rapport_pdf_path: string | null
  created_at: string
  updated_at: string
}
