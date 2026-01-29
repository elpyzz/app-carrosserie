import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { scanFactureAssurance } from "@/lib/ai/facture-scanner"
import { FactureAssuranceUploadResult } from "@/lib/relance/types"
import { isValidUUID } from "@/lib/utils"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "Non authentifié" },
        { status: 401 }
      )
    }

    const formData = await request.formData()
    const file = formData.get("file") as File
    const dossierIdRaw = formData.get("dossier_id") as string | null

    // Résoudre le dossier_id (peut être un UUID ou un dossier_id textuel comme DOS-2024-001)
    let dossierId: string | null = null
    if (dossierIdRaw && dossierIdRaw.trim()) {
      if (isValidUUID(dossierIdRaw)) {
        // C'est déjà un UUID
        dossierId = dossierIdRaw
      } else {
        // Chercher le dossier par son dossier_id textuel
        const { data: dossier } = await supabase
          .from("dossiers")
          .select("id")
          .eq("dossier_id", dossierIdRaw.trim())
          .single()
        
        if (dossier) {
          dossierId = dossier.id
        }
      }
    }

    if (!file) {
      return NextResponse.json(
        { success: false, error: "Aucun fichier fourni" },
        { status: 400 }
      )
    }

    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/jpg",
      "image/png",
    ]
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: "Type de fichier non supporté. Utilisez PDF, JPG ou PNG." },
        { status: 400 }
      )
    }

    // Limiter la taille (10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: "Fichier trop volumineux (max 10MB)" },
        { status: 400 }
      )
    }

    // Uploader le fichier
    const fileExt = file.name.split(".").pop()?.toLowerCase() || "pdf"
    const fileName = `factures-assurance/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
    const fileBuffer = Buffer.from(await file.arrayBuffer())

    const { error: uploadError } = await supabase.storage
      .from("documents")
      .upload(fileName, fileBuffer, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      console.error("[API] Upload error:", uploadError)
      return NextResponse.json(
        { success: false, error: "Erreur lors de l'upload du fichier" },
        { status: 500 }
      )
    }

    // Créer l'entrée document
    const { data: document, error: docError } = await supabase
      .from("documents")
      .insert({
        dossier_id: dossierId,
        type: "facture",
        nom_fichier: file.name,
        chemin_storage: fileName,
        taille_bytes: file.size,
        mime_type: file.type,
        uploaded_by: user.id,
      })
      .select()
      .single()

    if (docError) {
      console.error("[API] Document creation error:", docError)
      return NextResponse.json(
        { success: false, error: "Erreur lors de la création du document" },
        { status: 500 }
      )
    }

    // Obtenir l'URL publique
    const { data: urlData } = supabase.storage
      .from("documents")
      .getPublicUrl(fileName)

    // Scanner la facture avec l'IA
    const scanResult = await scanFactureAssurance(urlData.publicUrl, fileBuffer)

    // Calculer la date de prochaine relance (2 mois) si email présent
    let prochaineRelance: string | null = null
    if (scanResult.email_assurance) {
      const date = new Date()
      date.setMonth(date.getMonth() + 2)
      prochaineRelance = date.toISOString()
    }

    // Créer la facture assurance (même sans email)
    const { data: facture, error: factureError } = await supabase
      .from("factures_assurance")
      .insert({
        dossier_id: dossierId,
        nom_assurance: scanResult.nom_assurance,
        email_assurance: scanResult.email_assurance || "",
        telephone_assurance: scanResult.telephone_assurance || null,
        montant: scanResult.montant,
        numero_facture: scanResult.numero_facture || null,
        date_facture: scanResult.date_facture || null,
        date_echeance: scanResult.date_echeance || null,
        document_id: document.id,
        statut: "EN_ATTENTE",
        donnees_extractees: scanResult,
        prochaine_relance: prochaineRelance,
        uploaded_by: user.id,
      })
      .select()
      .single()

    if (factureError) {
      console.error("[API] Facture creation error:", factureError)
      return NextResponse.json(
        { success: false, error: "Erreur lors de la création de la facture" },
        { status: 500 }
      )
    }

    // Log audit
    await supabase.from("audit_logs").insert({
      action: "FACTURE_ASSURANCE_UPLOADED",
      entity_type: "factures_assurance",
      entity_id: facture.id,
      user_id: user.id,
      details: {
        nom_assurance: scanResult.nom_assurance,
        montant: scanResult.montant,
        confidence: scanResult.confidence,
        email_found: !!scanResult.email_assurance,
      },
    })

    // Préparer les warnings
    const warnings: string[] = []
    if (!scanResult.email_assurance) {
      warnings.push("Email de l'assurance non trouvé - veuillez le saisir manuellement pour activer les relances automatiques")
    }
    if (scanResult.confidence < 0.7) {
      warnings.push("Confiance faible - vérifiez les données extraites")
    }

    return NextResponse.json({
      success: true,
      facture_id: facture.id,
      donnees_extractees: scanResult,
      warnings,
    } as FactureAssuranceUploadResult)

  } catch (error: any) {
    console.error("[API] Upload facture error:", error)
    return NextResponse.json(
      { success: false, error: error.message || "Erreur serveur" },
      { status: 500 }
    )
  }
}
