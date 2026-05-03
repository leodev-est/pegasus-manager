import { prisma } from "../../config/prisma";

export const permissionsService = {
  async findAll() {
    return prisma.permission.findMany({
      orderBy: { key: "asc" },
    });
  },
};
