# Plan : Recréation complète de la page Paramètres

## Objectif

Recréer complètement `app/settings/page.tsx` de zéro avec une structure propre, tous les paramètres nécessaires pour les relances (experts, clients, assurances), et une gestion robuste pour éviter les boucles infinies de chargement.

## Contexte technique

- **Framework** : Next.js 14 (App Router)
- **React** : 18.3.1 avec hooks (useState, useEffect, useRef)
- **Formulaires** : react-hook-form 7.50.1 avec zodResolver
- **Validation** : Zod 3.22.4
- **Base de données** : Supabase (Postgres) - table `settings` (clé-valeur)
- **Composants UI** : shadcn/ui (Card, Input, Textarea, Checkbox, Button, Label)
- **Style** : TailwindCSS avec classes `bordeaux-*` et classes utilitaires (`page-title`, `btn-primary`)
- **TypeScript** : strict mode

## Structure de la base de données

Table `settings` :

- `key` (TEXT PRIMARY KEY)
- `value` (TEXT NOT NULL) - Tous les settings sont stockés en string
- `description` (TEXT)
- `updated_at` (TIMESTAMPTZ)

**Important** : Les boolean sont stockés comme string "true"/"false" dans la DB.

## Corrections critiques incluses

✅ **Checkbox avec Controller** - Utiliser `Controller` de react-hook-form pour les Checkbox

✅ **Validation email optionnel** - Schema custom pour accepter chaîne vide OU email valide

✅ **Validation fréquences** - Vérifier que la valeur est > 0 après conversion

✅ **Gestion erreur PGRST116** - Ignorer l'erreur si table settings vide

✅ **Conversion boolean ↔ string** - Gestion correcte lors du chargement/sauvegarde

✅ **Éviter boucles infinies** - useEffect avec dépendances vides, hasLoadedRef, reset() une seule fois

## 1. Schéma Zod complet

Fichier : `app/settings/page.tsx`

```typescript
import { z } from "zod"

// Helper pour email optionnel (vide OU email valide)
const optionalEmail = z.string().refine(
  (val) => val === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val),
  { message: "Email invalide" }
)

// Helper pour nombre positif en string
const positiveNumberString = z.string().refine(
  (val) => /^\d+$/.test(val) && parseInt(val) > 0,
  { message: "Doit être un nombre supérieur à 0" }
)

const settingsSchema = z.object({
  // Emails (peuvent être vides)
  email_expediteur: optionalEmail,
  email_paiements: optionalEmail,
  assurance_email_expediteur: optionalEmail,
  
  // Fréquences (doivent être des nombres > 0)
  frequence_relance_expert_jours: positiveNumberString,
  frequence_relance_client_jours: positiveNumberString,
  delai_alerte_rapport_jours: positiveNumberString,
  frequence_relance_assurance_mois: positiveNumberString,
  
  // Boolean (activations)
  sms_enabled: z.boolean(),
  relance_expert_portail_enabled: z.boolean(),
  relance_client_sms_enabled: z.boolean(),
  relance_assurance_auto_enabled: z.boolean(),
  
  // Modèles de messages (peuvent être vides)
  modele_message_expert: z.string(),
  modele_message_expert_portail: z.string(),
  modele_message_client: z.string(),
  modele_message_client_sms: z.string(),
  modele_message_assurance: z.string(),
  modele_message_impaye: z.string(),
  
  // Twilio (peuvent être vides)
  twilio_account_sid: z.string(),
  twilio_auth_token: z.string(),
  twilio_phone_number: z.string(),
  
  // Avancé
  relance_max_retries: positiveNumberString,
  relance_retry_delay_minutes: positiveNumberString,
})

type SettingsFormData = z.infer<typeof settingsSchema>
```

## 2. Valeurs par défaut

