import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import { errorMiddleware } from "./middlewares/error.middleware";
import { routes } from "./routes";

export const app = express();

const isProduction = process.env.NODE_ENV === "production";

const configuredOrigins = [
  process.env.CORS_ORIGIN,
  process.env.CORS_ORIGINS,
  process.env.FRONTEND_URL,
]
  .filter(Boolean)
  .flatMap((origin) => origin!.split(","))
  .map((origin) => origin.trim())
  .filter(Boolean);

function isAllowedOrigin(origin: string) {
  if (configuredOrigins.includes(origin)) return true;

  if (!isProduction) {
    try {
      const { hostname } = new URL(origin);
      return hostname === "localhost" || hostname === "127.0.0.1";
    } catch {
      return false;
    }
  }

  return false;
}

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProduction ? 500 : 5000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Muitas requisições. Tente novamente em breve." },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProduction ? 20 : 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Muitas tentativas de login. Aguarde 15 minutos." },
});

app.use(helmet());
app.use(morgan(isProduction ? "combined" : "dev"));
app.use(globalLimiter);
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || isAllowedOrigin(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("Origin not allowed by CORS"));
    },
  }),
);
app.use(express.json({ limit: "1mb" }));
app.get("/health", (_req, res) => res.json({ status: "ok" }));
app.use(routes);
app.use((_request, response) => {
  response.status(404).json({ message: "Rota não encontrada." });
});
app.use(errorMiddleware);


