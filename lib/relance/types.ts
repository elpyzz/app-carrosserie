import { PortailAction } from "@/lib/types"

// Types existants conservés pour compatibilité
export type RelanceTypeOld = "client" | "assurance" | "expert"
export type CommunicationTypeOld = "email" | "sms" | "appel" | "relance_auto"
export type CommunicationStatutOld = "envoye" | "lu" | "erreur"

export interface RelanceImpaye {
  id: string
  payment_id: string
  dossier_id: string
  dossier?: {
    dossier_id: string
    clients?: { nom: string; email: string | null; telephone: string | null }
    vehicules?: { immatriculation: string | null; marque: string | null; modele: string | null }
  }
  montant: number
  date_facture: string | null
  date_echeance: string | null
  statut: "EN_ATTENTE" | "EN_RETARD" | "PAYE" | "LITIGE"
  nombre_relances: number
  date_derniere_relance: string | null
  jours_retard: number
  created_at: string
}

export interface RelanceAssurance {
  id: string
  dossier_id: string
  dossier?: {
    dossier_id: string
    clients?: { nom: string; email: string | null; telephone: string | null }
    vehicules?: { immatriculation: string | null; marque: string | null; modele: string | null }
    statut: string
    assureur: string | null
    date_entree: string
  }
  nombre_relances: number
  date_derniere_relance: string | null
  jours_depuis_relance: number
  raison: string
  created_at: string
}

export interface RelanceExpert {
  id: string
  dossier_id: string
  dossier?: {
    dossier_id: string
    clients?: { nom: string; email: string | null; telephone: string | null }
    vehicules?: { immatriculation: string | null; marque: string | null; modele: string | null }
    expert: string | null
    expert_email: string | null
    date_entree: string
    date_rapport_recu: string | null
    date_derniere_relance_expert: string | null
  }
  nombre_relances: number
  jours_depuis_relance: number
  jours_depuis_entree: number
  raison: string
  created_at: string
}

// === NOUVEAUX TYPES POUR SYSTÈME DE RELANCE AUTOMATIQUE ===

export interface PortailRelanceResult {
  success: boolean
  action: PortailAction
  message?: string
  erreur?: string
  rapport_trouve?: boolean
  rapport_url?: string
  details?: Record<string, any>
}

export interface StopRelancesCheck {
  shouldStop: boolean
  reason?: "document_recu" | "statut_avance" | "date_rapport_recu"
  documentType?: string
  details?: Record<string, any>
}

export interface RelanceSettings {
  email_expediteur: string
  frequence_relance_expert_jours: string
  frequence_relance_client_jours: string
  modele_message_expert: string
  modele_message_expert_portail: string
  modele_message_client: string
  modele_message_client_sms: string
  sms_enabled: string
  relance_expert_portail_enabled: string
  relance_client_sms_enabled: string
}

export interface RelanceCronResults {
  experts_portail: { success: number; failed: number }
  experts_email: { success: number; failed: number }
  clients_sms: { success: number; failed: number }
  clients_email: { success: number; failed: number }
  stopped: number
  skipped: number
  errors: string[]
}

// === FACTURES ASSURANCE ===

export type FactureAssuranceStatut = 
  | "EN_ATTENTE" 
  | "RELANCE_EN_COURS" 
  | "SUPPRIME"

export interface FactureAssurance {
  id: string
  dossier_id: string | null
  nom_assurance: string
  email_assurance: string
  telephone_assurance: string | null
  montant: number
  numero_facture: string | null
  date_facture: string | null
  date_echeance: string | null
  document_id: string | null
  statut: FactureAssuranceStatut
  donnees_extractees: Record<string, any>
  date_derniere_relance: string | null
  nombre_relances: number
  prochaine_relance: string | null
  notes: string | null
  uploaded_by: string | null
  created_at: string
  updated_at: string
  // Jointures optionnelles
  dossier?: {
    id: string
    dossier_id: string
    clients?: {
      nom: string
    }
    vehicules?: {
      immatriculation: string
    }
  }
  document?: {
    id: string
    nom_fichier: string
    chemin_storage: string
  }
}

export interface FactureAssuranceUploadResult {
  success: boolean
  facture_id?: string
  donnees_extractees?: FactureAssuranceScanResult
  error?: string
  warnings?: string[]
}

export interface FactureAssuranceScanResult {
  nom_assurance: string
  email_assurance?: string
  telephone_assurance?: string
  montant: number
  numero_facture?: string
  date_facture?: string
  date_echeance?: string
  dossier_id?: string
  confidence: number
}
