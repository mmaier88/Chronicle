// Chronicle Types

export type BookStatus = 'drafting' | 'editing' | 'final'
export type BookGenre = 'non_fiction' | 'literary_fiction'
export type BookSource = 'author' | 'vibe'
export type ContentStatus = 'draft' | 'locked' | 'canonical'
export type VibeJobStatus = 'queued' | 'running' | 'failed' | 'complete'

export interface Constitution {
  central_thesis: string | null
  worldview_frame: string | null
  narrative_voice: string | null
  what_book_is_against: string | null
  what_book_refuses_to_do: string | null
  ideal_reader: string | null
  taboo_simplifications: string | null
}

export type CoverStatus = 'pending' | 'generating' | 'ready' | 'failed'

export interface Book {
  id: string
  owner_id: string
  title: string
  genre: BookGenre
  source: BookSource
  core_question: string | null
  status: BookStatus
  constitution_json: Constitution
  constitution_locked: boolean
  constitution_locked_at: string | null
  audio_voice_id: string | null
  audio_voice_name: string | null
  // Cover fields
  cover_url: string | null
  cover_storage_path: string | null
  cover_status: CoverStatus
  cover_generated_at: string | null
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


// =============================================================================
// VIBE FLOW TYPES
// =============================================================================

export interface VibeCharacter {
  name: string
  tagline: string
}

export interface VibeWarnings {
  violence: 'none' | 'low' | 'medium' | 'high'
  romance: 'none' | 'low' | 'medium' | 'high'
}

export interface VibePreview {
  title: string
  logline: string
  blurb: string
  cast: VibeCharacter[]
  setting: string
  promise: string[]
  warnings: VibeWarnings
}

export interface VibeJob {
  id: string
  user_id: string
  book_id: string | null
  genre: BookGenre
  user_prompt: string
  preview: VibePreview
  status: VibeJobStatus
  step: string | null
  progress: number
  story_synopsis: string | null
  error: string | null
  attempt: number
  created_at: string
  updated_at: string
  started_at: string | null
  completed_at: string | null
}

// Vibe chapter/section plan for generation
export interface VibeChapterPlan {
  title: string
  purpose: string
  sections: VibeSectionPlan[]
}

export interface VibeSectionPlan {
  title: string
  goal: string
  target_words: number
}

// =============================================================================
// AUDIO TTS TYPES
// =============================================================================

export type AudioStatus = 'pending' | 'generating' | 'ready' | 'failed'

export interface SectionAudio {
  id: string
  section_id: string
  content_hash: string
  storage_path: string
  voice_id: string
  voice_name: string | null
  duration_seconds: number | null
  file_size_bytes: number | null
  status: AudioStatus
  error_message: string | null
  created_at: string
  last_accessed_at: string
}

export interface AudioVoice {
  id: string
  name: string
  description: string
}

// =============================================================================
// BOOK SHARING TYPES
// =============================================================================

export interface BookShare {
  id: string
  book_id: string
  share_token: string
  enabled: boolean
  view_count: number
  created_at: string
  last_accessed_at: string | null
}

// Shared book data returned by RLS bypass functions
export interface SharedBook {
  id: string
  title: string
  core_question: string | null
  genre: string
  cover_url: string | null
  audio_voice_id: string | null
  audio_voice_name: string | null
}

export interface SharedChapter {
  id: string
  index: number
  title: string
}

export interface SharedSection {
  id: string
  chapter_id: string
  index: number
  title: string
  content_text: string | null
}
