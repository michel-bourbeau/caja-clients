// Contact management types

export interface Contact {
  id: string;
  tenant_id: string;
  
  // Basic information
  full_name: string;
  email?: string;
  phone_number?: string;
  whatsapp_number?: string;
  company_name?: string;
  
  // Address
  address?: string;
  city?: string;
  country?: string;
  postal_code?: string;
  
  // Additional
  position?: string;
  notes?: string;
  
  // Media
  photo_url?: string;
  google_maps_link?: string;
  whatsapp_conversation_url?: string;
  whatsapp_conversation_filename?: string;
  
  // Metadata
  created_at: string;
  updated_at: string;
  created_by?: string;
  is_active: boolean;
}

export interface CreateContactInput {
  full_name: string;
  email?: string;
  phone_number?: string;
  whatsapp_number?: string;
  company_name?: string;
  address?: string;
  city?: string;
  country?: string;
  postal_code?: string;
  position?: string;
  notes?: string;
  google_maps_link?: string;
  photo_url?: string;
}

export interface UpdateContactInput extends Partial<CreateContactInput> {
  is_active?: boolean;
}

export interface ContactFilters {
  search?: string; // Search in full_name, email, phone_number, company_name
  is_active?: boolean;
  company_name?: string;
  city?: string;
  sortBy?: "name" | "created_at" | "updated_at";
  sortOrder?: "asc" | "desc";
}

export interface ContactsResponse {
  contacts: Contact[];
  total: number;
  page: number;
  pageSize: number;
}
