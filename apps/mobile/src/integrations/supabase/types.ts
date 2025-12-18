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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      achievement_templates: {
        Row: {
          ap_reward: number
          category: string
          description: string
          icon: string
          id: string
          name: string
          requirement_type: string
          requirement_value: number
        }
        Insert: {
          ap_reward: number
          category: string
          description: string
          icon: string
          id: string
          name: string
          requirement_type: string
          requirement_value: number
        }
        Update: {
          ap_reward?: number
          category?: string
          description?: string
          icon?: string
          id?: string
          name?: string
          requirement_type?: string
          requirement_value?: number
        }
        Relationships: []
      }
      achievements: {
        Row: {
          achievement_type: string
          description: string
          earned_at: string
          icon: string
          id: string
          name: string
          template_id: string | null
          user_id: string
        }
        Insert: {
          achievement_type: string
          description: string
          earned_at?: string
          icon: string
          id?: string
          name: string
          template_id?: string | null
          user_id: string
        }
        Update: {
          achievement_type?: string
          description?: string
          earned_at?: string
          icon?: string
          id?: string
          name?: string
          template_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "achievements_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "achievement_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      case_applications: {
        Row: {
          applied_at: string
          case_id: string
          id: string
          notes: string | null
          status: string
          user_id: string
        }
        Insert: {
          applied_at?: string
          case_id: string
          id?: string
          notes?: string | null
          status?: string
          user_id: string
        }
        Update: {
          applied_at?: string
          case_id?: string
          id?: string
          notes?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_applications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_reports: {
        Row: {
          category: string
          created_at: string | null
          id: string
          image_url: string | null
          report_text: string
          user_id: string
        }
        Insert: {
          category: string
          created_at?: string | null
          id?: string
          image_url?: string | null
          report_text: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string | null
          id?: string
          image_url?: string | null
          report_text?: string
          user_id?: string
        }
        Relationships: []
      }
      events: {
        Row: {
          created_at: string | null
          difficulty: number
          event_date: string | null
          event_time: string | null
          id: string
          key_visual_url: string | null
          location: string
          participation_fee: number | null
          reception_location: string | null
          start_code: string
          status: string
          synopsis: string
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          difficulty: number
          event_date?: string | null
          event_time?: string | null
          id: string
          key_visual_url?: string | null
          location: string
          participation_fee?: number | null
          reception_location?: string | null
          start_code: string
          status?: string
          synopsis: string
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          difficulty?: number
          event_date?: string | null
          event_time?: string | null
          id?: string
          key_visual_url?: string | null
          location?: string
          participation_fee?: number | null
          reception_location?: string | null
          start_code?: string
          status?: string
          synopsis?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      friendships: {
        Row: {
          created_at: string | null
          id: string
          receiver_id: string
          requester_id: string
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          receiver_id: string
          requester_id: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          receiver_id?: string
          requester_id?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      praises: {
        Row: {
          created_at: string | null
          id: string
          log_id: string
          praiser_user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          log_id: string
          praiser_user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          log_id?: string
          praiser_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "praises_log_id_fkey"
            columns: ["log_id"]
            isOneToOne: false
            referencedRelation: "daily_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          achievement_count: number | null
          ap: number | null
          bio: string | null
          compass_level: number | null
          created_at: string | null
          current_streak: number | null
          current_title_id: string | null
          email: string | null
          has_completed_tutorial: boolean | null
          id: string
          ip: number | null
          lantern_level: number | null
          last_log_date: string | null
          level: number | null
          magnifying_glass_level: number | null
          name: string
          notification_enabled: boolean | null
          notification_time: string | null
          phone: string | null
          profile_picture_url: string | null
          rank: string | null
          title: string | null
          total_ap: number | null
          updated_at: string | null
        }
        Insert: {
          achievement_count?: number | null
          ap?: number | null
          bio?: string | null
          compass_level?: number | null
          created_at?: string | null
          current_streak?: number | null
          current_title_id?: string | null
          email?: string | null
          has_completed_tutorial?: boolean | null
          id: string
          ip?: number | null
          lantern_level?: number | null
          last_log_date?: string | null
          level?: number | null
          magnifying_glass_level?: number | null
          name: string
          notification_enabled?: boolean | null
          notification_time?: string | null
          phone?: string | null
          profile_picture_url?: string | null
          rank?: string | null
          title?: string | null
          total_ap?: number | null
          updated_at?: string | null
        }
        Update: {
          achievement_count?: number | null
          ap?: number | null
          bio?: string | null
          compass_level?: number | null
          created_at?: string | null
          current_streak?: number | null
          current_title_id?: string | null
          email?: string | null
          has_completed_tutorial?: boolean | null
          id?: string
          ip?: number | null
          lantern_level?: number | null
          last_log_date?: string | null
          level?: number | null
          magnifying_glass_level?: number | null
          name?: string
          notification_enabled?: boolean | null
          notification_time?: string | null
          phone?: string | null
          profile_picture_url?: string | null
          rank?: string | null
          title?: string | null
          total_ap?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_current_title_id_fkey"
            columns: ["current_title_id"]
            isOneToOne: false
            referencedRelation: "title_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      role_audit_log: {
        Row: {
          action: string
          admin_user_id: string
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          target_user_id: string
        }
        Insert: {
          action: string
          admin_user_id: string
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          target_user_id: string
        }
        Update: {
          action?: string
          admin_user_id?: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          target_user_id?: string
        }
        Relationships: []
      }
      story_blocks: {
        Row: {
          character_image_url: string | null
          character_name: string
          correct_answer: string | null
          created_at: string | null
          event_id: string
          failure_message: string | null
          id: string
          image_url: string | null
          message_text: string
          step: number
          success_step: number | null
          target_location: unknown
          trigger_type: string
        }
        Insert: {
          character_image_url?: string | null
          character_name: string
          correct_answer?: string | null
          created_at?: string | null
          event_id: string
          failure_message?: string | null
          id?: string
          image_url?: string | null
          message_text: string
          step: number
          success_step?: number | null
          target_location?: unknown
          trigger_type: string
        }
        Update: {
          character_image_url?: string | null
          character_name?: string
          correct_answer?: string | null
          created_at?: string | null
          event_id?: string
          failure_message?: string | null
          id?: string
          image_url?: string | null
          message_text?: string
          step?: number
          success_step?: number | null
          target_location?: unknown
          trigger_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_blocks_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      title_templates: {
        Row: {
          ap_required: number
          id: string
          name: string
          rank_order: number
        }
        Insert: {
          ap_required: number
          id: string
          name: string
          rank_order: number
        }
        Update: {
          ap_required?: number
          id?: string
          name?: string
          rank_order?: number
        }
        Relationships: []
      }
      user_progress: {
        Row: {
          created_at: string | null
          current_step: number
          quest_id: string
          id: string
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          current_step?: number
          quest_id: string
          id?: string
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          current_step?: number
          quest_id?: string
          id?: string
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
