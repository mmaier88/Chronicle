// Chronicle Types

export type BookStatus = 'drafting' | 'editing' | 'final'
export type BookGenre = 'non_fiction' | 'literary_fiction'
export type ContentStatus = 'draft' | 'locked' | 'canonical'
export type MilestoneVersion = 'v1' | 'v2' | 'final'
export type ClaimBlockType = 'assertion' | 'definition' | 'premise' | 'inference' | 'counterclaim'
export type ClaimStance = 'pro' | 'con' | 'neutral'

export interface Constitution {
  central_thesis: string | null
  worldview_frame: string | null
  narrative_voice: string | null
  what_book_is_against: string | null
  what_book_refuses_to_do: string | null
  ideal_reader: string | null
  taboo_simplifications: string | null
}

export interface Book {
  id: string
  owner_id: string
  title: string
  genre: BookGenre
  core_question: string | null
  status: BookStatus
  constitution_json: Constitution
  constitution_locked: boolean
  constitution_locked_at: string | null
  created_at: string
  updated_at: string
}

export interface Chapter {
  id: string
  book_id: string
  index: number
  title: string
  purpose: string | null
  central_claim: string | null
  emotional_arc: string | null
  failure_mode: string | null
  dependencies: string[]
  motifs: string[]
  status: ContentStatus
  created_at: string
  updated_at: string
}

export interface Section {
  id: string
  chapter_id: string
  index: number
  title: string
  goal: string | null
  local_claim: string | null
  constraints: string | null
  content_json: Record<string, unknown>
  content_text: string | null
  status: ContentStatus
  promoted_at: string | null
  promoted_by: string | null
  created_at: string
  updated_at: string
}

export interface Milestone {
  id: string
  book_id: string
  chapter_id: string | null
  section_id: string | null
  version: MilestoneVersion
  content_snapshot: Record<string, unknown>
  content_text: string
  embedded: boolean
  embedded_at: string | null
  created_at: string
}

export interface SemanticBlock {
  id: string
  book_id: string
  section_id: string
  block_type: 'claim' | 'motif' | 'thread' | 'note'
  content: string
  claim_type: ClaimBlockType | null
  stance: ClaimStance | null
  confidence: number | null
  canonical: boolean
  start_offset: number | null
  end_offset: number | null
  created_at: string
}

export interface ConsistencyReport {
  id: string
  book_id: string
  chapter_id: string | null
  report_type: 'chapter' | 'book'
  contradictions: unknown[]
  tone_drift: unknown[]
  unresolved_threads: unknown[]
  constitution_violations: unknown[]
  summary: string | null
  severity: 'info' | 'warning' | 'critical' | null
  created_at: string
}

export interface AIJob {
  id: string
  book_id: string
  user_id: string | null
  target_type: 'constitution' | 'chapter' | 'section' | 'extract' | 'consistency'
  target_id: string | null
  model_name: string
  provider: string
  input_tokens: number | null
  output_tokens: number | null
  cost_usd: number | null
  status: 'pending' | 'running' | 'completed' | 'failed'
  error_message: string | null
  created_at: string
  completed_at: string | null
}
