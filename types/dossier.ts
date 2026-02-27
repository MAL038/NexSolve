export type DossierType = 
  | 'document' 
  | 'vraag' 
  | 'case' 
  | 'notitie' 
  | 'offerte' 
  | 'contract'

export const DOSSIER_TYPE_LABELS: Record<DossierType, string> = {
  document: 'Document',
  vraag: 'Vraag',
  case: 'Case',
  notitie: 'Notitie',
  offerte: 'Offerte',
  contract: 'Contract',
}

export interface Dossier {
  id: string
  title: string
  type: DossierType
  description: string | null
  file_url: string | null
  file_name: string | null
  file_size: number | null
  submitted_by: string
  submitted_at: string
  project_id: string | null
  customer_id: string | null
  created_at: string
  updated_at: string
}

export interface DossierWithDetails extends Dossier {
  submitted_by_name: string
  submitted_by_avatar: string | null
  project_name: string | null
  customer_name: string | null
}

export interface CreateDossierInput {
  title: string
  type: DossierType
  description?: string
  project_id?: string
  customer_id?: string
  file?: File  // client-side only, wordt geupload voor opslaan
}