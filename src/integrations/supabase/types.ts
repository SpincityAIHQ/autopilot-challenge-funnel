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
      affiliate_clicks: {
        Row: {
          converted_registration_id: string | null
          id: string
          landed_at: string
          ref_code: string | null
          session_id: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          converted_registration_id?: string | null
          id?: string
          landed_at?: string
          ref_code?: string | null
          session_id?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          converted_registration_id?: string | null
          id?: string
          landed_at?: string
          ref_code?: string | null
          session_id?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_clicks_converted_registration_id_fkey"
            columns: ["converted_registration_id"]
            isOneToOne: false
            referencedRelation: "summit_registrations"
            referencedColumns: ["id"]
          },
        ]
      }
      challenge_payment_events: {
        Row: {
          created_at: string
          error: string | null
          event_type: string
          id: string
          payload: Json | null
          payment_id: string | null
          processed_at: string | null
          provider_event_id: string
          status: string
        }
        Insert: {
          created_at?: string
          error?: string | null
          event_type: string
          id?: string
          payload?: Json | null
          payment_id?: string | null
          processed_at?: string | null
          provider_event_id: string
          status?: string
        }
        Update: {
          created_at?: string
          error?: string | null
          event_type?: string
          id?: string
          payload?: Json | null
          payment_id?: string | null
          processed_at?: string | null
          provider_event_id?: string
          status?: string
        }
        Relationships: []
      }
      challenge_registrations: {
        Row: {
          amount_cents: number
          bump: boolean
          commas_payment_id: string
          created_at: string
          currency: string
          email: string
          email_marketing_consent: boolean
          email_marketing_consent_at: string | null
          full_name: string
          id: string
          phone: string | null
          sms_marketing_consent: boolean
          sms_marketing_consent_at: string | null
          status: string
          tier: string
          updated_at: string
        }
        Insert: {
          amount_cents: number
          bump?: boolean
          commas_payment_id: string
          created_at?: string
          currency?: string
          email: string
          email_marketing_consent?: boolean
          email_marketing_consent_at?: string | null
          full_name: string
          id?: string
          phone?: string | null
          sms_marketing_consent?: boolean
          sms_marketing_consent_at?: string | null
          status?: string
          tier: string
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          bump?: boolean
          commas_payment_id?: string
          created_at?: string
          currency?: string
          email?: string
          email_marketing_consent?: boolean
          email_marketing_consent_at?: string | null
          full_name?: string
          id?: string
          phone?: string | null
          sms_marketing_consent?: boolean
          sms_marketing_consent_at?: string | null
          status?: string
          tier?: string
          updated_at?: string
        }
        Relationships: []
      }
      entitlements: {
        Row: {
          buyer_email: string
          delivery_token_hash: string | null
          granted_at: string
          id: string
          product: string
          registration_id: string | null
          revoked_at: string | null
        }
        Insert: {
          buyer_email: string
          delivery_token_hash?: string | null
          granted_at?: string
          id?: string
          product: string
          registration_id?: string | null
          revoked_at?: string | null
        }
        Update: {
          buyer_email?: string
          delivery_token_hash?: string | null
          granted_at?: string
          id?: string
          product?: string
          registration_id?: string | null
          revoked_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "entitlements_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "summit_registrations"
            referencedColumns: ["id"]
          },
        ]
      }
      founder_seats: {
        Row: {
          claimed_at: string | null
          registration_id: string | null
          seat_number: number
        }
        Insert: {
          claimed_at?: string | null
          registration_id?: string | null
          seat_number: number
        }
        Update: {
          claimed_at?: string | null
          registration_id?: string | null
          seat_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "founder_seats_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: true
            referencedRelation: "challenge_registrations"
            referencedColumns: ["id"]
          },
        ]
      }
      intensive_slots: {
        Row: {
          buyer_email: string | null
          claimed_at: string | null
          commas_payment_id: string | null
          registration_id: string | null
          slot_number: number
        }
        Insert: {
          buyer_email?: string | null
          claimed_at?: string | null
          commas_payment_id?: string | null
          registration_id?: string | null
          slot_number: number
        }
        Update: {
          buyer_email?: string | null
          claimed_at?: string | null
          commas_payment_id?: string | null
          registration_id?: string | null
          slot_number?: number
        }
        Relationships: []
      }
      keynote_waitlist: {
        Row: {
          created_at: string
          email: string
          email_marketing_consent: boolean
          email_marketing_consent_at: string | null
          first_touch: Json | null
          full_name: string | null
          id: string
          source: string | null
        }
        Insert: {
          created_at?: string
          email: string
          email_marketing_consent?: boolean
          email_marketing_consent_at?: string | null
          first_touch?: Json | null
          full_name?: string | null
          id?: string
          source?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          email_marketing_consent?: boolean
          email_marketing_consent_at?: string | null
          first_touch?: Json | null
          full_name?: string | null
          id?: string
          source?: string | null
        }
        Relationships: []
      }
      marketing_consents: {
        Row: {
          channel: string
          copy_version: string | null
          created_at: string
          granted: boolean
          granted_at: string | null
          id: string
          revoked_at: string | null
          source: string | null
          subject_email: string
        }
        Insert: {
          channel: string
          copy_version?: string | null
          created_at?: string
          granted: boolean
          granted_at?: string | null
          id?: string
          revoked_at?: string | null
          source?: string | null
          subject_email: string
        }
        Update: {
          channel?: string
          copy_version?: string | null
          created_at?: string
          granted?: boolean
          granted_at?: string | null
          id?: string
          revoked_at?: string | null
          source?: string | null
          subject_email?: string
        }
        Relationships: []
      }
      mentorship_applications: {
        Row: {
          business: string | null
          created_at: string
          current_offer: string | null
          email: string
          full_name: string
          goals: string
          id: string
          monthly_revenue_band: string | null
          phone: string | null
          ready_to_invest: boolean
          status: string
        }
        Insert: {
          business?: string | null
          created_at?: string
          current_offer?: string | null
          email: string
          full_name: string
          goals: string
          id?: string
          monthly_revenue_band?: string | null
          phone?: string | null
          ready_to_invest?: boolean
          status?: string
        }
        Update: {
          business?: string | null
          created_at?: string
          current_offer?: string | null
          email?: string
          full_name?: string
          goals?: string
          id?: string
          monthly_revenue_band?: string | null
          phone?: string | null
          ready_to_invest?: boolean
          status?: string
        }
        Relationships: []
      }
      summit_payment_events: {
        Row: {
          created_at: string
          error: string | null
          event_type: string
          id: string
          payload: Json | null
          payment_id: string | null
          processed_at: string | null
          product: string | null
          provider_event_id: string
          status: string
        }
        Insert: {
          created_at?: string
          error?: string | null
          event_type: string
          id?: string
          payload?: Json | null
          payment_id?: string | null
          processed_at?: string | null
          product?: string | null
          provider_event_id: string
          status?: string
        }
        Update: {
          created_at?: string
          error?: string | null
          event_type?: string
          id?: string
          payload?: Json | null
          payment_id?: string | null
          processed_at?: string | null
          product?: string | null
          provider_event_id?: string
          status?: string
        }
        Relationships: []
      }
      summit_registrations: {
        Row: {
          ai_call_consent: boolean
          ai_call_consent_at: string | null
          amount_cents: number
          commas_payment_id: string
          created_at: string
          currency: string
          email: string
          email_marketing_consent: boolean
          email_marketing_consent_at: string | null
          first_touch: Json | null
          full_name: string
          id: string
          last_touch: Json | null
          phone: string | null
          sms_marketing_consent: boolean
          sms_marketing_consent_at: string | null
          status: string
          tier: string
          updated_at: string
        }
        Insert: {
          ai_call_consent?: boolean
          ai_call_consent_at?: string | null
          amount_cents: number
          commas_payment_id: string
          created_at?: string
          currency?: string
          email: string
          email_marketing_consent?: boolean
          email_marketing_consent_at?: string | null
          first_touch?: Json | null
          full_name: string
          id?: string
          last_touch?: Json | null
          phone?: string | null
          sms_marketing_consent?: boolean
          sms_marketing_consent_at?: string | null
          status?: string
          tier: string
          updated_at?: string
        }
        Update: {
          ai_call_consent?: boolean
          ai_call_consent_at?: string | null
          amount_cents?: number
          commas_payment_id?: string
          created_at?: string
          currency?: string
          email?: string
          email_marketing_consent?: boolean
          email_marketing_consent_at?: string | null
          first_touch?: Json | null
          full_name?: string
          id?: string
          last_touch?: Json | null
          phone?: string | null
          sms_marketing_consent?: boolean
          sms_marketing_consent_at?: string | null
          status?: string
          tier?: string
          updated_at?: string
        }
        Relationships: []
      }
      summit_vault_purchases: {
        Row: {
          amount_cents: number
          buyer_email: string
          commas_payment_id: string
          created_at: string
          currency: string
          id: string
          registration_id: string | null
          status: string
        }
        Insert: {
          amount_cents: number
          buyer_email: string
          commas_payment_id: string
          created_at?: string
          currency?: string
          id?: string
          registration_id?: string | null
          status?: string
        }
        Update: {
          amount_cents?: number
          buyer_email?: string
          commas_payment_id?: string
          created_at?: string
          currency?: string
          id?: string
          registration_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "summit_vault_purchases_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "summit_registrations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      claim_lowest_founder_seat: {
        Args: { _registration_id: string }
        Returns: number
      }
      claim_lowest_intensive_slot: {
        Args: { _buyer_email: string; _commas_payment_id: string }
        Returns: number
      }
      founder_seats_remaining: { Args: never; Returns: number }
      fulfill_challenge_payment: {
        Args: {
          _amount_cents: number
          _bump: boolean
          _commas_payment_id: string
          _currency: string
          _email: string
          _full_name: string
          _phone: string
          _tier: string
        }
        Returns: {
          already_existed: boolean
          registration_id: string
          seat_number: number
        }[]
      }
      fulfill_summit_payment: {
        Args: {
          _amount_cents: number
          _commas_payment_id: string
          _currency: string
          _email: string
          _first_touch: Json
          _full_name: string
          _last_touch: Json
          _phone: string
          _product: string
        }
        Returns: {
          already_existed: boolean
          registration_id: string
          slot_number: number
        }[]
      }
      intensive_slots_remaining: { Args: never; Returns: number }
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
