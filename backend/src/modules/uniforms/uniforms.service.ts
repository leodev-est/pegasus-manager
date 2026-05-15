import { prisma } from "../../config/prisma";
import { AppError } from "../../middlewares/error.middleware";

type UniformItemPayload = {
  name: string;
  description?: string | null;
  stock: number;
  minStock?: number;
};

type DeliveryPayload = {
  uniformItemId: string;
  athleteId: string;
  quantity: number;
  deliveredAt?: string;
  notes?: string | null;
  deliveredBy?: string | null;
};

export const uniformsService = {
  async findAllItems() {
    const items = await prisma.uniformItem.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { deliveries: true } } },
    });
    return items.map((item) => ({
      ...item,
      deliveryCount: item._count.deliveries,
      _count: undefined,
    }));
  },

  async findItemById(id: string) {
    const item = await prisma.uniformItem.findUnique({ where: { id } });
    if (!item) throw new AppError("Item de uniforme não encontrado", 404);
    return item;
  },

  async createItem(payload: UniformItemPayload) {
    if (!payload.name?.trim()) throw new AppError("Nome do item é obrigatório", 400);
    if (payload.stock < 0) throw new AppError("Estoque não pode ser negativo", 400);
    return prisma.uniformItem.create({
      data: {
        name: payload.name.trim(),
        description: payload.description?.trim() || null,
        stock: payload.stock,
        minStock: payload.minStock ?? 3,
      },
    });
  },

  async updateItem(id: string, payload: Partial<UniformItemPayload>) {
    await this.findItemById(id);
    const data: Record<string, unknown> = {};
    if (payload.name !== undefined) data.name = payload.name.trim();
    if (payload.description !== undefined) data.description = payload.description?.trim() || null;
    if (payload.stock !== undefined) data.stock = payload.stock;
    if (payload.minStock !== undefined) data.minStock = payload.minStock;
    return prisma.uniformItem.update({ where: { id }, data });
  },

  async deleteItem(id: string) {
    await this.findItemById(id);
    return prisma.uniformItem.delete({ where: { id } });
  },

  async getDeliveries(athleteId?: string, uniformItemId?: string) {
    return prisma.uniformDelivery.findMany({
      where: {
        ...(athleteId ? { athleteId } : {}),
        ...(uniformItemId ? { uniformItemId } : {}),
      },
      include: {
        uniformItem: { select: { id: true, name: true } },
        athlete: { select: { id: true, name: true } },
      },
      orderBy: { deliveredAt: "desc" },
    });
  },

  async createDelivery(payload: DeliveryPayload, deliveredByUser: string) {
    const item = await this.findItemById(payload.uniformItemId);
    if (item.stock < payload.quantity) {
      throw new AppError(`Estoque insuficiente. Disponível: ${item.stock}`, 400);
    }

    const athlete = await prisma.athlete.findUnique({ where: { id: payload.athleteId } });
    if (!athlete) throw new AppError("Atleta não encontrado", 404);

    const [delivery] = await prisma.$transaction([
      prisma.uniformDelivery.create({
        data: {
          uniformItemId: payload.uniformItemId,
          athleteId: payload.athleteId,
          quantity: payload.quantity,
          deliveredAt: payload.deliveredAt ? new Date(payload.deliveredAt) : new Date(),
          notes: payload.notes?.trim() || null,
          deliveredBy: payload.deliveredBy?.trim() || deliveredByUser,
        },
        include: {
          uniformItem: { select: { id: true, name: true } },
          athlete: { select: { id: true, name: true } },
        },
      }),
      prisma.uniformItem.update({
        where: { id: payload.uniformItemId },
        data: { stock: { decrement: payload.quantity } },
      }),
    ]);

    return delivery;
  },

  async deleteDelivery(id: string) {
    const delivery = await prisma.uniformDelivery.findUnique({ where: { id } });
    if (!delivery) throw new AppError("Entrega não encontrada", 404);

    await prisma.$transaction([
      prisma.uniformItem.update({
        where: { id: delivery.uniformItemId },
        data: { stock: { increment: delivery.quantity } },
      }),
      prisma.uniformDelivery.delete({ where: { id } }),
    ]);
  },

  async getLowStockItems() {
    const all = await prisma.uniformItem.findMany({ orderBy: { stock: "asc" } });
    return all.filter((item) => item.stock <= item.minStock);
  },
};
