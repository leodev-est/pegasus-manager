import cors from "cors";
import express from "express";
import { errorMiddleware } from "./middlewares/error.middleware";
import { routes } from "./routes";

export const app = express();

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
  try {
    const { hostname } = new URL(origin);

    return (
      configuredOrigins.includes(origin) ||
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname.endsWith(".vercel.app")
    );
  } catch {
    return false;
  }
}

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
app.use(express.json());
app.use(routes);
app.use((_request, response) => {
  response.status(404).json({ message: "Rota não encontrada." });
});
app.use(errorMiddleware);


