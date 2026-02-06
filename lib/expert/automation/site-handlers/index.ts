import { ExpertSite } from "@/lib/expert/types"
import { BaseAutomation } from "../base-automation"
import { PlaywrightAutomation } from "../playwright-automation"

/**
 * Factory pour créer le bon handler d'automation selon le site
 * Utilise PlaywrightAutomation par défaut (meilleure compatibilité Vercel)
 * Plus tard, on pourra créer des handlers spécifiques par site
 */
export function createAutomationHandler(site: ExpertSite): BaseAutomation {
  // Exemple de switch pour handlers spécifiques (à implémenter plus tard)
  // switch (site.id) {
  //   case "experts-groupe":
  //     return new ExpertsGroupeHandler(site)
  //   case "bca-expertise":
  //     return new BCAExpertiseHandler(site)
  //   default:
  //     return new PlaywrightAutomation(site)
  // }

  return new PlaywrightAutomation(site)
}

/**
 * Vérifie si l'automation est disponible pour un site
 */
export function isAutomationAvailable(site: ExpertSite): boolean {
  // Vérifier que le site a les infos minimales pour l'automation
  return !!(
    site.url_recherche &&
    site.actif &&
    (site.type_auth === "none" || (site.credentials && Object.keys(site.credentials).length > 0))
  )
}
