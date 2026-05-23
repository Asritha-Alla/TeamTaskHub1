import path from "path";
import { fileURLToPath } from "url";
import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes/index.js";
import { logger } from "./lib/logger.js";
import { connectMongoDB } from "./lib/mongodb.js";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

// Handle JSON parse errors from body-parser (malformed JSON requests)
// Return a 400 JSON error instead of letting the error crash the process.
app.use((err, _req, res, next) => {
  if (!err) return next();

  // body-parser sets `type === 'entity.parse.failed'` for parse errors
  if (err.type === "entity.parse.failed" || err instanceof SyntaxError) {
    res.status(400).json({ error: "Invalid JSON" });
    return;
  }

  next(err);
});

if (process.env.NODE_ENV === "production") {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const staticPath = path.resolve(__dirname, "../../task-app/dist/public");
  app.use(express.static(staticPath));
  app.get("/*path", (_req, res) => {
    res.sendFile(path.join(staticPath, "index.html"));
  });
}

connectMongoDB().catch((err) => {
  logger.error({ err }, "Failed to connect to MongoDB");
  process.exit(1);
});

export default app;
