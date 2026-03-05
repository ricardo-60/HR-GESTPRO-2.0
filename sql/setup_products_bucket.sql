-- 1. Criar o Bucket 'products' se não existir
INSERT INTO storage.buckets (id, name, public) 
VALUES ('products', 'products', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Remover políticas antigas se existirem (para evitar duplicados)
DROP POLICY IF EXISTS "Tenant Isolation Select" ON storage.objects;
DROP POLICY IF EXISTS "Tenant Isolation Insert" ON storage.objects;
DROP POLICY IF EXISTS "Tenant Isolation Update" ON storage.objects;
DROP POLICY IF EXISTS "Tenant Isolation Delete" ON storage.objects;

-- 3. Políticas RLS para o bucket 'products'
-- Nota: O caminho do ficheiro deve começar por 'tenant_id/'

CREATE POLICY "Tenant Product Images Select"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'products' AND 
  (storage.foldername(name))[1] = (SELECT tenant_id::text FROM profiles WHERE id = auth.uid())
);

CREATE POLICY "Tenant Product Images Insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'products' AND 
  (storage.foldername(name))[1] = (SELECT tenant_id::text FROM profiles WHERE id = auth.uid())
);

CREATE POLICY "Tenant Product Images Update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'products' AND 
  (storage.foldername(name))[1] = (SELECT tenant_id::text FROM profiles WHERE id = auth.uid())
);

CREATE POLICY "Tenant Product Images Delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'products' AND 
  (storage.foldername(name))[1] = (SELECT tenant_id::text FROM profiles WHERE id = auth.uid())
);
