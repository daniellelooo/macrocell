// AUTO-GENERATED — regenerar con MCP Supabase generate_typescript_types.
// No editar a mano.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  __InternalSupabase: { PostgrestVersion: "14.5" };
  public: {
    Tables: {
      customer_addresses: {
        Row: {
          address: string;
          city: string;
          created_at: string;
          department: string;
          full_name: string;
          id: string;
          is_default: boolean;
          label: string | null;
          notes: string | null;
          phone: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          address: string;
          city: string;
          created_at?: string;
          department: string;
          full_name: string;
          id?: string;
          is_default?: boolean;
          label?: string | null;
          notes?: string | null;
          phone: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          address?: string;
          city?: string;
          created_at?: string;
          department?: string;
          full_name?: string;
          id?: string;
          is_default?: boolean;
          label?: string | null;
          notes?: string | null;
          phone?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      order_items: {
        Row: {
          created_at: string;
          id: string;
          image_url: string | null;
          order_id: string;
          product_id: string | null;
          product_name: string;
          quantity: number;
          unit_price_cop: number;
          variant_label: string | null;
          variant_sku: string | null;
        };
        Insert: {
          created_at?: string;
          id?: string;
          image_url?: string | null;
          order_id: string;
          product_id?: string | null;
          product_name: string;
          quantity: number;
          unit_price_cop: number;
          variant_label?: string | null;
          variant_sku?: string | null;
        };
        Update: {
          created_at?: string;
          id?: string;
          image_url?: string | null;
          order_id?: string;
          product_id?: string | null;
          product_name?: string;
          quantity?: number;
          unit_price_cop?: number;
          variant_label?: string | null;
          variant_sku?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
        ];
      };
      orders: {
        Row: {
          created_at: string;
          customer_email: string | null;
          customer_name: string;
          customer_phone: string;
          id: string;
          notes: string | null;
          order_number: string;
          payment_method: string | null;
          payment_method_type: string | null;
          payment_paid_at: string | null;
          payment_provider: string | null;
          payment_reference: string | null;
          payment_status: string | null;
          payment_transaction_id: string | null;
          seller_id: string | null;
          shipping_address: string | null;
          shipping_city: string | null;
          shipping_cop: number;
          shipping_department: string | null;
          status: string;
          subtotal_cop: number;
          total_cop: number;
          updated_at: string;
          user_id: string | null;
          whatsapp_sent: boolean;
        };
        Insert: {
          created_at?: string;
          customer_email?: string | null;
          customer_name: string;
          customer_phone: string;
          id?: string;
          notes?: string | null;
          order_number?: string;
          payment_method?: string | null;
          payment_method_type?: string | null;
          payment_paid_at?: string | null;
          payment_provider?: string | null;
          payment_reference?: string | null;
          payment_status?: string | null;
          payment_transaction_id?: string | null;
          seller_id?: string | null;
          shipping_address?: string | null;
          shipping_city?: string | null;
          shipping_cop?: number;
          shipping_department?: string | null;
          status?: string;
          subtotal_cop: number;
          total_cop: number;
          updated_at?: string;
          user_id?: string | null;
          whatsapp_sent?: boolean;
        };
        Update: {
          created_at?: string;
          customer_email?: string | null;
          customer_name?: string;
          customer_phone?: string;
          id?: string;
          notes?: string | null;
          order_number?: string;
          payment_method?: string | null;
          payment_method_type?: string | null;
          payment_paid_at?: string | null;
          payment_provider?: string | null;
          payment_reference?: string | null;
          payment_status?: string | null;
          payment_transaction_id?: string | null;
          seller_id?: string | null;
          shipping_address?: string | null;
          shipping_city?: string | null;
          shipping_cop?: number;
          shipping_department?: string | null;
          status?: string;
          subtotal_cop?: number;
          total_cop?: number;
          updated_at?: string;
          user_id?: string | null;
          whatsapp_sent?: boolean;
        };
        Relationships: [];
      };
      product_images: {
        Row: {
          alt: string | null;
          color: string | null;
          created_at: string;
          id: string;
          position: number;
          product_id: string;
          sort_order: number;
          url: string;
        };
        Insert: {
          alt?: string | null;
          color?: string | null;
          created_at?: string;
          id?: string;
          position?: number;
          product_id: string;
          sort_order?: number;
          url: string;
        };
        Update: {
          alt?: string | null;
          color?: string | null;
          created_at?: string;
          id?: string;
          position?: number;
          product_id?: string;
          sort_order?: number;
          url?: string;
        };
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      products: {
        Row: {
          badge: string | null;
          brand: string;
          category: string;
          colors: Json;
          created_at: string;
          description: string;
          family: string | null;
          features: Json;
          id: string;
          image: string;
          is_active: boolean;
          is_featured: boolean;
          is_new: boolean;
          name: string;
          short_description: string;
          slug: string;
          sort_order: number;
          updated_at: string;
        };
        Insert: {
          badge?: string | null;
          brand?: string;
          category: string;
          colors?: Json;
          created_at?: string;
          description?: string;
          family?: string | null;
          features?: Json;
          id: string;
          image?: string;
          is_active?: boolean;
          is_featured?: boolean;
          is_new?: boolean;
          name: string;
          short_description?: string;
          slug: string;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          badge?: string | null;
          brand?: string;
          category?: string;
          colors?: Json;
          created_at?: string;
          description?: string;
          family?: string | null;
          features?: Json;
          id?: string;
          image?: string;
          is_active?: boolean;
          is_featured?: boolean;
          is_new?: boolean;
          name?: string;
          short_description?: string;
          slug?: string;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          created_at: string;
          full_name: string | null;
          id: string;
          is_admin: boolean;
          phone: string | null;
          role: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          full_name?: string | null;
          id: string;
          is_admin?: boolean;
          phone?: string | null;
          role?: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          full_name?: string | null;
          id?: string;
          is_admin?: boolean;
          phone?: string | null;
          role?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      sedes: {
        Row: {
          area: string;
          created_at: string;
          detail: string;
          id: string;
          name: string;
          sort_order: number;
          updated_at: string;
        };
        Insert: {
          area?: string;
          created_at?: string;
          detail?: string;
          id: string;
          name: string;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          area?: string;
          created_at?: string;
          detail?: string;
          id?: string;
          name?: string;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      seller_targets: {
        Row: {
          created_at: string;
          created_by: string | null;
          id: string;
          period_month: number;
          period_year: number;
          seller_id: string;
          target_cop: number;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          period_month: number;
          period_year: number;
          seller_id: string;
          target_cop: number;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          period_month?: number;
          period_year?: number;
          seller_id?: string;
          target_cop?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      site_config: {
        Row: { key: string; updated_at: string; value: Json };
        Insert: { key: string; updated_at?: string; value: Json };
        Update: { key?: string; updated_at?: string; value?: Json };
        Relationships: [];
      };
      variants: {
        Row: {
          battery_health: number | null;
          color: string | null;
          commission_pct: number | null;
          compare_price_cop: number | null;
          condition: string;
          condition_details: string | null;
          created_at: string;
          in_stock: boolean;
          is_active: boolean;
          notes: string | null;
          price_cop: number;
          product_id: string;
          ram: string | null;
          size: string | null;
          sku: string;
          sort_order: number;
          stock_quantity: number;
          storage: string | null;
          updated_at: string;
        };
        Insert: {
          battery_health?: number | null;
          color?: string | null;
          commission_pct?: number | null;
          compare_price_cop?: number | null;
          condition: string;
          condition_details?: string | null;
          created_at?: string;
          in_stock?: boolean;
          is_active?: boolean;
          notes?: string | null;
          price_cop: number;
          product_id: string;
          ram?: string | null;
          size?: string | null;
          sku: string;
          sort_order?: number;
          stock_quantity?: number;
          storage?: string | null;
          updated_at?: string;
        };
        Update: {
          battery_health?: number | null;
          color?: string | null;
          commission_pct?: number | null;
          compare_price_cop?: number | null;
          condition?: string;
          condition_details?: string | null;
          created_at?: string;
          in_stock?: boolean;
          is_active?: boolean;
          notes?: string | null;
          price_cop?: number;
          product_id?: string;
          ram?: string | null;
          size?: string | null;
          sku?: string;
          sort_order?: number;
          stock_quantity?: number;
          storage?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "variants_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      wishlists: {
        Row: { added_at: string; product_slug: string; user_id: string };
        Insert: { added_at?: string; product_slug: string; user_id: string };
        Update: { added_at?: string; product_slug?: string; user_id?: string };
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      apply_payment_event: {
        Args: {
          p_method_type: string;
          p_paid_at: string;
          p_payment_status: string;
          p_provider?: string;
          p_reference: string;
          p_transaction_id: string;
        };
        Returns: {
          new_status: string;
          order_id: string;
          order_number: string;
          prev_status: string;
        }[];
      };
      cancel_stale_pending_orders: {
        Args: { p_minutes?: number };
        Returns: number;
      };
      create_order_with_items: {
        Args: {
          p_customer_email?: string | null;
          p_customer_name?: string | null;
          p_customer_phone?: string | null;
          p_items?: Json;
          p_notes?: string | null;
          p_payment_method?: string | null;
          p_shipping_address?: string | null;
          p_shipping_city?: string | null;
          p_shipping_cop?: number | null;
          p_shipping_department?: string | null;
          p_subtotal_cop?: number | null;
          p_total_cop?: number | null;
          p_user_id?: string | null;
        };
        Returns: Json;
      };
      is_current_user_admin: { Args: never; Returns: boolean };
      is_current_user_inventory_manager: { Args: never; Returns: boolean };
      is_current_user_staff: { Args: never; Returns: boolean };
      lookup_order: {
        Args: { p_order_number: string; p_phone: string };
        Returns: Json;
      };
      register_local_sale: {
        Args: {
          p_notes?: string;
          p_payment_method_type?: string;
          p_qty: number;
          p_sku: string;
        };
        Returns: string;
      };
      register_local_sale_v2: {
        Args: {
          p_customer_name?: string;
          p_customer_phone?: string;
          p_items: Json;
          p_notes?: string;
          p_payment_method_type?: string;
        };
        Returns: Json;
      };
      set_variant_stock: {
        Args: { p_qty: number; p_sku: string };
        Returns: undefined;
      };
      undo_local_sale: { Args: { p_order_id: string }; Returns: undefined };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
