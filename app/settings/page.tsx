"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import AuthenticatedLayout from "@/components/layout/authenticated-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { createClient } from "@/lib/supabase/client"
import { Save } from "lucide-react"

const settingsSchema = z.object({
  email_expediteur: z.string().email(),
  email_paiements: z.string().email(),
  frequence_relance_expert_jours: z.string().min(1),
  delai_alerte_rapport_jours: z.string().min(1),
  sms_enabled: z.boolean(),
  modele_message_expert: z.string().min(1),
  modele_message_client: z.string().min(1),
  modele_message_impaye: z.string().min(1),
})

type SettingsFormData = z.infer<typeof settingsSchema>

export default function SettingsPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
  })

  const smsEnabled = watch("sms_enabled")

  useEffect(() => {
    // Vérifier si l'utilisateur est admin
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase
          .from("users")
          .select("role")
          .eq("id", user.id)
          .single()
          .then(({ data }) => {
            setIsAdmin(data?.role === "admin")
          })
      }
    })

    // Charger les settings
    supabase
      .from("settings")
      .select("key, value")
      .then(({ data }) => {
        if (data) {
          data.forEach((setting) => {
            if (setting.key === "sms_enabled") {
              setValue("sms_enabled", setting.value === "true")
            } else {
              setValue(setting.key as keyof SettingsFormData, setting.value)
            }
          })
        }
      })
  }, [supabase, setValue])

  if (!isAdmin) {
    return (
      <AuthenticatedLayout>
        <div className="text-center py-12">
          <p className="text-gray-500">Accès réservé aux administrateurs</p>
        </div>
      </AuthenticatedLayout>
    )
  }

  const onSubmit = async (data: SettingsFormData) => {
    setLoading(true)
    setError("")
    setSuccess(false)

    try {
      const settings = [
        { key: "email_expediteur", value: data.email_expediteur },
        { key: "email_paiements", value: data.email_paiements },
        { key: "frequence_relance_expert_jours", value: data.frequence_relance_expert_jours },
        { key: "delai_alerte_rapport_jours", value: data.delai_alerte_rapport_jours },
        { key: "sms_enabled", value: data.sms_enabled.toString() },
        { key: "modele_message_expert", value: data.modele_message_expert },
        { key: "modele_message_client", value: data.modele_message_client },
        { key: "modele_message_impaye", value: data.modele_message_impaye },
      ]

      for (const setting of settings) {
        const { error } = await supabase
          .from("settings")
          .upsert({
            key: setting.key,
            value: setting.value,
            updated_at: new Date().toISOString(),
          })

        if (error) throw error
      }

      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err: any) {
      setError(err.message || "Une erreur est survenue")
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthenticatedLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Paramètres</h1>
          <p className="text-gray-600 mt-2">Configuration de l'application</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-6">
            {/* Emails */}
            <Card>
              <CardHeader>
                <CardTitle>Configuration emails</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="email_expediteur">Email expéditeur</Label>
                  <Input
                    id="email_expediteur"
                    type="email"
                    {...register("email_expediteur")}
                    placeholder="noreply@carrosserie.local"
                  />
                  {errors.email_expediteur && (
                    <p className="text-sm text-red-600 mt-1">
                      {errors.email_expediteur.message}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="email_paiements">Email paiements</Label>
                  <Input
                    id="email_paiements"
                    type="email"
                    {...register("email_paiements")}
                    placeholder="paiements@carrosserie.local"
                  />
                  {errors.email_paiements && (
                    <p className="text-sm text-red-600 mt-1">
                      {errors.email_paiements.message}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Relances */}
            <Card>
              <CardHeader>
                <CardTitle>Configuration relances</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="frequence_relance_expert_jours">
                      Fréquence relance expert (jours)
                    </Label>
                    <Input
                      id="frequence_relance_expert_jours"
                      type="number"
                      {...register("frequence_relance_expert_jours")}
                      placeholder="3"
                    />
                    {errors.frequence_relance_expert_jours && (
                      <p className="text-sm text-red-600 mt-1">
                        {errors.frequence_relance_expert_jours.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="delai_alerte_rapport_jours">
                      Délai alerte rapport (jours)
                    </Label>
                    <Input
                      id="delai_alerte_rapport_jours"
                      type="number"
                      {...register("delai_alerte_rapport_jours")}
                      placeholder="15"
                    />
                    {errors.delai_alerte_rapport_jours && (
                      <p className="text-sm text-red-600 mt-1">
                        {errors.delai_alerte_rapport_jours.message}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="sms_enabled"
                    checked={smsEnabled}
                    onCheckedChange={(checked) =>
                      setValue("sms_enabled", checked === true)
                    }
                  />
                  <Label htmlFor="sms_enabled">Activer les SMS (Twilio)</Label>
                </div>
              </CardContent>
            </Card>

            {/* Modèles de messages */}
            <Card>
              <CardHeader>
                <CardTitle>Modèles de messages</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="modele_message_expert">
                    Message relance expert
                  </Label>
                  <Textarea
                    id="modele_message_expert"
                    {...register("modele_message_expert")}
                    placeholder="Bonjour, nous relançons concernant le dossier {dossier_id}..."
                    rows={3}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Variables disponibles: {"{dossier_id}"}
                  </p>
                  {errors.modele_message_expert && (
                    <p className="text-sm text-red-600 mt-1">
                      {errors.modele_message_expert.message}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="modele_message_client">
                    Message notification client
                  </Label>
                  <Textarea
                    id="modele_message_client"
                    {...register("modele_message_client")}
                    placeholder="Bonjour, nous avons relancé l'expert concernant votre dossier {dossier_id}..."
                    rows={3}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Variables disponibles: {"{dossier_id}"}
                  </p>
                  {errors.modele_message_client && (
                    <p className="text-sm text-red-600 mt-1">
                      {errors.modele_message_client.message}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="modele_message_impaye">
                    Message relance impayé
                  </Label>
                  <Textarea
                    id="modele_message_impaye"
                    {...register("modele_message_impaye")}
                    placeholder="Bonjour, votre facture {dossier_id} d'un montant de {montant}€ est en attente..."
                    rows={3}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Variables disponibles: {"{dossier_id}"}, {"{montant}"}, {"{jours}"}
                  </p>
                  {errors.modele_message_impaye && (
                    <p className="text-sm text-red-600 mt-1">
                      {errors.modele_message_impaye.message}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
                {error}
              </div>
            )}

            {success && (
              <div className="text-sm text-green-600 bg-green-50 p-3 rounded-md">
                Paramètres enregistrés avec succès !
              </div>
            )}

            <div className="flex justify-end">
              <Button type="submit" disabled={loading}>
                <Save className="h-4 w-4 mr-2" />
                {loading ? "Enregistrement..." : "Enregistrer"}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </AuthenticatedLayout>
  )
}
