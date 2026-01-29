import { SupplierSite, PieceSearchCriteria, PieceResult } from "../types"

export interface SupplierAutomationCredentials {
  login?: string
  password?: string
  api_key?: string
  token?: string
  [key: string]: string | undefined
}

export interface SupplierAutomationSelectors {
  // Authentification
  login_form?: string
  login_username?: string
  login_password?: string
  login_submit?: string
  
  // Recherche
  search_form?: string
  search_input?: string
  search_input_reference?: string
  search_input_marque?: string
  search_input_modele?: string
  search_input_annee?: string
  search_input_nom_piece?: string
  search_submit?: string
  
  // Résultats
  results_container?: string
  result_item?: string
  result_reference?: string
  result_nom?: string
  result_prix?: string
  result_disponibilite?: string
  result_delai?: string
  result_image?: string
  result_link?: string
  
  // Pagination (optionnel)
  next_page?: string
  
  [key: string]: string | undefined
}

export abstract class BaseSupplierAutomation {
  protected site: SupplierSite
  protected credentials: SupplierAutomationCredentials
  protected selectors: SupplierAutomationSelectors

  constructor(site: SupplierSite) {
    this.site = site
    this.credentials = this.parseCredentials(site.credentials)
    this.selectors = this.parseSelectors(site.selectors)
  }

  protected parseCredentials(credentials: unknown): SupplierAutomationCredentials {
    if (!credentials) return {}
    if (typeof credentials === "string") {
      try {
        return JSON.parse(credentials)
      } catch {
        return {}
      }
    }
    return (credentials as SupplierAutomationCredentials) || {}
  }

  protected parseSelectors(selectors: unknown): SupplierAutomationSelectors {
    if (!selectors) return {}
    if (typeof selectors === "string") {
      try {
        return JSON.parse(selectors)
      } catch {
        return {}
      }
    }
    return (selectors as SupplierAutomationSelectors) || {}
  }

  /**
   * Vérifie si les selectors minimaux sont configurés
   */
  protected hasMinimalSelectors(): boolean {
    return !!(
      this.selectors.search_input || 
      this.selectors.search_input_reference ||
      this.selectors.search_input_nom_piece
    )
  }

  /**
   * Se connecter au site fournisseur
   */
  abstract connect(): Promise<{ success: boolean; error?: string }>

  /**
   * Rechercher une pièce sur le site
   */
  abstract searchPiece(criteria: PieceSearchCriteria): Promise<PieceResult>

  /**
   * Nettoyer les ressources (fermer navigateur, etc.)
   */
  abstract cleanup(): Promise<void>

  /**
   * Exécute une recherche complète (connect + search + cleanup)
   */
  async executeSearch(criteria: PieceSearchCriteria): Promise<PieceResult> {
    try {
      // Vérifier les selectors
      if (!this.hasMinimalSelectors()) {
        return {
          site_id: this.site.id,
          site_nom: this.site.nom,
          statut: "erreur",
          message: "Configuration incomplète",
          erreur: "Selectors de recherche non configurés pour ce site",
        }
      }

      // 1. Connexion
      const connectResult = await this.connect()
      if (!connectResult.success) {
        return {
          site_id: this.site.id,
          site_nom: this.site.nom,
          statut: "erreur",
          message: "Erreur de connexion",
          erreur: connectResult.error || "Impossible de se connecter au site",
        }
      }

      // 2. Recherche
      const searchResult = await this.searchPiece(criteria)
      return searchResult

    } catch (error: any) {
      console.error(`[SupplierAutomation] Error for ${this.site.nom}:`, error)
      return {
        site_id: this.site.id,
        site_nom: this.site.nom,
        statut: "erreur",
        message: "Erreur lors de la recherche",
        erreur: error.message || "Erreur inconnue",
      }
    } finally {
      // TOUJOURS nettoyer les ressources
      await this.cleanup()
    }
  }
}
