"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { createClient } from "@/lib/supabase/client"
import { 
  Settings, 
  Mail, 
  MessageSquare, 
  Loader2,
  CheckCircle2,
} from "lucide-react"

interface ClientPreferencesProps {
  clientId: string
}

export function ClientPreferences({ clientId }: ClientPreferencesProps) {
  const [smsEnabled, setSmsEnabled] = useState(true)
  const [emailEnabled, setEmailEnabled] = useState(true)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const supabase = createClient()

  const loadPreferences = useCallback(async () => {
    if (!clientId) return
    
    setLoading(true)
    setError(null)
    
    try {
      const { data, error: fetchError } = await supabase
        .from("client_preferences")
        .select("*")
        .eq("client_id", clientId)
        .single()

      if (fetchError && fetchError.code !== "PGRST116") {
        // PGRST116 = pas de données (normal si pas encore de préférences)
        throw fetchError
      }

      if (data) {
        setSmsEnabled(data.sms_enabled !== false)
        setEmailEnabled(data.email_enabled !== false)
      } else {
        // Valeurs par défaut si pas de préférences
        setSmsEnabled(true)
        setEmailEnabled(true)
      }
    } catch (err: any) {
      console.error("Error loading preferences:", err)
      setError("Erreur lors du chargement des préférences")
    } finally {
      setLoading(false)
    }
  }, [clientId, supabase])

  useEffect(() => {
    loadPreferences()
  }, [loadPreferences])

  const handleSave = async () => {
    setSaving(true)
    setSuccess(false)
    setError(null)

    try {
      const { error: upsertError } = await supabase
        .from("client_preferences")
        .upsert({
          client_id: clientId,
          sms_enabled: smsEnabled,
          email_enabled: emailEnabled,
          opt_out_sms_at: smsEnabled ? null : new Date().toISOString(),
          opt_out_email_at: emailEnabled ? null : new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })

      if (upsertError) throw upsertError

      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err: any) {
      console.error("Error saving preferences:", err)
      setError(err.message || "Erreur lors de la sauvegarde")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Settings className="h-5 w-5 text-bordeaux-400" />
          Préférences de communication
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
            {error}
          </div>
        )}

        <div className="space-y-3">
          <div className="flex items-center space-x-3">
            <Checkbox
              id="email_enabled"
              checked={emailEnabled}
              onCheckedChange={(checked) => setEmailEnabled(checked === true)}
            />
            <Label htmlFor="email_enabled" className="flex items-center gap-2 cursor-pointer">
              <Mail className="h-4 w-4 text-gray-500" />
              Autoriser les notifications par email
            </Label>
          </div>
          <div className="flex items-center space-x-3">
            <Checkbox
              id="sms_enabled"
              checked={smsEnabled}
              onCheckedChange={(checked) => setSmsEnabled(checked === true)}
            />
            <Label htmlFor="sms_enabled" className="flex items-center gap-2 cursor-pointer">
              <MessageSquare className="h-4 w-4 text-gray-500" />
              Autoriser les notifications par SMS
            </Label>
          </div>
        </div>

        {success && (
          <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 p-3 rounded-md">
            <CheckCircle2 className="h-4 w-4" />
            Préférences enregistrées avec succès
          </div>
        )}

        <div className="flex justify-end pt-2">
          <Button 
            onClick={handleSave} 
            disabled={saving} 
            className="btn-primary"
            size="sm"
          >
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
      </CardContent>
    </Card>
  )
}
