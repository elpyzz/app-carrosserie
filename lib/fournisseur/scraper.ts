import { SupplierSite, PieceSearchCriteria, PieceResult } from "./types"
import { 
  createSupplierAutomationHandler, 
  isSupplierAutomationAvailable 
} from "./automation/site-handlers"

/**
 * Flag pour activer/désactiver le scraper réel
 * Mettre à "true" dans les variables d'environnement pour activer
 */
const USE_REAL_SCRAPER = process.env.ENABLE_SUPPLIER_SCRAPER === "true"

/**
 * Recherche une pièce sur un site fournisseur
 */
export async function searchOnSupplierSite(
  site: SupplierSite,
  criteria: PieceSearchCriteria
): Promise<PieceResult> {
  // Si le scraper réel n'est pas activé, retourner mock
  if (!USE_REAL_SCRAPER) {
    return getMockResult(site, criteria)
  }

  // Vérifier si l'automation est disponible pour ce site
  if (!isSupplierAutomationAvailable(site)) {
    return {
      site_id: site.id,
      site_nom: site.nom,
      statut: "erreur",
      message: "Site non configuré",
      erreur: "URL de recherche manquante, site inactif, ou credentials manquants",
    }
  }

  // Créer le handler et exécuter la recherche
  const automation = createSupplierAutomationHandler(site)
  
  try {
    const result = await automation.executeSearch(criteria)
    return result
  } catch (error: any) {
    console.error(`[SupplierScraper] Error for ${site.nom}:`, error)
    return {
      site_id: site.id,
      site_nom: site.nom,
      statut: "erreur",
      message: "Erreur lors du scraping",
      erreur: error.message || "Erreur inconnue",
    }
  }
  // Note: cleanup() est appelé dans executeSearch() via finally
}

/**
 * Résultat mock pour les tests ou si le scraper n'est pas activé
 */
function getMockResult(site: SupplierSite, criteria: PieceSearchCriteria): Promise<PieceResult> {
  // Simuler un délai
  const delay = 500 + Math.random() * 1000
  
  return new Promise((resolve) => {
    setTimeout(() => {
      // 70% de chance de trouver
      const found = Math.random() > 0.3
      
      if (found) {
        resolve({
          site_id: site.id,
          site_nom: site.nom,
          statut: "trouve",
          message: "Pièce trouvée (mock)",
          reference: criteria.reference_piece || `REF-${Math.random().toString(36).substring(7).toUpperCase()}`,
          nom: criteria.nom_piece || "Pièce détachée",
          prix: Math.round((50 + Math.random() * 200) * 100) / 100,
          devise: "EUR",
          disponibilite: Math.random() > 0.5 ? "en_stock" : "sur_commande",
          delai_jours: Math.random() > 0.5 ? undefined : Math.ceil(Math.random() * 5),
        })
      } else {
        resolve({
          site_id: site.id,
          site_nom: site.nom,
          statut: "non_trouve",
          message: "Aucune pièce trouvée (mock)",
        })
      }
    }, delay)
  })
}
