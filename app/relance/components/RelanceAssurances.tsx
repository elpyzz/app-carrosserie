"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { formatCurrency, formatDate, getDaysSince } from "@/lib/utils"
import { FactureAssurance } from "@/lib/relance/types"
import { 
  Upload, 
  Search, 
  RefreshCw, 
  FileText, 
  Building2, 
  Trash2,
  History,
  Loader2,
  X,
  Edit,
  AlertCircle,
} from "lucide-react"
import Link from "next/link"
import { RelanceHistory } from "./RelanceHistory"

export function RelanceAssurances() {
  const [activeTab, setActiveTab] = useState<"factures" | "historique">("factures")
  
  return (
    <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "factures" | "historique")}>
      <TabsList className="mb-4">
        <TabsTrigger value="factures" className="flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Factures impayées
        </TabsTrigger>
        <TabsTrigger value="historique" className="flex items-center gap-2">
          <History className="h-4 w-4" />
          Historique relances
        </TabsTrigger>
      </TabsList>

      <TabsContent value="factures">
        <FacturesAssuranceList />
      </TabsContent>

      <TabsContent value="historique">
        <RelanceHistory 
          relanceType="assurance_email"
          title="Historique des relances assurances"
        />
      </TabsContent>
    </Tabs>
  )
}

// ========== LISTE DES FACTURES ==========

