import type { PropsWithChildren } from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { authService } from "../services/authService";
import { getApiErrorMessage, TOKEN_KEY, USER_KEY } from "../services/api";
import { canAccess, getPermissionsByRoles } from "./permissions";
import type { Permission, Role } from "./permissions";

export type AuthUser = {
  id: string;
  name: string;
  username: string;
  email: string;
  roles: Role[];
  roleLabels?: string[];
  permissions: string[];
  mustChangePassword?: boolean;
};

type AuthContextValue = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  changeFirstPassword: (newPassword: string, confirmPassword: string) => Promise<void>;
  hasPermission: (requiredPermissions?: string[]) => boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const roleAliases: Record<string, Role> = {
  DIRETOR: "Diretor",
  Diretor: "Diretor",
  GESTAO: "Gestao",
  Gestao: "Gestao",
  Gestão: "Gestao",
  GESTÃO: "Gestao",
  RH: "RH",
  FINANCEIRO: "Financeiro",
  Financeiro: "Financeiro",
  MARKETING: "Marketing",
  Marketing: "Marketing",
  MARKETINGLVL1: "MarketingLvl1",
  MarketingLvl1: "MarketingLvl1",
  MARKETINGLVL2: "MarketingLvl2",
  MarketingLvl2: "MarketingLvl2",
  CONSELHEIRA: "Conselheira",
  Conselheira: "Conselheira",
  CONSELHEIRO: "Conselheira",
  Conselheiro: "Conselheira",
  TECNICO: "Tecnico",
  Técnico: "Tecnico",
  Tecnico: "Tecnico",
  TREINADOR: "Tecnico",
  Treinador: "Tecnico",
  OPERACIONAL: "Operacional",
  Operacional: "Operacional",
  ATLETA: "Atleta",
  Atleta: "Atleta",
};

const permissionAliases: Record<string, Permission> = {
  DASHBOARD: "dashboard",
  dashboard: "dashboard",
  GESTAO: "gestao",
  gestão: "gestao",
  gestao: "gestao",
  "management:read": "gestao",
  "management:create": "gestao",
  "management:update": "gestao",
  "management:delete": "gestao",
  RH: "rh",
  rh: "rh",
  "athletes:read": "rh",
  "athletes:create": "rh",
  "athletes:update": "rh",
  "athletes:delete": "rh",
  FINANCEIRO: "financeiro",
  financeiro: "financeiro",
  "finance:read": "financeiro",
  "finance:create": "financeiro",
  "finance:update": "financeiro",
  "finance:delete": "financeiro",
  MARKETING: "marketing",
  marketing: "marketing",
  "marketing:read": "marketing",
  "marketing:create": "marketing",
  "marketing:update": "marketing",
  "marketing:delete": "marketing",
  TREINOS: "treinos",
  treinos: "treinos",
  "trainings:read": "treinos",
  "trainings:create": "treinos",
  "trainings:update": "treinos",
  "trainings:delete": "treinos",
  OPERACIONAL: "operacional",
  operacional: "operacional",
  "operational:read": "operacional",
  "operational:create": "operacional",
  "operational:update": "operacional",
  "operational:delete": "operacional",
  ADMIN: "admin",
  admin: "admin",
  "users:read": "admin",
  "users:create": "admin",
  "users:update": "admin",
  "users:delete": "admin",
  "roles:read": "admin",
  "roles:create": "admin",
  "roles:update": "admin",
  "roles:delete": "admin",
  "permissions:read": "admin",
  ATLETA: "atleta",
  atleta: "atleta",
  "profile:read": "atleta",
  "profile:update": "atleta",
};

function normalizeRoles(rawRoles?: unknown): Role[] {
  if (!Array.isArray(rawRoles)) {
    return [];
  }

  return rawRoles
    .map((role) => {
      if (typeof role === "string") return roleAliases[role] ?? roleAliases[role.toUpperCase()];
      if (role && typeof role === "object" && "name" in role) {
        const name = String((role as { name: unknown }).name);
        return roleAliases[name] ?? roleAliases[name.toUpperCase()];
      }
      return undefined;
    })
    .filter((role): role is Role => Boolean(role));
}

function getRoleLabels(rawRoles?: unknown): string[] {
  if (!Array.isArray(rawRoles)) {
    return [];
  }

  return rawRoles
    .map((role) => {
      if (typeof role === "string") return role;
      if (role && typeof role === "object" && "name" in role) {
        return String((role as { name: unknown }).name);
      }
      return undefined;
    })
    .filter((role): role is string => Boolean(role));
}

