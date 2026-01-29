import puppeteer from "puppeteer-core"
import type { Browser, Page } from "puppeteer-core"
import chromium from "@sparticuz/chromium"
import { BaseSupplierAutomation } from "./base-supplier-automation"
import { SupplierSite, PieceSearchCriteria, PieceResult, Disponibilite } from "../types"
import { sanitizeErrorMessage } from "@/lib/security/credentials-masker"

export class PuppeteerSupplierAutomation extends BaseSupplierAutomation {
  private browser: Browser | null = null
  private page: Page | null = null

  constructor(site: SupplierSite) {
    super(site)
  }

  /**
   * Attendre un délai (remplace waitForTimeout qui est deprecated)
   */
  private async wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  /**
   * Se connecter au site
   */
  async connect(): Promise<{ success: boolean; error?: string }> {
    try {
      // Configuration Vercel vs local
      const isVercel = process.env.VERCEL === "1" || process.env.AWS_LAMBDA_FUNCTION_VERSION

      let launchOptions: any

      if (isVercel) {
        // Configuration Vercel/Serverless
        launchOptions = {
          args: chromium.args,
          defaultViewport: chromium.defaultViewport,
          executablePath: await chromium.executablePath(),
          headless: chromium.headless,
          ignoreHTTPSErrors: true,
        }
      } else {
        // Configuration locale (développement)
        launchOptions = {
          headless: true,
          args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--disable-accelerated-2d-canvas",
            "--disable-gpu",
            "--window-size=1920,1080",
          ],
          executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
        }
      }

      this.browser = await puppeteer.launch(launchOptions)
      this.page = await this.browser.newPage()

      // Timeouts
      const timeout = isVercel ? 25000 : 60000
      this.page.setDefaultTimeout(timeout)
      this.page.setDefaultNavigationTimeout(timeout)

      // User agent pour éviter la détection
      await this.page.setUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36"
      )

      // Aller sur le site
      await this.page.goto(this.site.url_recherche, {
        waitUntil: "networkidle2",
        timeout: timeout,
      })

      // Authentification si nécessaire
      if (this.site.type_auth === "form" && this.credentials.login && this.credentials.password) {
        await this.performLogin()
      }

