import { FactureAssuranceScanResult } from "@/lib/relance/types"

/**
 * Service de scan IA pour extraire les données d'une facture
 */
export async function scanFactureAssurance(
  imageUrl: string,
  imageBuffer?: Buffer
): Promise<FactureAssuranceScanResult> {
  // Vérifier que la clé API est configurée
  if (!process.env.OPENAI_API_KEY) {
    console.warn("[AI] OPENAI_API_KEY non configuré, retour de données par défaut")
    return {
      nom_assurance: "Assurance à identifier",
      montant: 0,
      confidence: 0,
    }
  }

  try {
    return await scanWithOpenAI(imageUrl, imageBuffer)
  } catch (error: any) {
    console.error("[AI] Scan error:", error)
    return {
      nom_assurance: "Assurance à identifier",
      montant: 0,
      confidence: 0,
    }
  }
}

async function scanWithOpenAI(
  imageUrl: string,
  imageBuffer?: Buffer
): Promise<FactureAssuranceScanResult> {
  let imageContent: { type: "image_url"; image_url: { url: string } }

  if (imageBuffer) {
    const base64 = imageBuffer.toString("base64")
    imageContent = {
      type: "image_url",
      image_url: {
        url: `data:image/jpeg;base64,${base64}`,
      },
    }
  } else {
    imageContent = {
      type: "image_url",
      image_url: {
        url: imageUrl,
      },
    }
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `Tu es un expert en extraction de données de factures d'assurance automobile.
Extrais les informations suivantes d'une facture :
- Nom de l'assurance
- Email de l'assurance (OBLIGATOIRE - cherche bien dans la facture)
- Téléphone de l'assurance (si visible)
- Montant total (en euros)
- Numéro de facture
- Date de facture (format YYYY-MM-DD)
- Date d'échéance (format YYYY-MM-DD)
- Numéro de dossier/sinistre (si visible)

Réponds UNIQUEMENT en JSON valide avec cette structure exacte (pas de backticks, pas de markdown) :
{
  "nom_assurance": "nom",
  "email_assurance": "email ou null",
  "telephone_assurance": "telephone ou null",
  "montant": nombre,
  "numero_facture": "numero ou null",
  "date_facture": "YYYY-MM-DD ou null",
  "date_echeance": "YYYY-MM-DD ou null",
  "dossier_id": "numero dossier ou null",
  "confidence": nombre entre 0 et 1
}`,
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Extrais toutes les informations de cette facture d'assurance. L'email de l'assurance est OBLIGATOIRE pour les relances automatiques. Réponds uniquement en JSON sans backticks.",
            },
            imageContent,
          ],
        },
      ],
      max_tokens: 1000,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Erreur OpenAI: ${response.status} - ${errorText}`)
  }

  const data = await response.json()
  const content = data.choices[0]?.message?.content

  if (!content) {
    throw new Error("Aucune réponse de l'IA")
  }

  // Nettoyer la réponse (enlever les backticks markdown si présents)
  const cleanedContent = content
    .replace(/```json\n?/g, "")
    .replace(/```\n?/g, "")
    .trim()

  try {
    const extracted = JSON.parse(cleanedContent)
    return {
      nom_assurance: extracted.nom_assurance || "Assurance inconnue",
      email_assurance: extracted.email_assurance || undefined,
      telephone_assurance: extracted.telephone_assurance || undefined,
      montant: parseFloat(extracted.montant) || 0,
      numero_facture: extracted.numero_facture || undefined,
      date_facture: extracted.date_facture || undefined,
      date_echeance: extracted.date_echeance || undefined,
      dossier_id: extracted.dossier_id || undefined,
      confidence: parseFloat(extracted.confidence) || 0.5,
    }
  } catch (parseError) {
    console.error("[AI] Parse error:", parseError, "Content:", cleanedContent)
    throw new Error("Erreur de parsing de la réponse IA")
  }
}