```typescript
const defaultValues: SettingsFormData = {
  // Emails
  email_expediteur: "",
  email_paiements: "",
  assurance_email_expediteur: "",
  
  // Fréquences
  frequence_relance_expert_jours: "7",
  frequence_relance_client_jours: "14",
  delai_alerte_rapport_jours: "15",
  frequence_relance_assurance_mois: "2",
  
  // Boolean
  sms_enabled: false,
  relance_expert_portail_enabled: true,
  relance_client_sms_enabled: false,
  relance_assurance_auto_enabled: true,
  
  // Modèles
  modele_message_expert: "Bonjour, nous vous relançons concernant le dossier {dossier_id}. Merci de nous transmettre votre rapport d'expertise. Cordialement.",
  modele_message_expert_portail: "Demande de rapport pour le dossier {dossier_id}, véhicule {immatriculation}.",
  modele_message_client: "Bonjour {nom_client}, nous vous informons que votre dossier {dossier_id} est en attente de documents. Merci de nous les transmettre. Cordialement.",
  modele_message_client_sms: "Bonjour, votre dossier {dossier_id} est en attente. Merci de nous contacter.",
  modele_message_assurance: "Bonjour, nous relançons concernant la facture {numero_facture} d'un montant de {montant}€ pour le dossier {dossier_id}. Merci de procéder au règlement. Cordialement.",
  modele_message_impaye: "Bonjour, nous vous relançons concernant le paiement en attente pour le dossier {dossier_id}. Cordialement.",
  
  // Twilio
  twilio_account_sid: "",
  twilio_auth_token: "",
  twilio_phone_number: "",
  
  // Avancé
  relance_max_retries: "3",
  relance_retry_delay_minutes: "60",
}
```

## 3. Structure complète du composant

### Imports

```typescript
"use client"

import { useState, useEffect, useRef } from "react"
import { useForm, Controller } from "react-hook-form"
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
import { 
  Settings, 
  Mail, 
  Clock, 
  MessageSquare, 
  Phone, 
  Building2, 
  Save, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  Cog,
} from "lucide-react"
```

### Structure du composant

```typescript
export default function SettingsPage() {
  // ========== STATES ==========
  const [initialLoading, setInitialLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  
  // Ref pour éviter chargements multiples
  const hasLoadedRef = useRef(false)
  
  // ========== FORM ==========
  const {
    register,
    handleSubmit,
    control,  // IMPORTANT pour Controller
    reset,
    watch,
    formState: { errors, isDirty },
  } = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    defaultValues,
  })
  
  // Watcher pour affichage conditionnel
  const smsEnabled = watch("sms_enabled")
  
  // ========== CHARGEMENT (UNE SEULE FOIS) ==========
  useEffect(() => {
    if (hasLoadedRef.current) return
    hasLoadedRef.current = true
    loadSettings()
  }, []) // Dépendances vides - CRITIQUE
  
  const loadSettings = async () => {
    try {
      const supabase = createClient()
      
      const { data: settings, error: fetchError } = await supabase
        .from("settings")
        .select("key, value")
      
      // Ignorer erreur PGRST116 (table vide ou pas de résultats)
      if (fetchError && fetchError.code !== "PGRST116") {
        console.error("[Settings] Load error:", fetchError)
        setError("Erreur lors du chargement des paramètres")
        setInitialLoading(false)
        return
      }
      
      // Si pas de settings, garder les valeurs par défaut
      if (!settings || settings.length === 0) {
        setInitialLoading(false)
        return
      }
      
      // Mapper les settings vers les valeurs du formulaire
      const formValues: Partial<SettingsFormData> = { ...defaultValues }
      
      settings.forEach((setting) => {
        const key = setting.key as keyof SettingsFormData
        const value = setting.value
        
        // Convertir les boolean stockés en string
        if (key in formValues) {
          if (typeof defaultValues[key] === "boolean") {
            formValues[key] = (value === "true" || value === true) as any
          } else {
            formValues[key] = value as any
          }
        }
      })
      
      // Reset UNE SEULE FOIS avec les valeurs chargées
      reset(formValues as SettingsFormData, {
        keepDefaultValues: false,
      })
      
    } catch (err: any) {
      console.error("[Settings] Load error:", err)
      setError("Erreur lors du chargement des paramètres")
    } finally {
      setInitialLoading(false)
    }
  }
  
  // ========== SAUVEGARDE ==========
  const onSubmit = async (data: SettingsFormData) => {
    setSaving(true)
    setError(null)
    setSuccess(false)
    
    try {
      const supabase = createClient()
      
      // Convertir les données pour la sauvegarde
      const settingsToSave: { key: string; value: string }[] = []
      
      Object.entries(data).forEach(([key, value]) => {
        // Ne pas sauvegarder twilio_auth_token si vide (sécurité)
        if (key === "twilio_auth_token" && !value) {
          return
        }
        
        // Convertir boolean en string
        const stringValue = typeof value === "boolean" 
          ? value.toString() 
          : value
        
        settingsToSave.push({ key, value: stringValue })
      })
      
      // Sauvegarder chaque setting avec upsert
      for (const setting of settingsToSave) {
        const { error: upsertError } = await supabase
          .from("settings")
          .upsert(
            { key: setting.key, value: setting.value },
            { onConflict: "key" }
          )
        
        if (upsertError) {
          throw new Error(`Erreur sauvegarde ${setting.key}: ${upsertError.message}`)
        }
      }
      
      setSuccess(true)
      
      // Reset isDirty après sauvegarde réussie
      reset(data, { keepValues: true })
      
      // Masquer le message de succès après 3 secondes
      setTimeout(() => setSuccess(false), 3000)
      
    } catch (err: any) {
      console.error("[Settings] Save error:", err)
      setError(err.message || "Erreur lors de la sauvegarde")
    } finally {
      setSaving(false)
    }
  }
  
  // ========== RENDER ==========
  if (initialLoading) {
    return (
      <AuthenticatedLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-bordeaux-500" />
        </div>
      </AuthenticatedLayout>
    )
  }
  
  return (
    <AuthenticatedLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title flex items-center gap-2">
              <Settings className="h-6 w-6" />
              Paramètres
            </h1>
            <p className="text-gray-600">Configuration des relances et notifications</p>
          </div>
          
          <Button
            onClick={handleSubmit(onSubmit)}
            disabled={saving || !isDirty}
            className="btn-primary"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Enregistrement...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Enregistrer
              </>
            )}
          </Button>
        </div>
        
        {/* Messages feedback */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2 text-red-700">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
        
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-2 text-green-700">
            <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
            <span>Paramètres enregistrés avec succès</span>
          </div>
        )}
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Sections JSX complètes ci-dessous */}
        </form>
      </div>
    </AuthenticatedLayout>
  )
}
```

