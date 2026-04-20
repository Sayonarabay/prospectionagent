// ============================================================
// Types centraux — Studio Veille
// ============================================================

export type OpportunityStatus = 'detected' | 'qualified' | 'drafting' | 'sent' | 'won' | 'lost'
export type OpportunityPriority = 'high' | 'medium' | 'low'
export type OpportunitySource =
  | 'boamp'
  | 'ao_public'
  | 'linkedin'
  | 'malt'
  | 'lbf'
  | 'behance'
  | 'instagram'
  | 'manual'

export type DocumentType = 'email' | 'lettre' | 'note_intention' | 'devis' | 'proposition'

export interface Opportunity {
  id: string
  user_id: string
  title: string
  client: string | null
  source: OpportunitySource
  source_url: string | null
  source_ref: string | null
  budget_min: number | null
  budget_max: number | null
  deadline: string | null
  status: OpportunityStatus
  priority: OpportunityPriority
  notes: string | null
  tags: string[]
  ao_raw_text: string | null
  ai_analysis: AIAnalysis | null
  created_at: string
  updated_at: string
}

export interface AIAnalysis {
  mission_type: string
  required_skills: string[]
  fit_score: 'high' | 'medium' | 'low'
  fit_reason: string
  watch_points: string[]
  strategy: string
  estimated_budget_range?: string
  analysed_at: string
}

export interface OpportunityHistory {
  id: string
  opportunity_id: string
  user_id: string
  event_type: 'status_change' | 'note_added' | 'document_generated' | 'email_sent' | 'scan_found'
  old_value: string | null
  new_value: string | null
  note: string | null
  created_at: string
}

export interface Document {
  id: string
  opportunity_id: string | null
  user_id: string
  doc_type: DocumentType
  title: string
  content: string
  is_template: boolean
  version: number
  created_at: string
  updated_at: string
}

export interface Template {
  id: string
  user_id: string
  name: string
  doc_type: DocumentType
  content: string
  variables: Record<string, string> | null
  is_default: boolean
  created_at: string
  updated_at: string
}

export interface UserSettings {
  id: string
  user_id: string
  studio_name: string
  da_name: string | null
  studio_bio: string | null
  skills_keywords: string[]
  sources_config: SourcesConfig
  notification_email: string | null
  scan_day: number
  anthropic_api_key: string | null
  created_at: string
  updated_at: string
}

export interface SourceConfig {
  enabled: boolean
  keywords: string[]
}

export interface SourcesConfig {
  boamp: SourceConfig
  ao_public: SourceConfig
  linkedin: SourceConfig
  malt: SourceConfig
  lbf: SourceConfig
  behance: SourceConfig
  instagram: SourceConfig
}

export interface ScanLog {
  id: string
  user_id: string
  sources_scanned: string[]
  opportunities_found: number
  new_count: number
  raw_results: unknown
  status: 'success' | 'error' | 'running'
  error_message: string | null
  started_at: string
  finished_at: string | null
}

// UI helpers
export const STATUS_LABELS: Record<OpportunityStatus, string> = {
  detected: 'Détectée',
  qualified: 'Qualifiée',
  drafting: 'En rédaction',
  sent: 'Envoyée',
  won: 'Gagnée',
  lost: 'Perdue',
}

export const STATUS_ORDER: OpportunityStatus[] = [
  'detected', 'qualified', 'drafting', 'sent', 'won'
]

export const PRIORITY_LABELS: Record<OpportunityPriority, string> = {
  high: 'Haute',
  medium: 'Moyenne',
  low: 'Faible',
}

export const SOURCE_LABELS: Record<OpportunitySource, string> = {
  boamp: 'BOAMP',
  ao_public: 'AO Public',
  linkedin: 'LinkedIn',
  malt: 'Malt',
  lbf: 'Les Bons Freelances',
  behance: 'Behance',
  instagram: 'Instagram',
  manual: 'Manuel',
}

export const DOC_TYPE_LABELS: Record<DocumentType, string> = {
  email: 'Email de candidature',
  lettre: 'Lettre de motivation',
  note_intention: "Note d'intention",
  devis: 'Devis',
  proposition: 'Proposition commerciale',
}
