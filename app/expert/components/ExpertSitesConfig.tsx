"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useSupabaseClient } from "@/lib/hooks/useSupabaseClient"
import { ExpertSite, ExpertSiteAuthType } from "@/lib/expert/types"
import {
  Settings,
  Plus,
  Edit,
  Trash2,
  Globe,
  Key,
  Loader2,
  AlertCircle,
  CheckCircle2,
  X,
} from "lucide-react"

export function ExpertSitesConfig() {
  const [sites, setSites] = useState<ExpertSite[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingSite, setEditingSite] = useState<ExpertSite | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  const supabase = useSupabaseClient()

  // Charger les sites
  const loadSites = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/expert/sites")
      const data = await response.json()

      if (data.success && data.sites) {
        setSites(data.sites)
      } else {
        setError(data.error || "Erreur lors du chargement")
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadSites()
  }, [loadSites])

  // Supprimer un site
  const handleDelete = async (siteId: string, siteName: string) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer le site "${siteName}" ?`)) {
      return
    }

    try {
      const response = await fetch(`/api/expert/sites/${siteId}`, {
        method: "DELETE",
      })

      const data = await response.json()

      if (data.success) {
        loadSites()
      } else {
        alert(`Erreur: ${data.error}`)
      }
    } catch (error: any) {
      alert(`Erreur lors de la suppression: ${error.message}`)
    }
  }

  // Ouvrir le modal pour ajouter
  const handleAdd = () => {
    setEditingSite(null)
    setShowModal(true)
  }

  // Ouvrir le modal pour modifier
  const handleEdit = (site: ExpertSite) => {
    setEditingSite(site)
    setShowModal(true)
  }

  // Fermer le modal et recharger
  const handleModalClose = () => {
    setShowModal(false)
    setEditingSite(null)
  }

  const handleModalSave = () => {
    setShowModal(false)
    setEditingSite(null)
    loadSites()
  }

  if (loading) {
    return (
      <Card className="card-gradient">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card className="card-gradient">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-bordeaux-400" />
              Configuration des sites experts
            </CardTitle>
            <Button onClick={handleAdd} className="btn-primary">
              <Plus className="h-4 w-4 mr-2" />
              Ajouter un site
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="flex items-center gap-2 p-3 mb-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {sites.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Aucun site expert configuré
            </div>
          ) : (
            <div className="space-y-3">
              {sites.map((site) => (
                <div
                  key={site.id}
                  className={`flex items-center justify-between p-4 rounded-lg border ${
                    site.actif 
                      ? "bg-white border-gray-200" 
                      : "bg-gray-50 border-gray-300 opacity-60"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Globe className={`h-5 w-5 ${site.actif ? "text-green-500" : "text-gray-400"}`} />
                    <div>
                      <div className="font-medium flex items-center gap-2">
                        {site.nom}
                        {!site.actif && (
                          <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded">
                            Inactif
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">{site.url_recherche}</div>
                      <div className="text-xs text-gray-400 flex items-center gap-2 mt-1">
                        <Key className="h-3 w-3" />
                        Auth: {site.type_auth || "none"}
                        {site.credentials && (
                          <span className="text-green-600">• Identifiants configurés</span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(site)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => handleDelete(site.id, site.nom)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de configuration */}
      {showModal && (
        <SiteConfigModal
          site={editingSite}
          onClose={handleModalClose}
          onSave={handleModalSave}
        />
      )}
    </>
  )
}

// ========== MODAL DE CONFIGURATION ==========

interface SiteConfigModalProps {
  site: ExpertSite | null
  onClose: () => void
  onSave: () => void
}

function SiteConfigModal({ site, onClose, onSave }: SiteConfigModalProps) {
  const [nom, setNom] = useState(site?.nom || "")
  const [url, setUrl] = useState(site?.url_recherche || "")
  const [typeAuth, setTypeAuth] = useState<ExpertSiteAuthType>(site?.type_auth || "none")
  const [credentials, setCredentials] = useState(
    site?.credentials ? JSON.stringify(site.credentials, null, 2) : ""
  )
  const [selectors, setSelectors] = useState(
    site?.selectors ? JSON.stringify(site.selectors, null, 2) : ""
  )
  const [actif, setActif] = useState(site?.actif !== false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSave = async () => {
    setLoading(true)
    setError(null)
    setSuccess(false)

    // Validation
    if (!nom.trim()) {
      setError("Le nom du site est requis")
      setLoading(false)
      return
    }

    if (!url.trim()) {
      setError("L'URL de recherche est requise")
      setLoading(false)
      return
    }

    // Valider l'URL
    try {
      new URL(url)
    } catch {
      setError("URL invalide (doit commencer par http:// ou https://)")
      setLoading(false)
      return
    }

    // Valider le JSON des credentials si fourni
    let parsedCredentials = null
    if (credentials.trim()) {
      try {
        parsedCredentials = JSON.parse(credentials)
      } catch {
        setError("Format JSON invalide pour les identifiants")
        setLoading(false)
        return
      }
    }

    // Valider le JSON des selectors si fourni
    let parsedSelectors = null
    if (selectors.trim()) {
      try {
        parsedSelectors = JSON.parse(selectors)
      } catch {
        setError("Format JSON invalide pour les sélecteurs CSS")
        setLoading(false)
        return
      }
    }

    try {
      const apiUrl = site 
        ? `/api/expert/sites/${site.id}`
        : "/api/expert/sites"

      const method = site ? "PUT" : "POST"

      const response = await fetch(apiUrl, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nom: nom.trim(),
          url_recherche: url.trim(),
          type_auth: typeAuth,
          credentials: parsedCredentials,
          selectors: parsedSelectors,
          actif,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setSuccess(true)
        setTimeout(() => {
          onSave()
        }, 500)
      } else {
        setError(data.error || "Erreur lors de la sauvegarde")
      }
    } catch (err: any) {
      setError(err.message || "Une erreur est survenue")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>
            {site ? "Modifier le site expert" : "Ajouter un site expert"}
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Message d'erreur */}
          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Message de succès */}
          {success && (
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <p className="text-sm text-green-700">Site enregistré avec succès !</p>
            </div>
          )}

          {/* Nom du site */}
          <div>
            <Label htmlFor="nom">
              Nom du site <span className="text-red-500">*</span>
            </Label>
            <Input
              id="nom"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              placeholder="Ex: Experts Groupe"
              disabled={loading}
            />
          </div>

          {/* URL de recherche */}
          <div>
            <Label htmlFor="url">
              URL de recherche <span className="text-red-500">*</span>
            </Label>
            <Input
              id="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.experts-groupe.com/recherche"
              disabled={loading}
            />
          </div>

          {/* Type d'authentification */}
          <div>
            <Label htmlFor="type_auth">Type d'authentification</Label>
            <select
              id="type_auth"
              value={typeAuth}
              onChange={(e) => setTypeAuth(e.target.value as ExpertSiteAuthType)}
              className="w-full h-10 px-3 rounded-md border border-gray-300 bg-white"
              disabled={loading}
            >
              <option value="none">Aucune authentification</option>
              <option value="form">Formulaire de connexion</option>
              <option value="api">Clé API</option>
            </select>
          </div>

          {/* Identifiants (si auth requise) */}
          {typeAuth !== "none" && (
            <div>
              <Label htmlFor="credentials">
                Identifiants (JSON)
              </Label>
              <Textarea
                id="credentials"
                value={credentials}
                onChange={(e) => setCredentials(e.target.value)}
                placeholder={
                  typeAuth === "form"
                    ? '{\n  "login": "votre_login",\n  "password": "votre_password"\n}'
                    : '{\n  "api_key": "votre_cle_api"\n}'
                }
                className="font-mono text-sm"
                rows={4}
                disabled={loading}
              />
              <p className="text-xs text-gray-500 mt-1">
                Format JSON valide requis. Ces données sont stockées de manière sécurisée.
              </p>
            </div>
          )}

          {/* Sélecteurs CSS */}
          <div>
            <Label htmlFor="selectors">
              Sélecteurs CSS (JSON) - Pour l'automation
            </Label>
            <Textarea
              id="selectors"
              value={selectors}
              onChange={(e) => setSelectors(e.target.value)}
              placeholder={`{
  "login_username": "#username",
  "login_password": "#password",
  "login_submit": "button[type='submit']",
  "search_input": "#search-dossier",
  "search_submit": ".btn-search",
  "message_textarea": "#message",
  "message_submit": ".send-message",
  "rapport_link": "a.pdf-download"
}`}
              className="font-mono text-sm"
              rows={8}
              disabled={loading}
            />
            <p className="text-xs text-gray-500 mt-1">
              Sélecteurs CSS utilisés par le scraper pour interagir avec le site.
            </p>
          </div>

          {/* Site actif */}
          <div className="flex items-center space-x-2 pt-2">
            <input
              type="checkbox"
              id="actif"
              checked={actif}
              onChange={(e) => setActif(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
              disabled={loading}
            />
            <Label htmlFor="actif" className="cursor-pointer">
              Site actif (les relances automatiques utiliseront ce site)
            </Label>
          </div>

          {/* Boutons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Annuler
            </Button>
            <Button 
              className="btn-primary" 
              onClick={handleSave} 
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enregistrement...
                </>
              ) : (
                site ? "Modifier" : "Créer"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
