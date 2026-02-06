import puppeteer, { Browser, Page } from "puppeteer-core"
import chromium from "@sparticuz/chromium"
import { BaseAutomation } from "./base-automation"
import { PortailRelanceResult } from "@/lib/relance/types"
import { sanitizeErrorMessage } from "@/lib/security/credentials-masker"

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
      const isVercel = 
        process.env.VERCEL === "1" || 
        process.env.VERCEL_ENV !== undefined ||
        process.env.AWS_LAMBDA_FUNCTION_VERSION !== undefined ||
        process.env.NEXT_RUNTIME === "nodejs"

      // Vérifier si Browserless est configuré (solution pour Vercel)
      const browserlessUrl = process.env.BROWSERLESS_URL || process.env.BROWSERLESS_WS_ENDPOINT

      if (isVercel && browserlessUrl) {
        // Utiliser Browserless (service externe) pour Vercel
        try {
          console.log(`[Puppeteer] Connexion à Browserless: ${browserlessUrl.replace(/\/[^\/]*$/, '')}...`)
          
          // Browserless utilise WebSocket pour la connexion
          // Format: wss://api.browserless.io?token=YOUR_TOKEN
          // ou: https://chrome.browserless.io?token=YOUR_TOKEN (converti en ws://)
          let wsEndpoint = browserlessUrl
          if (browserlessUrl.startsWith('http://')) {
            wsEndpoint = browserlessUrl.replace('http://', 'ws://')
          } else if (browserlessUrl.startsWith('https://')) {
            wsEndpoint = browserlessUrl.replace('https://', 'wss://')
          } else if (!browserlessUrl.startsWith('ws://') && !browserlessUrl.startsWith('wss://')) {
            // Si c'est juste une URL, ajouter le protocole WebSocket
            wsEndpoint = browserlessUrl.startsWith('chrome.browserless.io') 
              ? `wss://${browserlessUrl}` 
              : `wss://${browserlessUrl}`
          }

          // Se connecter au navigateur Browserless
          this.browser = await puppeteer.connect({
            browserWSEndpoint: wsEndpoint,
          })
          
          console.log("[Puppeteer] Connecté à Browserless avec succès")
        } catch (browserlessError: any) {
          console.error("[Puppeteer] Erreur connexion Browserless:", sanitizeErrorMessage(browserlessError))
          return {
            success: false,
            action: "connexion",
            erreur: `Erreur de connexion à Browserless. Vérifiez la configuration de BROWSERLESS_URL.`,
          }
        }
      } else if (isVercel) {
        // Sur Vercel sans Browserless, essayer @sparticuz/chromium (peut ne pas fonctionner)
        try {
          const chromiumPath = await chromium.executablePath()
          const launchOptions = {
            args: chromium.args,
            defaultViewport: chromium.defaultViewport,
            executablePath: chromiumPath,
            headless: chromium.headless,
            ignoreHTTPSErrors: true,
            timeout: 30000,
          }
          
          console.log(`[Puppeteer] Configuration Vercel - executablePath: ${chromiumPath}`)
          this.browser = await puppeteer.launch(launchOptions)
        } catch (chromiumError: any) {
          console.error("[Puppeteer] Erreur configuration Chromium:", chromiumError)
          return {
            success: false,
            action: "connexion",
            erreur: `Le scraping automatique nécessite Browserless sur Vercel. Configurez BROWSERLESS_URL dans les variables d'environnement Vercel.`,
          }
        }
      } else {
        // Configuration locale (développement)
        const launchOptions = {
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
        console.log("[Puppeteer] Configuration locale")
        this.browser = await puppeteer.launch(launchOptions)
      }

      this.page = await this.browser.newPage()

      // Configuration timeout plus court pour serverless
      const timeout = isVercel ? 30000 : 60000
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
      console.error("[Puppeteer] Connection error:", sanitizeErrorMessage(error))
      return {
        success: false,
        action: "connexion",
        erreur: sanitizeErrorMessage(error) || "Erreur de connexion au portail",
      }
    }
  }

  private async performLogin(): Promise<void> {
    if (!this.page) return

    try {
      // Attendre que le formulaire soit visible
      if (this.selectors.login_username) {
        await this.page.waitForSelector(this.selectors.login_username, { timeout: 10000 })
        await this.page.type(this.selectors.login_username, this.credentials.login || "", { delay: 100 })
      }
      
      if (this.selectors.login_password) {
        await this.page.type(this.selectors.login_password, this.credentials.password || "", { delay: 100 })
      }
      
      if (this.selectors.login_submit) {
        // Attendre que le bouton soit activé (certains sites désactivent le bouton au chargement)
        await this.page.waitForFunction(
          (selector) => {
            const button = document.querySelector(selector) as HTMLButtonElement
            return button && !button.disabled
          },
          { timeout: 10000 },
          this.selectors.login_submit
        )
        
        // Simuler un mouvement de souris pour activer le bouton si nécessaire
        await this.page.mouse.move(100, 100)
        await this.wait(500)
        
        await this.page.click(this.selectors.login_submit)
        await this.page.waitForNavigation({ waitUntil: "networkidle2", timeout: 20000 })
        await this.wait(2000) // Attendre le chargement complet après connexion
      }
    } catch (error) {
      console.error("[Puppeteer] Login error:", sanitizeErrorMessage(error))
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
      // Naviguer vers le dashboard si navigation_path est défini
      if (this.selectors.navigation_path) {
        const currentUrl = this.page.url()
        const baseUrl = new URL(currentUrl).origin
        const dashboardUrl = `${baseUrl}${this.selectors.navigation_path}`
        
        console.log(`[Puppeteer] Navigation vers dashboard: ${dashboardUrl}`)
        await this.page.goto(dashboardUrl, {
          waitUntil: "networkidle2",
          timeout: 30000,
        })
        await this.wait(2000) // Attendre le chargement complet
      }

      // Déterminer quel champ de recherche utiliser
      let searchSelector: string | undefined
      let searchValue: string

      if (numeroSinistre && this.selectors.search_input_numero_sinistre) {
        // Recherche par numéro de sinistre
        searchSelector = this.selectors.search_input_numero_sinistre
        searchValue = numeroSinistre
      } else if (immatriculation && this.selectors.search_input_immatriculation) {
        // Recherche par immatriculation
        searchSelector = this.selectors.search_input_immatriculation
        searchValue = immatriculation.replace(/\s/g, "").toUpperCase() // Nettoyer l'immatriculation
      } else if (this.selectors.search_input) {
        // Fallback sur search_input générique
        searchSelector = this.selectors.search_input
        searchValue = numeroSinistre || immatriculation || ""
      } else {
        return {
          success: false,
          action: "recherche",
          erreur: "Aucun sélecteur de recherche disponible",
        }
      }

      if (!searchSelector) {
        return {
          success: false,
          action: "recherche",
          erreur: "Aucun sélecteur de recherche configuré",
        }
      }

      // Attendre que le champ de recherche soit visible
      console.log(`[Puppeteer] Recherche avec selector: ${searchSelector}, valeur: ${searchValue}`)
      await this.page.waitForSelector(searchSelector, { timeout: 15000 })
      
      // Effacer le champ avant de taper
      await this.page.click(searchSelector, { clickCount: 3 })
      await this.wait(500)
      await this.page.type(searchSelector, searchValue, { delay: 100 })
      await this.wait(500)

      // Appuyer sur Entrée pour valider la recherche (data-search-on-enter-key="true")
      await this.page.keyboard.press("Enter")
      
      // Attendre que la recherche se termine (le tableau se met à jour)
      // On attend soit qu'une ligne apparaisse, soit qu'un message "aucun résultat" apparaisse
      try {
        // Attendre que le tableau soit mis à jour (disparition du loader ou apparition de résultats)
        await this.page.waitForFunction(
          () => {
            // Vérifier si le loader a disparu
            const loader = document.querySelector('.fixed-table-loading')
            if (loader && (loader as HTMLElement).style.display !== 'none') {
              return false
            }
            // Vérifier si des lignes sont présentes
            const rows = document.querySelectorAll('#table_dossiers tbody tr')
            return rows.length > 0 || document.body.textContent?.includes('Aucun')
          },
          { timeout: 10000 }
        )
        await this.wait(1000) // Attendre un peu plus pour être sûr
      } catch {
        // Si le timeout est atteint, continuer quand même
        console.log("[Puppeteer] Timeout lors de l'attente des résultats, continuation...")
        await this.wait(2000)
      }

      // Vérifier si des résultats sont présents
      if (this.selectors.dossier_row) {
        try {
          const rows = await this.page.$$(this.selectors.dossier_row)
          if (rows.length > 0) {
            console.log(`[Puppeteer] ${rows.length} dossier(s) trouvé(s) dans les résultats`)
          } else {
            console.log("[Puppeteer] Aucun dossier trouvé dans les résultats")
            return {
              success: true,
              action: "recherche",
              dossier_trouve: false,
              details: {
                numero_sinistre: numeroSinistre,
                immatriculation,
              },
            }
          }
        } catch {
          console.log("[Puppeteer] Aucun dossier trouvé dans les résultats")
          return {
            success: true,
            action: "recherche",
            dossier_trouve: false,
            details: {
              numero_sinistre: numeroSinistre,
              immatriculation,
            },
          }
        }
      }

      return {
        success: true,
        action: "recherche",
        dossier_trouve: true,
        details: {
          numero_sinistre: numeroSinistre,
          immatriculation,
        },
      }
    } catch (error: any) {
      console.error("[Puppeteer] Search error:", sanitizeErrorMessage(error))
      return {
        success: false,
        action: "recherche",
        erreur: sanitizeErrorMessage(error) || "Erreur lors de la recherche",
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
      console.error("[Puppeteer] Send message error:", sanitizeErrorMessage(error))
      return {
        success: false,
        action: "message_envoye",
        erreur: sanitizeErrorMessage(error) || "Erreur lors de l'envoi du message",
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
      // Si on est sur la page de recherche, cliquer sur la première ligne de résultat
      if (this.selectors.dossier_row) {
        try {
          console.log("[Puppeteer] Clic sur la ligne du dossier")
          await this.page.waitForSelector(this.selectors.dossier_row, { timeout: 5000 })
          
          // Cliquer sur la première ligne trouvée
          await this.page.click(this.selectors.dossier_row)
          
          // Attendre la navigation vers la page de dossier
          await this.page.waitForNavigation({ waitUntil: "networkidle2", timeout: 15000 })
          await this.wait(2000) // Attendre le chargement complet
        } catch (error) {
          console.error("[Puppeteer] Erreur lors du clic sur le dossier:", sanitizeErrorMessage(error))
          return {
            success: false,
            action: "rapport_telecharge",
            erreur: "Impossible de cliquer sur le dossier",
          }
        }
      }

      // Aller dans l'onglet Documents si nécessaire
      if (this.selectors.documents_tab) {
        try {
          console.log("[Puppeteer] Ouverture de l'onglet Documents")
          await this.page.waitForSelector(this.selectors.documents_tab, { timeout: 10000 })
          await this.page.click(this.selectors.documents_tab)
          await this.wait(2000) // Attendre le chargement de l'onglet
        } catch (error) {
          console.error("[Puppeteer] Erreur lors de l'ouverture de l'onglet Documents:", sanitizeErrorMessage(error))
          // Continuer quand même, peut-être que l'onglet est déjà ouvert
        }
      }

      // Chercher le bouton de téléchargement du rapport
      if (this.selectors.rapport_link) {
        try {
          console.log("[Puppeteer] Recherche du bouton de téléchargement")
          await this.page.waitForSelector(this.selectors.rapport_link, { timeout: 10000 })
          
          // Récupérer le path du PDF depuis l'attribut path du bouton
          const pdfPath = await this.page.evaluate((selector) => {
            const button = document.querySelector(selector) as HTMLElement
            return button?.getAttribute("path") || null
          }, this.selectors.rapport_link)

          if (pdfPath) {
            console.log(`[Puppeteer] PDF trouvé avec path: ${pdfPath}`)
            
            // Cliquer sur le bouton pour déclencher le téléchargement
            // Le site fait un appel AJAX pour récupérer le PDF, on doit intercepter la réponse
            try {
              const [response] = await Promise.all([
                this.page.waitForResponse(
                  (response) => {
                    const url = response.url()
                    return (url.includes("/reparateurs/get_document") || url.includes("get_document")) && response.status() === 200
                  },
                  { timeout: 20000 }
                ).catch(() => null),
                this.page.click(this.selectors.rapport_link),
              ])

              if (response) {
                console.log("[Puppeteer] Réponse AJAX interceptée")
                // Récupérer le PDF depuis la réponse
                const pdfData = await response.json()
                
                // Le PDF est retourné en base64 dans la réponse JSON
                if (pdfData && typeof pdfData === "string") {
                  // Convertir base64 en Buffer
                  const pdfBuffer = Buffer.from(pdfData, "base64")
                  
                  console.log(`[Puppeteer] PDF téléchargé, taille: ${pdfBuffer.length} bytes`)
                  
                  return {
                    success: true,
                    action: "rapport_telecharge",
                    rapport_trouve: true,
                    rapport_url: pdfPath,
                    pdf_buffer: pdfBuffer,
                    details: {
                      link_found: true,
                      pdf_path: pdfPath,
                      pdf_size: pdfBuffer.length,
                    },
                  }
                } else {
                  console.warn("[Puppeteer] Format de réponse PDF inattendu:", typeof pdfData)
                }
              } else {
                console.warn("[Puppeteer] Aucune réponse AJAX interceptée, le PDF pourrait s'ouvrir dans un nouvel onglet")
              }
            } catch (error) {
              console.error("[Puppeteer] Erreur lors du téléchargement du PDF:", sanitizeErrorMessage(error))
            }

            // Si on n'a pas pu intercepter la réponse, retourner au moins l'URL
            return {
              success: true,
              action: "rapport_telecharge",
              rapport_trouve: true,
              rapport_url: pdfPath,
              details: {
                link_found: true,
                pdf_path: pdfPath,
              },
            }
          } else {
            // Essayer de récupérer l'URL href si pas d'attribut path
            const href = await this.page.evaluate((selector) => {
              const button = document.querySelector(selector) as HTMLAnchorElement
              return button?.href || null
            }, this.selectors.rapport_link)

            if (href) {
              return {
                success: true,
                action: "rapport_telecharge",
                rapport_trouve: true,
                rapport_url: href,
                details: {
                  link_found: true,
                  link_href: href,
                },
              }
            }
          }
        } catch (error) {
          console.error("[Puppeteer] Erreur lors de la recherche du rapport:", sanitizeErrorMessage(error))
          return {
            success: false,
            action: "rapport_telecharge",
            erreur: sanitizeErrorMessage(error) || "Erreur lors de la recherche du rapport",
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
      console.error("[Puppeteer] Check rapport error:", sanitizeErrorMessage(error))
      return {
        success: false,
        action: "rapport_telecharge",
        erreur: sanitizeErrorMessage(error) || "Erreur lors de la vérification du rapport",
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
      console.error("[Puppeteer] Cleanup error:", sanitizeErrorMessage(error))
    }
  }
}
