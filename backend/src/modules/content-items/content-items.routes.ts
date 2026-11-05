import { Router, type RequestHandler } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { permissionMiddleware } from "../../middlewares/permission.middleware";
import { contentItemsController } from "./content-items.controller";

export const contentItemsRoutes = Router();

contentItemsRoutes.use(authMiddleware);

contentItemsRoutes.get("/week", permissionMiddleware(["marketing:read"]), contentItemsController.findForWeek);
// A Pauta foi copiada para o Kanban (migration 20261105120100_pauta_into_kanban). Escrever aqui
// criaria itens que nunca chegam ao Kanban (ex.: versão antiga do app em cache), então só leitura.
const pautaRetired: RequestHandler = (_request, response) => {
  response.status(410).json({ message: "A Pauta de Conteúdo agora faz parte do Kanban de marketing. Atualize a página." });
};
contentItemsRoutes.post("/", pautaRetired);
contentItemsRoutes.patch("/:id", pautaRetired);
contentItemsRoutes.delete("/:id", pautaRetired);
