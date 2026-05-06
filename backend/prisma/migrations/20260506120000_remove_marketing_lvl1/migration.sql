-- Delete UserRole assignments for MarketingLvl1 first (FK constraint)
DELETE FROM "UserRole"
WHERE "roleId" IN (SELECT id FROM "Role" WHERE name = 'MarketingLvl1');

-- Delete RolePermission entries for MarketingLvl1
DELETE FROM "RolePermission"
WHERE "roleId" IN (SELECT id FROM "Role" WHERE name = 'MarketingLvl1');

-- Delete the role itself
DELETE FROM "Role" WHERE name = 'MarketingLvl1';
