export type RelanceType = "client" | "assurance" | "expert"
export type CommunicationType = "email" | "sms" | "appel" | "relance_auto"
export type CommunicationStatut = "envoye" | "lu" | "erreur"

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

export interface RelanceHistory {
  id: string
  dossier_id: string | null
  relance_type: RelanceType
  type: CommunicationType
  destinataire: string
  sujet?: string
  contenu?: string
  statut: CommunicationStatut
  sent_by: string | null
  sent_at: string
  dossier?: {
    dossier_id: string
  }
}
