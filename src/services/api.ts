import axios, { AxiosError } from "axios";

export const TOKEN_KEY = "pegasus-manager:token";
export const USER_KEY = "pegasus-manager:user";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use((config) => {
  const token = window.localStorage.getItem(TOKEN_KEY);

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const token = window.localStorage.getItem(TOKEN_KEY);
    const isLoginRequest = error.config?.url?.includes("/auth/login");

    if (error.response?.status === 401 && token && !isLoginRequest) {
      window.localStorage.removeItem(TOKEN_KEY);
      window.localStorage.removeItem(USER_KEY);
      window.dispatchEvent(new CustomEvent("pegasus:auth:logout"));
      window.dispatchEvent(
        new CustomEvent("pegasus:toast", {
          detail: {
            message: "Sessão expirada. Entre novamente.",
            type: "error",
          },
        }),
      );
    }

    if (!error.response) {
      window.dispatchEvent(
        new CustomEvent("pegasus:toast", {
          detail: {
            message: getApiErrorMessage(error),
            type: "error",
          },
        }),
      );
    }

    return Promise.reject(error);
  },
);

export function getApiErrorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    if (!error.response) {
      return `Não foi possível conectar ao backend em ${API_URL}. Verifique se a API está rodando.`;
    }

    const data = error.response?.data as { message?: string; error?: string } | undefined;
    return data?.message ?? data?.error ?? "Não foi possível concluir a operação.";
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Não foi possível concluir a operação.";
}



