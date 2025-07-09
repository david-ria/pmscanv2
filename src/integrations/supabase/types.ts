export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      fitness_activities: {
        Row: {
          activity_type: string
          calories: number | null
          created_at: string
          distance_meters: number | null
          duration_minutes: number
          end_time: string
          id: string
          raw_data: Json | null
          source: string | null
          start_time: string
          steps: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          activity_type: string
          calories?: number | null
          created_at?: string
          distance_meters?: number | null
          duration_minutes: number
          end_time: string
          id?: string
          raw_data?: Json | null
          source?: string | null
          start_time: string
          steps?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          activity_type?: string
          calories?: number | null
          created_at?: string
          distance_meters?: number | null
          duration_minutes?: number
          end_time?: string
          id?: string
          raw_data?: Json | null
          source?: string | null
          start_time?: string
          steps?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      group_invitations: {
        Row: {
          created_at: string
          expires_at: string
          group_id: string
          id: string
          invitee_email: string
          invitee_id: string | null
          inviter_id: string
          status: string
          token: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          group_id: string
          id?: string
          invitee_email: string
          invitee_id?: string | null
          inviter_id: string
          status?: string
          token: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          group_id?: string
          id?: string
          invitee_email?: string
          invitee_id?: string | null
          inviter_id?: string
          status?: string
          token?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_invitations_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_invitations_inviter_id_fkey"
            columns: ["inviter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      group_memberships: {
        Row: {
          group_id: string
          id: string
          joined_at: string
          role: string
          user_id: string
        }
        Insert: {
          group_id: string
          id?: string
          joined_at?: string
          role?: string
          user_id: string
        }
        Update: {
          group_id?: string
          id?: string
          joined_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_memberships_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_settings: {
        Row: {
          activity_auto_suggest: boolean | null
          alarm_enabled: boolean | null
          auto_share_stats: boolean | null
          created_at: string
          default_activity: string | null
          default_location: string | null
          event_notifications: boolean | null
          group_id: string
          id: string
          location_auto_detect: boolean | null
          notification_frequency: string | null
          pm1_threshold: number | null
          pm10_threshold: number | null
          pm25_threshold: number | null
          updated_at: string
          weekly_reports: boolean | null
        }
        Insert: {
          activity_auto_suggest?: boolean | null
          alarm_enabled?: boolean | null
          auto_share_stats?: boolean | null
          created_at?: string
          default_activity?: string | null
          default_location?: string | null
          event_notifications?: boolean | null
          group_id: string
          id?: string
          location_auto_detect?: boolean | null
          notification_frequency?: string | null
          pm1_threshold?: number | null
          pm10_threshold?: number | null
          pm25_threshold?: number | null
          updated_at?: string
          weekly_reports?: boolean | null
        }
        Update: {
          activity_auto_suggest?: boolean | null
          alarm_enabled?: boolean | null
          auto_share_stats?: boolean | null
          created_at?: string
          default_activity?: string | null
          default_location?: string | null
          event_notifications?: boolean | null
          group_id?: string
          id?: string
          location_auto_detect?: boolean | null
          notification_frequency?: string | null
          pm1_threshold?: number | null
          pm10_threshold?: number | null
          pm25_threshold?: number | null
          updated_at?: string
          weekly_reports?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "group_settings_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: true
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_shared_statistics: {
        Row: {
          avg_pm1: number
          avg_pm10: number
          avg_pm25: number
          created_at: string
          date: string
          group_id: string
          id: string
          max_pm25: number
          total_duration_minutes: number
          total_measurements: number
          user_id: string
        }
        Insert: {
          avg_pm1: number
          avg_pm10: number
          avg_pm25: number
          created_at?: string
          date: string
          group_id: string
          id?: string
          max_pm25: number
          total_duration_minutes?: number
          total_measurements?: number
          user_id: string
        }
        Update: {
          avg_pm1?: number
          avg_pm10?: number
          avg_pm25?: number
          created_at?: string
          date?: string
          group_id?: string
          id?: string
          max_pm25?: number
          total_duration_minutes?: number
          total_measurements?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_shared_statistics_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      measurements: {
        Row: {
          accuracy: number | null
          created_at: string
          humidity: number | null
          id: string
          latitude: number | null
          longitude: number | null
          mission_id: string
          pm1: number
          pm10: number
          pm25: number
          temperature: number | null
          timestamp: string
        }
        Insert: {
          accuracy?: number | null
          created_at?: string
          humidity?: number | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          mission_id: string
          pm1: number
          pm10: number
          pm25: number
          temperature?: number | null
          timestamp: string
        }
        Update: {
          accuracy?: number | null
          created_at?: string
          humidity?: number | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          mission_id?: string
          pm1?: number
          pm10?: number
          pm25?: number
          temperature?: number | null
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "measurements_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "missions"
            referencedColumns: ["id"]
          },
        ]
      }
      missions: {
        Row: {
          activity_context: string | null
          avg_pm1: number
          avg_pm10: number
          avg_pm25: number
          created_at: string
          duration_minutes: number
          end_time: string
          id: string
          location_context: string | null
          max_pm25: number
          measurements_count: number
          name: string
          recording_frequency: string | null
          shared: boolean | null
          start_time: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          activity_context?: string | null
          avg_pm1: number
          avg_pm10: number
          avg_pm25: number
          created_at?: string
          duration_minutes: number
          end_time: string
          id?: string
          location_context?: string | null
          max_pm25: number
          measurements_count?: number
          name: string
          recording_frequency?: string | null
          shared?: boolean | null
          start_time: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          activity_context?: string | null
          avg_pm1?: number
          avg_pm10?: number
          avg_pm25?: number
          created_at?: string
          duration_minutes?: number
          end_time?: string
          id?: string
          location_context?: string | null
          max_pm25?: number
          measurements_count?: number
          name?: string
          recording_frequency?: string | null
          shared?: boolean | null
          start_time?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          first_name: string | null
          id: string
          last_name: string | null
          pseudo: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          first_name?: string | null
          id: string
          last_name?: string | null
          pseudo?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          pseudo?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_group_ids: {
        Args: { _user_id: string }
        Returns: string[]
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _user_id: string
          _role: Database["public"]["Enums"]["app_role"]
        }
        Returns: boolean
      }
      is_group_admin: {
        Args: { _user_id: string; _group_id: string }
        Returns: boolean
      }
      is_group_member: {
        Args: { _user_id: string; _group_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "super_admin" | "admin" | "moderator" | "user"
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
      app_role: ["super_admin", "admin", "moderator", "user"],
    },
  },
} as const
