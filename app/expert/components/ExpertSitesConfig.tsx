"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { createClient } from "@/lib/supabase/client"
import { ExpertSite, ExpertSiteAuthType } from "@/lib/expert/types"
import { Plus, Edit, Trash2, TestTube, Settings } from "lucide-react"

export function ExpertSitesConfig() {
  const supabase = createClient()
  const [sites, setSites] = useState<ExpertSite[]>([])
  const [showModal, setShowModal] = useState(false)
  const [editingSite, setEditingSite] = useState<ExpertSite | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    // Vérifier si admin
    const checkAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        try {
          const { data } = await supabase
            .from("users")
            .select("role")
            .eq("id", user.id)
            .single()
          setIsAdmin(data?.role === "admin")
        } catch {
          setIsAdmin(true) // Mode mock = admin
        }
      } else {
        setIsAdmin(true) // Mode mock = admin
      }
    }
    
    checkAdmin()
    loadSites()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadSites = async () => {
    try {
      const { data, error } = await supabase
        .from("expert_sites")
        .select("*")
        .order("nom", { ascending: true })
      
      if (data && !error) {
        setSites(data as ExpertSite[])
      } else {
        // Mode mock ou erreur
        setSites([
          {
            id: "mock-1",
            nom: "Expert Auto",
            url_recherche: "https://expert-auto.example.com",
            type_auth: "none",
            credentials: null,
            selectors: null,
            actif: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ])
      }
    } catch {
      // Mode mock
      setSites([
        {
          id: "mock-1",
          nom: "Expert Auto",
          url_recherche: "https://expert-auto.example.com",
          type_auth: "none",
          credentials: null,
          selectors: null,
          actif: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ])
    }
  }

  if (!isAdmin) {
    return null
  }

  return (
    <Card className="card-gradient">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center space-x-2">
          <Settings className="h-5 w-5 text-red-600" />
          <span>Configuration des sites d'experts</span>
        </CardTitle>
        <Button
          onClick={() => {
            setEditingSite(null)
            setShowModal(true)
          }}
          className="btn-primary"
        >
          <Plus className="h-4 w-4 mr-2" />
          Ajouter un site
        </Button>
      </CardHeader>
      <CardContent>
        {sites.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">Aucun site configuré</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sites.map((site) => (
              <div
                key={site.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-blue-50 transition-colors"
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
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{site.url_recherche}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Auth: {site.type_auth}
                  </p>
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
  onClose,
  onSave,
}: {
  site: ExpertSite | null
  onClose: () => void
  onSave: () => void
}) {
  const [nom, setNom] = useState(site?.nom || "")
  const [url, setUrl] = useState(site?.url_recherche || "")
  const [typeAuth, setTypeAuth] = useState<ExpertSiteAuthType>(
    site?.type_auth || "none"
  )

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[100] pointer-events-auto" 
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <Card 
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto relative z-[101]" 
        onClick={(e) => e.stopPropagation()}
      >
        <CardHeader>
          <CardTitle>{site ? "Modifier le site" : "Nouveau site d'expert"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="nom">Nom du site *</Label>
            <Input
              id="nom"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              placeholder="Expert Auto"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="url">URL de recherche *</Label>
            <Input
              id="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://expert.example.com/recherche"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="type_auth">Type d'authentification</Label>
            <Select
              id="type_auth"
              value={typeAuth}
              onChange={(e) => setTypeAuth(e.target.value as ExpertSiteAuthType)}
              className="mt-1"
            >
              <option value="none">Aucune</option>
              <option value="form">Formulaire</option>
              <option value="api">API</option>
            </Select>
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
              placeholder='{"dossierInput": "#dossier", "searchButton": ".btn-search", "pdfLink": "a.pdf-link"}'
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
