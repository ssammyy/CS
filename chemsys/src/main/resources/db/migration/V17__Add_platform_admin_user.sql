-- Create platform admin tenant (if not exists)
INSERT INTO tenants (id, name, created_at, updated_at)
SELECT '00000000-0000-0000-0000-000000000000'::uuid, 'Platform Admin', NOW(), NULL
WHERE NOT EXISTS (SELECT 1 FROM tenants WHERE id = '00000000-0000-0000-0000-000000000000'::uuid);
