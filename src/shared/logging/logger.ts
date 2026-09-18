export type LogContext = Readonly<Record<string, unknown>>;

export interface Logger {
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, error?: unknown, context?: LogContext): void;
}

export function createConsoleLogger(debugEnabled = false): Logger {
  return {
    debug(message, context) {
      if (debugEnabled) {
        console.debug(message, context ?? {});
      }
    },
    info(message, context) {
      console.info(message, context ?? {});
    },
    warn(message, context) {
      console.warn(message, context ?? {});
    },
    error(message, error, context) {
      console.error(message, error, context ?? {});
    },
  };
}

export const appLogger = createConsoleLogger();
