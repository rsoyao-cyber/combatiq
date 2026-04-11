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
      athlete: {
        Row: {
          clinic_name: string | null
          competition_level: string
          created_at: string
          id: string
          name: string
          sport: string
          trainerize_user_id: number | null
          training_age_years: number
          weight_class: string
        }
        Insert: {
          clinic_name?: string | null
          competition_level: string
          created_at?: string
          id?: string
          name: string
          sport: string
          trainerize_user_id?: number | null
          training_age_years: number
          weight_class: string
        }
        Update: {
          clinic_name?: string | null
          competition_level?: string
          created_at?: string
          id?: string
          name?: string
          sport?: string
          trainerize_user_id?: number | null
          training_age_years?: number
          weight_class?: string
        }
        Relationships: []
      }
      daily_check_in: {
        Row: {
          athlete_id: string
          checkin_date: string
          created_at: string
          diet_quality: number
          hitting_nutrition_targets: boolean | null
          id: string
          injury_area: string | null
          injury_pain_rating: number | null
          mental_focus: number
          mood: number
          motivation: number
          open_notes: string | null
          physical_fatigue: number
          session_rpe: number | null
          sleep_hours: number | null
          sleep_quality: number
          sparring_load_rounds: number | null
          stress: number
        }
        Insert: {
          athlete_id: string
          checkin_date: string
          created_at?: string
          diet_quality: number
          hitting_nutrition_targets?: boolean | null
          id?: string
          injury_area?: string | null
          injury_pain_rating?: number | null
          mental_focus: number
          mood: number
          motivation: number
          open_notes?: string | null
          physical_fatigue: number
          session_rpe?: number | null
          sleep_hours?: number | null
          sleep_quality: number
          sparring_load_rounds?: number | null
          stress: number
        }
        Update: {
          athlete_id?: string
          checkin_date?: string
          created_at?: string
          diet_quality?: number
          hitting_nutrition_targets?: boolean | null
          id?: string
          injury_area?: string | null
          injury_pain_rating?: number | null
          mental_focus?: number
          mood?: number
          motivation?: number
          open_notes?: string | null
          physical_fatigue?: number
          session_rpe?: number | null
          sleep_hours?: number | null
          sleep_quality?: number
          sparring_load_rounds?: number | null
          stress?: number
        }
        Relationships: [
          {
            foreignKeyName: "daily_check_in_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athlete"
            referencedColumns: ["id"]
          },
        ]
      }
      exercise_set: {
        Row: {
          cluster_number: number | null
          created_at: string
          duration_secs: number | null
          each_side: boolean
          exercise_category: string
          exercise_name: string
          id: string
          notes: string | null
          power_watts: number | null
          reps: number | null
          rest_secs: number | null
          session_id: string
          set_number: number
          target_power_watts: number | null
          weight_kg: number | null
        }
        Insert: {
          cluster_number?: number | null
          created_at?: string
          duration_secs?: number | null
          each_side?: boolean
          exercise_category: string
          exercise_name: string
          id?: string
          notes?: string | null
          power_watts?: number | null
          reps?: number | null
          rest_secs?: number | null
          session_id: string
          set_number: number
          target_power_watts?: number | null
          weight_kg?: number | null
        }
        Update: {
          cluster_number?: number | null
          created_at?: string
          duration_secs?: number | null
          each_side?: boolean
          exercise_category?: string
          exercise_name?: string
          id?: string
          notes?: string | null
          power_watts?: number | null
          reps?: number | null
          rest_secs?: number | null
          session_id?: string
          set_number?: number
          target_power_watts?: number | null
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "exercise_set_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "training_session"
            referencedColumns: ["id"]
          },
        ]
      }
      import_log: {
        Row: {
          athlete_id: string | null
          filename: string | null
          id: string
          imported_at: string | null
          manually_corrected: boolean | null
          notes: string | null
          programs_created: number | null
          sessions_created: number | null
          sets_created: number | null
          status: string | null
          trainerize_plan_id: number | null
        }
        Insert: {
          athlete_id?: string | null
          filename?: string | null
          id?: string
          imported_at?: string | null
          manually_corrected?: boolean | null
          notes?: string | null
          programs_created?: number | null
          sessions_created?: number | null
          sets_created?: number | null
          status?: string | null
          trainerize_plan_id?: number | null
        }
        Update: {
          athlete_id?: string | null
          filename?: string | null
          id?: string
          imported_at?: string | null
          manually_corrected?: boolean | null
          notes?: string | null
          programs_created?: number | null
          sessions_created?: number | null
          sets_created?: number | null
          status?: string | null
          trainerize_plan_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "import_log_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athlete"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_goal: {
        Row: {
          athlete_id: string
          created_at: string
          goal_text: string
          id: string
          month_year: string
        }
        Insert: {
          athlete_id: string
          created_at?: string
          goal_text: string
          id?: string
          month_year: string
        }
        Update: {
          athlete_id?: string
          created_at?: string
          goal_text?: string
          id?: string
          month_year?: string
        }
        Relationships: [
          {
            foreignKeyName: "monthly_goal_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athlete"
            referencedColumns: ["id"]
          },
        ]
      }
      report_share: {
        Row: {
          athlete_id: string | null
          created_at: string | null
          expires_at: string | null
          id: string
          report_json: Json
          report_type: string | null
          token: string | null
        }
        Insert: {
          athlete_id?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          report_json: Json
          report_type?: string | null
          token?: string | null
        }
        Update: {
          athlete_id?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          report_json?: Json
          report_type?: string | null
          token?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "report_share_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athlete"
            referencedColumns: ["id"]
          },
        ]
      }
      rmr: {
        Row: {
          athlete_id: string
          created_at: string
          id: string
          notes: string | null
          rmr_kcal: number
          test_date: string
        }
        Insert: {
          athlete_id: string
          created_at?: string
          id?: string
          notes?: string | null
          rmr_kcal: number
          test_date: string
        }
        Update: {
          athlete_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          rmr_kcal?: number
          test_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "rmr_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athlete"
            referencedColumns: ["id"]
          },
        ]
      }
      test_session: {
        Row: {
          athlete_id: string
          created_at: string
          id: string
          practitioner_notes: string | null
          results_json: Json | null
          session_date: string
        }
        Insert: {
          athlete_id: string
          created_at?: string
          id?: string
          practitioner_notes?: string | null
          results_json?: Json | null
          session_date: string
        }
        Update: {
          athlete_id?: string
          created_at?: string
          id?: string
          practitioner_notes?: string | null
          results_json?: Json | null
          session_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_session_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athlete"
            referencedColumns: ["id"]
          },
        ]
      }
      training_week_snapshot: {
        Row: {
          adherence: string | null
          alternative_json: import("./training-week-types").WeekScheduleJson | null
          athlete_id: string
          created_at: string
          id: string
          primary_json: import("./training-week-types").WeekScheduleJson
          updated_at: string
          week_notes: string | null
          week_start_date: string
        }
        Insert: {
          adherence?: string | null
          alternative_json?: import("./training-week-types").WeekScheduleJson | null
          athlete_id: string
          created_at?: string
          id?: string
          primary_json: import("./training-week-types").WeekScheduleJson
          updated_at?: string
          week_notes?: string | null
          week_start_date: string
        }
        Update: {
          adherence?: string | null
          alternative_json?: import("./training-week-types").WeekScheduleJson | null
          athlete_id?: string
          created_at?: string
          id?: string
          primary_json?: import("./training-week-types").WeekScheduleJson
          updated_at?: string
          week_notes?: string | null
          week_start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_week_snapshot_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athlete"
            referencedColumns: ["id"]
          },
        ]
      }
      training_session: {
        Row: {
          athlete_id: string
          completed: boolean
          created_at: string
          duration_actual_mins: number | null
          early_termination_reason: string | null
          id: string
          practitioner_notes: string | null
          session_date: string
          session_rpe: number | null
          template_id: string | null
        }
        Insert: {
          athlete_id: string
          completed?: boolean
          created_at?: string
          duration_actual_mins?: number | null
          early_termination_reason?: string | null
          id?: string
          practitioner_notes?: string | null
          session_date: string
          session_rpe?: number | null
          template_id?: string | null
        }
        Update: {
          athlete_id?: string
          completed?: boolean
          created_at?: string
          duration_actual_mins?: number | null
          early_termination_reason?: string | null
          id?: string
          practitioner_notes?: string | null
          session_date?: string
          session_rpe?: number | null
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "training_session_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athlete"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_session_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "workout_template"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_program: {
        Row: {
          athlete_id: string
          created_at: string
          end_date: string | null
          id: string
          name: string
          notes: string | null
          phase_number: number | null
          start_date: string
          total_weeks: number | null
          trainerize_plan_id: number | null
        }
        Insert: {
          athlete_id: string
          created_at?: string
          end_date?: string | null
          id?: string
          name: string
          notes?: string | null
          phase_number?: number | null
          start_date: string
          total_weeks?: number | null
          trainerize_plan_id?: number | null
        }
        Update: {
          athlete_id?: string
          created_at?: string
          end_date?: string | null
          id?: string
          name?: string
          notes?: string | null
          phase_number?: number | null
          start_date?: string
          total_weeks?: number | null
          trainerize_plan_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "workout_program_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athlete"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_template: {
        Row: {
          created_at: string
          created_by: string | null
          equipment: string[] | null
          estimated_duration_mins: number | null
          id: string
          instructions: string | null
          name: string
          program_id: string
          workout_type: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          equipment?: string[] | null
          estimated_duration_mins?: number | null
          id?: string
          instructions?: string | null
          name: string
          program_id: string
          workout_type: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          equipment?: string[] | null
          estimated_duration_mins?: number | null
          id?: string
          instructions?: string | null
          name?: string
          program_id?: string
          workout_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_template_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "workout_program"
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
