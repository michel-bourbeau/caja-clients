-- Create contacts table for storing important business contacts
CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Basic information
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone_number VARCHAR(20),
  whatsapp_number VARCHAR(20),
  company_name VARCHAR(255),
  
  -- Address information
  address VARCHAR(500),
  city VARCHAR(100),
  country VARCHAR(100),
  postal_code VARCHAR(20),
  
  -- Additional information
  position VARCHAR(100),
  notes TEXT,
  
  -- Files and media
  photo_url VARCHAR(500),
  google_maps_link VARCHAR(500),
  whatsapp_conversation_url VARCHAR(500),
  whatsapp_conversation_filename VARCHAR(255),
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  
  CONSTRAINT full_name_not_empty CHECK (full_name != '')
);

-- Create indexes for better query performance
CREATE INDEX idx_contacts_tenant_id ON contacts(tenant_id);
CREATE INDEX idx_contacts_is_active ON contacts(is_active);
CREATE INDEX idx_contacts_created_at ON contacts(created_at DESC);
CREATE INDEX idx_contacts_full_name ON contacts(full_name);

-- Enable RLS (Row Level Security)
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only access contacts from their tenant
CREATE POLICY contacts_tenant_isolation ON contacts
  FOR SELECT
  USING (tenant_id IN (
    SELECT tenant_id FROM users WHERE id = auth.uid()
  ));

CREATE POLICY contacts_insert_own_tenant ON contacts
  FOR INSERT
  WITH CHECK (tenant_id IN (
    SELECT tenant_id FROM users WHERE id = auth.uid()
  ));

CREATE POLICY contacts_update_own_tenant ON contacts
  FOR UPDATE
  USING (tenant_id IN (
    SELECT tenant_id FROM users WHERE id = auth.uid()
  ));

CREATE POLICY contacts_delete_own_tenant ON contacts
  FOR DELETE
  USING (tenant_id IN (
    SELECT tenant_id FROM users WHERE id = auth.uid()
  ));

-- Add storage bucket for contact files (WhatsApp exports, photos)
INSERT INTO storage.buckets (id, name, public)
VALUES ('contacts', 'contacts', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for storage bucket
CREATE POLICY "Users can upload to contacts bucket"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'contacts' AND 
    auth.uid() IS NOT NULL
  );

CREATE POLICY "Users can view contacts files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'contacts' AND 
    auth.uid() IS NOT NULL
  );

CREATE POLICY "Users can update their contact files"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'contacts' AND 
    auth.uid() IS NOT NULL
  );

CREATE POLICY "Users can delete their contact files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'contacts' AND 
    auth.uid() IS NOT NULL
  );
