import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { permissionMiddleware } from "../../middlewares/permission.middleware";
import { auditController } from "./audit.controller";

export const auditRoutes = Router();

auditRoutes.use(authMiddleware);
// "admin" não existe como chave real — hoje só restringe a Diretor por acidente (bypass
// de role). Usa "users:read", que só Diretor tem de fato, pra manter o mesmo efeito
// de forma explícita.
auditRoutes.get("/", permissionMiddleware("users:read"), auditController.list);