function getPermissionKey(permission: unknown) {
  if (typeof permission === "string") {
    return permission;
  }

  if (permission && typeof permission === "object" && "key" in permission) {
    return String((permission as { key: unknown }).key);
  }

  if (permission && typeof permission === "object" && "name" in permission) {
    return String((permission as { name: unknown }).name);
  }

  return undefined;
}

function normalizePermissions(rawPermissions?: unknown): string[] {
  if (!Array.isArray(rawPermissions)) {
    return [];
  }

  const permissions = rawPermissions.flatMap((permission) => {
    const key = getPermissionKey(permission);

    if (!key) {
      return [];
    }

    const areaPermission = permissionAliases[key] ?? permissionAliases[key.toLowerCase()];
    return areaPermission ? [key, areaPermission] : [key];
  });

  return Array.from(new Set(permissions));
}

function normalizeUser(rawUser: unknown): AuthUser {
  const user = rawUser as Partial<AuthUser> & { _id?: string };
  const roles = normalizeRoles(user.roles);
  const roleLabels = getRoleLabels(user.roleLabels ?? user.roles);
  const permissions = normalizePermissions(user.permissions);

  return {
    id: String(user.id ?? user._id ?? ""),
    name: String(user.name ?? ""),
    username: String(user.username ?? ""),
    email: String(user.email ?? ""),
    mustChangePassword: Boolean(user.mustChangePassword),
    roles,
    roleLabels: roleLabels.length > 0 ? roleLabels : roles,
    permissions: Array.from(
      new Set(["dashboard", ...permissions, ...getPermissionsByRoles(roles)]),
    ),
  };
}

function getStoredUser(): AuthUser | null {
  const storedUser = window.localStorage.getItem(USER_KEY);

  if (!storedUser) {
    return null;
  }

  try {
    return normalizeUser(JSON.parse(storedUser));
  } catch {
    window.localStorage.removeItem(USER_KEY);
    return null;
  }
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<AuthUser | null>(() => getStoredUser());
  const [isLoading, setIsLoading] = useState(Boolean(window.localStorage.getItem(TOKEN_KEY)));

  const logout = useCallback(() => {
    window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.removeItem(USER_KEY);
    setUser(null);
    setIsLoading(false);
  }, []);

  const restoreSession = useCallback(async () => {
    const token = window.localStorage.getItem(TOKEN_KEY);

    if (!token) {
      setIsLoading(false);
      return;
    }

    try {
      const currentUser = normalizeUser(await authService.me());
      window.localStorage.setItem(USER_KEY, JSON.stringify(currentUser));
      setUser(currentUser);
    } catch {
      logout();
    } finally {
      setIsLoading(false);
    }
  }, [logout]);

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  useEffect(() => {
    window.addEventListener("pegasus:auth:logout", logout);
    return () => window.removeEventListener("pegasus:auth:logout", logout);
  }, [logout]);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const response = await authService.login(email, password);
      const token = response.token ?? response.accessToken;

      if (!token) {
        throw new Error("A API não retornou um token de acesso.");
      }

      window.localStorage.setItem(TOKEN_KEY, token);

      const currentUser = normalizeUser(response.user ?? (await authService.me()));
      window.localStorage.setItem(USER_KEY, JSON.stringify(currentUser));
      setUser(currentUser);
      setIsLoading(false);
    } catch (error) {
      throw new Error(getApiErrorMessage(error));
    }
  }, []);

  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    try {
      const currentUser = normalizeUser(await authService.changePassword(currentPassword, newPassword));
      window.localStorage.setItem(USER_KEY, JSON.stringify(currentUser));
      setUser(currentUser);
    } catch (error) {
      throw new Error(getApiErrorMessage(error));
    }
  }, []);

  const changeFirstPassword = useCallback(async (newPassword: string, confirmPassword: string) => {
    try {
      const currentUser = normalizeUser(await authService.changeFirstPassword(newPassword, confirmPassword));
      window.localStorage.setItem(USER_KEY, JSON.stringify(currentUser));
      setUser(currentUser);
    } catch (error) {
      throw new Error(getApiErrorMessage(error));
    }
  }, []);

  const hasPermission = useCallback(
    (requiredPermissions?: string[]) =>
      Boolean(user && canAccess(user.permissions, requiredPermissions)),
    [user],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isLoading,
      login,
      changePassword,
      changeFirstPassword,
      logout,
      hasPermission,
    }),
    [changeFirstPassword, changePassword, hasPermission, isLoading, login, logout, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}


