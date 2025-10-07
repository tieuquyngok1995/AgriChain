import express from "express";
import cors from "cors";
import helmet from "helmet";
import route from "./routes/index.js";
import {
  errorHandler,
  notFoundHandler,
  rateLimiter,
} from "./middlewares/index.js";
import { logger } from "./utils/logger.js";

const app = express();

// Security middleware
app.use(helmet());

// CORS configuration
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(",")
      : "*",
    credentials: true,
  })
);

// Rate limiting
app.use(
  rateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100,
    skipPaths: ["/api/health"],
  })
);

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.originalUrl}`, {
    ip: req.ip,
    userAgent: req.get("User-Agent"),
  });
  next();
});

// Health check endpoint
app.get("/api/health", async (req, res) => {
  try {
    // Check blockchain connection
    const { BlockchainService } = await import(
      "./services/blockchain.service.js"
    );
    const networkInfo = await BlockchainService.getNetworkInfo();

    res.json({
      success: true,
      message: "AgriChain API is running",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || "development",
      version: "1.0.0",
      blockchain: {
        connected: true,
        network: networkInfo.name,
        chainId: networkInfo.chainId,
      },
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      message: "Service partially unavailable",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || "development",
      blockchain: {
        connected: false,
        error: error.message,
      },
    });
  }
});

// Main API routes
app.use("/api", route);

// Handle 404 routes
app.use(notFoundHandler);

// Global error handler (must be last)
app.use(errorHandler);

export default app;