## 4. Sections JSX complètes

### Section 1 : Configuration des emails

```typescript
<Card>
  <CardHeader>
    <CardTitle className="flex items-center gap-2">
      <Mail className="h-5 w-5 text-bordeaux-500" />
      Configuration des emails
    </CardTitle>
  </CardHeader>
  <CardContent className="space-y-4">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <Label htmlFor="email_expediteur">Email expéditeur (relances)</Label>
        <Input
          id="email_expediteur"
          type="email"
          placeholder="relances@votredomaine.com"
          {...register("email_expediteur")}
          className="mt-1"
        />
        {errors.email_expediteur && (
          <p className="text-sm text-red-600 mt-1">{errors.email_expediteur.message}</p>
        )}
      </div>
      <div>
        <Label htmlFor="email_paiements">Email paiements</Label>
        <Input
          id="email_paiements"
          type="email"
          placeholder="paiements@votredomaine.com"
          {...register("email_paiements")}
          className="mt-1"
        />
        {errors.email_paiements && (
          <p className="text-sm text-red-600 mt-1">{errors.email_paiements.message}</p>
        )}
      </div>
    </div>
    <div>
      <Label htmlFor="assurance_email_expediteur">Email expéditeur (relances assurances)</Label>
      <Input
        id="assurance_email_expediteur"
        type="email"
        placeholder="assurances@votredomaine.com"
        {...register("assurance_email_expediteur")}
        className="mt-1"
      />
      <p className="text-xs text-gray-500 mt-1">
        Si vide, l'email expéditeur principal sera utilisé
      </p>
      {errors.assurance_email_expediteur && (
        <p className="text-sm text-red-600 mt-1">{errors.assurance_email_expediteur.message}</p>
      )}
    </div>
  </CardContent>
</Card>
```

### Section 2 : Relances experts

