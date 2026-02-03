import twilio from "twilio"
import { createClient } from "@/lib/supabase/server"
import { SendSMSResult, TwilioCredentials } from "./types"

/**
 * Récupère les credentials Twilio depuis les settings
 */
async function getTwilioCredentials(): Promise<TwilioCredentials | null> {
  const supabase = await createClient()
  
  const { data: settings } = await supabase
    .from("settings")
    .select("key, value")
    .in("key", ["twilio_account_sid", "twilio_auth_token", "twilio_phone_number"])

  if (!settings || settings.length < 3) {
    return null
  }

  const settingsMap: Record<string, string> = {}
  settings.forEach((s: { key: string; value: string }) => {
    settingsMap[s.key] = s.value
  })

  const accountSid = settingsMap["twilio_account_sid"]
  const authToken = settingsMap["twilio_auth_token"]
  const phoneNumber = settingsMap["twilio_phone_number"]

  if (!accountSid || !authToken || !phoneNumber) {
    return null
  }

  return { accountSid, authToken, phoneNumber }
}

/**
 * Normalise un numéro de téléphone français au format international
 */
export function normalizePhoneNumber(phone: string): string {
  // Enlever tous les espaces, points, tirets
  let cleaned = phone.replace(/[\s.\-()]/g, "")

  // Si commence par 0, remplacer par +33
  if (cleaned.startsWith("0")) {
    cleaned = "+33" + cleaned.substring(1)
  } else if (!cleaned.startsWith("+")) {
    // Si ne commence pas par +, ajouter +33
    cleaned = "+33" + cleaned
  }

  return cleaned
}

/**
 * Envoie un SMS via Twilio
 */
export async function sendSMS(
  to: string,
  message: string
): Promise<SendSMSResult> {
  try {
    const credentials = await getTwilioCredentials()
    
    if (!credentials) {
      return {
        success: false,
        error: "Twilio credentials not configured. Please configure twilio_account_sid, twilio_auth_token, and twilio_phone_number in settings.",
      }
    }

    const client = twilio(credentials.accountSid, credentials.authToken)
    const normalizedTo = normalizePhoneNumber(to)

    const messageResult = await client.messages.create({
      body: message,
      from: credentials.phoneNumber,
      to: normalizedTo,
    })

    return {
      success: true,
      messageSid: messageResult.sid,
      status: messageResult.status,
    }
  } catch (error: any) {
    console.error("[Twilio] Error sending SMS:", error)
    return {
      success: false,
      error: error.message || "Unknown Twilio error",
    }
  }
}

/**
 * Vérifie le statut d'un SMS envoyé
 */
export async function getSMSStatus(messageSid: string): Promise<string | null> {
  try {
    const credentials = await getTwilioCredentials()
    
    if (!credentials) {
      return null
    }

    const client = twilio(credentials.accountSid, credentials.authToken)
    const message = await client.messages(messageSid).fetch()
    
    return message.status
  } catch (error) {
    console.error("[Twilio] Error fetching SMS status:", error)
    return null
  }
}

/**
 * Vérifie si Twilio est configuré
 */
export async function isTwilioConfigured(): Promise<boolean> {
  const credentials = await getTwilioCredentials()
  return credentials !== null
}
