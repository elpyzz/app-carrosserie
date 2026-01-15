export type UserRole = "admin" | "employe"

export type DossierStatut =
  | "NOUVEAU"
  | "EN_ATTENTE_EXPERT"
  | "RELANCE_EXPERT"
  | "RAPPORT_RECU"
  | "EN_REPARATION"
  | "FACTURE_ENVOYEE"
  | "EN_ATTENTE_PAIEMENT"
  | "PAYE"
  | "LITIGE"

export type DocumentType =
  | "devis"
  | "photos_avant"
  | "photos_apres"
  | "carte_grise"
  | "rapport_expert"
  | "facture"
  | "autres"

export type CommunicationType = "email" | "sms" | "appel" | "relance_auto"

export type PaymentStatut = "EN_ATTENTE" | "PAYE" | "EN_RETARD" | "LITIGE"

export interface User {
  id: string
  email: string
  full_name: string | null
  role: UserRole
  created_at: string
  updated_at: string
}

export interface Client {
  id: string
  nom: string
  telephone: string | null
  email: string | null
  adresse: string | null
  created_at: string
  updated_at: string
}

export interface Vehicule {
  id: string
  immatriculation: string | null
  vin: string | null
  marque: string | null
  modele: string | null
  annee: number | null
  created_at: string
  updated_at: string
}

export interface Dossier {
  id: string
  dossier_id: string
  client_id: string | null
  vehicule_id: string | null
  assureur: string | null
  expert: string | null
  expert_email: string | null
  statut: DossierStatut
  montant_estime: number | null
  notes: string | null
  date_entree: string
  date_derniere_relance_expert: string | null
  date_rapport_recu: string | null
  date_facture_envoyee: string | null
  notifier_client: boolean
  created_by: string | null
  created_at: string
  updated_at: string
  client?: Client
  vehicule?: Vehicule
}

export interface Document {
  id: string
  dossier_id: string
  type: DocumentType
  nom_fichier: string
  chemin_storage: string
  taille_bytes: number | null
  mime_type: string | null
  uploaded_by: string | null
  created_at: string
}

export interface ChecklistItem {
  id: string
  dossier_id: string
  libelle: string
  est_obligatoire: boolean
  est_coche: boolean
  document_requis: string | null
  checked_by: string | null
  checked_at: string | null
  created_at: string
  updated_at: string
}

export interface Communication {
  id: string
  dossier_id: string
  type: CommunicationType
  destinataire: string
  sujet: string | null
  contenu: string
  statut: string
  thread_id: string | null
  sent_by: string | null
  sent_at: string
}

export interface Payment {
  id: string
  dossier_id: string
  montant: number
  date_facture: string | null
  date_echeance: string | null
  statut: PaymentStatut
  date_derniere_relance: string | null
  nombre_relances: number
  email_paiements: string | null
  thread_id: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Supplier {
  id: string
  nom: string
  contact: string | null
  telephone: string | null
  email: string | null
  site_web: string | null
  notes: string | null
  actif: boolean
  created_at: string
  updated_at: string
}

export interface SupplierSearch {
  id: string
  dossier_id: string | null
  vehicule_marque: string | null
  vehicule_modele: string | null
  piece: string
  reference: string | null
  supplier_id: string | null
  prix: number | null
  delai_jours: number | null
  disponible: boolean | null
  notes: string | null
  searched_by: string | null
  created_at: string
}