```typescript
<Card>
  <CardHeader>
    <CardTitle className="flex items-center gap-2">
      <Clock className="h-5 w-5 text-bordeaux-500" />
      Relances experts
    </CardTitle>
  </CardHeader>
  <CardContent className="space-y-4">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <Label htmlFor="frequence_relance_expert_jours">Fréquence relance (jours)</Label>
        <Input
          id="frequence_relance_expert_jours"
          type="number"
          min="1"
          {...register("frequence_relance_expert_jours")}
          className="mt-1"
        />
        {errors.frequence_relance_expert_jours && (
          <p className="text-sm text-red-600 mt-1">{errors.frequence_relance_expert_jours.message}</p>
        )}
      </div>
      <div>
        <Label htmlFor="delai_alerte_rapport_jours">Délai alerte rapport (jours)</Label>
        <Input
          id="delai_alerte_rapport_jours"
          type="number"
          min="1"
          {...register("delai_alerte_rapport_jours")}
          className="mt-1"
        />
        {errors.delai_alerte_rapport_jours && (
          <p className="text-sm text-red-600 mt-1">{errors.delai_alerte_rapport_jours.message}</p>
        )}
      </div>
    </div>
    
    {/* Checkbox avec Controller - CRITIQUE */}
    <div className="flex items-center space-x-2">
      <Controller
        name="relance_expert_portail_enabled"
        control={control}
        render={({ field }) => (
          <Checkbox
            id="relance_expert_portail_enabled"
            checked={field.value}
            onCheckedChange={field.onChange}
          />
        )}
      />
      <Label htmlFor="relance_expert_portail_enabled" className="cursor-pointer">
        Activer la relance via portail expert
      </Label>
    </div>
    
    <div>
      <Label htmlFor="modele_message_expert">Modèle email expert</Label>
      <Textarea
        id="modele_message_expert"
        rows={3}
        placeholder="Bonjour, nous vous relançons..."
        {...register("modele_message_expert")}
        className="mt-1"
      />
      <p className="text-xs text-gray-500 mt-1">
        Variables : {"{dossier_id}"}, {"{immatriculation}"}, {"{nom_client}"}
      </p>
    </div>
    
    <div>
      <Label htmlFor="modele_message_expert_portail">Modèle message portail</Label>
      <Textarea
        id="modele_message_expert_portail"
        rows={2}
        placeholder="Demande de rapport pour le dossier..."
        {...register("modele_message_expert_portail")}
        className="mt-1"
      />
    </div>
  </CardContent>
</Card>
```

### Section 3 : Relances clients

```typescript
<Card>
  <CardHeader>
    <CardTitle className="flex items-center gap-2">
      <MessageSquare className="h-5 w-5 text-bordeaux-500" />
      Relances clients
    </CardTitle>
  </CardHeader>
  <CardContent className="space-y-4">
    <div>
      <Label htmlFor="frequence_relance_client_jours">Fréquence relance (jours)</Label>
      <Input
        id="frequence_relance_client_jours"
        type="number"
        min="1"
        {...register("frequence_relance_client_jours")}
        className="mt-1 max-w-xs"
      />
      {errors.frequence_relance_client_jours && (
        <p className="text-sm text-red-600 mt-1">{errors.frequence_relance_client_jours.message}</p>
      )}
    </div>
    
    {/* Checkbox avec Controller */}
    <div className="flex items-center space-x-2">
      <Controller
        name="relance_client_sms_enabled"
        control={control}
        render={({ field }) => (
          <Checkbox
            id="relance_client_sms_enabled"
            checked={field.value}
            onCheckedChange={field.onChange}
          />
        )}
      />
      <Label htmlFor="relance_client_sms_enabled" className="cursor-pointer">
        Activer les relances par SMS
      </Label>
    </div>
    
    <div>
      <Label htmlFor="modele_message_client">Modèle email client</Label>
      <Textarea
        id="modele_message_client"
        rows={3}
        placeholder="Bonjour, votre dossier..."
        {...register("modele_message_client")}
        className="mt-1"
      />
      <p className="text-xs text-gray-500 mt-1">
        Variables : {"{nom_client}"}, {"{dossier_id}"}, {"{immatriculation}"}
      </p>
    </div>
    
    <div>
      <Label htmlFor="modele_message_client_sms">Modèle SMS client</Label>
      <Textarea
        id="modele_message_client_sms"
        rows={2}
        maxLength={160}
        placeholder="Bonjour, votre dossier..."
        {...register("modele_message_client_sms")}
        className="mt-1"
      />
      <p className="text-xs text-gray-500 mt-1">
        Maximum 160 caractères pour un SMS
      </p>
    </div>
  </CardContent>
</Card>
```

### Section 4 : Relances assurances

