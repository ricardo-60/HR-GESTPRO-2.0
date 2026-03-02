
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
  EXPIRED = 'expired'
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
}

export interface UserProfile {
  id: string;
  tenant_id: string;
  role: UserRole;
  full_name?: string;
  email?: string;
}

export interface TenantStatusInfo {
  tenant_id: string;
  status: TenantStatus;
  company_name: string;
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
