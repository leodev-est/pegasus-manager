export type Role =
  | "Diretor"
  | "Gestao"
  | "RH"
  | "Financeiro"
  | "Marketing"
  | "ChefeMarketing"
  | "Conselheira"
  | "Tecnico"
  | "Operacional"
  | "Atleta";

export type Permission =
  | "dashboard"
  | "gestao"
  | "rh"
  | "financeiro"
  | "marketing"
  | "treinos"
  | "chamada"
  | "operacional"
  | "admin"
  | "atleta";

export const rolePermissions: Record<Role, Permission[]> = {
  Diretor: [
    "dashboard",
    "gestao",
    "rh",
    "financeiro",
    "marketing",
    "treinos",
    "chamada",
    "operacional",
    "admin",
  ],
  Gestao: ["dashboard", "gestao", "treinos"],
  RH: ["dashboard", "rh", "gestao"],
  Financeiro: ["dashboard", "financeiro", "gestao"],
  Marketing: ["dashboard", "marketing", "gestao"],
  ChefeMarketing: ["dashboard", "marketing", "gestao"],
  Conselheira: ["dashboard", "gestao"],
  Tecnico: ["dashboard", "treinos", "chamada"],
  Operacional: ["dashboard", "operacional", "gestao"],
  Atleta: ["dashboard", "atleta", "treinos"],
};

export function getPermissionsByRoles(roles: Role[]): Permission[] {
  return Array.from(new Set(roles.flatMap((role) => rolePermissions[role])));
}

export function canAccess(
  userPermissions: string[],
  requiredPermissions?: string[],
) {
  if (!requiredPermissions || requiredPermissions.length === 0) {
    return true;
  }

  return requiredPermissions.some((permission) => userPermissions.includes(permission));
}

export function canEditArea(roles: Role[], permission: Permission) {
  if (roles.includes("Diretor")) {
    return true;
  }

  const editorByPermission: Partial<Record<Permission, Role[]>> = {
    rh: ["RH"],
    financeiro: ["Financeiro"],
    marketing: ["Marketing"],
    treinos: ["Tecnico"],
    operacional: ["Operacional"],
  };

  return editorByPermission[permission]?.some((role) => roles.includes(role)) ?? false;
}
