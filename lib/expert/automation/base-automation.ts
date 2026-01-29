import { ExpertSite } from "@/lib/expert/types"
import { PortailRelanceResult } from "@/lib/relance/types"

export interface AutomationCredentials {
  login?: string
  password?: string
  api_key?: string
  token?: string
  [key: string]: string | undefined
}

export interface AutomationSelectors {
  login_form?: string
  login_username?: string
  login_password?: string
  login_submit?: string
  search_form?: string
  search_input?: string
  search_submit?: string
  message_form?: string
  message_textarea?: string
  message_submit?: string
  rapport_link?: string
  [key: string]: string | undefined
}

export abstract class BaseAutomation {
  protected site: ExpertSite
  protected credentials: AutomationCredentials
  protected selectors: AutomationSelectors

  constructor(site: ExpertSite) {
    this.site = site
    this.credentials = this.parseCredentials(site.credentials)
    this.selectors = this.parseSelectors(site.selectors)
  }

  protected parseCredentials(credentials: unknown): AutomationCredentials {
    if (typeof credentials === "string") {
      try {
        return JSON.parse(credentials)
      } catch {
        return {}
      }
    }
    return (credentials as AutomationCredentials) || {}
  }

  protected parseSelectors(selectors: unknown): AutomationSelectors {
    if (typeof selectors === "string") {
      try {
        return JSON.parse(selectors)
      } catch {
        return {}
      }
    }
    return (selectors as AutomationSelectors) || {}
  }

  /**
   * Se connecter au portail expert
   */
  abstract connect(): Promise<PortailRelanceResult>

  /**
   * Rechercher un dossier sur le portail
   */
  abstract searchDossier(
    numeroSinistre: string,
    immatriculation?: string
  ): Promise<PortailRelanceResult>

  /**
   * Envoyer un message de relance via le portail
   */
  abstract sendRelanceMessage(message: string): Promise<PortailRelanceResult>

  /**
   * Vérifier et télécharger le rapport si disponible
   */
  abstract checkAndDownloadRapport(): Promise<PortailRelanceResult>

  /**
   * Nettoyer les ressources (fermer navigateur, etc.)
   */
  abstract cleanup(): Promise<void>

  /**
   * Exécute une relance complète
   */
  async executeRelance(
    numeroSinistre: string,
    immatriculation: string,
    message: string
  ): Promise<PortailRelanceResult> {
    try {
      // 1. Connexion
      const connectResult = await this.connect()
      if (!connectResult.success) {
        return connectResult
      }

      // 2. Recherche dossier
      const searchResult = await this.searchDossier(numeroSinistre, immatriculation)
      if (!searchResult.success) {
        return searchResult
      }

      // 3. Vérifier si rapport disponible
      const rapportResult = await this.checkAndDownloadRapport()
      if (rapportResult.success && rapportResult.rapport_trouve) {
        return {
          success: true,
          action: "rapport_telecharge",
          rapport_trouve: true,
          rapport_url: rapportResult.rapport_url,
          details: rapportResult.details,
        }
      }

      // 4. Envoyer message relance
      const messageResult = await this.sendRelanceMessage(message)
      return messageResult
    } catch (error: any) {
      return {
        success: false,
        action: "recherche",
        erreur: error.message || "Erreur inconnue lors de la relance portail",
      }
    }
  }
}
