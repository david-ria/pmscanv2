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
      air_quality_data: {
        Row: {
          created_at: string
          data_source: string
          id: string
          latitude: number
          longitude: number
          no2_value: number | null
          o3_value: number | null
          station_id: string | null
          station_name: string | null
          timestamp: string
          timestamp_epoch_ms: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          data_source?: string
          id?: string
          latitude: number
          longitude: number
          no2_value?: number | null
          o3_value?: number | null
          station_id?: string | null
          station_name?: string | null
          timestamp: string
          timestamp_epoch_ms?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          data_source?: string
          id?: string
          latitude?: number
          longitude?: number
          no2_value?: number | null
          o3_value?: number | null
          station_id?: string | null
          station_name?: string | null
          timestamp?: string
          timestamp_epoch_ms?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      events: {
        Row: {
          accuracy: number | null
          comment: string | null
          created_at: string
          created_by: string | null
          date_utc: string | null
          event_type: string
          id: string
          latitude: number | null
          longitude: number | null
          mission_id: string
          photo_url: string | null
          timestamp: string
          timestamp_epoch_ms: number | null
          updated_at: string
        }
        Insert: {
          accuracy?: number | null
          comment?: string | null
          created_at?: string
          created_by?: string | null
          date_utc?: string | null
          event_type: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          mission_id: string
          photo_url?: string | null
          timestamp?: string
          timestamp_epoch_ms?: number | null
          updated_at?: string
        }
        Update: {
          accuracy?: number | null
          comment?: string | null
          created_at?: string
          created_by?: string | null
          date_utc?: string | null
          event_type?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          mission_id?: string
          photo_url?: string | null
          timestamp?: string
          timestamp_epoch_ms?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_events_mission_id"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "missions"
            referencedColumns: ["id"]
          },
        ]
      }
      fitness_activities: {
        Row: {
          activity_type: string
          calories: number | null
          created_at: string
          distance_meters: number | null
          duration_minutes: number
          end_epoch_ms: number | null
          end_time: string
          id: string
          raw_data: Json | null
          source: string | null
          start_epoch_ms: number | null
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
          end_epoch_ms?: number | null
          end_time: string
          id?: string
          raw_data?: Json | null
          source?: string | null
          start_epoch_ms?: number | null
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
          end_epoch_ms?: number | null
          end_time?: string
          id?: string
          raw_data?: Json | null
          source?: string | null
          start_epoch_ms?: number | null
          start_time?: string
          steps?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      group_custom_thresholds: {
        Row: {
          color: string | null
          created_at: string
          enabled: boolean | null
          group_id: string
          id: string
          name: string
          pm1_max: number | null
          pm1_min: number | null
          pm10_max: number | null
          pm10_min: number | null
          pm25_max: number | null
          pm25_min: number | null
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          enabled?: boolean | null
          group_id: string
          id?: string
          name: string
          pm1_max?: number | null
          pm1_min?: number | null
          pm10_max?: number | null
          pm10_min?: number | null
          pm25_max?: number | null
          pm25_min?: number | null
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          enabled?: boolean | null
          group_id?: string
          id?: string
          name?: string
          pm1_max?: number | null
          pm1_min?: number | null
          pm10_max?: number | null
          pm10_min?: number | null
          pm25_max?: number | null
          pm25_min?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      group_events: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          enabled: boolean | null
          group_id: string
          icon: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          enabled?: boolean | null
          group_id: string
          icon?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          enabled?: boolean | null
          group_id?: string
          icon?: string | null
          id?: string
          name?: string
          updated_at?: string
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
            referencedRelation: "group_member_profiles"
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
          custom_alarms: Json | null
          default_activity: string | null
          default_location: string | null
          event_notifications: boolean | null
          geohash_precision: number | null
          geohash_privacy_enabled: boolean | null
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
          custom_alarms?: Json | null
          default_activity?: string | null
          default_location?: string | null
          event_notifications?: boolean | null
          geohash_precision?: number | null
          geohash_privacy_enabled?: boolean | null
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
          custom_alarms?: Json | null
          default_activity?: string | null
          default_location?: string | null
          event_notifications?: boolean | null
          geohash_precision?: number | null
          geohash_privacy_enabled?: boolean | null
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
          custom_activities: Json | null
          custom_locations: Json | null
          description: string | null
          id: string
          logo_url: string | null
          member_quota: number | null
          name: string
          subscription_tier:
            | Database["public"]["Enums"]["subscription_tier"]
            | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          custom_activities?: Json | null
          custom_locations?: Json | null
          description?: string | null
          id?: string
          logo_url?: string | null
          member_quota?: number | null
          name: string
          subscription_tier?:
            | Database["public"]["Enums"]["subscription_tier"]
            | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          custom_activities?: Json | null
          custom_locations?: Json | null
          description?: string | null
          id?: string
          logo_url?: string | null
          member_quota?: number | null
          name?: string
          subscription_tier?:
            | Database["public"]["Enums"]["subscription_tier"]
            | null
          updated_at?: string
        }
        Relationships: []
      }
      location_enrichment_data: {
        Row: {
          address_components: Json | null
          amenity: string | null
          created_at: string
          display_name: string | null
          id: string
          latitude: number
          longitude: number
          place_class: string | null
          place_type: string | null
          raw_nominatim_data: Json | null
          timestamp: string
          updated_at: string
        }
        Insert: {
          address_components?: Json | null
          amenity?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          latitude: number
          longitude: number
          place_class?: string | null
          place_type?: string | null
          raw_nominatim_data?: Json | null
          timestamp?: string
          updated_at?: string
        }
        Update: {
          address_components?: Json | null
          amenity?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          latitude?: number
          longitude?: number
          place_class?: string | null
          place_type?: string | null
          raw_nominatim_data?: Json | null
          timestamp?: string
          updated_at?: string
        }
        Relationships: []
      }
      measurements: {
        Row: {
          accuracy: number | null
          activity_context: string | null
          automatic_context: string | null
          co2: number | null
          created_at: string
          date_utc: string | null
          enriched_location: string | null
          external_humidity: number | null
          external_temperature: number | null
          geohash: string | null
          humidity: number | null
          id: string
          latitude: number | null
          location_context: string | null
          longitude: number | null
          mission_id: string
          particles_02_05: number | null
          particles_05_10: number | null
          particles_10_25: number | null
          particles_25_50: number | null
          particles_50_100: number | null
          pm1: number
          pm10: number
          pm25: number
          temperature: number | null
          timestamp: string
          timestamp_epoch_ms: number | null
          voc: number | null
        }
        Insert: {
          accuracy?: number | null
          activity_context?: string | null
          automatic_context?: string | null
          co2?: number | null
          created_at?: string
          date_utc?: string | null
          enriched_location?: string | null
          external_humidity?: number | null
          external_temperature?: number | null
          geohash?: string | null
          humidity?: number | null
          id?: string
          latitude?: number | null
          location_context?: string | null
          longitude?: number | null
          mission_id: string
          particles_02_05?: number | null
          particles_05_10?: number | null
          particles_10_25?: number | null
          particles_25_50?: number | null
          particles_50_100?: number | null
          pm1: number
          pm10: number
          pm25: number
          temperature?: number | null
          timestamp: string
          timestamp_epoch_ms?: number | null
          voc?: number | null
        }
        Update: {
          accuracy?: number | null
          activity_context?: string | null
          automatic_context?: string | null
          co2?: number | null
          created_at?: string
          date_utc?: string | null
          enriched_location?: string | null
          external_humidity?: number | null
          external_temperature?: number | null
          geohash?: string | null
          humidity?: number | null
          id?: string
          latitude?: number | null
          location_context?: string | null
          longitude?: number | null
          mission_id?: string
          particles_02_05?: number | null
          particles_05_10?: number | null
          particles_10_25?: number | null
          particles_25_50?: number | null
          particles_50_100?: number | null
          pm1?: number
          pm10?: number
          pm25?: number
          temperature?: number | null
          timestamp?: string
          timestamp_epoch_ms?: number | null
          voc?: number | null
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
          actual_recording_minutes: number | null
          air_quality_data_id: string | null
          avg_pm1: number
          avg_pm10: number
          avg_pm25: number
          created_at: string
          device_name: string | null
          duration_minutes: number
          end_epoch_ms: number | null
          end_time: string
          gap_detected: boolean | null
          group_id: string | null
          id: string
          location_context: string | null
          max_pm25: number
          measurements_count: number
          name: string
          processed_by_robot: boolean | null
          recording_coverage_percentage: number | null
          recording_frequency: string | null
          robot_processed_at: string | null
          robot_processing_attempts: number | null
          shared: boolean | null
          start_epoch_ms: number | null
          start_time: string
          updated_at: string
          user_id: string | null
          weather_data_id: string | null
        }
        Insert: {
          activity_context?: string | null
          actual_recording_minutes?: number | null
          air_quality_data_id?: string | null
          avg_pm1: number
          avg_pm10: number
          avg_pm25: number
          created_at?: string
          device_name?: string | null
          duration_minutes: number
          end_epoch_ms?: number | null
          end_time: string
          gap_detected?: boolean | null
          group_id?: string | null
          id?: string
          location_context?: string | null
          max_pm25: number
          measurements_count?: number
          name: string
          processed_by_robot?: boolean | null
          recording_coverage_percentage?: number | null
          recording_frequency?: string | null
          robot_processed_at?: string | null
          robot_processing_attempts?: number | null
          shared?: boolean | null
          start_epoch_ms?: number | null
          start_time: string
          updated_at?: string
          user_id?: string | null
          weather_data_id?: string | null
        }
        Update: {
          activity_context?: string | null
          actual_recording_minutes?: number | null
          air_quality_data_id?: string | null
          avg_pm1?: number
          avg_pm10?: number
          avg_pm25?: number
          created_at?: string
          device_name?: string | null
          duration_minutes?: number
          end_epoch_ms?: number | null
          end_time?: string
          gap_detected?: boolean | null
          group_id?: string | null
          id?: string
          location_context?: string | null
          max_pm25?: number
          measurements_count?: number
          name?: string
          processed_by_robot?: boolean | null
          recording_coverage_percentage?: number | null
          recording_frequency?: string | null
          robot_processed_at?: string | null
          robot_processing_attempts?: number | null
          shared?: boolean | null
          start_epoch_ms?: number | null
          start_time?: string
          updated_at?: string
          user_id?: string | null
          weather_data_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_missions_air_quality_data"
            columns: ["air_quality_data_id"]
            isOneToOne: false
            referencedRelation: "air_quality_data"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "missions_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "missions_weather_data_id_fkey"
            columns: ["weather_data_id"]
            isOneToOne: false
            referencedRelation: "weather_data"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          custom_activities: Json | null
          custom_locations: Json | null
          email: string | null
          first_name: string | null
          home_wifi_ssid: string | null
          id: string
          last_name: string | null
          pseudo: string | null
          subscription_tier:
            | Database["public"]["Enums"]["subscription_tier"]
            | null
          updated_at: string
          work_wifi_ssid: string | null
        }
        Insert: {
          created_at?: string
          custom_activities?: Json | null
          custom_locations?: Json | null
          email?: string | null
          first_name?: string | null
          home_wifi_ssid?: string | null
          id: string
          last_name?: string | null
          pseudo?: string | null
          subscription_tier?:
            | Database["public"]["Enums"]["subscription_tier"]
            | null
          updated_at?: string
          work_wifi_ssid?: string | null
        }
        Update: {
          created_at?: string
          custom_activities?: Json | null
          custom_locations?: Json | null
          email?: string | null
          first_name?: string | null
          home_wifi_ssid?: string | null
          id?: string
          last_name?: string | null
          pseudo?: string | null
          subscription_tier?:
            | Database["public"]["Enums"]["subscription_tier"]
            | null
          updated_at?: string
          work_wifi_ssid?: string | null
        }
        Relationships: []
      }
      role_audit_log: {
        Row: {
          change_reason: string | null
          changed_by: string
          created_at: string
          id: string
          new_role: Database["public"]["Enums"]["app_role"]
          old_role: Database["public"]["Enums"]["app_role"] | null
          target_user_id: string
        }
        Insert: {
          change_reason?: string | null
          changed_by: string
          created_at?: string
          id?: string
          new_role: Database["public"]["Enums"]["app_role"]
          old_role?: Database["public"]["Enums"]["app_role"] | null
          target_user_id: string
        }
        Update: {
          change_reason?: string | null
          changed_by?: string
          created_at?: string
          id?: string
          new_role?: Database["public"]["Enums"]["app_role"]
          old_role?: Database["public"]["Enums"]["app_role"] | null
          target_user_id?: string
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
      weather_data: {
        Row: {
          created_at: string
          humidity: number
          id: string
          latitude: number
          longitude: number
          pressure: number
          temperature: number
          timestamp: string
          timestamp_epoch_ms: number | null
          updated_at: string
          uv_index: number | null
          visibility: number | null
          weather_description: string
          weather_main: string
          wind_direction: number | null
          wind_speed: number | null
        }
        Insert: {
          created_at?: string
          humidity: number
          id?: string
          latitude: number
          longitude: number
          pressure: number
          temperature: number
          timestamp: string
          timestamp_epoch_ms?: number | null
          updated_at?: string
          uv_index?: number | null
          visibility?: number | null
          weather_description: string
          weather_main: string
          wind_direction?: number | null
          wind_speed?: number | null
        }
        Update: {
          created_at?: string
          humidity?: number
          id?: string
          latitude?: number
          longitude?: number
          pressure?: number
          temperature?: number
          timestamp?: string
          timestamp_epoch_ms?: number | null
          updated_at?: string
          uv_index?: number | null
          visibility?: number | null
          weather_description?: string
          weather_main?: string
          wind_direction?: number | null
          wind_speed?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      group_member_profiles: {
        Row: {
          created_at: string | null
          email: string | null
          first_name: string | null
          id: string | null
          last_name: string | null
          pseudo: string | null
          subscription_tier:
            | Database["public"]["Enums"]["subscription_tier"]
            | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email?: never
          first_name?: string | null
          id?: string | null
          last_name?: string | null
          pseudo?: string | null
          subscription_tier?:
            | Database["public"]["Enums"]["subscription_tier"]
            | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: never
          first_name?: string | null
          id?: string | null
          last_name?: string | null
          pseudo?: string | null
          subscription_tier?:
            | Database["public"]["Enums"]["subscription_tier"]
            | null
          updated_at?: string | null
        }
        Relationships: []
      }
      measurements_group_view: {
        Row: {
          accuracy: number | null
          activity_context: string | null
          automatic_context: string | null
          created_at: string | null
          date_utc: string | null
          enriched_location: string | null
          external_humidity: number | null
          external_temperature: number | null
          geohash: string | null
          group_geohash_precision: number | null
          group_privacy_active: boolean | null
          humidity: number | null
          id: string | null
          is_own_data: boolean | null
          latitude: number | null
          location_context: string | null
          longitude: number | null
          mission_id: string | null
          particles_02_05: number | null
          particles_05_10: number | null
          particles_10_25: number | null
          particles_25_50: number | null
          particles_50_100: number | null
          pm1: number | null
          pm10: number | null
          pm25: number | null
          temperature: number | null
          timestamp: string | null
          timestamp_epoch_ms: number | null
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
    }
    Functions: {
      are_users_in_same_group: {
        Args: { _user1_id: string; _user2_id: string }
        Returns: boolean
      }
      cleanup_location_enrichment_aggressive: {
        Args: never
        Returns: {
          deleted_count: number
        }[]
      }
      cleanup_old_location_enrichment: {
        Args: never
        Returns: {
          deleted_count: number
        }[]
      }
      elevate_user_role:
        | {
            Args: {
              change_reason?: string
              new_role: Database["public"]["Enums"]["app_role"]
              target_user_id: string
            }
            Returns: boolean
          }
        | {
            Args: {
              new_role: Database["public"]["Enums"]["app_role"]
              target_user_id: string
            }
            Returns: boolean
          }
      get_group_geohash_aggregates: {
        Args: {
          p_end_date: string
          p_geohash_precision?: number
          p_group_id: string
          p_start_date: string
        }
        Returns: {
          avg_pm1: number
          avg_pm10: number
          avg_pm25: number
          contributor_count: number
          geohash_cell: string
          last_measurement_time: string
          measurement_count: number
        }[]
      }
      get_location_enrichment_stats: {
        Args: never
        Returns: {
          estimated_size_mb: number
          newest_record: string
          oldest_record: string
          records_over_30_days: number
          records_over_90_days: number
          total_records: number
        }[]
      }
      get_user_email: { Args: { _user_id: string }; Returns: string }
      get_user_group_ids: { Args: { _user_id: string }; Returns: string[] }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      initialize_super_admin: {
        Args: { target_user_email: string }
        Returns: boolean
      }
      is_group_admin: {
        Args: { _group_id: string; _user_id: string }
        Returns: boolean
      }
      is_group_member: {
        Args: { _group_id: string; _user_id: string }
        Returns: boolean
      }
      is_user_in_group: {
        Args: { _group_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "super_admin" | "admin" | "moderator" | "user"
      subscription_tier: "free" | "premium" | "enterprise"
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
      subscription_tier: ["free", "premium", "enterprise"],
    },
  },
} as const
