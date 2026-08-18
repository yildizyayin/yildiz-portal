export interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
  status: string;
  institution_id?: string;
  created_at: string;
  updated_at: string;
}

export interface Session {
  id: string;
  user_id: string;
  token: string;
  expires_at: string;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

export interface Publisher {
  id: string;
  name: string;
  short_name: string;
  logo_url?: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  sales_representative?: string;
  order_contact_info?: string;
  minimum_order: number;
  default_discount: number;
  payment_terms?: string;
  delivery_days: number;
  notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Season {
  id: string;
  name: string;
  year_start: number;
  year_end: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface GradeLevel {
  id: string;
  name: string;
  code: string;
  sort_order?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Exam {
  id: string;
  publisher_id: string;
  season_id: string;
  grade_level_id: string;
  name: string;
  code: string;
  list_price: number;
  purchase_price: number;
  default_sale_price: number;
  minimum_order: number;
  last_order_date?: string;
  estimated_ship_date?: string;
  application_start_date?: string;
  application_end_date?: string;
  description?: string;
  status: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Institution {
  id: string;
  erp_external_id?: string;
  name: string;
  code: string;
  type?: string;
  is_private?: boolean;
  province?: string;
  district?: string;
  phone?: string;
  email?: string;
  contact_person?: string;
  staff_id?: string;
  estimated_capacity?: number;
  is_active: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: string;
  institution_id: string;
  exam_id: string;
  season_id: string;
  grade_level_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  staff_id?: string;
  status: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface SalesOpportunity {
  id: string;
  institution_id: string;
  exam_id: string;
  staff_id: string;
  priority: string;
  status: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Delivery {
  id: string;
  order_id: string;
  quantity: number;
  delivery_method?: string;
  carrier?: string;
  tracking_number?: string;
  delivery_date?: string;
  delivered_by?: string;
  status: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  user_id?: string;
  action: string;
  resource_type: string;
  resource_id: string;
  old_value?: string;
  new_value?: string;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

export interface AuthRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  expires_at: string;
}

export enum Role {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  PERSONEL = 'PERSONEL',
  OPERASYON = 'OPERASYON',
  KURUM = 'KURUM',
}

export enum OrderStatus {
  TASLAK = 'TASLAK',
  SIPARIS_ALINDI = 'SIPARIS_ALINDI',
  ONAYLANDI = 'ONAYLANDI',
  YAYINEVINE_GECILECEK = 'YAYINEVINE_GECILECEK',
  YAYINEVINE_GECILDI = 'YAYINEVINE_GECILDI',
  URUN_BEKLENIYOR = 'URUN_BEKLENIYOR',
  URUN_GELDI = 'URUN_GELDI',
  SEVK_EDILECEK = 'SEVK_EDILECEK',
  TESLIM_EDILDI = 'TESLIM_EDILDI',
  IPTAL = 'IPTAL',
}

export enum DeliveryStatus {
  HAZIRLANIYOR = 'HAZIRLANIYOR',
  HAZIR = 'HAZIR',
  SEVK_EDILDI = 'SEVK_EDILDI',
  PERSONEL_TESLIM = 'PERSONEL_TESLIM',
  KARGO = 'KARGO',
  KURUMDAN_TESLIM = 'KURUMDAN_TESLIM',
  TESLIM_EDILDI = 'TESLIM_EDILDI',
}