```typescript
<Card>
  <CardHeader>
    <CardTitle className="flex items-center gap-2">
      <Building2 className="h-5 w-5 text-bordeaux-500" />
      Relances assurances
    </CardTitle>
  </CardHeader>
  <CardContent className="space-y-4">
    <div>
      <Label htmlFor="frequence_relance_assurance_mois">Fréquence relance (mois)</Label>
      <Input
        id="frequence_relance_assurance_mois"
        type="number"
        min="1"
        {...register("frequence_relance_assurance_mois")}
        className="mt-1 max-w-xs"
      />
      {errors.frequence_relance_assurance_mois && (
        <p className="text-sm text-red-600 mt-1">{errors.frequence_relance_assurance_mois.message}</p>
      )}
    </div>
    
    {/* Checkbox avec Controller */}
    <div className="flex items-center space-x-2">
      <Controller
        name="relance_assurance_auto_enabled"
        control={control}
        render={({ field }) => (
          <Checkbox
            id="relance_assurance_auto_enabled"
            checked={field.value}
            onCheckedChange={field.onChange}
          />
        )}
      />
      <Label htmlFor="relance_assurance_auto_enabled" className="cursor-pointer">
        Activer les relances automatiques des assurances
      </Label>
    </div>
    
    <div>
      <Label htmlFor="modele_message_assurance">Modèle email assurance</Label>
      <Textarea
        id="modele_message_assurance"
        rows={3}
        placeholder="Bonjour, nous relançons concernant la facture..."
        {...register("modele_message_assurance")}
        className="mt-1"
      />
      <p className="text-xs text-gray-500 mt-1">
        Variables : {"{numero_facture}"}, {"{montant}"}, {"{dossier_id}"}, {"{nom_assurance}"}
      </p>
    </div>
    
    <div>
      <Label htmlFor="modele_message_impaye">Modèle email impayé</Label>
      <Textarea
        id="modele_message_impaye"
        rows={3}
        placeholder="Bonjour, nous vous relançons concernant le paiement..."
        {...register("modele_message_impaye")}
        className="mt-1"
      />
      <p className="text-xs text-gray-500 mt-1">
        Variables : {"{dossier_id}"}, {"{montant}"}, {"{jours}"}
      </p>
    </div>
  </CardContent>
</Card>
```

### Section 5 : Configuration SMS (Twilio) - Conditionnel

```typescript
<Card>
  <CardHeader>
    <CardTitle className="flex items-center gap-2">
      <Phone className="h-5 w-5 text-bordeaux-500" />
      Configuration SMS (Twilio)
    </CardTitle>
  </CardHeader>
  <CardContent className="space-y-4">
    {/* Checkbox global SMS avec Controller */}
    <div className="flex items-center space-x-2">
      <Controller
        name="sms_enabled"
        control={control}
        render={({ field }) => (
          <Checkbox
            id="sms_enabled"
            checked={field.value}
            onCheckedChange={field.onChange}
          />
        )}
      />
      <Label htmlFor="sms_enabled" className="cursor-pointer">
        Activer l'envoi de SMS (nécessite un compte Twilio)
      </Label>
    </div>
    
    {/* Affichage conditionnel si SMS activés */}
    {smsEnabled && (
      <div className="space-y-4 pt-4 border-t">
        <div>
          <Label htmlFor="twilio_account_sid">Account SID</Label>
          <Input
            id="twilio_account_sid"
            placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
            {...register("twilio_account_sid")}
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="twilio_auth_token">Auth Token</Label>
          <Input
            id="twilio_auth_token"
            type="password"
            placeholder="••••••••••••••••"
            {...register("twilio_auth_token")}
            className="mt-1"
          />
          <p className="text-xs text-gray-500 mt-1">
            Laissez vide pour conserver la valeur actuelle
          </p>
        </div>
        <div>
          <Label htmlFor="twilio_phone_number">Numéro Twilio</Label>
          <Input
            id="twilio_phone_number"
            placeholder="+33612345678"
            {...register("twilio_phone_number")}
            className="mt-1"
          />
          <p className="text-xs text-gray-500 mt-1">
            Format E.164 (ex: +33612345678)
          </p>
        </div>
      </div>
    )}
  </CardContent>
</Card>
```

### Section 6 : Configuration avancée

```typescript
<Card>
  <CardHeader>
    <CardTitle className="flex items-center gap-2">
      <Cog className="h-5 w-5 text-bordeaux-500" />
      Configuration avancée
    </CardTitle>
  </CardHeader>
  <CardContent className="space-y-4">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <Label htmlFor="relance_max_retries">Nombre max de tentatives</Label>
        <Input
          id="relance_max_retries"
          type="number"
          min="1"
          max="10"
          {...register("relance_max_retries")}
          className="mt-1"
        />
        <p className="text-xs text-gray-500 mt-1">
          Nombre de tentatives avant abandon
        </p>
        {errors.relance_max_retries && (
          <p className="text-sm text-red-600 mt-1">{errors.relance_max_retries.message}</p>
        )}
      </div>
      <div>
        <Label htmlFor="relance_retry_delay_minutes">Délai entre tentatives (minutes)</Label>
        <Input
          id="relance_retry_delay_minutes"
          type="number"
          min="1"
          {...register("relance_retry_delay_minutes")}
          className="mt-1"
        />
        {errors.relance_retry_delay_minutes && (
          <p className="text-sm text-red-600 mt-1">{errors.relance_retry_delay_minutes.message}</p>
        )}
      </div>
    </div>
  </CardContent>
</Card>
```

