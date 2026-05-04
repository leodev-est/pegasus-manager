import { AppError } from "../middlewares/error.middleware";

export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new AppError("JWT_SECRET não configurado", 500);
  }

  return secret;
}
