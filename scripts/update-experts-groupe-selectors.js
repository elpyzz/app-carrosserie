/**
 * Script pour mettre à jour les sélecteurs CSS du site "Experts Groupe"
 * 
 * Utilisation:
 * 1. Ouvrez la console du navigateur (F12) sur votre application
 * 2. Copiez-collez ce script et exécutez-le
 */

const updateSelectors = async () => {
  try {
    const response = await fetch('/api/expert/sites/update-selectors', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        site_nom: 'Experts Groupe',
        selectors: {
          "login_username": "#email",
          "login_password": "#password",
          "login_submit": "#login_btn",
          "navigation_path": "/espace-documentaire",
          "search_input_numero_sinistre": "input.bootstrap-table-filter-control-Numero_Sinistre",
          "search_input_immatriculation": "input.bootstrap-table-filter-control-Immat",
          "dossier_row": "#table_dossiers tbody tr",
          "documents_tab": "a.nav-item:contains('Documents'), button:has-text('Documents')",
          "rapport_link": "button[path], a[path]"
        }
      })
    })

    const data = await response.json()
    
    if (data.success) {
      console.log('✅ Succès:', data.message)
      console.log('Sélecteurs mis à jour:', data.site)
    } else {
      console.error('❌ Erreur:', data.error)
    }
    
    return data
  } catch (error) {
    console.error('❌ Erreur lors de la mise à jour:', error)
    throw error
  }
}

// Exécuter le script
updateSelectors()
