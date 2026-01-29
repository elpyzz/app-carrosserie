"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { SupplierSite, SupplierSiteAuthType } from "@/lib/fournisseur/types"
import { Plus, Edit, Trash2, TestTube, Settings, AlertCircle } from "lucide-react"

export function SupplierSitesConfig() {
  const [sites, setSites] = useState<SupplierSite[]>([])
  const [showModal, setShowModal] = useState(false)
  const [editingSite, setEditingSite] = useState<SupplierSite | null>(null)
  const [isAdmin, setIsAdmin] = useState(true) // Mode mock = admin par défaut

  useEffect(() => {
    loadSites()
  }, [])

  const loadSites = async () => {
    try {
      const response = await fetch('/api/fournisseur/sites')
      const data = await response.json()
      
      if (data.success && data.sites) {
        setSites(data.sites as SupplierSite[])
      } else {
        setSites([])
      }
    } catch (error) {
      console.error('Erreur lors du chargement des sites:', error)
      setSites([])
    }
  }

  if (!isAdmin) {
    return null
  }

  const canAddMore = sites.filter((s) => s.actif).length < 6

  return (
    <Card className="card-gradient">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="h-5 w-5 text- param($m) $m -replace 'blue', 'red' " />
            <span>Configuration des sites fournisseurs</span>
          </CardTitle>
          <p className="text-sm text-gray-900 mt-1">
            Maximum 6 sites fournisseurs (actuellement: {sites.filter((s) => s.actif).length}/6)
          </p>
        </div>
        <Button
          onClick={() => {
            if (!canAddMore) {
              alert("Maximum 6 sites fournisseurs autorisés")
              return
            }
            setEditingSite(null)
            setShowModal(true)
          }}
          className="btn-primary"
          disabled={!canAddMore}
        >
          <Plus className="h-4 w-4 mr-2" />
          Ajouter un site
        </Button>
      </CardHeader>
      <CardContent>
        {!canAddMore && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-amber-600" />
            <p className="text-sm text-amber-700">
              Maximum 6 sites atteint. Désactivez un site pour en ajouter un autre.
            </p>
          </div>
        )}

        {sites.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-900">Aucun site configuré</p>
            <p className="text-sm text-gray-900 mt-2">
              Ajoutez jusqu'à 6 sites fournisseurs pour commencer
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {sites.map((site) => (
              <div
                key={site.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg- param($m) $m -replace 'blue', 'red'  transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <h3 className="font-bold text-lg">{site.nom}</h3>
                    <Badge
                      variant={site.actif ? "default" : "secondary"}
                      className={site.actif ? "bg-green-100 text-green-700" : ""}
                    >
                      {site.actif ? "Actif" : "Inactif"}
                    </Badge>
                    {site.ordre && (
                      <Badge className="bg- param($m) $m -replace 'blue', 'red'  text- param($m) $m -replace 'blue', 'red' ">
                        Ordre #{site.ordre}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-900 mt-1">{site.url_recherche}</p>
                  <p className="text-xs text-gray-900 mt-1">Auth: {site.type_auth}</p>
                </div>
                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditingSite(site)
                      setShowModal(true)
                    }}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="outline">
                    <TestTube className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {showModal && (
          <SiteConfigModal
            site={editingSite}
            existingSites={sites}
            onClose={() => {
              setShowModal(false)
              setEditingSite(null)
            }}
            onSave={() => {
              loadSites()
              setShowModal(false)
              setEditingSite(null)
            }}
          />
        )}
      </CardContent>
    </Card>
  )
}

function SiteConfigModal({
  site,
  existingSites,
  onClose,
  onSave,
}: {
  site: SupplierSite | null
  existingSites: SupplierSite[]
  onClose: () => void
  onSave: () => void
}) {
  const [nom, setNom] = useState(site?.nom || "")
  const [url, setUrl] = useState(site?.url_recherche || "")
  const [typeAuth, setTypeAuth] = useState<SupplierSiteAuthType>(
    site?.type_auth || "none"
  )
  const [ordre, setOrdre] = useState(
    site?.ordre || (existingSites.length + 1).toString()
  )

  const availableOrders = [1, 2, 3, 4, 5, 6].filter(
    (o) => !existingSites.some((s) => s.ordre === o && s.id !== site?.id)
  )

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[100] pointer-events-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
    >
      <Card
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto relative z-[101]"
        onClick={(e) => e.stopPropagation()}
      >
        <CardHeader>
          <CardTitle>
            {site ? "Modifier le site" : "Nouveau site fournisseur"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="nom">Nom du site *</Label>
            <Input
              id="nom"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              placeholder="Pièces Auto Pro"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="url">URL de recherche *</Label>
            <Input
              id="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://pieces-auto-pro.com/recherche"
              className="mt-1"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="type_auth">Type d'authentification</Label>
              <Select
                id="type_auth"
                value={typeAuth}
                onChange={(e) => setTypeAuth(e.target.value as SupplierSiteAuthType)}
                className="mt-1"
              >
                <option value="none">Aucune</option>
                <option value="form">Formulaire</option>
                <option value="api">API</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="ordre">Ordre d'affichage (1-6) *</Label>
              <Select
                id="ordre"
                value={ordre}
                onChange={(e) => setOrdre(e.target.value)}
                className="mt-1"
              >
                {availableOrders.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          {typeAuth !== "none" && (
            <div>
              <Label htmlFor="credentials">Identifiants (JSON)</Label>
              <Textarea
                id="credentials"
                placeholder='{"username": "...", "password": "..."}'
                className="mt-1 font-mono text-sm"
                rows={3}
              />
            </div>
          )}
          <div>
            <Label htmlFor="selectors">Sélecteurs CSS/XPath (JSON, avancé)</Label>
            <Textarea
              id="selectors"
              placeholder='{"searchInput": "#search", "searchButton": ".btn-search", "price": ".price", "availability": ".stock"}'
              className="mt-1 font-mono text-sm"
              rows={4}
            />
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <Button variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button className="btn-primary" onClick={onSave}>
              {site ? "Modifier" : "Créer"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