## Points critiques à respecter

### 1. Checkbox avec Controller (CRITIQUE)

Le composant Checkbox de shadcn/ui utilise `onCheckedChange` (pas `onChange`). Utiliser `Controller` garantit la synchronisation parfaite avec react-hook-form :

```typescript
<Controller
  name="sms_enabled"
  control={control}
  render={({ field }) => (
    <Checkbox
      id="sms_enabled"
      checked={field.value}
      onCheckedChange={field.onChange}
    />
  )}
/>
```

**Important** : Le composant Checkbox de shadcn/ui utilise `onCheckedChange` qui reçoit directement la valeur boolean, donc on utilise `onCheckedChange={field.onChange}` (pas besoin de `e.target.checked`).

### 2. Validation email optionnel

Un email peut être vide OU valide. `z.string().email()` rejette les chaînes vides.

**Solution :** Validation custom avec `refine()` :

```typescript
const optionalEmail = z.string().refine(
  (val) => val === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val),
  { message: "Email invalide" }
)
```

### 3. Éviter les boucles infinies (CRITIQUE)

- `useEffect` avec dépendances vides `[]` - NE PAS ajouter de dépendances
- `hasLoadedRef.current` pour empêcher chargements multiples
- `reset()` appelé UNE SEULE FOIS après chargement
- **JAMAIS** mettre `reset()` ou `setValue()` dans les dépendances du useEffect
- Pas de cleanup qui annule les requêtes en cours

### 4. Gestion erreur PGRST116

Supabase retourne l'erreur PGRST116 si la table est vide. Il faut l'ignorer :

```typescript
// Ignorer erreur PGRST116 (table vide ou pas de résultats)
if (fetchError && fetchError.code !== "PGRST116") {
  console.error("[Settings] Load error:", fetchError)
  setError("Erreur lors du chargement des paramètres")
  setInitialLoading(false)
  return
}
```

### 5. Conversion boolean ↔ string

Les settings sont stockés en string dans Supabase, mais le formulaire utilise des boolean :

```typescript
// Chargement : string → boolean
if (typeof defaultValues[key] === "boolean") {
  formValues[key] = (value === "true" || value === true) as any
}

// Sauvegarde : boolean → string
const stringValue = typeof value === "boolean" ? value.toString() : value
```

### 6. Gestion twilio_auth_token

Ne pas sauvegarder `twilio_auth_token` si vide (pour sécurité - permet de conserver l'ancien token) :

```typescript
if (key === "twilio_auth_token" && !value) {
  return // Skip cette sauvegarde
}
```

## Fichiers à modifier

- `app/settings/page.tsx` : **SUPPRIMER complètement puis RECRÉER** avec tout le code ci-dessus

## Validation finale

Après implémentation, vérifier :

✅ Pas de boucles infinies de chargement (vérifier dans console du navigateur)

✅ Tous les paramètres sont chargés correctement depuis Supabase

✅ Tous les paramètres sont sauvegardés correctement dans Supabase

✅ Les Checkbox fonctionnent (cocher/décocher met à jour le formulaire)

✅ Affichage conditionnel Twilio fonctionne (section visible seulement si `sms_enabled === true`)

✅ Messages d'erreur/succès s'affichent correctement

✅ Validation Zod fonctionne pour tous les champs (emails invalides, nombres négatifs, etc.)

✅ Bouton "Enregistrer" désactivé si pas de modifications (`isDirty === false`)

✅ Le loader s'affiche pendant le chargement initial

✅ Pas d'erreurs dans la console du navigateur

## Notes importantes

- Le bouton "Enregistrer" utilise `onClick={handleSubmit(onSubmit)}` pour soumettre le formulaire
- Tous les champs optionnels peuvent être vides (emails, Twilio, modèles)
- Les modèles de messages peuvent contenir des variables entre accolades : `{dossier_id}`, `{montant}`, etc.
- Le style utilise les classes `page-title` et `btn-primary` définies dans `app/globals.css` pour la cohérence avec le reste de l'application
- Les Checkbox utilisent `onCheckedChange={field.onChange}` avec `Controller` pour une synchronisation parfaite avec react-hook-form