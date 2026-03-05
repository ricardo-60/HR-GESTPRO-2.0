
export enum UserRole {
  MASTER = 'master_admin',
  ADMIN = 'tenant_admin',
  RH = 'hr_user',
  FINANCE = 'finance_user',
  SALES = 'sales_user'
}


export enum TenantStatus {
  TRIAL = 'trial',
  ACTIVE = 'active',
  EXPIRED = 'expired',
  SUSPENDED = 'suspended'
}

export interface Tenant {
  id: string;
  company_name: string;
  tax_id: string; // NIF/CNPJ
  status: TenantStatus;
  plan_tier: string;
  created_at?: string;
  logo_url?: string;
  contact_email?: string;
  address?: string;
  phone?: string;
  trial_start_date?: string;
  trial_end_date?: string;
  bank_name?: string;
  bank_account?: string;
  bank_iban?: string;
  tax_regime?: 'Exclusion' | 'General';
  vat_number?: string;
  allow_negative_stock?: boolean;
}

export interface Product {
  id: string;
  tenant_id: string;
  sku?: string;
  name: string;
  description?: string;
  unit_price: number;
  cost_price: number;
  average_cost: number;
  stock_current: number;
  stock_min: number;
  stock_max: number;
  is_active: boolean;
  is_exempt: boolean;
  exemption_reason?: string;
  created_at?: string;
  updated_at?: string;
}

export interface InventoryLog {
  id: string;
  tenant_id: string;
  product_id: string;
  quantity: number;
  type: 'IN' | 'OUT';
  reason: string;
  operator_id?: string;
  cost_at_time?: number;
  created_at?: string;
}

export interface UserProfile {
  id: string;
  tenant_id: string;
  role: UserRole;
  full_name?: string;
  email?: string;
  can_close_sales?: boolean;
}

export interface TenantStatusInfo {
  tenant_id: string;
  status: TenantStatus;
  company_name: string;
  trial_end_date?: string;
  tax_regime?: 'Exclusion' | 'General';
  allow_negative_stock?: boolean;
}

export interface AuthContextType {
  user: any | null;
  profile: UserProfile | null;
  role: UserRole | null;
  tenantId: string | null;
  tenantStatus: TenantStatusInfo | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

export interface Supplier {
  id: string;
  tenant_id: string;
  name: string;
  nif?: string;
  address?: string;
  phone?: string;
  email?: string;
  created_at?: string;
}

export interface PurchaseOrder {
  id: string;
  tenant_id: string;
  supplier_id: string;
  order_no: string;
  purchase_date: string;
  status: 'draft' | 'finalized';
  total_amount: number;
  notes?: string;
  created_at?: string;
}

export interface PurchaseItem {
  id: string;
  purchase_order_id: string;
  product_id: string;
  quantity: number;
  cost_price: number;
  total: number;
}

export interface AccountPayable {
  id: string;
  tenant_id: string;
  purchase_order_id?: string;
  supplier_id: string;
  description: string;
  amount: number;
  due_date: string;
  status: 'pending' | 'paid' | 'overdue';
  paid_at?: string;
}
