import { SupplierSite } from "@/lib/fournisseur/types"
import { BaseSupplierAutomation } from "../base-supplier-automation"
import { PuppeteerSupplierAutomation } from "../puppeteer-supplier-automation"

/**
 * Factory pour créer le bon handler d'automatisation selon le site
 */
export function createSupplierAutomationHandler(site: SupplierSite): BaseSupplierAutomation {
  // Pour l'instant, utilise PuppeteerSupplierAutomation par défaut
  // Plus tard, on pourra créer des handlers spécifiques par site :
  //
  // switch (site.nom.toLowerCase()) {
  //   case "autodoc":
  //     return new AutoDocHandler(site)
  //   case "oscaro":
  //     return new OscaroHandler(site)
  //   default:
  //     return new PuppeteerSupplierAutomation(site)
  // }

  return new PuppeteerSupplierAutomation(site)
}

/**
 * Vérifie si l'automation est disponible pour un site
 */
export function isSupplierAutomationAvailable(site: SupplierSite): boolean {
  // Vérifications de base
  if (!site.url_recherche) {
    console.warn(`[SupplierAutomation] Site ${site.nom}: URL de recherche manquante`)
    return false
  }

  if (!site.actif) {
    console.warn(`[SupplierAutomation] Site ${site.nom}: Site inactif`)
    return false
  }

  // Si authentification requise, vérifier les credentials
  if (site.type_auth === "form") {
    const credentials = parseJSON(site.credentials)
    if (!credentials.login || !credentials.password) {
      console.warn(`[SupplierAutomation] Site ${site.nom}: Credentials manquants`)
      return false
    }
  }

  return true
}

/**
 * Parse JSON de manière sécurisée
 */
function parseJSON(value: unknown): Record<string, any> {
  if (!value) return {}
  if (typeof value === "string") {
    try {
      return JSON.parse(value)
    } catch {
      return {}
    }
  }
  return (value as Record<string, any>) || {}
}
