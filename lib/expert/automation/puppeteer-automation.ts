import puppeteer, { Browser, Page } from "puppeteer-core"
import chromium from "@sparticuz/chromium"
import { BaseAutomation } from "./base-automation"
import { PortailRelanceResult } from "@/lib/relance/types"

export class PuppeteerAutomation extends BaseAutomation {
  private browser: Browser | null = null
  private page: Page | null = null

  /**
   * Helper pour attendre (remplace waitForTimeout déprécié)
   */
  private async wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  async connect(): Promise<PortailRelanceResult> {
    try {
      // Configuration pour Vercel (serverless)
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

      // Configuration timeout plus court pour serverless
      const timeout = isVercel ? 25000 : 60000
      await this.page.setDefaultTimeout(timeout)
      await this.page.setDefaultNavigationTimeout(timeout)

      // User agent pour éviter la détection
      await this.page.setUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36"
      )

      await this.page.goto(this.site.url_recherche, {
        waitUntil: "networkidle2",
        timeout: timeout,
      })

      // Si authentification par formulaire requise
      if (this.site.type_auth === "form" && this.credentials.login && this.credentials.password) {
        await this.performLogin()
      }

      console.log(`[Puppeteer] Connecté (${isVercel ? "Vercel" : "local"})`)

      return {
        success: true,
        action: "connexion",
        details: {
          url: this.site.url_recherche,
          auth_type: this.site.type_auth,
          environment: isVercel ? "vercel" : "local",
        },
      }
    } catch (error: any) {
      console.error("[Puppeteer] Connection error:", error)
      return {
        success: false,
        action: "connexion",
        erreur: error.message || "Erreur de connexion au portail",
      }
    }
  }

  private async performLogin(): Promise<void> {
    if (!this.page) return

    try {
      // Attendre que le formulaire soit visible
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
    } catch (error) {
      console.error("[Puppeteer] Login error:", error)
      throw error
    }
  }

  async searchDossier(
    numeroSinistre: string,
    immatriculation?: string
  ): Promise<PortailRelanceResult> {
    if (!this.page) {
      return {
        success: false,
        action: "recherche",
        erreur: "Page not initialized - call connect() first",
      }
    }

    try {
      // Remplir le formulaire de recherche
      if (this.selectors.search_input) {
        await this.page.waitForSelector(this.selectors.search_input, { timeout: 10000 })
        
        // Effacer le champ avant de taper
        await this.page.click(this.selectors.search_input, { clickCount: 3 })
        await this.page.type(this.selectors.search_input, numeroSinistre)
      }
      
      if (this.selectors.search_submit) {
        await this.page.click(this.selectors.search_submit)
        await this.wait(3000) // Attendre les résultats
      }

      return {
        success: true,
        action: "recherche",
        details: {
          numero_sinistre: numeroSinistre,
          immatriculation,
        },
      }
    } catch (error: any) {
      console.error("[Puppeteer] Search error:", error)
      return {
        success: false,
        action: "recherche",
        erreur: error.message || "Erreur lors de la recherche",
      }
    }
  }

  async sendRelanceMessage(message: string): Promise<PortailRelanceResult> {
    if (!this.page) {
      return {
        success: false,
        action: "message_envoye",
        erreur: "Page not initialized",
      }
    }

    try {
      // Chercher et remplir le formulaire de message
      if (this.selectors.message_textarea) {
        await this.page.waitForSelector(this.selectors.message_textarea, { timeout: 10000 })
        await this.page.type(this.selectors.message_textarea, message)
      } else {
        // Si pas de sélecteur de message, on considère que c'est OK (certains portails n'ont pas cette fonctionnalité)
        return {
          success: true,
          action: "message_envoye",
          message: "Aucun formulaire de message disponible sur ce portail",
          details: {
            no_message_form: true,
          },
        }
      }
      
      if (this.selectors.message_submit) {
        await this.page.click(this.selectors.message_submit)
        await this.wait(2000) // Attendre l'envoi
      }

      return {
        success: true,
        action: "message_envoye",
        details: {
          message_length: message.length,
        },
      }
    } catch (error: any) {
      console.error("[Puppeteer] Send message error:", error)
      return {
        success: false,
        action: "message_envoye",
        erreur: error.message || "Erreur lors de l'envoi du message",
      }
    }
  }

  async checkAndDownloadRapport(): Promise<PortailRelanceResult> {
    if (!this.page) {
      return {
        success: false,
        action: "rapport_telecharge",
        erreur: "Page not initialized",
      }
    }

    try {
      // Chercher le lien de téléchargement du rapport
      if (this.selectors.rapport_link) {
        const rapportLink = await this.page.$(this.selectors.rapport_link)
        
        if (rapportLink) {
          const href = await this.page.evaluate(
            (el) => el.getAttribute("href"),
            rapportLink
          )
          
          return {
            success: true,
            action: "rapport_telecharge",
            rapport_trouve: true,
            rapport_url: href || undefined,
            details: {
              link_found: true,
              link_href: href,
            },
          }
        }
      }

      // Rapport non trouvé
      return {
        success: true,
        action: "rapport_telecharge",
        rapport_trouve: false,
        details: {
          link_found: false,
          selector_used: this.selectors.rapport_link,
        },
      }
    } catch (error: any) {
      console.error("[Puppeteer] Check rapport error:", error)
      return {
        success: false,
        action: "rapport_telecharge",
        erreur: error.message || "Erreur lors de la vérification du rapport",
      }
    }
  }

  async cleanup(): Promise<void> {
    try {
      if (this.page) {
        await this.page.close()
        this.page = null
      }
      if (this.browser) {
        await this.browser.close()
        this.browser = null
      }
    } catch (error) {
      console.error("[Puppeteer] Cleanup error:", error)
    }
  }
}
