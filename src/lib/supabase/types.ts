export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  __InternalSupabase: { PostgrestVersion: "14.5" }
  public: {
    Tables: {
      agent_configs: {
        Row: { agent_name: string; business_id: string; created_at: string; id: string; objectives: string[]; sample_responses: Json; tone_concise_detailed: number; tone_formal_informal: number; tone_reserved_energetic: number; updated_at: string }
        Insert: { agent_name?: string; business_id: string; created_at?: string; id?: string; objectives?: string[]; sample_responses?: Json; tone_concise_detailed?: number; tone_formal_informal?: number; tone_reserved_energetic?: number; updated_at?: string }
        Update: Partial<Database["public"]["Tables"]["agent_configs"]["Insert"]>
        Relationships: []
      }
      businesses: {
        Row: { about_business: string | null; contact_email: string | null; contact_phone: string | null; contact_site: string | null; contact_whatsapp: string | null; differentials: string | null; policies: string | null; site_type: string | null; brand_colors: Json; brand_personality: Json; brand_font: string | null; brand_voice_summary: string | null; created_at: string; id: string; instagram_handle: string | null; last_import_at: string | null; last_import_url: string | null; logo_url: string | null; name: string; onboarding_status: string; owner_id: string; slug: string; updated_at: string; website_url: string | null }
        Insert: { about_business?: string | null; contact_email?: string | null; contact_phone?: string | null; contact_site?: string | null; contact_whatsapp?: string | null; differentials?: string | null; policies?: string | null; site_type?: string | null; brand_colors?: Json; brand_personality?: Json; brand_font?: string | null; brand_voice_summary?: string | null; created_at?: string; id?: string; instagram_handle?: string | null; last_import_at?: string | null; last_import_url?: string | null; logo_url?: string | null; name: string; onboarding_status?: string; owner_id: string; slug: string; updated_at?: string; website_url?: string | null }
        Update: Partial<Database["public"]["Tables"]["businesses"]["Insert"]>
        Relationships: []
      }
      campaigns: {
        Row: { ai_recommended_time: boolean; business_id: string; channel: string; content: string | null; created_at: string; id: string; performance: Json; recommended_content_id: string | null; scheduled_at: string | null; status: string; title: string; updated_at: string }
        Insert: { ai_recommended_time?: boolean; business_id: string; channel: string; content?: string | null; created_at?: string; id?: string; performance?: Json; recommended_content_id?: string | null; scheduled_at?: string | null; status?: string; title: string; updated_at?: string }
        Update: Partial<Database["public"]["Tables"]["campaigns"]["Insert"]>
        Relationships: []
      }
      content_items: {
        Row: { target_url: string | null; link_kind: string | null; ai_optimized: boolean; ai_score: number | null; box_color: string; box_style: string; brand_label: string | null; layout_size: string; business_id: string; created_at: string; description: string | null; id: string; image_is_placeholder: boolean; image_url: string | null; images: Json; position: number; price: number | null; source_url: string | null; status: string; title: string; type: string; updated_at: string }
        Insert: { target_url?: string | null; link_kind?: string | null; ai_optimized?: boolean; ai_score?: number | null; box_color?: string; box_style?: string; brand_label?: string | null; layout_size?: string; business_id: string; created_at?: string; description?: string | null; id?: string; image_is_placeholder?: boolean; image_url?: string | null; images?: Json; position?: number; price?: number | null; source_url?: string | null; status?: string; title: string; type: string; updated_at?: string }
        Update: Partial<Database["public"]["Tables"]["content_items"]["Insert"]>
        Relationships: []
      }
      click_events: { Row: { business_id: string; content_item_id: string | null; created_at: string; id: string; kind: string; target_url: string | null; visitor_session_id: string | null }; Insert: { business_id: string; content_item_id?: string | null; created_at?: string; id?: string; kind: string; target_url?: string | null; visitor_session_id?: string | null }; Update: Partial<Database["public"]["Tables"]["click_events"]["Insert"]>; Relationships: [] }
      conversations: {
        Row: { business_id: string; channel: string; ended_at: string | null; id: string; started_at: string; status: string; visitor_session_id: string | null }
        Insert: { business_id: string; channel?: string; ended_at?: string | null; id?: string; started_at?: string; status?: string; visitor_session_id?: string | null }
        Update: Partial<Database["public"]["Tables"]["conversations"]["Insert"]>
        Relationships: []
      }
      messages: {
        Row: { content: string; conversation_id: string; created_at: string; id: string; role: string }
        Insert: { content: string; conversation_id: string; created_at?: string; id?: string; role: string }
        Update: Partial<Database["public"]["Tables"]["messages"]["Insert"]>
        Relationships: []
      }
      opportunities: {
        Row: { business_id: string; category: string | null; created_at: string; description: string | null; id: string; impact_score: number | null; related_content_id: string | null; status: string; title: string }
        Insert: { business_id: string; category?: string | null; created_at?: string; description?: string | null; id?: string; impact_score?: number | null; related_content_id?: string | null; status?: string; title: string }
        Update: Partial<Database["public"]["Tables"]["opportunities"]["Insert"]>
        Relationships: []
      }
      profiles: {
        Row: { avatar_url: string | null; created_at: string; email: string; full_name: string | null; id: string; updated_at: string }
        Insert: { avatar_url?: string | null; created_at?: string; email: string; full_name?: string | null; id: string; updated_at?: string }
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>
        Relationships: []
      }
      pulse_metrics: {
        Row: { business_id: string; conversion_score: number | null; created_at: string; discovery_score: number | null; id: string; interest_score: number | null; metric_date: string; overall_score: number | null; relationship_score: number | null }
        Insert: { business_id: string; conversion_score?: number | null; created_at?: string; discovery_score?: number | null; id?: string; interest_score?: number | null; metric_date?: string; overall_score?: number | null; relationship_score?: number | null }
        Update: Partial<Database["public"]["Tables"]["pulse_metrics"]["Insert"]>
        Relationships: []
      }
      smart_boxes: {
        Row: { auto_arranged: boolean; box_type: string; business_id: string; config: Json; created_at: string; id: string; is_active: boolean; position: number; title: string | null; updated_at: string }
        Insert: { auto_arranged?: boolean; box_type: string; business_id: string; config?: Json; created_at?: string; id?: string; is_active?: boolean; position?: number; title?: string | null; updated_at?: string }
        Update: Partial<Database["public"]["Tables"]["smart_boxes"]["Insert"]>
        Relationships: []
      }
      visitor_sessions: {
        Row: { business_id: string; device: string | null; id: string; intent: string | null; last_seen_at: string; referrer: string | null; source: string | null; started_at: string }
        Insert: { business_id: string; device?: string | null; id?: string; intent?: string | null; last_seen_at?: string; referrer?: string | null; source?: string | null; started_at?: string }
        Update: Partial<Database["public"]["Tables"]["visitor_sessions"]["Insert"]>
        Relationships: []
      }
    }
    Views: { [_ in never]: never }
    Functions: { [_ in never]: never }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}
