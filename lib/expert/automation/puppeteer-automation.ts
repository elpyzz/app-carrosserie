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

  /**
   * Helper pour vérifier que le navigateur et la page sont toujours connectés
   */
  private async ensureBrowserConnected(): Promise<void> {
    if (!this.browser) {
      throw new Error("Browser not initialized")
    }
    
    // Vérifier que le navigateur est toujours connecté
    try {
      const pages = await this.browser.pages()
      if (pages.length === 0) {
        throw new Error("Browser has no pages")
      }
    } catch (error: any) {
      if (error.message?.includes("Target closed") || error.message?.includes("Session closed")) {
        throw new Error("Browser connection lost. Please retry the operation.")
      }
      throw error
    }
    
    if (!this.page) {
      throw new Error("Page not initialized")
    }
    
    // Vérifier que la page est toujours connectée
    try {
      await this.page.evaluate(() => document.readyState)
    } catch (error: any) {
      if (error.message?.includes("Target closed") || error.message?.includes("Session closed")) {
        throw new Error("Page connection lost. Please retry the operation.")
      }
      throw error
    }
  }

  /**
   * Helper pour s'assurer que la page est attachée avant utilisation
   * Récupère automatiquement une nouvelle page si elle est détachée
   */
  private async ensurePageAttached(operation: string = "opération"): Promise<void> {
    if (!this.page) {
      console.log(`[Puppeteer] ensurePageAttached(${operation}): Page null, récupération...`)
      if (this.browser) {
        const pages = await this.browser.pages()
        if (pages.length > 0) {
          this.page = pages[pages.length - 1]
          await this.wait(1000)
          console.log(`[Puppeteer] ensurePageAttached(${operation}): Page récupérée depuis le navigateur`)
          return
        } else {
          this.page = await this.browser.newPage()
          await this.wait(1000)
          console.log(`[Puppeteer] ensurePageAttached(${operation}): Nouvelle page créée`)
          return
        }
      }
      throw new Error("Browser and page not initialized")
    }

    // Vérifier que la page est toujours attachée
    try {
      await this.page.evaluate(() => document.readyState)
    } catch (error: any) {
      // Si la page est détachée, récupérer une nouvelle page
      if (error.message?.includes("detached") || error.message?.includes("Target closed") || error.message?.includes("Session closed")) {
        console.log(`[Puppeteer] ensurePageAttached(${operation}): Page détachée détectée (${error.message}), récupération...`)
        if (this.browser) {
          const pages = await this.browser.pages()
          if (pages.length > 0) {
            this.page = pages[pages.length - 1]
            await this.wait(2000)
            console.log(`[Puppeteer] ensurePageAttached(${operation}): Nouvelle page récupérée`)
          } else {
            this.page = await this.browser.newPage()
            await this.wait(2000)
            console.log(`[Puppeteer] ensurePageAttached(${operation}): Nouvelle page créée`)
          }
        }
      } else {
        console.error(`[Puppeteer] ensurePageAttached(${operation}): Erreur inattendue:`, error.message)
        throw error
      }
    }
  }

  async connect(): Promise<PortailRelanceResult> {
    console.log(`[Puppeteer] connect: Début de la connexion à ${this.site.url_recherche}`)
    
    // Retry jusqu'à 3 fois en cas de déconnexion
    let lastError: any = null
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        console.log(`[Puppeteer] connect: Tentative de connexion ${attempt}/3`)
      
      // Configuration pour Vercel (serverless)
      const isVercel = 
        process.env.VERCEL === "1" || 
        process.env.VERCEL_ENV !== undefined ||
        process.env.AWS_LAMBDA_FUNCTION_VERSION !== undefined ||
        process.env.NEXT_RUNTIME === "nodejs"

        console.log(`[Puppeteer] connect: Environnement détecté: ${isVercel ? "Vercel" : "local"}`)

        // Vérifier si Browserless est configuré (solution pour Vercel)
        const browserlessUrl = process.env.BROWSERLESS_URL || process.env.BROWSERLESS_WS_ENDPOINT
        console.log(`[Puppeteer] connect: Browserless configuré: ${browserlessUrl ? "OUI" : "NON"}`)
        if (browserlessUrl) {
          // Masquer le token pour la sécurité
          const maskedUrl = browserlessUrl.replace(/(token=)[^&]+/, '$1***')
          console.log(`[Puppeteer] connect: Browserless URL (masquée): ${maskedUrl}`)
        }

        if (isVercel && browserlessUrl) {
          // Utiliser Browserless (service externe) pour Vercel
          try {
            console.log(`[Puppeteer] connect: Tentative de connexion à Browserless...`)
            
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

            // Masquer le token pour la sécurité
            const maskedWsEndpoint = wsEndpoint.replace(/(token=)[^&]+/, '$1***')
            console.log(`[Puppeteer] connect: WebSocket endpoint (masqué): ${maskedWsEndpoint}`)

            // Se connecter au navigateur Browserless avec timeout
            this.browser = await puppeteer.connect({
              browserWSEndpoint: wsEndpoint,
              defaultViewport: null,
            })
            
            console.log("[Puppeteer] connect: Connecté à Browserless avec succès")
          } catch (browserlessError: any) {
            console.error(`[Puppeteer] connect: Erreur connexion Browserless (${browserlessError.message}):`, sanitizeErrorMessage(browserlessError))
            console.error("[Puppeteer] connect: Détails erreur:", {
              message: browserlessError?.message,
              code: browserlessError?.code,
              stack: browserlessError?.stack?.substring(0, 200)
            })
            throw new Error(`Erreur de connexion à Browserless: ${sanitizeErrorMessage(browserlessError)}. Vérifiez que BROWSERLESS_WS_ENDPOINT est correctement configuré dans Vercel avec le format: wss://chrome.browserless.io?token=VOTRE_TOKEN`)
          }
        } else if (isVercel) {
          // Sur Vercel sans Browserless, essayer @sparticuz/chromium (peut ne pas fonctionner)
          console.log(`[Puppeteer] connect: Browserless non configuré, tentative avec @sparticuz/chromium...`)
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
            
            console.log(`[Puppeteer] connect: Configuration Vercel - executablePath: ${chromiumPath}`)
            this.browser = await puppeteer.launch(launchOptions)
            console.log(`[Puppeteer] connect: Chromium lancé avec succès`)
          } catch (chromiumError: any) {
            console.error(`[Puppeteer] connect: Erreur configuration Chromium (${chromiumError.message}):`, chromiumError)
            throw new Error(`Le scraping automatique nécessite Browserless sur Vercel. Configurez BROWSERLESS_WS_ENDPOINT dans les variables d'environnement Vercel avec la valeur: wss://chrome.browserless.io?token=VOTRE_TOKEN`)
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
          console.log("[Puppeteer] connect: Configuration locale")
          this.browser = await puppeteer.launch(launchOptions)
          console.log(`[Puppeteer] connect: Navigateur local lancé avec succès`)
        }

        this.page = await this.browser.newPage()
        console.log(`[Puppeteer] connect: Page créée`)

        // Configuration timeout - AUGMENTÉ pour Browserless qui peut être plus lent
        const timeout = isVercel ? 60000 : 60000 // 60 secondes même sur Vercel avec Browserless
        await this.page.setDefaultTimeout(timeout)
        await this.page.setDefaultNavigationTimeout(timeout)
        console.log(`[Puppeteer] connect: Timeouts configurés: ${timeout}ms`)

        // User agent pour éviter la détection
        await this.page.setUserAgent(
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36"
        )
        console.log(`[Puppeteer] connect: User agent configuré`)

        console.log(`[Puppeteer] connect: Navigation vers ${this.site.url_recherche}...`)
        try {
          // Utiliser "load" au lieu de "domcontentloaded" pour être plus permissif
          // "load" attend que la page soit chargée mais ne bloque pas sur les ressources lentes
          await this.page.goto(this.site.url_recherche, {
            waitUntil: "load", // CHANGÉ: plus permissif que domcontentloaded
            timeout: timeout,
          })
          console.log(`[Puppeteer] connect: Page chargée (load), attente supplémentaire pour les scripts...`)
          await this.wait(5000) // Attendre 5 secondes pour que les scripts se chargent (augmenté)
          console.log(`[Puppeteer] connect: Attente terminée, page prête`)
        } catch (navError: any) {
          console.error(`[Puppeteer] connect: Erreur lors de la navigation (${navError.message}):`, sanitizeErrorMessage(navError))
          // Si la navigation échoue, essayer quand même de continuer
          console.log(`[Puppeteer] connect: Tentative de continuation malgré l'erreur de navigation...`)
          await this.wait(5000)
        }

        // Si authentification par formulaire requise
        if (this.site.type_auth === "form" && this.credentials.login && this.credentials.password) {
          console.log(`[Puppeteer] connect: Authentification requise, début du login...`)
          await this.performLogin()
          console.log(`[Puppeteer] connect: Login terminé avec succès`)
        }

        console.log(`[Puppeteer] connect: Connecté avec succès (${isVercel ? "Vercel" : "local"})`)

        return {
          success: true,
          action: "connexion",
          details: {
            url: this.site.url_recherche,
            auth_type: this.site.type_auth,
            environment: isVercel ? "vercel" : "local",
            attempt: attempt,
          },
        }
      } catch (error: any) {
        lastError = error
        console.error(`[Puppeteer] connect: Tentative ${attempt} échouée:`, sanitizeErrorMessage(error))
        
        // Nettoyer la connexion précédente
        try {
          if (this.browser) {
            await this.browser.close()
          }
        } catch {}
        this.browser = null
        this.page = null
        
        // Si c'est la dernière tentative, arrêter
        if (attempt === 3) {
          break
        }
        
        // Attendre avant de réessayer
        console.log(`[Puppeteer] connect: Attente de 2 secondes avant nouvelle tentative...`)
        await this.wait(2000)
      }
    }
    
    // Toutes les tentatives ont échoué
    return {
      success: false,
      action: "connexion",
      erreur: `Impossible de se connecter après 3 tentatives. Dernière erreur: ${sanitizeErrorMessage(lastError)}`,
    }
  }

  private async performLogin(): Promise<void> {
    if (!this.page) {
      console.error(`[Puppeteer] performLogin: Page non initialisée`)
      return
    }

    console.log(`[Puppeteer] performLogin: Début du processus de connexion...`)

    try {
      // Vérifier que le navigateur est toujours connecté
      console.log(`[Puppeteer] performLogin: Vérification de la connexion du navigateur...`)
      await this.ensureBrowserConnected()
      console.log(`[Puppeteer] performLogin: Navigateur connecté`)
      
      // Attendre que le formulaire soit visible - TIMEOUT AUGMENTÉ à 60s
      if (this.selectors.login_username) {
        console.log(`[Puppeteer] performLogin: Attente du sélecteur login: ${this.selectors.login_username}`)
        try {
          await this.ensurePageAttached("waitForSelector login_username")
          await this.page.waitForSelector(this.selectors.login_username, { timeout: 60000 })
          console.log(`[Puppeteer] performLogin: Sélecteur login trouvé, saisie de l'email...`)
          
          // Vérifier à nouveau avant de taper
          await this.ensurePageAttached("type login_username")
          await this.page.type(this.selectors.login_username, this.credentials.login || "", { delay: 100 })
        } catch (error: any) {
          console.error(`[Puppeteer] performLogin: Erreur lors de la saisie de l'email:`, error.message)
          if (error.message?.includes("Target closed") || error.message?.includes("connection lost") || error.message?.includes("detached")) {
            throw new Error("Browser connection lost during login. Please retry.")
          }
          throw error
        }
      }
      
      if (this.selectors.login_password) {
        console.log(`[Puppeteer] performLogin: Saisie du mot de passe...`)
        try {
          await this.ensurePageAttached("type login_password")
          await this.page.type(this.selectors.login_password, this.credentials.password || "", { delay: 100 })
        } catch (error: any) {
          console.error(`[Puppeteer] performLogin: Erreur lors de la saisie du mot de passe:`, error.message)
          if (error.message?.includes("Target closed") || error.message?.includes("connection lost") || error.message?.includes("detached")) {
            throw new Error("Browser connection lost during login. Please retry.")
          }
          throw error
        }
      }
      
      if (this.selectors.login_submit) {
        console.log(`[Puppeteer] performLogin: Attente du bouton de connexion: ${this.selectors.login_submit}`)
        
        // Attendre que le bouton existe (plus rapide que waitForFunction qui attend l'activation)
        try {
          await this.ensurePageAttached("waitForSelector login_submit")
          await this.page.waitForSelector(this.selectors.login_submit, { timeout: 10000 })
          console.log(`[Puppeteer] performLogin: Bouton de connexion trouvé`)
        } catch (error: any) {
          console.error(`[Puppeteer] performLogin: Erreur lors de l'attente du bouton:`, error.message)
          if (error.message?.includes("Target closed") || error.message?.includes("connection lost") || error.message?.includes("detached")) {
            throw new Error("Browser connection lost while waiting for login button. Please retry.")
          }
          throw error
        }
        
        // Vérifier si le bouton est désactivé et essayer de l'activer
        try {
          await this.ensurePageAttached("evaluate isDisabled")
          const isDisabled = await this.page.evaluate((selector) => {
            const button = document.querySelector(selector) as HTMLButtonElement
            return button?.disabled || false
          }, this.selectors.login_submit)
          
          if (isDisabled) {
            console.log(`[Puppeteer] performLogin: Bouton désactivé, tentative d'activation...`)
            // Simuler un mouvement de souris pour activer le bouton
            await this.ensurePageAttached("mouse move")
            await this.page.mouse.move(100, 100)
            await this.wait(500)
            // Essayer de cliquer sur le champ pour déclencher les événements
            if (this.selectors.login_username) {
              await this.ensurePageAttached("click login_username to activate")
              await this.page.click(this.selectors.login_username)
              await this.wait(200)
            }
          }
        } catch (error: any) {
          console.error(`[Puppeteer] performLogin: Erreur lors de la vérification du bouton:`, error.message)
          // Continuer quand même
        }
        
        console.log(`[Puppeteer] performLogin: Clic sur le bouton de connexion...`)
        
        try {
          await this.ensurePageAttached("mouse move before click")
          // Simuler un mouvement de souris pour activer le bouton si nécessaire
          await this.page.mouse.move(100, 100)
          await this.wait(500)
          
          await this.ensurePageAttached("click login_submit")
          await this.page.click(this.selectors.login_submit)
        } catch (error: any) {
          console.error(`[Puppeteer] performLogin: Erreur lors du clic sur le bouton:`, error.message)
          if (error.message?.includes("Target closed") || error.message?.includes("connection lost") || error.message?.includes("detached")) {
            throw new Error("Browser connection lost while clicking login button. Please retry.")
          }
          throw error
        }
        console.log(`[Puppeteer] Attente de la navigation après connexion...`)
        
        // Au lieu d'attendre la navigation directement, attendre un changement d'URL ou un élément
        try {
          await this.ensurePageAttached("get currentUrl")
          // Option 1: Attendre que l'URL change (plus robuste que waitForNavigation)
          const currentUrl = this.page.url()
          console.log(`[Puppeteer] performLogin: URL actuelle: ${currentUrl}`)
          
          // Attendre jusqu'à 60 secondes que l'URL change
          try {
            await this.ensurePageAttached("waitForFunction URL change")
            await this.page.waitForFunction(
              (oldUrl) => window.location.href !== oldUrl,
              { timeout: 60000 },
              currentUrl
            )
            console.log(`[Puppeteer] performLogin: URL changée détectée`)
          } catch (waitError: any) {
            // Si le waitForFunction échoue, attendre simplement quelques secondes
            console.log(`[Puppeteer] performLogin: waitForFunction timeout (${waitError.message}), attente fixe...`)
            await this.wait(5000)
          }
          
          // Attendre un peu plus pour que la page se charge
          await this.wait(2000)
          
          try {
            await this.ensurePageAttached("get newUrl")
            const newUrl = this.page.url()
            console.log(`[Puppeteer] performLogin: Nouvelle URL après connexion: ${newUrl}`)
          } catch (urlError: any) {
            // Si on ne peut pas obtenir l'URL, la page a peut-être changé
            console.log(`[Puppeteer] performLogin: Impossible d'obtenir l'URL (${urlError.message}), page peut-être changée`)
            // Récupérer une nouvelle page
            await this.ensurePageAttached("recover page after URL error")
          }
          
        } catch (error: any) {
          console.error(`[Puppeteer] performLogin: Erreur lors de la navigation:`, error.message)
          // Si l'erreur est "frame detached", c'est normal - la page a changé
          if (error.message?.includes("frame was detached") || error.message?.includes("detached Frame") || error.message?.includes("Target closed")) {
            console.log(`[Puppeteer] performLogin: Frame détaché (normal lors de la navigation), récupération...`)
            await this.wait(3000)
            // Vérifier que la page est toujours accessible
            try {
              await this.ensurePageAttached("recover page after frame detached")
              const url = this.page.url()
              console.log(`[Puppeteer] performLogin: URL après frame détaché: ${url}`)
            } catch (recoverError: any) {
              console.log(`[Puppeteer] performLogin: Erreur lors de la récupération (${recoverError.message}), nouvelle tentative...`)
              // Si la page n'est plus accessible, récupérer une nouvelle page
              if (this.browser) {
                const pages = await this.browser.pages()
                if (pages.length > 0) {
                  this.page = pages[pages.length - 1]
                  await this.wait(3000) // Attendre que la nouvelle page se charge
                  console.log(`[Puppeteer] performLogin: Nouvelle page récupérée depuis le navigateur`)
                }
              }
            }
          } else if (error.message?.includes("connection lost")) {
            throw new Error("Browser connection lost during navigation. Please retry.")
          } else {
            // Autre erreur, continuer quand même
            console.log(`[Puppeteer] performLogin: Erreur navigation (non bloquante):`, sanitizeErrorMessage(error))
            await this.wait(3000)
          }
        }
        
        console.log(`[Puppeteer] Navigation après connexion terminée, attente supplémentaire...`)
        await this.wait(2000)
        console.log(`[Puppeteer] Connexion réussie`)
      }
    } catch (error) {
      console.error("[Puppeteer] Login error:", sanitizeErrorMessage(error))
      
      // Vérifier si c'est une erreur de connexion perdue
      if (error instanceof Error && (error.message.includes("Target closed") || error.message.includes("connection lost"))) {
        throw new Error("La connexion au navigateur a été perdue. Cela peut arriver si Browserless se déconnecte. Veuillez réessayer.")
      }
      
      // Prendre une capture d'écran pour debug si possible
      if (this.page) {
        try {
          const screenshot = await this.page.screenshot({ encoding: 'base64' })
          console.log("[Puppeteer] Screenshot de la page lors de l'erreur (premiers 100 caractères):", screenshot.substring(0, 100))
        } catch (screenshotError) {
          console.log("[Puppeteer] Impossible de prendre une capture d'écran")
        }
      }
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
      // Vérifier que la page est toujours attachée (peut être détachée après le login)
      try {
        console.log(`[Puppeteer] searchDossier: Vérification de la connexion du navigateur...`)
        await this.ensureBrowserConnected()
        console.log(`[Puppeteer] searchDossier: Navigateur connecté`)
      } catch (error: any) {
        console.error(`[Puppeteer] searchDossier: Erreur connexion navigateur (${error.message})`)
        // Si la page est détachée, récupérer une nouvelle page
        if (error.message?.includes("detached") || error.message?.includes("Target closed")) {
          console.log(`[Puppeteer] searchDossier: Page détachée, récupération d'une nouvelle page...`)
          if (this.browser) {
            const pages = await this.browser.pages()
            if (pages.length > 0) {
              this.page = pages[pages.length - 1]
              await this.wait(2000) // Attendre que la nouvelle page se charge
              console.log(`[Puppeteer] searchDossier: Nouvelle page récupérée`)
            } else {
              // Créer une nouvelle page si aucune n'existe
              this.page = await this.browser.newPage()
              await this.wait(2000)
              console.log(`[Puppeteer] searchDossier: Nouvelle page créée`)
            }
          }
        } else {
          throw error
        }
      }

      // Naviguer vers le dashboard si navigation_path est défini
      if (this.selectors.navigation_path) {
        try {
          await this.ensurePageAttached("get currentUrl for dashboard")
          const currentUrl = this.page.url()
          const baseUrl = new URL(currentUrl).origin
          const dashboardUrl = `${baseUrl}${this.selectors.navigation_path}`
          
          console.log(`[Puppeteer] searchDossier: Navigation vers dashboard: ${dashboardUrl}`)
          await this.ensurePageAttached("goto dashboard")
          await this.page.goto(dashboardUrl, {
            waitUntil: "load", // CHANGÉ: load au lieu de domcontentloaded
            timeout: 30000,
          })
          console.log(`[Puppeteer] searchDossier: Dashboard chargé, attente supplémentaire...`)
          await this.wait(3000) // Attendre le chargement complet (augmenté à 3s)
        } catch (navError: any) {
          console.error(`[Puppeteer] searchDossier: Erreur navigation dashboard (${navError.message})`)
          // Si l'erreur est "frame detached", continuer quand même
          if (navError.message?.includes("frame was detached") || navError.message?.includes("detached Frame") || navError.message?.includes("Target closed")) {
            console.log(`[Puppeteer] searchDossier: Frame détaché lors de la navigation vers dashboard, récupération...`)
            await this.wait(3000)
            // Récupérer la page actuelle
            if (this.browser) {
              const pages = await this.browser.pages()
              if (pages.length > 0) {
                this.page = pages[pages.length - 1]
                await this.wait(2000)
                console.log(`[Puppeteer] searchDossier: Page récupérée après frame détaché`)
              }
            }
          } else {
            // Autre erreur, continuer quand même
            console.log(`[Puppeteer] searchDossier: Erreur navigation non bloquante, continuation...`)
            await this.wait(3000)
          }
        }
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
      try {
        await this.ensurePageAttached("waitForSelector recherche")
        await this.page.waitForSelector(searchSelector, { timeout: 15000 })
      } catch (error: any) {
        console.error(`[Puppeteer] Erreur waitForSelector recherche:`, error.message)
        throw new Error(`Erreur lors de l'attente du champ de recherche: ${error.message}`)
      }
      
      // Effacer le champ avant de taper
      try {
        await this.ensurePageAttached("click recherche")
        await this.page.click(searchSelector, { clickCount: 3 })
        await this.wait(500)
      } catch (error: any) {
        console.error(`[Puppeteer] Erreur click recherche:`, error.message)
        throw new Error(`Erreur lors du clic sur le champ de recherche: ${error.message}`)
      }
      
      try {
        await this.ensurePageAttached("type recherche")
        await this.page.type(searchSelector, searchValue, { delay: 100 })
        await this.wait(500)
      } catch (error: any) {
        console.error(`[Puppeteer] Erreur type recherche:`, error.message)
        throw new Error(`Erreur lors de la saisie dans le champ de recherche: ${error.message}`)
      }

      // Appuyer sur Entrée pour valider la recherche (data-search-on-enter-key="true")
      try {
        await this.ensurePageAttached("keyboard press")
        await this.page.keyboard.press("Enter")
      } catch (error: any) {
        console.error(`[Puppeteer] Erreur keyboard press:`, error.message)
        throw new Error(`Erreur lors de la validation de la recherche: ${error.message}`)
      }
      
      // Attendre que la recherche se termine (le tableau se met à jour)
      // On attend soit qu'une ligne apparaisse, soit qu'un message "aucun résultat" apparaisse
      try {
        await this.ensurePageAttached("waitForFunction résultats recherche")
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
          { timeout: 20000 } // TIMEOUT AUGMENTÉ à 20s
        )
        await this.wait(1000) // Attendre un peu plus pour être sûr
        console.log(`[Puppeteer] searchDossier: Résultats de recherche chargés`)
      } catch (error: any) {
        // Si le timeout est atteint, continuer quand même
        console.log(`[Puppeteer] searchDossier: Timeout lors de l'attente des résultats (${error.message}), continuation...`)
        await this.wait(2000)
      }

      // Vérifier si des résultats sont présents
      if (this.selectors.dossier_row) {
        try {
          await this.ensurePageAttached("$$ dossier_row")
          const rows = await this.page.$$(this.selectors.dossier_row)
          if (rows.length > 0) {
            console.log(`[Puppeteer] searchDossier: ${rows.length} dossier(s) trouvé(s) dans les résultats`)
          } else {
            console.log("[Puppeteer] searchDossier: Aucun dossier trouvé dans les résultats")
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
        } catch (error: any) {
          console.error(`[Puppeteer] searchDossier: Erreur lors de la vérification des résultats (${error.message})`)
          console.log("[Puppeteer] searchDossier: Aucun dossier trouvé dans les résultats")
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
      // Vérifier que la page est attachée au début
      console.log(`[Puppeteer] sendRelanceMessage: Début, vérification de la page...`)
      await this.ensurePageAttached("sendRelanceMessage start")
      console.log(`[Puppeteer] sendRelanceMessage: Page vérifiée`)
      
      // Chercher et remplir le formulaire de message
      if (this.selectors.message_textarea) {
        try {
          await this.ensurePageAttached("waitForSelector message_textarea")
          await this.page.waitForSelector(this.selectors.message_textarea, { timeout: 20000 }) // TIMEOUT AUGMENTÉ à 20s
          await this.ensurePageAttached("type message_textarea")
          await this.page.type(this.selectors.message_textarea, message)
          console.log(`[Puppeteer] sendRelanceMessage: Message saisi (${message.length} caractères)`)
        } catch (error: any) {
          console.error(`[Puppeteer] sendRelanceMessage: Erreur lors de la saisie du message (${error.message})`)
          throw error
        }
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
        try {
          await this.ensurePageAttached("click message_submit")
          await this.page.click(this.selectors.message_submit)
          await this.wait(2000) // Attendre l'envoi
          console.log(`[Puppeteer] sendRelanceMessage: Message envoyé`)
        } catch (error: any) {
          console.error(`[Puppeteer] sendRelanceMessage: Erreur lors de l'envoi du message (${error.message})`)
          throw error
        }
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
      // Vérifier que la page est attachée au début
      console.log(`[Puppeteer] checkAndDownloadRapport: Début, vérification de la page...`)
      await this.ensurePageAttached("checkAndDownloadRapport start")
      console.log(`[Puppeteer] checkAndDownloadRapport: Page vérifiée`)
      
      // Si on est sur la page de recherche, cliquer sur la première ligne de résultat
      if (this.selectors.dossier_row) {
        try {
          console.log("[Puppeteer] checkAndDownloadRapport: Clic sur la ligne du dossier")
          await this.ensurePageAttached("waitForSelector dossier_row")
          await this.page.waitForSelector(this.selectors.dossier_row, { timeout: 15000 }) // TIMEOUT AUGMENTÉ à 15s
          
          // Cliquer sur la première ligne trouvée
          await this.ensurePageAttached("click dossier_row")
          await this.page.click(this.selectors.dossier_row)
          console.log(`[Puppeteer] checkAndDownloadRapport: Clic effectué, attente navigation...`)
          
          // Attendre la navigation vers la page de dossier
          try {
            await this.ensurePageAttached("waitForNavigation dossier")
            await this.page.waitForNavigation({ waitUntil: "load", timeout: 20000 }) // CHANGÉ: load
            console.log(`[Puppeteer] checkAndDownloadRapport: Page de dossier chargée, attente supplémentaire...`)
            await this.wait(3000) // Attendre le chargement complet (augmenté à 3s)
          } catch (navError: any) {
            console.error(`[Puppeteer] checkAndDownloadRapport: Erreur navigation (${navError.message})`)
            // Si frame détaché, récupérer la page
            if (navError.message?.includes("frame was detached") || navError.message?.includes("detached Frame") || navError.message?.includes("Target closed")) {
              console.log(`[Puppeteer] checkAndDownloadRapport: Frame détaché lors de la navigation, récupération...`)
              await this.ensurePageAttached("recover after frame detached")
              await this.wait(3000)
            } else {
              // Autre erreur, continuer quand même
              console.log(`[Puppeteer] checkAndDownloadRapport: Erreur navigation non bloquante, continuation...`)
              await this.wait(3000)
            }
          }
        } catch (error: any) {
          console.error(`[Puppeteer] checkAndDownloadRapport: Erreur lors du clic sur le dossier (${error.message}):`, sanitizeErrorMessage(error))
          return {
            success: false,
            action: "rapport_telecharge",
            erreur: `Impossible de cliquer sur le dossier: ${error.message}`,
          }
        }
      }

      // Aller dans l'onglet Documents si nécessaire
      if (this.selectors.documents_tab) {
        try {
          console.log("[Puppeteer] checkAndDownloadRapport: Ouverture de l'onglet Documents")
          await this.ensurePageAttached("waitForSelector documents_tab")
          await this.page.waitForSelector(this.selectors.documents_tab, { timeout: 20000 }) // TIMEOUT AUGMENTÉ à 20s
          await this.ensurePageAttached("click documents_tab")
          await this.page.click(this.selectors.documents_tab)
          await this.wait(2000) // Attendre le chargement de l'onglet
          console.log(`[Puppeteer] checkAndDownloadRapport: Onglet Documents ouvert`)
        } catch (error: any) {
          console.error(`[Puppeteer] checkAndDownloadRapport: Erreur lors de l'ouverture de l'onglet Documents (${error.message}):`, sanitizeErrorMessage(error))
          // Continuer quand même, peut-être que l'onglet est déjà ouvert
        }
      }

      // Chercher le bouton de téléchargement du rapport
      if (this.selectors.rapport_link) {
        try {
          console.log("[Puppeteer] checkAndDownloadRapport: Recherche du bouton de téléchargement")
          await this.ensurePageAttached("waitForSelector rapport_link")
          await this.page.waitForSelector(this.selectors.rapport_link, { timeout: 20000 }) // TIMEOUT AUGMENTÉ à 20s
          
          // Récupérer le path du PDF depuis l'attribut path du bouton
          await this.ensurePageAttached("evaluate pdfPath")
          const pdfPath = await this.page.evaluate((selector) => {
            const button = document.querySelector(selector) as HTMLElement
            return button?.getAttribute("path") || null
          }, this.selectors.rapport_link)

          if (pdfPath) {
            console.log(`[Puppeteer] PDF trouvé avec path: ${pdfPath}`)
            
            // Cliquer sur le bouton pour déclencher le téléchargement
            // Le site fait un appel AJAX pour récupérer le PDF, on doit intercepter la réponse
            try {
              console.log(`[Puppeteer] checkAndDownloadRapport: Clic sur le bouton PDF et attente de la réponse AJAX...`)
              await this.ensurePageAttached("click rapport_link and waitForResponse")
              const [response] = await Promise.all([
                this.page.waitForResponse(
                  (response) => {
                    const url = response.url()
                    return (url.includes("/reparateurs/get_document") || url.includes("get_document")) && response.status() === 200
                  },
                  { timeout: 20000 }
                ).catch((error: any) => {
                  console.error(`[Puppeteer] checkAndDownloadRapport: Erreur waitForResponse (${error.message})`)
                  return null
                }),
                this.page.click(this.selectors.rapport_link).catch((error: any) => {
                  console.error(`[Puppeteer] checkAndDownloadRapport: Erreur click rapport_link (${error.message})`)
                  throw error
                }),
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
      // Vérifier si la page existe et est encore connectée avant de la fermer
      if (this.page) {
        try {
          // Vérifier que la page est encore connectée
          await this.page.evaluate(() => document.readyState).catch(() => {
            // Si la page est déjà fermée, on ne fait rien
            this.page = null
            return
          })
          await this.page.close()
        } catch (error: any) {
          // Ignorer les erreurs si la page est déjà fermée
          if (!error.message?.includes("Target closed") && !error.message?.includes("Connection closed")) {
            console.error("[Puppeteer] Erreur fermeture page:", sanitizeErrorMessage(error))
          }
        }
        this.page = null
      }
      
      // Vérifier si le navigateur existe et est encore connecté avant de le fermer
      if (this.browser) {
        try {
          // Vérifier que le navigateur est encore connecté
          const pages = await this.browser.pages().catch(() => [])
          if (pages.length > 0) {
            // Si c'est une connexion Browserless, on ne ferme pas (c'est géré par Browserless)
            const isConnected = this.browser.isConnected()
            if (isConnected) {
              await this.browser.close()
            }
          }
        } catch (error: any) {
          // Ignorer les erreurs si le navigateur est déjà fermé
          if (!error.message?.includes("Target closed") && !error.message?.includes("Connection closed")) {
            console.error("[Puppeteer] Erreur fermeture navigateur:", sanitizeErrorMessage(error))
          }
        }
        this.browser = null
      }
    } catch (error) {
      // Ne pas logger les erreurs de cleanup si c'est juste une connexion fermée
      const errorMessage = error instanceof Error ? error.message : String(error)
      if (!errorMessage.includes("Target closed") && !errorMessage.includes("Connection closed")) {
        console.error("[Puppeteer] Cleanup error:", sanitizeErrorMessage(error))
      }
    }
  }
}
