export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      ai_jobs: {
        Row: {
          book_id: string
          completed_at: string | null
          cost_usd: number | null
          created_at: string | null
          error_message: string | null
          id: string
          input_tokens: number | null
          model_name: string
          output_tokens: number | null
          provider: string
          status: string | null
          target_id: string | null
          target_type: string
          user_id: string | null
        }
        Insert: {
          book_id: string
          completed_at?: string | null
          cost_usd?: number | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          input_tokens?: number | null
          model_name: string
          output_tokens?: number | null
          provider?: string
          status?: string | null
          target_id?: string | null
          target_type: string
          user_id?: string | null
        }
        Update: {
          book_id?: string
          completed_at?: string | null
          cost_usd?: number | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          input_tokens?: number | null
          model_name?: string
          output_tokens?: number | null
          provider?: string
          status?: string | null
          target_id?: string | null
          target_type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_jobs_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      book_shares: {
        Row: {
          book_id: string
          created_at: string | null
          enabled: boolean | null
          id: string
          last_accessed_at: string | null
          listen_count: number | null
          share_token: string
          view_count: number | null
        }
        Insert: {
          book_id: string
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          last_accessed_at?: string | null
          listen_count?: number | null
          share_token: string
          view_count?: number | null
        }
        Update: {
          book_id?: string
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          last_accessed_at?: string | null
          listen_count?: number | null
          share_token?: string
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "book_shares_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      books: {
        Row: {
          audio_voice_id: string | null
          audio_voice_name: string | null
          constitution_json: Json | null
          constitution_locked: boolean | null
          constitution_locked_at: string | null
          core_question: string | null
          cover_generated_at: string | null
          cover_status: string | null
          cover_storage_path: string | null
          cover_url: string | null
          created_at: string | null
          genre: Database["public"]["Enums"]["book_genre"]
          id: string
          is_staff_pick: boolean | null
          owner_id: string
          source: Database["public"]["Enums"]["book_source"]
          staff_pick_order: number | null
          status: Database["public"]["Enums"]["book_status"] | null
          title: string
          updated_at: string | null
        }
        Insert: {
          audio_voice_id?: string | null
          audio_voice_name?: string | null
          constitution_json?: Json | null
          constitution_locked?: boolean | null
          constitution_locked_at?: string | null
          core_question?: string | null
          cover_generated_at?: string | null
          cover_status?: string | null
          cover_storage_path?: string | null
          cover_url?: string | null
          created_at?: string | null
          genre?: Database["public"]["Enums"]["book_genre"]
          id?: string
          is_staff_pick?: boolean | null
          owner_id: string
          source?: Database["public"]["Enums"]["book_source"]
          staff_pick_order?: number | null
          status?: Database["public"]["Enums"]["book_status"] | null
          title: string
          updated_at?: string | null
        }
        Update: {
          audio_voice_id?: string | null
          audio_voice_name?: string | null
          constitution_json?: Json | null
          constitution_locked?: boolean | null
          constitution_locked_at?: string | null
          core_question?: string | null
          cover_generated_at?: string | null
          cover_status?: string | null
          cover_storage_path?: string | null
          cover_url?: string | null
          created_at?: string | null
          genre?: Database["public"]["Enums"]["book_genre"]
          id?: string
          is_staff_pick?: boolean | null
          owner_id?: string
          source?: Database["public"]["Enums"]["book_source"]
          staff_pick_order?: number | null
          status?: Database["public"]["Enums"]["book_status"] | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      chapters: {
        Row: {
          book_id: string
          central_claim: string | null
          created_at: string | null
          dependencies: string[] | null
          emotional_arc: string | null
          failure_mode: string | null
          id: string
          index: number
          motifs: string[] | null
          purpose: string | null
          status: Database["public"]["Enums"]["content_status"] | null
          title: string
          updated_at: string | null
        }
        Insert: {
          book_id: string
          central_claim?: string | null
          created_at?: string | null
          dependencies?: string[] | null
          emotional_arc?: string | null
          failure_mode?: string | null
          id?: string
          index: number
          motifs?: string[] | null
          purpose?: string | null
          status?: Database["public"]["Enums"]["content_status"] | null
          title: string
          updated_at?: string | null
        }
        Update: {
          book_id?: string
          central_claim?: string | null
          created_at?: string | null
          dependencies?: string[] | null
          emotional_arc?: string | null
          failure_mode?: string | null
          id?: string
          index?: number
          motifs?: string[] | null
          purpose?: string | null
          status?: Database["public"]["Enums"]["content_status"] | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chapters_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      consistency_reports: {
        Row: {
          book_id: string
          chapter_id: string | null
          constitution_violations: Json | null
          contradictions: Json | null
          created_at: string | null
          id: string
          report_type: string
          severity: string | null
          summary: string | null
          tone_drift: Json | null
          unresolved_threads: Json | null
        }
        Insert: {
          book_id: string
          chapter_id?: string | null
          constitution_violations?: Json | null
          contradictions?: Json | null
          created_at?: string | null
          id?: string
          report_type: string
          severity?: string | null
          summary?: string | null
          tone_drift?: Json | null
          unresolved_threads?: Json | null
        }
        Update: {
          book_id?: string
          chapter_id?: string | null
          constitution_violations?: Json | null
          contradictions?: Json | null
          created_at?: string | null
          id?: string
          report_type?: string
          severity?: string | null
          summary?: string | null
          tone_drift?: Json | null
          unresolved_threads?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "consistency_reports_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consistency_reports_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
        ]
      }
      embeddings: {
        Row: {
          book_id: string
          chunk_index: number
          content: string
          created_at: string | null
          embedding: string | null
          id: string
          milestone_id: string
        }
        Insert: {
          book_id: string
          chunk_index: number
          content: string
          created_at?: string | null
          embedding?: string | null
          id?: string
          milestone_id: string
        }
        Update: {
          book_id?: string
          chunk_index?: number
          content?: string
          created_at?: string | null
          embedding?: string | null
          id?: string
          milestone_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "embeddings_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "embeddings_milestone_id_fkey"
            columns: ["milestone_id"]
            isOneToOne: false
            referencedRelation: "milestones"
            referencedColumns: ["id"]
          },
        ]
      }
      milestones: {
        Row: {
          book_id: string
          chapter_id: string | null
          content_snapshot: Json
          content_text: string
          created_at: string | null
          embedded: boolean | null
          embedded_at: string | null
          id: string
          section_id: string | null
          version: Database["public"]["Enums"]["milestone_version"]
        }
        Insert: {
          book_id: string
          chapter_id?: string | null
          content_snapshot: Json
          content_text: string
          created_at?: string | null
          embedded?: boolean | null
          embedded_at?: string | null
          id?: string
          section_id?: string | null
          version: Database["public"]["Enums"]["milestone_version"]
        }
        Update: {
          book_id?: string
          chapter_id?: string | null
          content_snapshot?: Json
          content_text?: string
          created_at?: string | null
          embedded?: boolean | null
          embedded_at?: string | null
          id?: string
          section_id?: string | null
          version?: Database["public"]["Enums"]["milestone_version"]
        }
        Relationships: [
          {
            foreignKeyName: "milestones_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "milestones_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "milestones_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
        ]
      }
      section_audio: {
        Row: {
          content_hash: string
          created_at: string | null
          duration_seconds: number | null
          error_message: string | null
          file_size_bytes: number | null
          id: string
          last_accessed_at: string | null
          section_id: string
          status: string | null
          storage_path: string
          voice_id: string
          voice_name: string | null
        }
        Insert: {
          content_hash: string
          created_at?: string | null
          duration_seconds?: number | null
          error_message?: string | null
          file_size_bytes?: number | null
          id?: string
          last_accessed_at?: string | null
          section_id: string
          status?: string | null
          storage_path: string
          voice_id: string
          voice_name?: string | null
        }
        Update: {
          content_hash?: string
          created_at?: string | null
          duration_seconds?: number | null
          error_message?: string | null
          file_size_bytes?: number | null
          id?: string
          last_accessed_at?: string | null
          section_id?: string
          status?: string | null
          storage_path?: string
          voice_id?: string
          voice_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "section_audio_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
        ]
      }
      sections: {
        Row: {
          chapter_id: string
          constraints: string | null
          content_json: Json | null
          content_text: string | null
          created_at: string | null
          goal: string | null
          id: string
          index: number
          local_claim: string | null
          promoted_at: string | null
          promoted_by: string | null
          status: Database["public"]["Enums"]["content_status"] | null
          title: string
          updated_at: string | null
        }
        Insert: {
          chapter_id: string
          constraints?: string | null
          content_json?: Json | null
          content_text?: string | null
          created_at?: string | null
          goal?: string | null
          id?: string
          index: number
          local_claim?: string | null
          promoted_at?: string | null
          promoted_by?: string | null
          status?: Database["public"]["Enums"]["content_status"] | null
          title: string
          updated_at?: string | null
        }
        Update: {
          chapter_id?: string
          constraints?: string | null
          content_json?: Json | null
          content_text?: string | null
          created_at?: string | null
          goal?: string | null
          id?: string
          index?: number
          local_claim?: string | null
          promoted_at?: string | null
          promoted_by?: string | null
          status?: Database["public"]["Enums"]["content_status"] | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sections_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
        ]
      }
      semantic_blocks: {
        Row: {
          block_type: string
          book_id: string
          canonical: boolean | null
          claim_type: Database["public"]["Enums"]["claim_block_type"] | null
          confidence: number | null
          content: string
          created_at: string | null
          end_offset: number | null
          id: string
          section_id: string
          stance: Database["public"]["Enums"]["claim_stance"] | null
          start_offset: number | null
        }
        Insert: {
          block_type: string
          book_id: string
          canonical?: boolean | null
          claim_type?: Database["public"]["Enums"]["claim_block_type"] | null
          confidence?: number | null
          content: string
          created_at?: string | null
          end_offset?: number | null
          id?: string
          section_id: string
          stance?: Database["public"]["Enums"]["claim_stance"] | null
          start_offset?: number | null
        }
        Update: {
          block_type?: string
          book_id?: string
          canonical?: boolean | null
          claim_type?: Database["public"]["Enums"]["claim_block_type"] | null
          confidence?: number | null
          content?: string
          created_at?: string | null
          end_offset?: number | null
          id?: string
          section_id?: string
          stance?: Database["public"]["Enums"]["claim_stance"] | null
          start_offset?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "semantic_blocks_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "semantic_blocks_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
        ]
      }
      share_analytics: {
        Row: {
          created_at: string | null
          event_type: string
          id: string
          referrer: string | null
          share_id: string
          user_agent: string | null
        }
        Insert: {
          created_at?: string | null
          event_type: string
          id?: string
          referrer?: string | null
          share_id: string
          user_agent?: string | null
        }
        Update: {
          created_at?: string | null
          event_type?: string
          id?: string
          referrer?: string | null
          share_id?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "share_analytics_share_id_fkey"
            columns: ["share_id"]
            isOneToOne: false
            referencedRelation: "book_shares"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          created_at: string | null
          updated_at: string | null
          user_id: string
          voice_id: string | null
        }
        Insert: {
          created_at?: string | null
          updated_at?: string | null
          user_id: string
          voice_id?: string | null
        }
        Update: {
          created_at?: string | null
          updated_at?: string | null
          user_id?: string
          voice_id?: string | null
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          display_name: string | null
          id: string
          preferences: Json | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          display_name?: string | null
          id: string
          preferences?: Json | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string
          preferences?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      vibe_jobs: {
        Row: {
          attempt: number
          auto_resume_attempts: number
          book_id: string | null
          completed_at: string | null
          created_at: string
          error: string | null
          genre: Database["public"]["Enums"]["book_genre"]
          id: string
          preview: Json
          progress: number
          started_at: string | null
          status: Database["public"]["Enums"]["vibe_job_status"]
          step: string | null
          story_synopsis: string | null
          updated_at: string
          user_id: string
          user_prompt: string
        }
        Insert: {
          attempt?: number
          auto_resume_attempts?: number
          book_id?: string | null
          completed_at?: string | null
          created_at?: string
          error?: string | null
          genre: Database["public"]["Enums"]["book_genre"]
          id?: string
          preview?: Json
          progress?: number
          started_at?: string | null
          status?: Database["public"]["Enums"]["vibe_job_status"]
          step?: string | null
          story_synopsis?: string | null
          updated_at?: string
          user_id: string
          user_prompt: string
        }
        Update: {
          attempt?: number
          auto_resume_attempts?: number
          book_id?: string | null
          completed_at?: string | null
          created_at?: string
          error?: string | null
          genre?: Database["public"]["Enums"]["book_genre"]
          id?: string
          preview?: Json
          progress?: number
          started_at?: string | null
          status?: Database["public"]["Enums"]["vibe_job_status"]
          step?: string | null
          story_synopsis?: string | null
          updated_at?: string
          user_id?: string
          user_prompt?: string
        }
        Relationships: [
          {
            foreignKeyName: "vibe_jobs_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cleanup_stale_audio: {
        Args: never
        Returns: {
          deleted_count: number
          storage_paths: string[]
        }[]
      }
      generate_share_token: { Args: never; Returns: string }
      get_book_id_from_share: { Args: { token: string }; Returns: string }
      get_shared_book: {
        Args: { token: string }
        Returns: {
          audio_voice_id: string
          audio_voice_name: string
          core_question: string
          cover_url: string
          genre: string
          id: string
          title: string
        }[]
      }
      get_shared_chapters: {
        Args: { token: string }
        Returns: {
          id: string
          index: number
          title: string
        }[]
      }
      get_shared_sections: {
        Args: { token: string }
        Returns: {
          chapter_id: string
          content_text: string
          id: string
          index: number
          title: string
        }[]
      }
      get_staff_picks: {
        Args: { pick_limit?: number }
        Returns: {
          core_question: string
          cover_url: string
          created_at: string
          genre: string
          id: string
          share_token: string
          title: string
        }[]
      }
      get_user_vibe_job_count_today: {
        Args: { user_uuid: string }
        Returns: number
      }
      search_book_embeddings: {
        Args: {
          book_uuid: string
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          chunk_index: number
          content: string
          milestone_id: string
          similarity: number
        }[]
      }
      touch_section_audio: { Args: { audio_id: string }; Returns: undefined }
      validate_share_token: {
        Args: { section_uuid: string; token: string }
        Returns: boolean
      }
    }
    Enums: {
      book_genre: "non_fiction" | "literary_fiction"
      book_source: "author" | "vibe"
      book_status: "drafting" | "editing" | "final"
      claim_block_type:
        | "assertion"
        | "definition"
        | "premise"
        | "inference"
        | "counterclaim"
      claim_stance: "pro" | "con" | "neutral"
      content_status: "draft" | "locked" | "canonical"
      milestone_version: "v1" | "v2" | "final"
      vibe_job_status: "queued" | "running" | "failed" | "complete"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      book_genre: ["non_fiction", "literary_fiction"],
      book_source: ["author", "vibe"],
      book_status: ["drafting", "editing", "final"],
      claim_block_type: [
        "assertion",
        "definition",
        "premise",
        "inference",
        "counterclaim",
      ],
      claim_stance: ["pro", "con", "neutral"],
      content_status: ["draft", "locked", "canonical"],
      milestone_version: ["v1", "v2", "final"],
      vibe_job_status: ["queued", "running", "failed", "complete"],
    },
  },
} as const
