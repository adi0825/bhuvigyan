import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { startOutboxScheduler } from "./lib/outbox-scheduler";
import { runSeedIfEmpty } from "./lib/seed";
import { traceIdMiddleware } from "./middlewares/traceId";

const app: Express = express();

app.use(traceIdMiddleware);
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

// API routes
app.use("/api", router);

// 404 handler for API routes (must be after routes)
app.use("/api", (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      message: "API endpoint not found",
      code: "NOT_FOUND",
    },
  });
});

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error(err);
  res.status(err.status || 500).json({
    success: false,
    error: {
      message: err.message || "Internal server error",
      code: err.code || "INTERNAL_ERROR",
    },
  });
});

startOutboxScheduler();
runSeedIfEmpty();

export default app;
