-- Delete UserRole assignments for MarketingLvl2 first (FK constraint)
DELETE FROM "UserRole"
WHERE "roleId" IN (SELECT id FROM "Role" WHERE name = 'MarketingLvl2');

-- Delete RolePermission entries for MarketingLvl2
DELETE FROM "RolePermission"
WHERE "roleId" IN (SELECT id FROM "Role" WHERE name = 'MarketingLvl2');

-- Delete the role itself
DELETE FROM "Role" WHERE name = 'MarketingLvl2';
