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
  
  // Champs séparés pour email et mot de passe (mode simple)
  const [email, setEmail] = useState(
    site?.credentials?.email || site?.credentials?.login || ""
  )
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  
  // Champ pour le chemin de navigation
  const [navigationPath, setNavigationPath] = useState(
    site?.selectors?.navigation_path || ""
  )
  
  // Mode avancé (JSON) - optionnel
  const [useAdvancedMode, setUseAdvancedMode] = useState(false)
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

    // Construire les credentials selon le mode
    let parsedCredentials = null
    if (typeAuth !== "none") {
      if (useAdvancedMode) {
        // Mode avancé : utiliser le JSON fourni
        if (credentials.trim()) {
          try {
            parsedCredentials = JSON.parse(credentials)
          } catch {
            setError("Format JSON invalide pour les identifiants")
            setLoading(false)
            return
          }
        }
      } else {
        // Mode simple : construire depuis les champs email/password
        if (typeAuth === "form") {
          if (!email.trim()) {
            setError("L'email est requis")
            setLoading(false)
            return
          }
          // Si c'est une modification et que le mot de passe n'a pas été changé, utiliser l'ancien
          if (site && !password && site.credentials?.password) {
            parsedCredentials = {
              email: email.trim(),
              login: email.trim(),
              password: site.credentials.password
            }
          } else {
            if (!password && !site) {
              setError("Le mot de passe est requis")
              setLoading(false)
              return
            }
            parsedCredentials = {
              email: email.trim(),
              login: email.trim(),
              password: password
            }
          }
        } else if (typeAuth === "api") {
          if (!email.trim()) {
            setError("La clé API est requise")
            setLoading(false)
            return
          }
          parsedCredentials = {
            api_key: email.trim()
          }
        }
      }
    }

    // Construire les selectors
    let parsedSelectors = null
    if (useAdvancedMode) {
      // Mode avancé : utiliser le JSON fourni
      if (selectors.trim()) {
        try {
          parsedSelectors = JSON.parse(selectors)
        } catch {
          setError("Format JSON invalide pour les sélecteurs CSS")
          setLoading(false)
          return
        }
      }
    } else {
      // Mode simple : construire depuis le champ navigation
      if (navigationPath.trim()) {
        parsedSelectors = {
          navigation_path: navigationPath.trim(),
          ...(site?.selectors || {}) // Conserver les autres selectors existants
        }
      } else if (site?.selectors) {
        parsedSelectors = site.selectors
      }
    }

    try {
      // Si c'est une modification ET que les credentials ont changé, utiliser l'endpoint dédié
      if (site && parsedCredentials) {
        // Vérifier si les credentials ont vraiment changé
        const emailChanged = email.trim() !== (site.credentials?.email || site.credentials?.login || "")
        const passwordChanged = password !== "" // Si password n'est pas vide, il a été modifié
        
        if (emailChanged || passwordChanged) {
          // D'abord mettre à jour les credentials via l'endpoint dédié
          const credentialsResponse = await fetch(`/api/expert/sites/${site.id}/credentials`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              credentials: parsedCredentials,
              merge: false // Remplacer complètement
            }),
          })

          const credentialsData = await credentialsResponse.json()
          if (!credentialsData.success) {
            setError(credentialsData.error || "Erreur lors de la mise à jour des credentials")
            setLoading(false)
            return
          }
        }
      }

      // Mettre à jour le reste (nom, URL, selectors, etc.) sans credentials
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
          // Ne pas envoyer credentials si c'est une modification (déjà fait via endpoint dédié)
          credentials: site ? undefined : parsedCredentials,
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
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4" 
      style={{ zIndex: 9999, pointerEvents: 'auto' }}
      onClick={(e) => {
        // Fermer si on clique sur l'overlay (pas sur le contenu)
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
    >
      {/* Remplacer Card par un div simple pour éviter les problèmes de backdrop-blur */}
      <div 
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-xl border border-bordeaux-500/40 shadow-2xl"
        style={{ 
          zIndex: 10000, 
          position: 'relative',
          pointerEvents: 'auto',
          isolation: 'isolate'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div 
          className="flex flex-row items-center justify-between p-8 pb-4"
          style={{ pointerEvents: 'auto' }}
        >
          <h3 className="text-2xl font-semibold leading-none tracking-tight">
            {site ? "Modifier le site expert" : "Ajouter un site expert"}
          </h3>
          <Button variant="ghost" size="sm" onClick={onClose} style={{ pointerEvents: 'auto', zIndex: 10003 }}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div 
          className="p-8 pt-0 space-y-4" 
          style={{ 
            position: 'relative', 
            zIndex: 10001,
            pointerEvents: 'auto',
            isolation: 'isolate'
          }}
        >
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
          <div style={{ pointerEvents: 'auto', position: 'relative', zIndex: 10002 }}>
            <Label htmlFor="nom">
              Nom du site <span className="text-red-500">*</span>
            </Label>
            <Input
              id="nom"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              placeholder="Ex: Experts Groupe"
              disabled={loading}
              style={{ 
                position: 'relative', 
                zIndex: 10003,
                pointerEvents: 'auto',
                cursor: 'text',
                backgroundColor: 'white'
              }}
              autoComplete="off"
              onFocus={(e) => e.target.select()}
            />
          </div>

          {/* URL de recherche */}
          <div style={{ pointerEvents: 'auto', position: 'relative', zIndex: 10002 }}>
            <Label htmlFor="url">
              URL de recherche <span className="text-red-500">*</span>
            </Label>
            <Input
              id="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.experts-groupe.com/recherche"
              disabled={loading}
              style={{ 
                position: 'relative', 
                zIndex: 10003,
                pointerEvents: 'auto',
                cursor: 'text',
                backgroundColor: 'white'
              }}
              autoComplete="off"
              onFocus={(e) => e.target.select()}
            />
          </div>

          {/* Type d'authentification */}
          <div style={{ pointerEvents: 'auto', position: 'relative', zIndex: 10002 }}>
            <Label htmlFor="type_auth">Type d'authentification</Label>
            <select
              id="type_auth"
              value={typeAuth}
              onChange={(e) => setTypeAuth(e.target.value as ExpertSiteAuthType)}
              className="w-full h-10 px-3 rounded-md border border-gray-300 bg-white"
              disabled={loading}
              style={{ 
                position: 'relative', 
                zIndex: 10003,
                pointerEvents: 'auto',
                cursor: 'pointer',
                backgroundColor: 'white'
              }}
            >
              <option value="none">Aucune authentification</option>
              <option value="form">Formulaire de connexion</option>
              <option value="api">Clé API</option>
            </select>
          </div>

          {/* Mode simple vs avancé */}
          <div className="flex items-center space-x-2 pt-2 pb-2" style={{ pointerEvents: 'auto' }}>
            <input
              type="checkbox"
              id="advanced_mode"
              checked={useAdvancedMode}
              onChange={(e) => setUseAdvancedMode(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
              disabled={loading}
              style={{ pointerEvents: 'auto', cursor: 'pointer' }}
            />
            <Label htmlFor="advanced_mode" className="cursor-pointer" style={{ pointerEvents: 'auto' }}>
              Mode configuration avancée (JSON)
            </Label>
          </div>

          {/* Configuration simple */}
          {!useAdvancedMode && (
            <>
              {/* Email / Login */}
              {typeAuth !== "none" && (
                <div style={{ pointerEvents: 'auto', position: 'relative', zIndex: 10002 }}>
                  <Label htmlFor="email">
                    {typeAuth === "form" ? "Email / Login" : "Clé API"} <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="email"
                    type={typeAuth === "api" ? "password" : "email"}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={typeAuth === "form" ? "votre@email.com" : "Votre clé API"}
                    disabled={loading}
                    style={{ 
                      position: 'relative', 
                      zIndex: 10003,
                      pointerEvents: 'auto',
                      cursor: 'text',
                      backgroundColor: 'white'
                    }}
                    autoComplete="off"
                  />
                </div>
              )}

              {/* Mot de passe */}
              {typeAuth === "form" && (
                <div style={{ pointerEvents: 'auto', position: 'relative', zIndex: 10002 }}>
                  <Label htmlFor="password">
                    Mot de passe {site ? "(laisser vide pour ne pas modifier)" : ""} <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Votre mot de passe"
                      disabled={loading}
                      style={{ 
                        position: 'relative', 
                        zIndex: 10003,
                        pointerEvents: 'auto',
                        cursor: 'text',
                        backgroundColor: 'white'
                      }}
                      autoComplete="off"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{ pointerEvents: 'auto', zIndex: 10004 }}
                    >
                      {showPassword ? "👁️" : "👁️‍🗨️"}
                    </Button>
                  </div>
                </div>
              )}

              {/* Chemin de navigation */}
              <div style={{ pointerEvents: 'auto', position: 'relative', zIndex: 10002 }}>
                <Label htmlFor="navigation_path">
                  Chemin pour accéder aux dossiers
                </Label>
                <Input
                  id="navigation_path"
                  value={navigationPath}
                  onChange={(e) => setNavigationPath(e.target.value)}
                  placeholder="Ex: /dossiers ou /mes-dossiers/recherche"
                  disabled={loading}
                  style={{ 
                    position: 'relative', 
                    zIndex: 10003,
                    pointerEvents: 'auto',
                    cursor: 'text',
                    backgroundColor: 'white'
                  }}
                  autoComplete="off"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Chemin URL ou sélecteur CSS pour accéder à la page de recherche des dossiers
                </p>
              </div>
            </>
          )}

          {/* Configuration avancée (JSON) */}
          {useAdvancedMode && (
            <>
              {/* Identifiants (si auth requise) */}
              {typeAuth !== "none" && (
                <div style={{ pointerEvents: 'auto', position: 'relative', zIndex: 10002 }}>
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
                    style={{ 
                      position: 'relative', 
                      zIndex: 10003,
                      pointerEvents: 'auto',
                      cursor: 'text',
                      backgroundColor: 'white'
                    }}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Format JSON valide requis. Ces données sont stockées de manière sécurisée.
                  </p>
                </div>
              )}

              {/* Sélecteurs CSS */}
              <div style={{ pointerEvents: 'auto', position: 'relative', zIndex: 10002 }}>
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
  "navigation_path": "/dossiers",
  "rapport_link": "a.pdf-download"
}`}
                  className="font-mono text-sm"
                  rows={8}
                  disabled={loading}
                  style={{ 
                    position: 'relative', 
                    zIndex: 10003,
                    pointerEvents: 'auto',
                    cursor: 'text',
                    backgroundColor: 'white'
                  }}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Sélecteurs CSS utilisés par le scraper pour interagir avec le site.
                </p>
              </div>
            </>
          )}

          {/* Site actif */}
          <div className="flex items-center space-x-2 pt-2" style={{ pointerEvents: 'auto', position: 'relative', zIndex: 10002 }}>
            <input
              type="checkbox"
              id="actif"
              checked={actif}
              onChange={(e) => setActif(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
              disabled={loading}
              style={{ 
                position: 'relative', 
                zIndex: 10003,
                pointerEvents: 'auto',
                cursor: 'pointer'
              }}
            />
            <Label htmlFor="actif" className="cursor-pointer" style={{ pointerEvents: 'auto' }}>
              Site actif (les relances automatiques utiliseront ce site)
            </Label>
          </div>

          {/* Boutons */}
          <div className="flex justify-end gap-3 pt-4 border-t" style={{ pointerEvents: 'auto', position: 'relative', zIndex: 10002 }}>
            <Button 
              variant="outline" 
              onClick={onClose} 
              disabled={loading}
              style={{ 
                position: 'relative', 
                zIndex: 10003,
                pointerEvents: 'auto',
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              Annuler
            </Button>
            <Button 
              className="btn-primary" 
              onClick={handleSave} 
              disabled={loading}
              style={{ 
                position: 'relative', 
                zIndex: 10003,
                pointerEvents: 'auto',
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
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
        </div>
      </div>
    </div>
  )
}
