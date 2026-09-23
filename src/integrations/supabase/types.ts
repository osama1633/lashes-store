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
      abandoned_carts: {
        Row: {
          created_at: string
          customer_id: string | null
          email: string | null
          id: string
          items: Json
          phone: string | null
          recovered_at: string | null
          total: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id?: string | null
          email?: string | null
          id?: string
          items?: Json
          phone?: string | null
          recovered_at?: string | null
          total?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string | null
          email?: string | null
          id?: string
          items?: Json
          phone?: string | null
          recovered_at?: string | null
          total?: number
          updated_at?: string
        }
        Relationships: []
      }
      app_connections: {
        Row: {
          app_key: string
          app_name: string
          connected_at: string | null
          connected_by: string | null
          created_at: string
          id: string
          settings: Json
          status: string
          updated_at: string
        }
        Insert: {
          app_key: string
          app_name: string
          connected_at?: string | null
          connected_by?: string | null
          created_at?: string
          id?: string
          settings?: Json
          status?: string
          updated_at?: string
        }
        Update: {
          app_key?: string
          app_name?: string
          connected_at?: string | null
          connected_by?: string | null
          created_at?: string
          id?: string
          settings?: Json
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          id: string
          image_url: string | null
          is_active: boolean
          name_ar: string
          name_en: string | null
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          name_ar: string
          name_en?: string | null
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          name_ar?: string
          name_en?: string | null
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      content_pages: {
        Row: {
          category: string
          content_ar: string
          created_at: string
          id: string
          is_published: boolean
          seo_description: string | null
          seo_title: string | null
          seo_url: string | null
          slug: string
          sort_order: number
          title_ar: string
          updated_at: string
        }
        Insert: {
          category?: string
          content_ar?: string
          created_at?: string
          id?: string
          is_published?: boolean
          seo_description?: string | null
          seo_title?: string | null
          seo_url?: string | null
          slug: string
          sort_order?: number
          title_ar: string
          updated_at?: string
        }
        Update: {
          category?: string
          content_ar?: string
          created_at?: string
          id?: string
          is_published?: boolean
          seo_description?: string | null
          seo_title?: string | null
          seo_url?: string | null
          slug?: string
          sort_order?: number
          title_ar?: string
          updated_at?: string
        }
        Relationships: []
      }
      coupons: {
        Row: {
          code: string
          created_at: string
          discount_type: Database["public"]["Enums"]["discount_type"]
          discount_value: number
          ends_at: string | null
          id: string
          is_active: boolean
          minimum_order: number
          starts_at: string | null
          updated_at: string
          usage_count: number
          usage_limit: number | null
        }
        Insert: {
          code: string
          created_at?: string
          discount_type: Database["public"]["Enums"]["discount_type"]
          discount_value: number
          ends_at?: string | null
          id?: string
          is_active?: boolean
          minimum_order?: number
          starts_at?: string | null
          updated_at?: string
          usage_count?: number
          usage_limit?: number | null
        }
        Update: {
          code?: string
          created_at?: string
          discount_type?: Database["public"]["Enums"]["discount_type"]
          discount_value?: number
          ends_at?: string | null
          id?: string
          is_active?: boolean
          minimum_order?: number
          starts_at?: string | null
          updated_at?: string
          usage_count?: number
          usage_limit?: number | null
        }
        Relationships: []
      }
      customer_campaigns: {
        Row: {
          audience: Json
          content: string
          created_at: string
          id: string
          name: string
          scheduled_at: string | null
          sent_at: string | null
          status: string
          subject: string
          updated_at: string
        }
        Insert: {
          audience?: Json
          content: string
          created_at?: string
          id?: string
          name: string
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string
          subject: string
          updated_at?: string
        }
        Update: {
          audience?: Json
          content?: string
          created_at?: string
          id?: string
          name?: string
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string
          subject?: string
          updated_at?: string
        }
        Relationships: []
      }
      customer_groups: {
        Row: {
          color: string
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      influencer_collaborations: {
        Row: {
          budget: number
          created_at: string
          created_by: string
          handle: string | null
          id: string
          influencer_name: string
          notes: string | null
          platform: string
          status: string
          updated_at: string
        }
        Insert: {
          budget?: number
          created_at?: string
          created_by: string
          handle?: string | null
          id?: string
          influencer_name: string
          notes?: string | null
          platform: string
          status?: string
          updated_at?: string
        }
        Update: {
          budget?: number
          created_at?: string
          created_by?: string
          handle?: string | null
          id?: string
          influencer_name?: string
          notes?: string | null
          platform?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      merchant_service_requests: {
        Row: {
          created_at: string
          created_by: string
          id: string
          notes: string | null
          service_key: string
          service_name: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          notes?: string | null
          service_key: string
          service_name: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          notes?: string | null
          service_key?: string
          service_name?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          line_total: number
          order_id: string
          product_id: string | null
          product_name: string
          quantity: number
          sku: string
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          line_total: number
          order_id: string
          product_id?: string | null
          product_name: string
          quantity: number
          sku: string
          unit_price: number
        }
        Update: {
          created_at?: string
          id?: string
          line_total?: number
          order_id?: string
          product_id?: string | null
          product_name?: string
          quantity?: number
          sku?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          coupon_id: string | null
          created_at: string
          customer_email: string | null
          customer_id: string | null
          customer_name: string
          customer_phone: string
          discount_amount: number
          id: string
          notes: string | null
          order_number: string
          payment_method: string
          payment_status: Database["public"]["Enums"]["payment_status"]
          shipping_address: Json
          shipping_amount: number
          shipping_method: string
          status: Database["public"]["Enums"]["order_status"]
          subtotal: number
          tax_amount: number
          total: number
          updated_at: string
        }
        Insert: {
          coupon_id?: string | null
          created_at?: string
          customer_email?: string | null
          customer_id?: string | null
          customer_name: string
          customer_phone: string
          discount_amount?: number
          id?: string
          notes?: string | null
          order_number: string
          payment_method: string
          payment_status?: Database["public"]["Enums"]["payment_status"]
          shipping_address?: Json
          shipping_amount?: number
          shipping_method: string
          status?: Database["public"]["Enums"]["order_status"]
          subtotal: number
          tax_amount?: number
          total: number
          updated_at?: string
        }
        Update: {
          coupon_id?: string | null
          created_at?: string
          customer_email?: string | null
          customer_id?: string | null
          customer_name?: string
          customer_phone?: string
          discount_amount?: number
          id?: string
          notes?: string | null
          order_number?: string
          payment_method?: string
          payment_status?: Database["public"]["Enums"]["payment_status"]
          shipping_address?: Json
          shipping_amount?: number
          shipping_method?: string
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          tax_amount?: number
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_methods: {
        Row: {
          code: string
          created_at: string
          id: string
          is_active: boolean
          name_ar: string
          settings: Json
          sort_order: number
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          name_ar: string
          settings?: Json
          sort_order?: number
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name_ar?: string
          settings?: Json
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      product_images: {
        Row: {
          alt_text: string | null
          created_at: string
          id: string
          image_url: string
          product_id: string
          sort_order: number
        }
        Insert: {
          alt_text?: string | null
          created_at?: string
          id?: string
          image_url: string
          product_id: string
          sort_order?: number
        }
        Update: {
          alt_text?: string | null
          created_at?: string
          id?: string
          image_url?: string
          product_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category_id: string | null
          created_at: string
          description_ar: string
          description_en: string | null
          id: string
          is_active: boolean
          is_bestseller: boolean
          is_featured: boolean
          low_stock_threshold: number
          name_ar: string
          name_en: string | null
          regular_price: number
          sale_price: number | null
          sku: string
          slug: string
          specifications: Json
          stock: number
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          description_ar?: string
          description_en?: string | null
          id?: string
          is_active?: boolean
          is_bestseller?: boolean
          is_featured?: boolean
          low_stock_threshold?: number
          name_ar: string
          name_en?: string | null
          regular_price: number
          sale_price?: number | null
          sku: string
          slug: string
          specifications?: Json
          stock?: number
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          description_ar?: string
          description_en?: string | null
          id?: string
          is_active?: boolean
          is_bestseller?: boolean
          is_featured?: boolean
          low_stock_threshold?: number
          name_ar?: string
          name_en?: string | null
          regular_price?: number
          sale_price?: number | null
          sku?: string
          slug?: string
          specifications?: Json
          stock?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: Json
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          last_order_at: string | null
          notes: string | null
          orders_count: number
          phone: string | null
          status: string
          total_spent: number
          updated_at: string
        }
        Insert: {
          address?: Json
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          last_order_at?: string | null
          notes?: string | null
          orders_count?: number
          phone?: string | null
          status?: string
          total_spent?: number
          updated_at?: string
        }
        Update: {
          address?: Json
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          last_order_at?: string | null
          notes?: string | null
          orders_count?: number
          phone?: string | null
          status?: string
          total_spent?: number
          updated_at?: string
        }
        Relationships: []
      }
      promo_banners: {
        Row: {
          created_at: string
          ends_at: string | null
          id: string
          image_url: string | null
          is_active: boolean
          link_url: string | null
          position: string
          sort_order: number
          starts_at: string | null
          subtitle_ar: string | null
          title_ar: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          ends_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          link_url?: string | null
          position?: string
          sort_order?: number
          starts_at?: string | null
          subtitle_ar?: string | null
          title_ar: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          ends_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          link_url?: string | null
          position?: string
          sort_order?: number
          starts_at?: string | null
          subtitle_ar?: string | null
          title_ar?: string
          updated_at?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          admin_reply: string | null
          body: string
          created_at: string
          customer_id: string | null
          customer_name: string
          id: string
          product_id: string
          rating: number
          status: Database["public"]["Enums"]["review_status"]
          updated_at: string
        }
        Insert: {
          admin_reply?: string | null
          body: string
          created_at?: string
          customer_id?: string | null
          customer_name: string
          id?: string
          product_id: string
          rating: number
          status?: Database["public"]["Enums"]["review_status"]
          updated_at?: string
        }
        Update: {
          admin_reply?: string | null
          body?: string
          created_at?: string
          customer_id?: string | null
          customer_name?: string
          id?: string
          product_id?: string
          rating?: number
          status?: Database["public"]["Enums"]["review_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      shipping_methods: {
        Row: {
          company: string | null
          created_at: string
          estimated_days_max: number
          estimated_days_min: number
          free_shipping_threshold: number | null
          id: string
          is_active: boolean
          name_ar: string
          price: number
          regions: Json
          updated_at: string
        }
        Insert: {
          company?: string | null
          created_at?: string
          estimated_days_max?: number
          estimated_days_min?: number
          free_shipping_threshold?: number | null
          id?: string
          is_active?: boolean
          name_ar: string
          price?: number
          regions?: Json
          updated_at?: string
        }
        Update: {
          company?: string | null
          created_at?: string
          estimated_days_max?: number
          estimated_days_min?: number
          free_shipping_threshold?: number | null
          id?: string
          is_active?: boolean
          name_ar?: string
          price?: number
          regions?: Json
          updated_at?: string
        }
        Relationships: []
      }
      staff_phones: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string | null
          phone: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string | null
          phone: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string | null
          phone?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Relationships: []
      }
      store_settings: {
        Row: {
          currency: string
          email: string | null
          id: boolean
          logo_url: string | null
          phone: string | null
          policies: Json
          shipping_settings: Json
          social_links: Json
          store_name: string
          updated_at: string
          vat_rate: number
          whatsapp: string | null
        }
        Insert: {
          currency?: string
          email?: string | null
          id?: boolean
          logo_url?: string | null
          phone?: string | null
          policies?: Json
          shipping_settings?: Json
          social_links?: Json
          store_name?: string
          updated_at?: string
          vat_rate?: number
          whatsapp?: string | null
        }
        Update: {
          currency?: string
          email?: string | null
          id?: boolean
          logo_url?: string | null
          phone?: string | null
          policies?: Json
          shipping_settings?: Json
          social_links?: Json
          store_name?: string
          updated_at?: string
          vat_rate?: number
          whatsapp?: string | null
        }
        Relationships: []
      }
      storefront_drafts: {
        Row: {
          content: Json
          id: boolean
          updated_at: string
        }
        Insert: {
          content?: Json
          id?: boolean
          updated_at?: string
        }
        Update: {
          content?: Json
          id?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      storefront_published: {
        Row: {
          content: Json
          id: boolean
          updated_at: string
        }
        Insert: {
          content?: Json
          id?: boolean
          updated_at?: string
        }
        Update: {
          content?: Json
          id?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
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
      claim_staff_access: { Args: never; Returns: boolean }
      claim_store_admin: { Args: never; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      place_store_order: {
        Args: {
          _coupon_code: string
          _customer_email: string
          _customer_name: string
          _customer_phone: string
          _items: Json
          _notes: string
          _order_number: string
          _payment_code: string
          _shipping_address: Json
          _shipping_method_id: string
        }
        Returns: Json
      }
      publish_storefront_draft: { Args: never; Returns: undefined }
      set_storefront_draft: { Args: { next_draft: Json }; Returns: undefined }
    }
    Enums: {
      app_role: "admin" | "customer" | "staff"
      discount_type: "percentage" | "fixed"
      order_status:
        | "new"
        | "processing"
        | "shipped"
        | "delivered"
        | "cancelled"
        | "refunded"
      payment_status: "pending" | "paid" | "failed" | "refunded"
      review_status: "pending" | "approved" | "rejected"
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
    Enums: {
      app_role: ["admin", "customer", "staff"],
      discount_type: ["percentage", "fixed"],
      order_status: [
        "new",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
        "refunded",
      ],
      payment_status: ["pending", "paid", "failed", "refunded"],
      review_status: ["pending", "approved", "rejected"],
    },
  },
} as const
