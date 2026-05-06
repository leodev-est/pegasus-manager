-- CreateRole: ChefeMarketing
INSERT INTO "Role" (id, name, description)
VALUES (gen_random_uuid(), 'ChefeMarketing', 'Chefe de Marketing')
ON CONFLICT (name) DO NOTHING;

-- Assign permissions to ChefeMarketing
INSERT INTO "RolePermission" (id, "roleId", "permissionId")
SELECT gen_random_uuid(), r.id, p.id
FROM "Role" r
CROSS JOIN "Permission" p
WHERE r.name = 'ChefeMarketing'
  AND p.key IN (
    'marketing:read',
    'marketing:create',
    'marketing:update',
    'marketing:delete',
    'management:read'
  )
ON CONFLICT DO NOTHING;
