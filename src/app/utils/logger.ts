/* eslint-disable */

// Custom logger class for formatted console output with colors and timestamps
export class Logger {
  private context: string;
  // ANSI escape codes for console text colors
  private colors = {
    reset: "\x1b[0m",
    red: "\x1b[31m",
    yellow: "\x1b[33m",
    blue: "\x1b[34m",
    gray: "\x1b[90m",
    bold: "\x1b[1m",
  };

  // Initialize logger with a context name (e.g., module or component name)
  constructor(context: string) {
    this.context = context;
  }

  // Formats the log message with timestamp, context, and optional data
  private formatMessage(level: string, message: string, data?: unknown) {
    const timestamp = new Date().toISOString();
    const prefix = `${timestamp} ${this.context}:`;
    return [prefix, message, ...(data ? [JSON.stringify(data)] : [])];
  }

  // Applies color formatting to text using ANSI escape codes
  private colorize(color: keyof typeof this.colors, text: string): string {
    return `${this.colors[color]}${text}${this.colors.reset}`;
  }

  // Formats the log level indicator (e.g., [INFO], [ERROR])
  private formatLogLevel(level: string): string {
    return `[${level.toUpperCase()}]`;
  }

  // Combines all formatting functions to create the final log output string
  private formatOutput({
    level,
    message,
    data,
  }: {
    level: "info" | "warn" | "error";
    message: string;
    data?: unknown;
  }): string {
    // Map log levels to their corresponding colors
    const levelColors = {
      info: "blue",
      warn: "yellow",
      error: "red",
    } as const;

    const formattedMessage = this.formatMessage(level, message, data);
    return `${this.colorize(levelColors[level], this.formatLogLevel(level))} ${formattedMessage.join(" ")}`;
  }

  // Public methods for different log levels
  info(message: string, data?: unknown) {
    console.info(this.formatOutput({ level: "info", message, data }));
  }

  warn(message: string, data?: unknown) {
    console.warn(this.formatOutput({ level: "warn", message, data }));
  }

  error(message: string, data?: unknown) {
    console.error(this.formatOutput({ level: "error", message, data }));
  }
}
