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
      academy_access_codes: {
        Row: {
          access_hours: number
          access_until: string | null
          code_hash: string
          email: string
          expires_at: string
          generation: string
          id: string
          issued_at: string
          line_id: string
          order_id: string
          redeemed_at: string | null
          redeemed_by: string | null
          terms_version: string
          tier: string
        }
        Insert: {
          access_hours: number
          access_until?: string | null
          code_hash: string
          email: string
          expires_at?: string
          generation: string
          id: string
          issued_at?: string
          line_id: string
          order_id: string
          redeemed_at?: string | null
          redeemed_by?: string | null
          terms_version: string
          tier: string
        }
        Update: {
          access_hours?: number
          access_until?: string | null
          code_hash?: string
          email?: string
          expires_at?: string
          generation?: string
          id?: string
          issued_at?: string
          line_id?: string
          order_id?: string
          redeemed_at?: string | null
          redeemed_by?: string | null
          terms_version?: string
          tier?: string
        }
        Relationships: [
          {
            foreignKeyName: "academy_access_codes_order_id_line_id_fkey"
            columns: ["order_id", "line_id"]
            isOneToOne: true
            referencedRelation: "academy_grants"
            referencedColumns: ["order_id", "line_id"]
          },
        ]
      }
      academy_access_deliveries: {
        Row: {
          attempts: number
          code_id: string
          completed_at: string | null
          created_at: string
          due_at: string
          generation: string
          id: string
          locked_at: string | null
          status: string
        }
        Insert: {
          attempts?: number
          code_id: string
          completed_at?: string | null
          created_at?: string
          due_at?: string
          generation: string
          id?: string
          locked_at?: string | null
          status?: string
        }
        Update: {
          attempts?: number
          code_id?: string
          completed_at?: string | null
          created_at?: string
          due_at?: string
          generation?: string
          id?: string
          locked_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "academy_access_deliveries_code_id_fkey"
            columns: ["code_id"]
            isOneToOne: false
            referencedRelation: "academy_access_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      academy_attempts: {
        Row: {
          answers: Json
          content_version: string
          created_at: string
          id: string
          lesson_id: string
          score: number
          total: number
          user_id: string
        }
        Insert: {
          answers: Json
          content_version: string
          created_at?: string
          id: string
          lesson_id: string
          score: number
          total: number
          user_id: string
        }
        Update: {
          answers?: Json
          content_version?: string
          created_at?: string
          id?: string
          lesson_id?: string
          score?: number
          total?: number
          user_id?: string
        }
        Relationships: []
      }
      academy_avatar_sessions: {
        Row: {
          created_at: string
          ended_at: string | null
          expires_at: string
          id: string
          max_seconds: number
          provider_session_id: string | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          ended_at?: string | null
          expires_at: string
          id: string
          max_seconds: number
          provider_session_id?: string | null
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          ended_at?: string | null
          expires_at?: string
          id?: string
          max_seconds?: number
          provider_session_id?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      academy_commerce_receipts: {
        Row: {
          event_id: string
          order_id: string
          processed_at: string | null
          received_at: string
          status: string
          topic: string
        }
        Insert: {
          event_id: string
          order_id: string
          processed_at?: string | null
          received_at?: string
          status?: string
          topic: string
        }
        Update: {
          event_id?: string
          order_id?: string
          processed_at?: string | null
          received_at?: string
          status?: string
          topic?: string
        }
        Relationships: []
      }
      academy_events: {
        Row: {
          created_at: string
          id: string
          lesson_id: string | null
          name: string
          payload: Json
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          lesson_id?: string | null
          name: string
          payload?: Json
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          lesson_id?: string | null
          name?: string
          payload?: Json
          user_id?: string | null
        }
        Relationships: []
      }
      academy_grants: {
        Row: {
          active: boolean
          email: string
          line_id: string
          order_id: string
          quantity: number
          tier: string
          updated_at: string
          variant_id: string
        }
        Insert: {
          active?: boolean
          email: string
          line_id: string
          order_id: string
          quantity: number
          tier: string
          updated_at?: string
          variant_id: string
        }
        Update: {
          active?: boolean
          email?: string
          line_id?: string
          order_id?: string
          quantity?: number
          tier?: string
          updated_at?: string
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "academy_grants_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "academy_orders"
            referencedColumns: ["order_id"]
          },
        ]
      }
      academy_imported_tickets: {
        Row: {
          active: boolean
          claimed_at: string | null
          claimed_by: string | null
          created_at: string
          email: string
          expires_at: string | null
          id: string
          source_batch: string
          source_key: string
          source_kind: string
          source_reference: string | null
          terms_note: string
          tier: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          claimed_at?: string | null
          claimed_by?: string | null
          created_at?: string
          email: string
          expires_at?: string | null
          id?: string
          source_batch: string
          source_key: string
          source_kind?: string
          source_reference?: string | null
          terms_note: string
          tier: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          claimed_at?: string | null
          claimed_by?: string | null
          created_at?: string
          email?: string
          expires_at?: string | null
          id?: string
          source_batch?: string
          source_key?: string
          source_kind?: string
          source_reference?: string | null
          terms_note?: string
          tier?: string
          updated_at?: string
        }
        Relationships: []
      }
      academy_orders: {
        Row: {
          email: string
          financial_status: string
          needs_review: boolean
          order_id: string
          shopify_updated_at: string
          updated_at: string
        }
        Insert: {
          email: string
          financial_status: string
          needs_review?: boolean
          order_id: string
          shopify_updated_at: string
          updated_at?: string
        }
        Update: {
          email?: string
          financial_status?: string
          needs_review?: boolean
          order_id?: string
          shopify_updated_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      academy_outbox: {
        Row: {
          attempts: number
          completed_at: string | null
          created_at: string
          dedup_key: string
          due_at: string
          id: string
          locked_at: string | null
          name: string
          payload: Json
          status: string
          user_id: string | null
        }
        Insert: {
          attempts?: number
          completed_at?: string | null
          created_at?: string
          dedup_key: string
          due_at?: string
          id?: string
          locked_at?: string | null
          name: string
          payload?: Json
          status?: string
          user_id?: string | null
        }
        Update: {
          attempts?: number
          completed_at?: string | null
          created_at?: string
          dedup_key?: string
          due_at?: string
          id?: string
          locked_at?: string | null
          name?: string
          payload?: Json
          status?: string
          user_id?: string | null
        }
        Relationships: []
      }
      academy_profiles: {
        Row: {
          attribution: Json
          consent_at: string
          consent_version: string
          created_at: string
          email: string
          marketing_consent: boolean
          phone: string | null
          sms_consent: boolean
          sms_consent_at: string | null
          timezone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          attribution?: Json
          consent_at?: string
          consent_version: string
          created_at?: string
          email: string
          marketing_consent?: boolean
          phone?: string | null
          sms_consent?: boolean
          sms_consent_at?: string | null
          timezone?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          attribution?: Json
          consent_at?: string
          consent_version?: string
          created_at?: string
          email?: string
          marketing_consent?: boolean
          phone?: string | null
          sms_consent?: boolean
          sms_consent_at?: string | null
          timezone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      academy_progress: {
        Row: {
          content_version: string
          duration: number
          intervals: Json
          lesson_id: string
          media_version: string
          position: number
          quiz_score: number | null
          quiz_total: number | null
          reviewer_feedback: string | null
          updated_at: string
          user_id: string
          workbook: Json
          workbook_status: string
        }
        Insert: {
          content_version?: string
          duration?: number
          intervals?: Json
          lesson_id: string
          media_version?: string
          position?: number
          quiz_score?: number | null
          quiz_total?: number | null
          reviewer_feedback?: string | null
          updated_at?: string
          user_id: string
          workbook?: Json
          workbook_status?: string
        }
        Update: {
          content_version?: string
          duration?: number
          intervals?: Json
          lesson_id?: string
          media_version?: string
          position?: number
          quiz_score?: number | null
          quiz_total?: number | null
          reviewer_feedback?: string | null
          updated_at?: string
          user_id?: string
          workbook?: Json
          workbook_status?: string
        }
        Relationships: []
      }
      academy_reviews: {
        Row: {
          created_at: string
          feedback: string
          id: string
          lesson_id: string
          reviewer_id: string
          status: string
          user_id: string
          workbook_snapshot: Json
        }
        Insert: {
          created_at?: string
          feedback: string
          id?: string
          lesson_id: string
          reviewer_id: string
          status: string
          user_id: string
          workbook_snapshot: Json
        }
        Update: {
          created_at?: string
          feedback?: string
          id?: string
          lesson_id?: string
          reviewer_id?: string
          status?: string
          user_id?: string
          workbook_snapshot?: Json
        }
        Relationships: []
      }
      academy_scheduler_credentials: {
        Row: {
          enabled: boolean
          name: string
          rotated_at: string
          token_sha256: string
        }
        Insert: {
          enabled?: boolean
          name: string
          rotated_at?: string
          token_sha256: string
        }
        Update: {
          enabled?: boolean
          name?: string
          rotated_at?: string
          token_sha256?: string
        }
        Relationships: []
      }
      academy_tutor_messages: {
        Row: {
          answer: string
          consent_version: string
          created_at: string
          id: string
          lesson_id: string
          model: string
          question: string
          user_id: string
        }
        Insert: {
          answer: string
          consent_version: string
          created_at?: string
          id?: string
          lesson_id: string
          model: string
          question: string
          user_id: string
        }
        Update: {
          answer?: string
          consent_version?: string
          created_at?: string
          id?: string
          lesson_id?: string
          model?: string
          question?: string
          user_id?: string
        }
        Relationships: []
      }
      academy_tutor_usage: {
        Row: {
          day: string
          requests: number
        }
        Insert: {
          day: string
          requests?: number
        }
        Update: {
          day?: string
          requests?: number
        }
        Relationships: []
      }
      academy_write_usage: {
        Row: {
          bucket: string
          hour: string
          requests: number
          user_id: string
        }
        Insert: {
          bucket: string
          hour: string
          requests?: number
          user_id: string
        }
        Update: {
          bucket?: string
          hour?: string
          requests?: number
          user_id?: string
        }
        Relationships: []
      }
      access_tokens: {
        Row: {
          buyer_email: string
          created_at: string
          expires_at: string
          id: string
          registration_id: string | null
          revoked_at: string | null
          scope: string
          token_hash: string
          used_at: string | null
        }
        Insert: {
          buyer_email: string
          created_at?: string
          expires_at: string
          id?: string
          registration_id?: string | null
          revoked_at?: string | null
          scope: string
          token_hash: string
          used_at?: string | null
        }
        Update: {
          buyer_email?: string
          created_at?: string
          expires_at?: string
          id?: string
          registration_id?: string | null
          revoked_at?: string | null
          scope?: string
          token_hash?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "access_tokens_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "summit_registrations"
            referencedColumns: ["id"]
          },
        ]
      }
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
      consent_events: {
        Row: {
          action: string
          channel: string
          copy_version: string
          created_at: string
          id: string
          ip_hash: string | null
          source: string | null
          subject_email: string
          user_agent_hash: string | null
        }
        Insert: {
          action: string
          channel: string
          copy_version: string
          created_at?: string
          id?: string
          ip_hash?: string | null
          source?: string | null
          subject_email: string
          user_agent_hash?: string | null
        }
        Update: {
          action?: string
          channel?: string
          copy_version?: string
          created_at?: string
          id?: string
          ip_hash?: string | null
          source?: string | null
          subject_email?: string
          user_agent_hash?: string | null
        }
        Relationships: []
      }
      delivery_outbox: {
        Row: {
          attempts: number
          channel: string
          created_at: string
          destination_hash: string
          id: string
          last_error: string | null
          provider: string | null
          scheduled_at: string
          sent_at: string | null
          status: string
          template_key: string
        }
        Insert: {
          attempts?: number
          channel: string
          created_at?: string
          destination_hash: string
          id?: string
          last_error?: string | null
          provider?: string | null
          scheduled_at?: string
          sent_at?: string | null
          status?: string
          template_key: string
        }
        Update: {
          attempts?: number
          channel?: string
          created_at?: string
          destination_hash?: string
          id?: string
          last_error?: string | null
          provider?: string | null
          scheduled_at?: string
          sent_at?: string | null
          status?: string
          template_key?: string
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
          source_payment_id: string
        }
        Insert: {
          buyer_email: string
          delivery_token_hash?: string | null
          granted_at?: string
          id?: string
          product: string
          registration_id?: string | null
          revoked_at?: string | null
          source_payment_id: string
        }
        Update: {
          buyer_email?: string
          delivery_token_hash?: string | null
          granted_at?: string
          id?: string
          product?: string
          registration_id?: string | null
          revoked_at?: string | null
          source_payment_id?: string
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
      intensive_eligibility: {
        Row: {
          buyer_email: string
          created_at: string
          id: string
          note: string | null
          source: string
        }
        Insert: {
          buyer_email: string
          created_at?: string
          id?: string
          note?: string | null
          source?: string
        }
        Update: {
          buyer_email?: string
          created_at?: string
          id?: string
          note?: string | null
          source?: string
        }
        Relationships: []
      }
      intensive_slots: {
        Row: {
          amount_cents: number | null
          booking_status: string
          buyer_email: string | null
          claimed_at: string | null
          commas_payment_id: string | null
          currency: string | null
          refunded_at: string | null
          registration_id: string | null
          slot_number: number
        }
        Insert: {
          amount_cents?: number | null
          booking_status?: string
          buyer_email?: string | null
          claimed_at?: string | null
          commas_payment_id?: string | null
          currency?: string | null
          refunded_at?: string | null
          registration_id?: string | null
          slot_number: number
        }
        Update: {
          amount_cents?: number | null
          booking_status?: string
          buyer_email?: string | null
          claimed_at?: string | null
          commas_payment_id?: string | null
          currency?: string | null
          refunded_at?: string | null
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
          consent_text: string | null
          copy_version: string | null
          created_at: string
          granted: boolean
          granted_at: string | null
          id: string
          phone: string | null
          request_hash: string | null
          revoked_at: string | null
          seller: string | null
          signer_name: string | null
          source: string | null
          source_route: string | null
          subject_email: string
          user_agent_hash: string | null
        }
        Insert: {
          channel: string
          consent_text?: string | null
          copy_version?: string | null
          created_at?: string
          granted: boolean
          granted_at?: string | null
          id?: string
          phone?: string | null
          request_hash?: string | null
          revoked_at?: string | null
          seller?: string | null
          signer_name?: string | null
          source?: string | null
          source_route?: string | null
          subject_email: string
          user_agent_hash?: string | null
        }
        Update: {
          channel?: string
          consent_text?: string | null
          copy_version?: string | null
          created_at?: string
          granted?: boolean
          granted_at?: string | null
          id?: string
          phone?: string | null
          request_hash?: string | null
          revoked_at?: string | null
          seller?: string | null
          signer_name?: string | null
          source?: string | null
          source_route?: string | null
          subject_email?: string
          user_agent_hash?: string | null
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
      rate_limits: {
        Row: {
          count: number
          expires_at: string
          key_hash: string
          window_start: string
        }
        Insert: {
          count?: number
          expires_at?: string
          key_hash: string
          window_start?: string
        }
        Update: {
          count?: number
          expires_at?: string
          key_hash?: string
          window_start?: string
        }
        Relationships: []
      }
      resource_sessions: {
        Row: {
          buyer_email: string
          created_at: string
          expires_at: string
          issued_scopes: string[]
          revoked_at: string | null
          session_hash: string
          source_token_hash: string
        }
        Insert: {
          buyer_email: string
          created_at?: string
          expires_at: string
          issued_scopes?: string[]
          revoked_at?: string | null
          session_hash: string
          source_token_hash: string
        }
        Update: {
          buyer_email?: string
          created_at?: string
          expires_at?: string
          issued_scopes?: string[]
          revoked_at?: string | null
          session_hash?: string
          source_token_hash?: string
        }
        Relationships: []
      }
      summit_audit: {
        Row: {
          ai_tools: string[] | null
          anything_else: string | null
          attendance: string | null
          autonomy_goal: string | null
          bottleneck: string | null
          business_type: string | null
          created_at: string
          email: string
          entitlement_tier: string | null
          id: string
          revenue_stage: string | null
          team_size: string | null
          top_question: string | null
          updated_at: string
          verification: string
          what_stops: string | null
        }
        Insert: {
          ai_tools?: string[] | null
          anything_else?: string | null
          attendance?: string | null
          autonomy_goal?: string | null
          bottleneck?: string | null
          business_type?: string | null
          created_at?: string
          email: string
          entitlement_tier?: string | null
          id?: string
          revenue_stage?: string | null
          team_size?: string | null
          top_question?: string | null
          updated_at?: string
          verification?: string
          what_stops?: string | null
        }
        Update: {
          ai_tools?: string[] | null
          anything_else?: string | null
          attendance?: string | null
          autonomy_goal?: string | null
          bottleneck?: string | null
          business_type?: string | null
          created_at?: string
          email?: string
          entitlement_tier?: string | null
          id?: string
          revenue_stage?: string | null
          team_size?: string | null
          top_question?: string | null
          updated_at?: string
          verification?: string
          what_stops?: string | null
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
          admission_product: string
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
          payment_status: string
          phone: string | null
          refunded_at: string | null
          sms_marketing_consent: boolean
          sms_marketing_consent_at: string | null
          status: string
          tier: string
          updated_at: string
        }
        Insert: {
          admission_product: string
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
          payment_status?: string
          phone?: string | null
          refunded_at?: string | null
          sms_marketing_consent?: boolean
          sms_marketing_consent_at?: string | null
          status?: string
          tier: string
          updated_at?: string
        }
        Update: {
          admission_product?: string
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
          payment_status?: string
          phone?: string | null
          refunded_at?: string | null
          sms_marketing_consent?: boolean
          sms_marketing_consent_at?: string | null
          status?: string
          tier?: string
          updated_at?: string
        }
        Relationships: []
      }
      summit_reservations: {
        Row: {
          created_at: string
          email: string | null
          first_name: string | null
          id: string
          phone: string | null
          settled: boolean
          tier_reserved: string
          token: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          phone?: string | null
          settled?: boolean
          tier_reserved?: string
          token: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          phone?: string | null
          settled?: boolean
          tier_reserved?: string
          token?: string
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
          payment_status: string
          refunded_at: string | null
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
          payment_status?: string
          refunded_at?: string | null
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
          payment_status?: string
          refunded_at?: string | null
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
      summit_vip_upgrades: {
        Row: {
          amount_cents: number
          buyer_email: string
          commas_payment_id: string
          created_at: string
          currency: string
          id: string
          payment_status: string
          refunded_at: string | null
          registration_id: string
        }
        Insert: {
          amount_cents: number
          buyer_email: string
          commas_payment_id: string
          created_at?: string
          currency?: string
          id?: string
          payment_status?: string
          refunded_at?: string | null
          registration_id: string
        }
        Update: {
          amount_cents?: number
          buyer_email?: string
          commas_payment_id?: string
          created_at?: string
          currency?: string
          id?: string
          payment_status?: string
          refunded_at?: string | null
          registration_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "summit_vip_upgrades_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "summit_registrations"
            referencedColumns: ["id"]
          },
        ]
      }
      training_waitlist: {
        Row: {
          attribution: Json
          created_at: string
          email: string
          email_marketing_consent: boolean
          email_marketing_consent_at: string | null
          full_name: string | null
          id: string
          notified_at: string | null
          source: string | null
        }
        Insert: {
          attribution?: Json
          created_at?: string
          email: string
          email_marketing_consent?: boolean
          email_marketing_consent_at?: string | null
          full_name?: string | null
          id?: string
          notified_at?: string | null
          source?: string | null
        }
        Update: {
          attribution?: Json
          created_at?: string
          email?: string
          email_marketing_consent?: boolean
          email_marketing_consent_at?: string | null
          full_name?: string | null
          id?: string
          notified_at?: string | null
          source?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      academy_claim_access_deliveries: {
        Args: { p_limit: number }
        Returns: {
          attempts: number
          code_id: string
          completed_at: string | null
          created_at: string
          due_at: string
          generation: string
          id: string
          locked_at: string | null
          status: string
        }[]
        SetofOptions: {
          from: "*"
          to: "academy_access_deliveries"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      academy_claim_imported_tickets: {
        Args: { p_user: string }
        Returns: {
          tier: string
        }[]
      }
      academy_claim_outbox: {
        Args: { p_limit: number }
        Returns: {
          attempts: number
          completed_at: string | null
          created_at: string
          dedup_key: string
          due_at: string
          id: string
          locked_at: string | null
          name: string
          payload: Json
          status: string
          user_id: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "academy_outbox"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      academy_has_imported_ticket: {
        Args: { p_user: string }
        Returns: boolean
      }
      academy_issue_access_code: {
        Args: {
          p_generation: string
          p_hash: string
          p_hours: number
          p_id: string
          p_line: string
          p_order: string
          p_terms: string
        }
        Returns: string
      }
      academy_queue_learning_nudges: { Args: never; Returns: number }
      academy_reconcile_order: {
        Args: {
          p_email: string
          p_lines: Json
          p_order: string
          p_review: boolean
          p_status: string
          p_updated: string
        }
        Returns: boolean
      }
      academy_record_progress: {
        Args: {
          p_event: string
          p_kind: string
          p_lesson: string
          p_payload: Json
          p_user: string
        }
        Returns: undefined
      }
      academy_redeem_access_code: {
        Args: { p_email: string; p_hash: string; p_user: string }
        Returns: Json
      }
      academy_register:
        | {
            Args: {
              p_attribution: Json
              p_consent: boolean
              p_email: string
              p_timezone: string
              p_user: string
            }
            Returns: undefined
          }
        | {
            Args: {
              p_attribution: Json
              p_consent: boolean
              p_email: string
              p_phone?: string
              p_sms?: boolean
              p_timezone: string
              p_user: string
            }
            Returns: undefined
          }
      academy_reserve_avatar: {
        Args: {
          p_daily_seconds: number
          p_global_seconds: number
          p_id: string
          p_seconds: number
          p_user: string
        }
        Returns: boolean
      }
      academy_review_workbook: {
        Args: {
          p_feedback: string
          p_lesson: string
          p_reviewer: string
          p_status: string
          p_user: string
        }
        Returns: undefined
      }
      academy_scheduler_authorized: {
        Args: { p_token_sha256: string }
        Returns: boolean
      }
      academy_tutor_budget: {
        Args: { p_global_limit: number; p_user: string }
        Returns: boolean
      }
      academy_write_budget: {
        Args: { p_bucket: string; p_limit: number; p_user: string }
        Returns: boolean
      }
      claim_lowest_founder_seat: {
        Args: { _registration_id: string }
        Returns: number
      }
      claim_lowest_intensive_slot: {
        Args: { _buyer_email: string; _commas_payment_id: string }
        Returns: number
      }
      consume_rate_limit: {
        Args: { _key_hash: string; _limit: number; _window_seconds: number }
        Returns: {
          ok: boolean
          retry_after: number
        }[]
      }
      entitlement_by_token_hash: {
        Args: { _token_hash: string }
        Returns: {
          active: boolean
          buyer_email: string
          expires_at: string
          registration_id: string
          scope: string
          used_at: string
        }[]
      }
      exchange_access_token: {
        Args: {
          _session_hash: string
          _token_hash: string
          _ttl_seconds: number
        }
        Returns: {
          buyer_email: string
          expires_at: string
          scopes: string[]
        }[]
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
      fulfill_summit_bundle: {
        Args: {
          _amount_cents: number
          _commas_payment_id: string
          _currency: string
          _email: string
          _first_touch: Json
          _full_name: string
          _last_touch: Json
          _phone: string
          _scopes: string[]
        }
        Returns: {
          already_existed: boolean
          registration_id: string
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
      reverse_summit_payment: {
        Args: { _commas_payment_id: string }
        Returns: {
          released_slot: number
          reversed_product: string
        }[]
      }
      revoke_resource_session: {
        Args: { _session_hash: string }
        Returns: boolean
      }
      session_active_scopes: {
        Args: { _session_hash: string }
        Returns: {
          buyer_email: string
          expires_at: string
          scopes: string[]
        }[]
      }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