      console.log(`[PuppeteerSupplier] Connecté à ${this.site.nom} (${isVercel ? "Vercel" : "local"})`)
      return { success: true }

        } catch (error: any) {
          console.error(`[PuppeteerSupplier] Connection error for ${this.site.nom}:`, sanitizeErrorMessage(error))
          return {
            success: false,
            error: sanitizeErrorMessage(error) || "Erreur de connexion au site",
          }
        }
  }

  /**
   * Effectuer le login
   */
  private async performLogin(): Promise<void> {
    if (!this.page) return

    try {
      // Attendre le formulaire de login
      if (this.selectors.login_username) {
        await this.page.waitForSelector(this.selectors.login_username, { timeout: 10000 })
        await this.page.type(this.selectors.login_username, this.credentials.login || "")
      }

      if (this.selectors.login_password) {
        await this.page.type(this.selectors.login_password, this.credentials.password || "")
      }

      if (this.selectors.login_submit) {
        await this.page.click(this.selectors.login_submit)
        await this.page.waitForNavigation({ waitUntil: "networkidle2", timeout: 15000 })
      }

      console.log(`[PuppeteerSupplier] Login réussi sur ${this.site.nom}`)
    } catch (error: any) {
      console.error(`[PuppeteerSupplier] Login error for ${this.site.nom}:`, sanitizeErrorMessage(error))
      throw new Error(`Échec de l'authentification: ${sanitizeErrorMessage(error)}`)
    }
  }

  /**
   * Rechercher une pièce
   */
  async searchPiece(criteria: PieceSearchCriteria): Promise<PieceResult> {
    if (!this.page) {
      return {
        site_id: this.site.id,
        site_nom: this.site.nom,
        statut: "erreur",
        erreur: "Page non initialisée",
      }
    }

    try {
      // Remplir le formulaire de recherche
      await this.fillSearchForm(criteria)

      // Soumettre la recherche
      if (this.selectors.search_submit) {
        await this.page.click(this.selectors.search_submit)
        await this.wait(3000) // Attendre les résultats
      } else {
        // Si pas de bouton submit, essayer Enter
        await this.page.keyboard.press("Enter")
        await this.wait(3000)
      }

      // Extraire les résultats
      const results = await this.extractResults()

      if (results.length === 0) {
        return {
          site_id: this.site.id,
          site_nom: this.site.nom,
          statut: "non_trouve",
          message: "Aucune pièce trouvée pour ces critères",
        }
      }

      // Retourner le premier résultat (le meilleur match)
      const bestResult = results[0]
      return {
        site_id: this.site.id,
        site_nom: this.site.nom,
        statut: "trouve",
        message: "Pièce trouvée avec succès",
        reference: bestResult.reference || undefined,
        nom: bestResult.nom || undefined,
        prix: bestResult.prix,
        devise: bestResult.devise || "EUR",
        disponibilite: bestResult.disponibilite,
        delai_jours: bestResult.delai_jours,
        image_url: bestResult.image_url || undefined,
        produit_url: bestResult.produit_url || undefined,
      }

    } catch (error: any) {
      console.error(`[PuppeteerSupplier] Search error for ${this.site.nom}:`, sanitizeErrorMessage(error))
      return {
        site_id: this.site.id,
        site_nom: this.site.nom,
        statut: "erreur",
        message: "Erreur lors de la recherche",
        erreur: sanitizeErrorMessage(error) || "Erreur inconnue",
      }
    }
  }

  /**
   * Remplir le formulaire de recherche
   */
  private async fillSearchForm(criteria: PieceSearchCriteria): Promise<void> {
    if (!this.page) return

    // Recherche par référence (priorité)
    if (criteria.reference_piece && this.selectors.search_input_reference) {
      await this.page.waitForSelector(this.selectors.search_input_reference, { timeout: 10000 })
      await this.page.click(this.selectors.search_input_reference, { clickCount: 3 }) // Sélectionner tout
      await this.page.type(this.selectors.search_input_reference, criteria.reference_piece)
      return
    }

    // Recherche par input générique
    if (this.selectors.search_input) {
      const searchTerm = criteria.reference_piece || criteria.nom_piece || ""
      if (searchTerm) {
        await this.page.waitForSelector(this.selectors.search_input, { timeout: 10000 })
        await this.page.click(this.selectors.search_input, { clickCount: 3 })
        await this.page.type(this.selectors.search_input, searchTerm)
        return
      }
    }

    // Recherche par champs séparés
    if (this.selectors.search_input_marque && criteria.marque) {
      await this.page.waitForSelector(this.selectors.search_input_marque, { timeout: 10000 })
      await this.page.type(this.selectors.search_input_marque, criteria.marque)
    }

    if (this.selectors.search_input_modele && criteria.modele) {
      await this.page.waitForSelector(this.selectors.search_input_modele, { timeout: 5000 })
      await this.page.type(this.selectors.search_input_modele, criteria.modele)
    }

    if (this.selectors.search_input_annee && criteria.annee) {
      await this.page.waitForSelector(this.selectors.search_input_annee, { timeout: 5000 })
      await this.page.type(this.selectors.search_input_annee, String(criteria.annee))
    }

    if (this.selectors.search_input_nom_piece && criteria.nom_piece) {
      await this.page.waitForSelector(this.selectors.search_input_nom_piece, { timeout: 5000 })
      await this.page.type(this.selectors.search_input_nom_piece, criteria.nom_piece)
    }
  }

  /**
   * Extraire les résultats de la page
   */
  private async extractResults(): Promise<Array<{
    reference?: string
    nom?: string
    prix?: number
    devise?: string
    disponibilite?: Disponibilite
    delai_jours?: number
    image_url?: string
    produit_url?: string
  }>> {
    if (!this.page) return []

    // Si pas de container de résultats configuré, impossible d'extraire
    if (!this.selectors.results_container) {
      console.warn(`[PuppeteerSupplier] Pas de results_container configuré pour ${this.site.nom}`)
      return []
    }

    try {
      // Attendre les résultats
      await this.page.waitForSelector(this.selectors.results_container, { timeout: 10000 })

      // Extraire les données
      const selectors = this.selectors
      const results = await this.page.evaluate((sel) => {
        const container = document.querySelector(sel.results_container || "")
        if (!container) return []

        const itemSelector = sel.result_item || "div"
        const items = Array.from(container.querySelectorAll(itemSelector))

        return items.slice(0, 10).map((item) => { // Limiter à 10 résultats
          // Helpers
          const getText = (selector: string | undefined): string => {
            if (!selector) return ""
            const el = item.querySelector(selector)
            return el?.textContent?.trim() || ""
          }

          const getHref = (selector: string | undefined): string => {
            if (!selector) return ""
            const el = item.querySelector(selector)
            return (el as HTMLAnchorElement)?.href || ""
          }

          const getSrc = (selector: string | undefined): string => {
            if (!selector) return ""
            const el = item.querySelector(selector)
            return (el as HTMLImageElement)?.src || ""
          }

          // Extraire le prix
          const prixText = getText(sel.result_prix)
          const prixClean = prixText.replace(/[^\d.,]/g, "").replace(",", ".")
          const prix = parseFloat(prixClean)

          // Déterminer la disponibilité
          const dispoText = getText(sel.result_disponibilite).toLowerCase()
          let disponibilite: "en_stock" | "sur_commande" | "indisponible" = "indisponible"
          if (dispoText.includes("stock") || dispoText.includes("disponible") || dispoText.includes("immédiat")) {
            disponibilite = "en_stock"
          } else if (dispoText.includes("commande") || dispoText.includes("délai") || dispoText.includes("jours")) {
            disponibilite = "sur_commande"
          }

          // Extraire le délai
          const delaiText = getText(sel.result_delai)
          const delaiMatch = delaiText.match(/(\d+)/)
          const delai_jours = delaiMatch ? parseInt(delaiMatch[1]) : undefined

          return {
            reference: getText(sel.result_reference),
            nom: getText(sel.result_nom),
            prix: isNaN(prix) ? undefined : prix,
            disponibilite,
            delai_jours,
            image_url: getSrc(sel.result_image),
            produit_url: getHref(sel.result_link),
          }
        })
      }, selectors)

      // Filtrer les résultats vides
      return results.filter(r => r.nom || r.reference || r.prix)

        } catch (error: any) {
          console.error(`[PuppeteerSupplier] Extract results error for ${this.site.nom}:`, sanitizeErrorMessage(error))
          return []
        }
  }

  /**
   * Nettoyer les ressources
   */
  async cleanup(): Promise<void> {
    try {
      if (this.page) {
        await this.page.close().catch(() => {})
        this.page = null
      }
      if (this.browser) {
        await this.browser.close().catch(() => {})
        this.browser = null
      }
      console.log(`[PuppeteerSupplier] Cleanup done for ${this.site.nom}`)
        } catch (error) {
          console.error(`[PuppeteerSupplier] Cleanup error for ${this.site.nom}:`, sanitizeErrorMessage(error))
          // Ne pas throw, le cleanup doit toujours réussir
        }
  }
}
