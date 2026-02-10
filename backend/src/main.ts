import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { validateEnv } from './config/env.validation';

const API_PREFIX = 'v1';

async function bootstrap() {
  validateEnv();
  const app = await NestFactory.create(AppModule);
  
  // Trust proxy headers from Caddy reverse proxy
  app.set('trust proxy', true);
  
  // Enable CORS for Telegram Mini Apps and frontend
  app.enableCors({
    origin: (origin, callback) => {
      // Allow all origins - restrict in production to specific domains
      callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
    exposedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400, // 24 hours
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });
  
  app.setGlobalPrefix(API_PREFIX);
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
  );

  const config = app.get(ConfigService);
  const port = config.get('port') ?? 3000;

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Chainfluence API')
    .setDescription('Telegram Ad Marketplace backend')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup(
    'api',
    app,
    SwaggerModule.createDocument(app, swaggerConfig),
  );

  await app.listen(port, '0.0.0.0');
}
bootstrap();
