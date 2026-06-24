/**
 * database — Generated type
 * Supabase-generated row/insert/update types for every table in the
 * `public` schema. Regenerate after every schema change:
 *
 *   npx supabase gen types typescript --project-id kjhoqbxuylczuemgjgpc \
 *     > src/types/database.ts
 *
 * Source of truth: the live database. Do not edit by hand.
 * Used by: src/core/supabase/client.ts (Database generic), feature hooks.
 */

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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      analyses: {
        Row: {
          coaching_text: string
          created_at: string | null
          drill: string | null
          frame_refs: string[] | null
          id: string
          input_tokens: number | null
          issues: Json
          model_version: string
          output_tokens: number | null
          positives: Json
          prompt_version: string
          swing_score: number | null
          user_id: string
          video_id: string
        }
        Insert: {
          coaching_text: string
          created_at?: string | null
          drill?: string | null
          frame_refs?: string[] | null
          id?: string
          input_tokens?: number | null
          issues?: Json
          model_version: string
          output_tokens?: number | null
          positives?: Json
          prompt_version: string
          swing_score?: number | null
          user_id: string
          video_id: string
        }
        Update: {
          coaching_text?: string
          created_at?: string | null
          drill?: string | null
          frame_refs?: string[] | null
          id?: string
          input_tokens?: number | null
          issues?: Json
          model_version?: string
          output_tokens?: number | null
          positives?: Json
          prompt_version?: string
          swing_score?: number | null
          user_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "analyses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analyses_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          analyses_run: number | null
          avatar_url: string | null
          created_at: string | null
          display_name: string | null
          handicap: number | null
          id: string
          is_pro: boolean | null
          last_active: string | null
          skill_level: string | null
          streak_days: number | null
          swing_hand: string | null
          username: string
        }
        Insert: {
          analyses_run?: number | null
          avatar_url?: string | null
          created_at?: string | null
          display_name?: string | null
          handicap?: number | null
          id: string
          is_pro?: boolean | null
          last_active?: string | null
          skill_level?: string | null
          streak_days?: number | null
          swing_hand?: string | null
          username: string
        }
        Update: {
          analyses_run?: number | null
          avatar_url?: string | null
          created_at?: string | null
          display_name?: string | null
          handicap?: number | null
          id?: string
          is_pro?: boolean | null
          last_active?: string | null
          skill_level?: string | null
          streak_days?: number | null
          swing_hand?: string | null
          username?: string
        }
        Relationships: []
      }
      tempo_presets: {
        Row: {
          bpm_values: number[] | null
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          bpm_values?: number[] | null
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          bpm_values?: number[] | null
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tempo_presets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      videos: {
        Row: {
          camera_angle: string | null
          club_type: string | null
          created_at: string | null
          drawings: Json | null
          duration_ms: number | null
          has_analysis: boolean | null
          id: string
          storage_path: string
          swing_hand: string
          tags: string[] | null
          thumbnail_path: string | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          camera_angle?: string | null
          club_type?: string | null
          created_at?: string | null
          drawings?: Json | null
          duration_ms?: number | null
          has_analysis?: boolean | null
          id?: string
          storage_path: string
          swing_hand?: string
          tags?: string[] | null
          thumbnail_path?: string | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          camera_angle?: string | null
          club_type?: string | null
          created_at?: string | null
          drawings?: Json | null
          duration_ms?: number | null
          has_analysis?: boolean | null
          id?: string
          storage_path?: string
          swing_hand?: string
          tags?: string[] | null
          thumbnail_path?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "videos_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
