import { ShieldCheck, Users } from "lucide-react";
import { useEffect, useState } from "react";
import type { AuthUser } from "../../auth/AuthContext";
import { PageHeader } from "../../components/ui/PageHeader";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { Table } from "../../components/ui/Table";
import { useToast } from "../../components/ui/Toast";
import { permissionRules } from "../../data/mockData";
import { getApiErrorMessage } from "../../services/api";
import { roleService, type RoleRecord } from "../../services/roleService";
import { userService } from "../../services/userService";

const accessByRole: Record<string, string> = {
  Atleta: "Dashboard",
  Conselheiro: "Gestão",
  Conselheira: "Gestão",
  Diretor: "Acesso total",
  Financeiro: "Financeiro e Gestão",
  Marketing: "Marketing e Gestão",
  Operacional: "Operacional e Gestão",
  RH: "RH e Gestão",
  Tecnico: "Treinos",
  Técnico: "Treinos",
};

function getAccessDescription(user: AuthUser) {
  if (user.roles.includes("Diretor")) return "Acesso total";

  return user.roles.map((role) => accessByRole[role] ?? role).join(" + ") || "Sem acesso";
}

export function AccessControlPage() {
  const { showToast } = useToast();
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [roles, setRoles] = useState<RoleRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [savingUserId, setSavingUserId] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadUsers() {
      setIsLoading(true);
      setError("");

      try {
        const [apiUsers, apiRoles] = await Promise.all([
          userService.getUsers(),
          roleService.getRoles(),
        ]);
        if (isMounted) {
          setUsers(apiUsers);
          setRoles(apiRoles);
        }
      } catch (loadError) {
        const message = getApiErrorMessage(loadError);
        if (isMounted) {
          setError(message);
          showToast(message, "error");
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadUsers();

    return () => {
      isMounted = false;
    };
  }, [showToast]);

  async function toggleRole(user: AuthUser, roleName: string) {
    const hasRole = user.roles.includes(roleName as AuthUser["roles"][number]);
    const nextRoles = hasRole
      ? user.roles.filter((role) => role !== roleName)
      : [...user.roles, roleName as AuthUser["roles"][number]];

    setSavingUserId(user.id);

    try {
      const updatedUser = await userService.updateUserRoles(user.id, nextRoles);
      setUsers((currentUsers) =>
        currentUsers.map((currentUser) => (currentUser.id === updatedUser.id ? updatedUser : currentUser)),
      );
      showToast("Perfil atualizado com sucesso.", "success");
    } catch (roleError) {
      showToast(getApiErrorMessage(roleError), "error");
    } finally {
      setSavingUserId("");
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Controle de Acessos"
        description="Mapa inicial de usuários, perfis e permissões por área do Pegasus Manager."
      />

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <article className="panel overflow-hidden">
          <div className="flex items-center gap-3 border-b border-blue-100 p-6">
            <Users className="text-pegasus-primary" size={22} />
            <div>
              <h2 className="text-xl font-bold text-pegasus-navy">Usuários</h2>
              <p className="text-sm text-slate-500">Usuários ativos e perfis reais do sistema.</p>
            </div>
          </div>
          <div className="md:hidden">
            {isLoading ? <p className="p-6 text-sm font-semibold text-slate-500">Carregando usuários...</p> : null}
            {!isLoading && error ? <p className="p-6 text-sm font-semibold text-rose-700">{error}</p> : null}
            {!isLoading && !error && users.length === 0 ? <p className="p-6 text-sm font-semibold text-slate-500">Nenhum usuário encontrado.</p> : null}
            {!isLoading && !error ? (
              <div className="grid gap-3 p-4">
                {users.map((user) => (
                  <article key={user.id || user.email} className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="font-bold text-pegasus-navy">{user.name}</h3>
                        <p className="mt-1 break-words text-sm text-slate-500">
                          @{user.username} {user.email ? `| ${user.email}` : ""}
                        </p>
                      </div>
                      <StatusBadge
                        label={user.roles.join(" + ") || "Sem perfil"}
                        tone={user.roles.includes("Diretor") ? "success" : "info"}
                      />
                    </div>
                    <p className="mt-4 text-sm leading-6 text-slate-600">
                      <strong className="text-pegasus-navy">Acesso:</strong>{" "}
                      {getAccessDescription(user)}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {roles.map((role) => (
                        <button
                          className={`rounded-full px-3 py-1 text-xs font-bold ring-1 transition ${
                            user.roles.includes(role.name as AuthUser["roles"][number])
                              ? "bg-pegasus-primary text-white ring-pegasus-primary"
                              : "bg-white text-slate-600 ring-blue-100 hover:bg-pegasus-ice"
                          }`}
                          disabled={savingUserId === user.id}
                          key={role.id}
                          onClick={() => toggleRole(user, role.name)}
                          type="button"
                        >
                          {role.name}
                        </button>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            ) : null}
          </div>
          <div className="hidden md:block">
            <Table headers={["Usuário", "Perfil", "Acesso"]} minWidth="640px">
              {isLoading ? (
                <tr className="bg-white">
                  <td className="px-6 py-6 text-sm font-semibold text-slate-500" colSpan={3}>
                    Carregando usuários...
                  </td>
                </tr>
              ) : null}
              {!isLoading && error ? (
                <tr className="bg-white">
                  <td className="px-6 py-6 text-sm font-semibold text-rose-700" colSpan={3}>
                    {error}
                  </td>
                </tr>
              ) : null}
              {!isLoading && !error && users.length === 0 ? (
                <tr className="bg-white">
                  <td className="px-6 py-6 text-sm font-semibold text-slate-500" colSpan={3}>
                    Nenhum usuário encontrado.
                  </td>
                </tr>
              ) : null}
              {!isLoading && !error
                ? users.map((user) => (
                    <tr key={user.id || user.email} className="bg-white">
                      <td className="px-6 py-4">
                        <p className="font-bold text-pegasus-navy">{user.name}</p>
                        <p className="text-xs text-slate-500">
                          @{user.username} {user.email ? `| ${user.email}` : ""}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge
                          label={user.roles.join(" + ") || "Sem perfil"}
                          tone={user.roles.includes("Diretor") ? "success" : "info"}
                        />
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        <p>{getAccessDescription(user)}</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {roles.map((role) => (
                            <button
                              className={`rounded-full px-3 py-1 text-xs font-bold ring-1 transition ${
                                user.roles.includes(role.name as AuthUser["roles"][number])
                                  ? "bg-pegasus-primary text-white ring-pegasus-primary"
                                  : "bg-white text-slate-600 ring-blue-100 hover:bg-pegasus-ice"
                              }`}
                              disabled={savingUserId === user.id}
                              key={role.id}
                              onClick={() => toggleRole(user, role.name)}
                              type="button"
                            >
                              {role.name}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))
                : null}
            </Table>
          </div>
        </article>

        <article className="panel p-6">
          <div className="flex items-center gap-3">
            <ShieldCheck className="text-pegasus-primary" size={22} />
            <div>
              <h2 className="text-xl font-bold text-pegasus-navy">Perfis e permissões</h2>
              <p className="text-sm text-slate-500">Regras iniciais de acesso por área.</p>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            {permissionRules.map((rule) => (
              <div
                key={rule.profile}
                className="flex flex-col gap-2 rounded-2xl bg-pegasus-surface p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
              >
                <strong className="text-pegasus-navy">{rule.profile}</strong>
                <span className="text-sm text-slate-600 sm:text-right">{rule.description}</span>
              </div>
            ))}
          </div>
        </article>
      </section>
    </div>
  );
}