function FacturesAssuranceList() {
  const [factures, setFactures] = useState<FactureAssurance[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [search, setSearch] = useState("")
  const [filterStatut, setFilterStatut] = useState<string>("all")
  const [filterAssurance, setFilterAssurance] = useState<string>("all")
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [editingFacture, setEditingFacture] = useState<FactureAssurance | null>(null)
  const hasLoadedRef = useRef(false)

  const loadFactures = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/relance/assurance")
      const data = await response.json()

      if (data.success) {
        setFactures(data.factures || [])
      } else {
        console.error("Error loading factures:", data.error)
      }
    } catch (error) {
      console.error("Error loading factures:", error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (hasLoadedRef.current) {
      return
    }
    
    hasLoadedRef.current = true
    loadFactures()
  }, []) // Dépendances vides - loadFactures est stable grâce à useCallback

  const handleUpload = async (file: File, dossierId?: string) => {
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      if (dossierId) {
        formData.append("dossier_id", dossierId)
      }

      const response = await fetch("/api/relance/assurance/upload", {
        method: "POST",
        body: formData,
      })

      const result = await response.json()

      if (result.success) {
        await loadFactures()
        setShowUploadModal(false)
        
        if (result.warnings && result.warnings.length > 0) {
          alert(`Facture créée avec avertissements :\n\n${result.warnings.join("\n")}`)
        }
      } else {
        alert(`Erreur: ${result.error}`)
      }
    } catch (error: any) {
      alert(`Erreur: ${error.message}`)
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (factureId: string) => {
    if (!confirm("Supprimer cette facture ?\n\nElle ne sera plus relancée automatiquement.")) {
      return
    }

    try {
      const response = await fetch(`/api/relance/assurance/${factureId}`, {
        method: "DELETE",
      })

      const data = await response.json()

      if (data.success) {
        await loadFactures()
      } else {
        alert(`Erreur: ${data.error}`)
      }
    } catch (error: any) {
      alert(`Erreur: ${error.message}`)
    }
  }

  const handleEdit = async (facture: FactureAssurance, updates: Partial<FactureAssurance>) => {
    try {
      const response = await fetch(`/api/relance/assurance/${facture.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      })

      const data = await response.json()

      if (data.success) {
        await loadFactures()
        setEditingFacture(null)
      } else {
        alert(`Erreur: ${data.error}`)
      }
    } catch (error: any) {
      alert(`Erreur: ${error.message}`)
    }
  }

  // Filtrage
  const filteredFactures = factures.filter((fact) => {
    if (search) {
      const searchLower = search.toLowerCase()
      const matches = 
        fact.numero_facture?.toLowerCase().includes(searchLower) ||
        fact.nom_assurance.toLowerCase().includes(searchLower) ||
        fact.dossier?.dossier_id?.toLowerCase().includes(searchLower)
      if (!matches) return false
    }
    if (filterStatut !== "all" && fact.statut !== filterStatut) return false
    if (filterAssurance !== "all" && fact.nom_assurance !== filterAssurance) return false
    return true
  })

  // Liste des assurances uniques
  const assurances = Array.from(
    new Set(factures.map((f) => f.nom_assurance).filter(Boolean))
  ).sort()

  return (
    <>
      <Card className="card-gradient">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-bordeaux-400" />
              Factures impayées - Assurances
            </CardTitle>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={loadFactures}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                Actualiser
              </Button>
              <Button
                size="sm"
                className="btn-primary"
                onClick={() => setShowUploadModal(true)}
              >
                <Upload className="h-4 w-4 mr-2" />
                Ajouter une facture
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Filtres - UTILISE <select> HTML natif */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Rechercher..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={filterStatut}
              onChange={(e) => setFilterStatut(e.target.value)}
              className="h-10 px-3 rounded-md border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-bordeaux-500"
            >
              <option value="all">Tous les statuts</option>
              <option value="EN_ATTENTE">En attente</option>
              <option value="RELANCE_EN_COURS">Relance en cours</option>
            </select>
            <select
              value={filterAssurance}
              onChange={(e) => setFilterAssurance(e.target.value)}
              className="h-10 px-3 rounded-md border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-bordeaux-500"
            >
              <option value="all">Toutes les assurances</option>
              {assurances.map((ass) => (
                <option key={ass} value={ass}>
                  {ass}
                </option>
              ))}
            </select>
          </div>

          {/* Liste */}
          {loading ? (
            <div className="text-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400 mx-auto" />
            </div>
          ) : filteredFactures.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Aucune facture impayée</p>
              <p className="text-sm text-gray-400 mt-2">
                Uploadez une facture pour commencer
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredFactures.map((facture) => (
                <FactureCard
                  key={facture.id}
                  facture={facture}
                  onEdit={() => setEditingFacture(facture)}
                  onDelete={() => handleDelete(facture.id)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      {showUploadModal && (
        <UploadFactureModal
          onClose={() => setShowUploadModal(false)}
          onUpload={handleUpload}
          uploading={uploading}
        />
      )}

      {editingFacture && (
        <EditFactureModal
          facture={editingFacture}
          onClose={() => setEditingFacture(null)}
          onSave={(updates) => handleEdit(editingFacture, updates)}
        />
      )}
    </>
  )
}

// ========== CARTE FACTURE ==========

function FactureCard({ 
  facture, 
  onEdit, 
  onDelete 
}: { 
  facture: FactureAssurance
  onEdit: () => void
  onDelete: () => void
}) {
  const joursDepuisRelance = facture.date_derniere_relance
    ? getDaysSince(facture.date_derniere_relance)
    : null
  const joursDepuisEcheance = facture.date_echeance
    ? getDaysSince(facture.date_echeance)
    : null

  const hasEmail = facture.email_assurance && facture.email_assurance.trim()

  return (
    <div className="p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-all">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="font-bold text-lg">
              {facture.numero_facture || "Sans numéro"}
            </span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
              facture.statut === "RELANCE_EN_COURS"
                ? "bg-blue-100 text-blue-700"
                : "bg-gray-100 text-gray-700"
            }`}>
              {facture.statut === "RELANCE_EN_COURS" ? "Relance en cours" : "En attente"}
            </span>
            {joursDepuisEcheance !== null && joursDepuisEcheance > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                {joursDepuisEcheance} jour{joursDepuisEcheance > 1 ? "s" : ""} de retard
              </span>
            )}
            {!hasEmail && (
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                Email manquant
              </span>
            )}
          </div>

          {/* Infos */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-gray-600 mb-2">
            <div>
              <span className="font-medium">Assurance:</span> {facture.nom_assurance}
            </div>
            <div>
              <span className="font-medium">Montant:</span> {formatCurrency(facture.montant)}
            </div>
            <div>
              <span className="font-medium">Dossier:</span>{" "}
              {facture.dossier?.dossier_id || "Non associé"}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600 mb-2">
            <div>
              <span className="font-medium">Email:</span>{" "}
              {hasEmail ? facture.email_assurance : (
                <span className="text-amber-600">À compléter</span>
              )}
            </div>
            {facture.date_echeance && (
              <div>
                <span className="font-medium">Échéance:</span> {formatDate(facture.date_echeance)}
              </div>
            )}
          </div>

          {/* Infos relance */}
          <div className="text-sm text-gray-500 space-y-1">
            {facture.prochaine_relance && hasEmail && (
              <div>
                <span className="font-medium">Prochaine relance:</span>{" "}
                {formatDate(facture.prochaine_relance)}
              </div>
            )}
            {facture.nombre_relances > 0 && (
              <div>
                <span className="font-medium">Relances envoyées:</span> {facture.nombre_relances}
                {joursDepuisRelance !== null && (
                  <span className="ml-2 text-gray-400">
                    (il y a {joursDepuisRelance} jour{joursDepuisRelance > 1 ? "s" : ""})
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2">
          <Button size="sm" variant="outline" onClick={onEdit}>
            <Edit className="h-4 w-4 mr-1" />
            Modifier
          </Button>
          {facture.dossier_id && (
            <Link href={`/dossiers/${facture.dossier_id}`}>
              <Button size="sm" variant="outline" className="w-full">
                <FileText className="h-4 w-4 mr-1" />
                Dossier
              </Button>
            </Link>
          )}
          <Button
            size="sm"
            variant="outline"
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={onDelete}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Supprimer
          </Button>
        </div>
      </div>
    </div>
  )
}

// ========== MODAL UPLOAD ==========

function UploadFactureModal({
  onClose,
  onUpload,
  uploading,
}: {
  onClose: () => void
  onUpload: (file: File, dossierId?: string) => Promise<void>
  uploading: boolean
}) {
  const [file, setFile] = useState<File | null>(null)
  const [dossierId, setDossierId] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) {
      alert("Veuillez sélectionner un fichier")
      return
    }
    await onUpload(file, dossierId || undefined)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Ajouter une facture impayée</CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>
                Fichier facture (PDF, JPG, PNG) <span className="text-red-500">*</span>
              </Label>
              <Input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                disabled={uploading}
                required
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">
                L'IA scannera automatiquement la facture pour extraire les informations.
              </p>
            </div>
            <div>
              <Label>Dossier associé (optionnel)</Label>
              <Input
                type="text"
                placeholder="DOS-2024-001"
                value={dossierId}
                onChange={(e) => setDossierId(e.target.value)}
                disabled={uploading}
                className="mt-1"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={onClose} disabled={uploading}>
                Annuler
              </Button>
              <Button type="submit" className="btn-primary" disabled={uploading || !file}>
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Analyse en cours...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Uploader
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

// ========== MODAL EDIT ==========

function EditFactureModal({
  facture,
  onClose,
  onSave,
}: {
  facture: FactureAssurance
  onClose: () => void
  onSave: (updates: Partial<FactureAssurance>) => Promise<void>
}) {
  const [nomAssurance, setNomAssurance] = useState(facture.nom_assurance)
  const [emailAssurance, setEmailAssurance] = useState(facture.email_assurance || "")
  const [telephoneAssurance, setTelephoneAssurance] = useState(facture.telephone_assurance || "")
  const [montant, setMontant] = useState(facture.montant.toString())
  const [numeroFacture, setNumeroFacture] = useState(facture.numero_facture || "")
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!emailAssurance.trim()) {
      if (!confirm("Sans email, les relances automatiques ne fonctionneront pas. Continuer quand même ?")) {
        return
      }
    }

    setSaving(true)
    try {
      await onSave({
        nom_assurance: nomAssurance,
        email_assurance: emailAssurance,
        telephone_assurance: telephoneAssurance || null,
        montant: parseFloat(montant) || facture.montant,
        numero_facture: numeroFacture || null,
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Modifier la facture</CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Nom de l'assurance <span className="text-red-500">*</span></Label>
              <Input
                value={nomAssurance}
                onChange={(e) => setNomAssurance(e.target.value)}
                required
                disabled={saving}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Email de l'assurance</Label>
              <Input
                type="email"
                value={emailAssurance}
                onChange={(e) => setEmailAssurance(e.target.value)}
                disabled={saving}
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">
                Requis pour les relances automatiques
              </p>
            </div>
            <div>
              <Label>Téléphone</Label>
              <Input
                type="tel"
                value={telephoneAssurance}
                onChange={(e) => setTelephoneAssurance(e.target.value)}
                disabled={saving}
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Montant (€) <span className="text-red-500">*</span></Label>
                <Input
                  type="number"
                  step="0.01"
                  value={montant}
                  onChange={(e) => setMontant(e.target.value)}
                  required
                  disabled={saving}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>N° Facture</Label>
                <Input
                  value={numeroFacture}
                  onChange={(e) => setNumeroFacture(e.target.value)}
                  disabled={saving}
                  className="mt-1"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
                Annuler
              </Button>
              <Button type="submit" className="btn-primary" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Enregistrement...
                  </>
                ) : (
                  "Enregistrer"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
