import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as winston from 'winston';

@Injectable()
export class LoggerService implements NestLoggerService {
  private logger: winston.Logger;

  constructor(private readonly config: ConfigService) {
    const nodeEnv = this.config.get<string>('nodeEnv', 'development');
    const isProduction = nodeEnv === 'production';

    this.logger = winston.createLogger({
      level: isProduction ? 'info' : 'debug',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.splat(),
        isProduction
          ? winston.format.json()
          : winston.format.combine(
              winston.format.colorize(),
              winston.format.printf(({ timestamp, level, message, context, ...meta }) => {
                const contextStr = context ? `[${context}] ` : '';
                const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
                return `${timestamp} ${level}: ${contextStr}${message}${metaStr}`;
              }),
            ),
      ),
      transports: [new winston.transports.Console()],
    });
  }

  log(message: string, context?: string) {
    this.logger.info(message, { context });
  }

  error(message: string, trace?: string, context?: string) {
    this.logger.error(message, { trace, context });
  }

  warn(message: string, context?: string) {
    this.logger.warn(message, { context });
  }

  debug(message: string, context?: string) {
    this.logger.debug(message, { context });
  }

  verbose(message: string, context?: string) {
    this.logger.verbose(message, { context });
  }

  // Additional helper methods for structured logging
  info(message: string, meta?: Record<string, unknown>, context?: string) {
    this.logger.info(message, { ...meta, context });
  }

  logWithMeta(level: string, message: string, meta?: Record<string, unknown>, context?: string) {
    this.logger.log(level, message, { ...meta, context });
  }
}
