"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Select } from "@/components/ui/select"
import { Dossier, DossierStatut } from "@/lib/types"

interface DossierDetailClientProps {
  dossierId: string
  initialDossier: Dossier
}

export function DossierDetailClient({
  dossierId,
  initialDossier,
}: DossierDetailClientProps) {
  const router = useRouter()
  const supabase = createClient()
  const [statut, setStatut] = useState(initialDossier.statut)
  const [loading, setLoading] = useState(false)

  const handleStatutChange = async (newStatut: DossierStatut) => {
    setLoading(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      const { error } = await supabase
        .from("dossiers")
        .update({ statut: newStatut, updated_at: new Date().toISOString() })
        .eq("id", dossierId)

      if (error) throw error

      // Log audit
      await supabase.from("audit_logs").insert({
        action: "STATUT_CHANGED",
        entity_type: "dossiers",
        entity_id: dossierId,
        user_id: user.id,
        details: {
          old_statut: statut,
          new_statut: newStatut,
        },
      })

      setStatut(newStatut)
      router.refresh()
    } catch (err) {
      console.error("Error updating statut:", err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mb-6 flex items-center justify-end space-x-4">
      <label className="text-sm font-medium">Changer le statut:</label>
      <Select
        value={statut}
        onChange={(e) => handleStatutChange(e.target.value as DossierStatut)}
        disabled={loading}
        className="w-64"
      >
        <option value="NOUVEAU">Nouveau</option>
        <option value="EN_ATTENTE_EXPERT">En attente expert</option>
        <option value="RELANCE_EXPERT">Relance expert</option>
        <option value="RAPPORT_RECU">Rapport reçu</option>
        <option value="EN_REPARATION">En réparation</option>
        <option value="FACTURE_ENVOYEE">Facture envoyée</option>
        <option value="EN_ATTENTE_PAIEMENT">En attente paiement</option>
        <option value="PAYE">Payé</option>
        <option value="LITIGE">Litige</option>
      </Select>
    </div>
  )
}
