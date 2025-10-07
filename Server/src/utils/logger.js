/**
 * Logger utility for AgriChain application
 * Provides different log levels and structured logging
 */

import fs from "fs";
import path from "path";

class Logger {
  constructor() {
    // Ensure logs directory exists
    this.logDir = path.join(process.cwd(), "logs");
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  /**
   * Get current timestamp in ISO format
   */
  getTimestamp() {
    return new Date().toISOString();
  }

  /**
   * Format log message
   */
  formatMessage(level, message, meta = {}) {
    return JSON.stringify({
      timestamp: this.getTimestamp(),
      level: level.toUpperCase(),
      message,
      ...meta,
    });
  }

  /**
   * Write log to file
   */
  writeToFile(level, formattedMessage) {
    const fileName = `${level}.log`;
    const filePath = path.join(this.logDir, fileName);

    fs.appendFileSync(filePath, formattedMessage + "\n");

    // Also write to combined log
    const combinedPath = path.join(this.logDir, "combined.log");
    fs.appendFileSync(combinedPath, formattedMessage + "\n");
  }

  /**
   * Log info messages
   */
  info(message, meta = {}) {
    const formattedMessage = this.formatMessage("info", message, meta);

    if (process.env.NODE_ENV !== "test") {
      console.log(`[INFO] ${message}`, meta);
    }

    this.writeToFile("info", formattedMessage);
  }

  /**
   * Log error messages
   */
  error(message, meta = {}) {
    const formattedMessage = this.formatMessage("error", message, meta);

    if (process.env.NODE_ENV !== "test") {
      console.error(`[ERROR] ${message}`, meta);
    }

    this.writeToFile("error", formattedMessage);
  }

  /**
   * Log warning messages
   */
  warn(message, meta = {}) {
    const formattedMessage = this.formatMessage("warn", message, meta);

    if (process.env.NODE_ENV !== "test") {
      console.warn(`[WARN] ${message}`, meta);
    }

    this.writeToFile("warn", formattedMessage);
  }

  /**
   * Log debug messages (only in development)
   */
  debug(message, meta = {}) {
    if (process.env.NODE_ENV !== "development") return;

    const formattedMessage = this.formatMessage("debug", message, meta);
    console.log(`[DEBUG] ${message}`, meta);
    this.writeToFile("debug", formattedMessage);
  }
}

export const logger = new Logger();
