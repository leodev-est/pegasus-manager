import { prisma } from "../../config/prisma";
import { AppError } from "../../middlewares/error.middleware";

const VALID_CATEGORIES = ["info", "urgente", "evento"];

export const muralService = {
  async list() {
    return prisma.muralPost.findMany({ orderBy: { createdAt: "desc" } });
  },

  async create(data: { title: string; body: string; category?: string; authorId: string }) {
    const category = data.category ?? "info";
    if (!VALID_CATEGORIES.includes(category)) {
      throw new AppError("Categoria inválida. Use: info, urgente ou evento.", 400);
    }
    if (!data.title?.trim()) throw new AppError("Título é obrigatório.", 400);
    if (!data.body?.trim()) throw new AppError("Texto é obrigatório.", 400);

    return prisma.muralPost.create({
      data: {
        title: data.title.trim(),
        body: data.body.trim(),
        category,
        authorId: data.authorId,
      },
    });
  },

  async remove(id: string) {
    const post = await prisma.muralPost.findUnique({ where: { id } });
    if (!post) throw new AppError("Comunicado não encontrado.", 404);
    await prisma.muralPost.delete({ where: { id } });
  },
};
