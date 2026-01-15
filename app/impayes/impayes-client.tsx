"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Send, CheckCircle2 } from "lucide-react"

interface ImpayesClientProps {
  initialImpayes: any[]
}

export function ImpayesClient({ initialImpayes }: ImpayesClientProps) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState<string | null>(null)

  const handleMarquerPaye = async (paymentId: string) => {
    setLoading(paymentId)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      const { error } = await supabase
        .from("payments")
        .update({
          statut: "PAYE",
          updated_at: new Date().toISOString(),
        })
        .eq("id", paymentId)

      if (error) throw error

      // Mettre à jour le statut du dossier si nécessaire
      const { data: payment } = await supabase
        .from("payments")
        .select("dossier_id")
        .eq("id", paymentId)
        .single()

      if (payment) {
        await supabase
          .from("dossiers")
          .update({ statut: "PAYE" })
          .eq("id", payment.dossier_id)
      }

      router.refresh()
    } catch (err) {
      console.error("Error marking as paid:", err)
    } finally {
      setLoading(null)
    }
  }

  return null // Cette composante peut être étendue pour ajouter des actions rapides
}
