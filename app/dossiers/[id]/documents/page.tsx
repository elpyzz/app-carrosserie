"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import AuthenticatedLayout from "@/components/layout/client-authenticated-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { useSupabaseClient } from "@/lib/hooks/useSupabaseClient"
import { DocumentType } from "@/lib/types"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

const documentSchema = z.object({
  type: z.enum([
    "devis",
    "photos_avant",
    "photos_apres",
    "carte_grise",
    "rapport_expert",
    "pv",
    "reglement_direct",
    "facture",
    "autres",
  ]),
  file: z.instanceof(FileList).refine((files) => files.length > 0, "Fichier requis"),
})

type DocumentFormData = z.infer<typeof documentSchema>

export default function UploadDocumentPage({
  params,
}: {
  params: { id: string }
}) {
  const router = useRouter()
  const supabase = useSupabaseClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<DocumentFormData>({
    resolver: zodResolver(documentSchema),
  })

  const onSubmit = async (data: DocumentFormData) => {
    if (!supabase) {
      setError("Client Supabase non initialisé")
      return
    }

    setLoading(true)
    setError("")
    setSuccess(false)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setError("Vous devez être connecté")
        return
      }

      const file = data.file[0]
      const fileExt = file.name.split(".").pop()
      const fileName = `${params.id}/${Date.now()}.${fileExt}`
      const filePath = `documents/${fileName}`

      // Upload vers Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(filePath, file)

      if (uploadError) throw uploadError

      // Enregistrer dans la base de données
      const { data: document, error: dbError } = await supabase
        .from("documents")
        .insert({
          dossier_id: params.id,
          type: data.type,
          nom_fichier: file.name,
          chemin_storage: filePath,
          taille_bytes: file.size,
          mime_type: file.type,
          uploaded_by: user.id,
        })
        .select("id")
        .single()

      if (dbError) throw dbError
      if (!document) throw new Error("Erreur lors de la création du document")

      // Vérifier si cela complète un élément de checklist
      const { data: checklistItems } = await supabase
        .from("checklist_items")
        .select("*")
        .eq("dossier_id", params.id)
        .eq("document_requis", data.type)
        .eq("est_coche", false)

      if (checklistItems && checklistItems.length > 0) {
        // Auto-cocher les éléments de checklist correspondants
        await supabase
          .from("checklist_items")
          .update({
            est_coche: true,
            checked_by: user.id,
            checked_at: new Date().toISOString(),
          })
          .eq("dossier_id", params.id)
          .eq("document_requis", data.type)
          .eq("est_coche", false)
      }

      // Log audit
      await supabase.from("audit_logs").insert({
        action: "DOCUMENT_UPLOADED",
        entity_type: "documents",
        entity_id: params.id,
        user_id: user.id,
        details: { type: data.type, nom_fichier: file.name },
      })

      // Arrêter les relances si document rapport_expert, pv ou reglement_direct
      if (
        data.type === "rapport_expert" ||
        data.type === "pv" ||
        data.type === "reglement_direct"
      ) {
        try {
          await fetch("/api/relance/stop", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              dossier_id: params.id,
              document_type: data.type,
              document_id: document.id,
            }),
          })

          // Mettre à jour le dossier
          await supabase
            .from("dossiers")
            .update({
              statut: "RAPPORT_RECU",
              date_rapport_recu: new Date().toISOString(),
            })
            .eq("id", params.id)
        } catch (relanceError) {
          console.error("Error stopping relances:", relanceError)
          // Ne pas bloquer l'upload si l'arrêt des relances échoue
        }
      }

      setSuccess(true)
      reset()
      setTimeout(() => {
        router.push(`/dossiers/${params.id}`)
      }, 1500)
    } catch (err: any) {
      setError(err.message || "Une erreur est survenue")
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthenticatedLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center space-x-4">
          <Link href={`/dossiers/${params.id}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Ajouter un document</h1>
            <p className="text-gray-900 mt-2">Téléchargez un document pour ce dossier</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Nouveau document</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <Label htmlFor="type">Type de document</Label>
                <Select id="type" {...register("type")}>
                  <option value="devis">Devis</option>
                  <option value="photos_avant">Photos avant</option>
                  <option value="photos_apres">Photos après</option>
                  <option value="carte_grise">Carte grise</option>
                  <option value="rapport_expert">Rapport expert</option>
                  <option value="pv">PV</option>
                  <option value="reglement_direct">Règlement direct</option>
                  <option value="facture">Facture</option>
                  <option value="autres">Autres</option>
                </Select>
                {errors.type && (
                  <p className="text-sm text-red-600 mt-1">{errors.type.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="file">Fichier</Label>
                <Input
                  id="file"
                  type="file"
                  {...register("file")}
                  accept="image/*,.pdf,.doc,.docx"
                />
                {errors.file && (
                  <p className="text-sm text-red-600 mt-1">{errors.file.message}</p>
                )}
              </div>

              {error && (
                <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
                  {error}
                </div>
              )}

              {success && (
                <div className="text-sm text-green-600 bg-green-50 p-3 rounded-md">
                  Document uploadé avec succès ! Redirection...
                </div>
              )}

              <div className="flex justify-end space-x-4">
                <Link href={`/dossiers/${params.id}`}>
                  <Button type="button" variant="outline">
                    Annuler
                  </Button>
                </Link>
                <Button type="submit" disabled={loading}>
                  {loading ? "Upload..." : "Uploader"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AuthenticatedLayout>
  )
}
