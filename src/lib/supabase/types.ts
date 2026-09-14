export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  __InternalSupabase: { PostgrestVersion: "14.5" }
  public: {
    Tables: {
      agent_configs: {
        Row: { agent_name: string; business_id: string; created_at: string; id: string; objectives: string[]; orbi_colors: Json; sample_responses: Json; tone_concise_detailed: number; tone_formal_informal: number; tone_reserved_energetic: number; suggested_questions: Json; curation_question: string | null; curation_options: Json; updated_at: string }
        Insert: { agent_name?: string; business_id: string; created_at?: string; id?: string; objectives?: string[]; orbi_colors?: Json; sample_responses?: Json; tone_concise_detailed?: number; tone_formal_informal?: number; tone_reserved_energetic?: number; suggested_questions?: Json; curation_question?: string | null; curation_options?: Json; updated_at?: string }
        Update: Partial<Database["public"]["Tables"]["agent_configs"]["Insert"]>
        Relationships: []
      }
      businesses: {
        Row: { about_business: string | null; address: string | null; contact_email: string | null; contact_phone: string | null; contact_site: string | null; contact_whatsapp: string | null; differentials: string | null; differentials_cards: Json; site_analysis: Json; policies: string | null; customer_classes: string[] | null; customer_ages: string[] | null; payment_methods: string[] | null; service_modes: string[] | null; site_type: string | null; story_photos: string[]; story_photo_format: string | null; vitrine_categories: string[]; vitrine_cover_url: string | null; vitrine_cover_urls: string[]; hero_question: string | null; brand_colors: Json; brand_personality: Json; brand_font: string | null; brand_voice_summary: string | null; created_at: string; id: string; instagram_handle: string | null; last_import_at: string | null; last_import_url: string | null; logo_url: string | null; logo_gallery: Json; hero_avatar: string | null; hero_gradient: Json; hero_style: string; catalog_title: string | null; catalog_subtitle: string | null; tour_completed_at: string | null; vitrine_intro_seen: boolean; orbi_trial_count: number; orbi_trial_last_at: string | null; share_image_url: string | null; share_description: string | null; name: string; onboarding_status: string; owner_id: string; slug: string; updated_at: string; website_url: string | null }
        Insert: { about_business?: string | null; address?: string | null; contact_email?: string | null; contact_phone?: string | null; contact_site?: string | null; contact_whatsapp?: string | null; differentials?: string | null; differentials_cards?: Json; site_analysis?: Json; policies?: string | null; customer_classes?: string[] | null; customer_ages?: string[] | null; payment_methods?: string[] | null; service_modes?: string[] | null; site_type?: string | null; story_photos?: string[]; story_photo_format?: string | null; vitrine_categories?: string[]; vitrine_cover_url?: string | null; vitrine_cover_urls?: string[]; hero_question?: string | null; brand_colors?: Json; brand_personality?: Json; brand_font?: string | null; brand_voice_summary?: string | null; created_at?: string; id?: string; instagram_handle?: string | null; last_import_at?: string | null; last_import_url?: string | null; logo_url?: string | null; logo_gallery?: Json; hero_avatar?: string | null; hero_gradient?: Json; hero_style?: string; catalog_title?: string | null; catalog_subtitle?: string | null; tour_completed_at?: string | null; vitrine_intro_seen?: boolean; orbi_trial_count?: number; orbi_trial_last_at?: string | null; share_image_url?: string | null; share_description?: string | null; name: string; onboarding_status?: string; owner_id: string; slug: string; updated_at?: string; website_url?: string | null }
        Update: Partial<Database["public"]["Tables"]["businesses"]["Insert"]>
        Relationships: []
      }
      campaigns: {
        Row: { ai_recommended_time: boolean; business_id: string; channel: string; content: string | null; created_at: string; id: string; performance: Json; recommended_content_id: string | null; scheduled_at: string | null; status: string; title: string; updated_at: string }
        Insert: { ai_recommended_time?: boolean; business_id: string; channel: string; content?: string | null; created_at?: string; id?: string; performance?: Json; recommended_content_id?: string | null; scheduled_at?: string | null; status?: string; title: string; updated_at?: string }
        Update: Partial<Database["public"]["Tables"]["campaigns"]["Insert"]>
        Relationships: []
      }
      content_items: { Row: { target_url: string | null; link_kind: string | null; ai_optimized: boolean; ai_score: number | null; box_color: string; footer_color: string | null; title_placement: string; box_style: string; starts_at: string | null; ends_at: string | null; brand_label: string | null; layout_size: string; business_id: string; created_at: string; description: string | null; gallery_urls: string[]; photo_format: string | null; id: string; image_is_placeholder: boolean; image_url: string | null; images: Json; position: number; price: number | null; price_type: string; price_max: number | null; source_url: string | null; status: string; title: string; type: string; updated_at: string }
        Insert: { target_url?: string | null; link_kind?: string | null; ai_optimized?: boolean; ai_score?: number | null; box_color?: string; footer_color?: string | null; title_placement?: string; box_style?: string; starts_at?: string | null; ends_at?: string | null; brand_label?: string | null; layout_size?: string; business_id: string; created_at?: string; description?: string | null; gallery_urls?: string[]; photo_format?: string | null; id?: string; image_is_placeholder?: boolean; image_url?: string | null; images?: Json; position?: number; price?: number | null; price_type?: string; price_max?: number | null; source_url?: string | null; status?: string; title: string; type: string; updated_at?: string }
        Update: Partial<Database["public"]["Tables"]["content_items"]["Insert"]>
        Relationships: []
      }
      click_events: { Row: { business_id: string; content_item_id: string | null; created_at: string; id: string; kind: string; target_url: string | null; visitor_session_id: string | null }; Insert: { business_id: string; content_item_id?: string | null; created_at?: string; id?: string; kind: string; target_url?: string | null; visitor_session_id?: string | null }; Update: Partial<Database["public"]["Tables"]["click_events"]["Insert"]>; Relationships: [] }
      conversations: {
        Row: { business_id: string; channel: string; ended_at: string | null; id: string; seen_by_owner: boolean; started_at: string; status: string; visitor_session_id: string | null }
        Insert: { business_id: string; channel?: string; ended_at?: string | null; id?: string; seen_by_owner?: boolean; started_at?: string; status?: string; visitor_session_id?: string | null }
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
        Row: { auto_arranged: boolean; box_type: string; business_id: string; config: Json; created_at: string; id: string; is_active: boolean; position: number; title: string | null; updated_at: string; starts_at: string | null; ends_at: string | null }
        Insert: { auto_arranged?: boolean; box_type: string; business_id: string; config?: Json; created_at?: string; id?: string; is_active?: boolean; position?: number; title?: string | null; updated_at?: string; starts_at?: string | null; ends_at?: string | null }
        Update: Partial<Database["public"]["Tables"]["smart_boxes"]["Insert"]>
        Relationships: []
      }
      plans: {
        Row: { id: string; name: string; description: string | null; monthly_price_cents: number; yearly_price_cents: number; stripe_product_id: string | null; stripe_price_id_monthly: string | null; stripe_price_id_yearly: string | null; max_businesses: number; has_ai_chat: boolean; has_vouchers: boolean; created_at: string; updated_at: string }
        Insert: { id: string; name: string; description?: string | null; monthly_price_cents: number; yearly_price_cents: number; stripe_product_id?: string | null; stripe_price_id_monthly?: string | null; stripe_price_id_yearly?: string | null; max_businesses?: number; has_ai_chat?: boolean; has_vouchers?: boolean; created_at?: string; updated_at?: string }
        Update: Partial<Database["public"]["Tables"]["plans"]["Insert"]>
        Relationships: []
      }
      subscriptions: {
        Row: { id: string; owner_id: string; plan_id: string; billing_cycle: string; status: string; stripe_customer_id: string | null; stripe_subscription_id: string | null; stripe_price_id: string | null; trial_ends_at: string | null; current_period_end: string | null; cancel_at_period_end: boolean; created_at: string; updated_at: string }
        Insert: { id?: string; owner_id: string; plan_id: string; billing_cycle?: string; status?: string; stripe_customer_id?: string | null; stripe_subscription_id?: string | null; stripe_price_id?: string | null; trial_ends_at?: string | null; current_period_end?: string | null; cancel_at_period_end?: boolean; created_at?: string; updated_at?: string }
        Update: Partial<Database["public"]["Tables"]["subscriptions"]["Insert"]>
        Relationships: []
      }
      vouchers: {
        Row: { id: string; business_id: string; title: string; description: string | null; discount_type: string; discount_value: number; quantity_total: number; quantity_claimed: number; expires_hours: number | null; is_active: boolean; image_url: string | null; badge: string | null; color: string; created_at: string; updated_at: string }
        Insert: { id?: string; business_id: string; title: string; description?: string | null; discount_type: string; discount_value: number; quantity_total: number; quantity_claimed?: number; expires_hours?: number | null; is_active?: boolean; image_url?: string | null; badge?: string | null; color?: string; created_at?: string; updated_at?: string }
        Update: Partial<Database["public"]["Tables"]["vouchers"]["Insert"]>
        Relationships: []
      }
      voucher_redemptions: {
        Row: { id: string; voucher_id: string; business_id: string; code: string; visitor_name: string | null; visitor_whatsapp: string | null; status: string; claimed_at: string; expires_at: string | null; redeemed_at: string | null; created_at: string }
        Insert: { id?: string; voucher_id: string; business_id: string; code: string; visitor_name?: string | null; visitor_whatsapp?: string | null; status?: string; claimed_at?: string; expires_at?: string | null; redeemed_at?: string | null; created_at?: string }
        Update: Partial<Database["public"]["Tables"]["voucher_redemptions"]["Insert"]>
        Relationships: []
      }
      business_admins: {
        Row: { id: string; business_id: string; email: string; user_id: string | null; role: string; invited_at: string; accepted_at: string | null }
        Insert: { id?: string; business_id: string; email: string; user_id?: string | null; role?: string; invited_at?: string; accepted_at?: string | null }
        Update: Partial<Database["public"]["Tables"]["business_admins"]["Insert"]>
        Relationships: []
      }
      affiliates: {
        Row: { id: string; name: string; email: string | null; phone: string | null; pix_key: string | null; code: string; panel_token: string; commission_rate: number; commission_months: number; active: boolean; notes: string | null; created_at: string; updated_at: string }
        Insert: { id?: string; name: string; email?: string | null; phone?: string | null; pix_key?: string | null; code: string; commission_rate?: number; commission_months?: number; active?: boolean; notes?: string | null; created_at?: string; updated_at?: string }
        Update: Partial<Database["public"]["Tables"]["affiliates"]["Insert"]>
        Relationships: []
      }
      affiliate_referrals: {
        Row: { id: string; affiliate_id: string; referred_user_id: string | null; status: string; subscribed_at: string | null; commission_until: string | null; stripe_subscription_id: string | null; created_at: string }
        Insert: { id?: string; affiliate_id: string; referred_user_id?: string | null; status?: string; subscribed_at?: string | null; commission_until?: string | null; stripe_subscription_id?: string | null; created_at?: string }
        Update: Partial<Database["public"]["Tables"]["affiliate_referrals"]["Insert"]>
        Relationships: []
      }
      affiliate_commissions: {
        Row: { id: string; affiliate_id: string; affiliate_referral_id: string | null; amount_cents: number; base_amount_cents: number; stripe_invoice_id: string | null; status: string; paid_at: string | null; created_at: string }
        Insert: { id?: string; affiliate_id: string; affiliate_referral_id?: string | null; amount_cents: number; base_amount_cents: number; stripe_invoice_id?: string | null; status?: string; paid_at?: string | null; created_at?: string }
        Update: Partial<Database["public"]["Tables"]["affiliate_commissions"]["Insert"]>
        Relationships: []
      }
      bonus_links: {
        Row: { id: string; code: string; label: string | null; kind: string; plan_id: string; max_uses: number | null; uses: number; expires_at: string | null; active: boolean; created_at: string }
        Insert: { id?: string; code: string; label?: string | null; kind: string; plan_id?: string; max_uses?: number | null; uses?: number; expires_at?: string | null; active?: boolean; created_at?: string }
        Update: Partial<Database["public"]["Tables"]["bonus_links"]["Insert"]>
        Relationships: []
      }
      bonus_redemptions: {
        Row: { id: string; bonus_link_id: string; user_id: string; granted_until: string | null; created_at: string }
        Insert: { id?: string; bonus_link_id: string; user_id: string; granted_until?: string | null; created_at?: string }
        Update: Partial<Database["public"]["Tables"]["bonus_redemptions"]["Insert"]>
        Relationships: []
      }
      inspire_theme_photos: {
        Row: { theme_id: string; photos: Json; title_style: string; updated_at: string; label: string | null; custom: boolean }
        Insert: { theme_id: string; photos?: Json; title_style?: string; updated_at?: string; label?: string | null; custom?: boolean }
        Update: Partial<Database["public"]["Tables"]["inspire_theme_photos"]["Insert"]>
        Relationships: []
      }
      visitor_sessions: {
        Row: { business_id: string; device: string | null; id: string; intent: string | null; last_seen_at: string; referrer: string | null; source: string | null; started_at: string }
        Insert: { business_id: string; device?: string | null; id?: string; intent?: string | null; last_seen_at?: string; referrer?: string | null; source?: string | null; started_at?: string }
        Update: Partial<Database["public"]["Tables"]["visitor_sessions"]["Insert"]>
        Relationships: []
      }
      referral_codes: {
        Row: { user_id: string; code: string; created_at: string }
        Insert: { user_id: string; code: string; created_at?: string }
        Update: Partial<Database["public"]["Tables"]["referral_codes"]["Insert"]>
        Relationships: []
      }
      notifications: {
        Row: { id: string; user_id: string; kind: string; title: string; body: string | null; celebrate: boolean; seen_at: string | null; created_at: string }
        Insert: { id?: string; user_id: string; kind: string; title: string; body?: string | null; celebrate?: boolean; seen_at?: string | null; created_at?: string }
        Update: Partial<Database["public"]["Tables"]["notifications"]["Insert"]>
        Relationships: []
      }
      ai_status: {
        Row: { id: number; sem_credito_desde: string | null; ultima_falha_em: string | null; updated_at: string }
        Insert: { id?: number; sem_credito_desde?: string | null; ultima_falha_em?: string | null; updated_at?: string }
        Update: Partial<Database["public"]["Tables"]["ai_status"]["Insert"]>
        Relationships: []
      }
      orbi_learnings: {
        Row: { id: string; business_id: string; pergunta: string; sugestao: string | null; status: string; vezes: number; created_at: string; updated_at: string }
        Insert: { id?: string; business_id: string; pergunta: string; sugestao?: string | null; status?: string; vezes?: number; created_at?: string; updated_at?: string }
        Update: Partial<Database["public"]["Tables"]["orbi_learnings"]["Insert"]>
        Relationships: []
      }
      referrals: {
        Row: { id: string; referrer_user_id: string; referred_user_id: string; code: string; status: string; subscribed_at: string | null; credit_after: string | null; credited_at: string | null; stripe_subscription_id: string | null; created_at: string; updated_at: string }
        Insert: { id?: string; referrer_user_id: string; referred_user_id: string; code: string; status?: string; subscribed_at?: string | null; credit_after?: string | null; credited_at?: string | null; stripe_subscription_id?: string | null; created_at?: string; updated_at?: string }
        Update: Partial<Database["public"]["Tables"]["referrals"]["Insert"]>
        Relationships: []
      }
    }
    Views: { [_ in never]: never }
    Functions: {
      get_or_create_referral_code: {
        Args: Record<string, never>
        Returns: string
      }
      register_referral: {
        Args: { p_code: string }
        Returns: undefined
      }
      referral_mark_subscribed: {
        Args: { p_user_id: string; p_stripe_subscription_id: string }
        Returns: undefined
      }
      process_referral_credits: {
        Args: Record<string, never>
        Returns: number
      }
      registrar_status_ia: {
        Args: { p_sem_credito: boolean }
        Returns: undefined
      }
      consumir_ia: {
        Args: { p_business_id: string; p_kind: string }
        Returns: { permitido: boolean; usado: number; limite: number; restante: number }
      }
      uso_ia: {
        Args: { p_business_id: string }
        Returns: { conteudo_usado: number; conteudo_limite: number; chat_usado: number; chat_limite: number }
      }
      business_progress: {
        Args: { p_business_id: string }
        Returns: Record<string, boolean>
      }
      is_super_admin: {
        Args: Record<string, never>
        Returns: boolean
      }
      master_list_businesses: {
        Args: Record<string, never>
        Returns: { business_id: string; name: string; slug: string; owner_id: string; owner_email: string; created_at: string; plan_id: string | null; sub_status: string | null; billing_cycle: string | null; trial_ends_at: string | null; active_boxes: number; content_items: number; total_visits: number; total_clicks: number; total_conversations: number; tour_completed: boolean }[]
      }
      master_metrics: {
        Args: Record<string, never>
        Returns: Record<string, number>
      }
      master_set_subscription: {
        Args: { p_owner_id: string; p_plan_id: string; p_status: string }
        Returns: undefined
      }
      owner_has_feature: {
        Args: { p_owner_id: string; p_feature: string }
        Returns: boolean
      }
      affiliate_panel_summary: {
        Args: { p_token: string }
        Returns: Json
      }
      affiliate_panel_sales: {
        Args: { p_token: string }
        Returns: { referral_id: string; plano: string; ciclo: string; status: string; comprou_em: string | null; comissao_ate: string | null; comissao_total_cents: number; cobrancas: number }[]
      }
      affiliate_panel_monthly: {
        Args: { p_token: string }
        Returns: { mes: string; total_cents: number; lancamentos: number }[]
      }
      register_affiliate_click: {
        Args: { p_code: string }
        Returns: undefined
      }
      register_affiliate_referral: {
        Args: { p_code: string }
        Returns: boolean
      }
      redeem_bonus_link: {
        Args: { p_code: string }
        Returns: Json
      }
      master_list_affiliates: {
        Args: Record<string, never>
        Returns: { id: string; name: string; email: string | null; phone: string | null; pix_key: string | null; code: string; panel_token: string; commission_rate: number; commission_months: number; active: boolean; indicados: number; assinantes: number; comissao_pendente_cents: number; comissao_paga_cents: number; created_at: string }[]
      }
      claim_voucher: {
        Args: { p_voucher_id: string; p_visitor_name: string | null; p_visitor_whatsapp: string | null }
        Returns: { code: string; expires_at: string | null; title: string; discount_type: string; discount_value: number }[]
      }
    }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}
