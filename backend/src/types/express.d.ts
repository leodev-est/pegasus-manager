import type { AuthenticatedUser } from "./auth";

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      /** Corpo bruto da requisição (texto, antes do parse), capturado só pra validar HMAC de webhooks. */
      rawBody?: string;
    }
  }
}

export {};
