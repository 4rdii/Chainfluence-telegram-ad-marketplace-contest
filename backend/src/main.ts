import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Request, Response, NextFunction } from 'express';
import { AppModule } from './app.module';
import { validateEnv } from './config/env.validation';

const API_PREFIX = 'v1';

async function bootstrap() {
  validateEnv();
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix(API_PREFIX);
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
  );
  const config = app.get(ConfigService);
  const port = config.get('port') ?? 3000;

  const swaggerPath = 'api';
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Chainfluence API')
    .setDescription('Telegram Ad Marketplace backend')
    .setVersion('1.0')
    .addServer(`https://debazaar.click/${API_PREFIX}`)
    .addServer(`http://localhost:3000/${API_PREFIX}`)
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  document.security = [{ bearer: [] }];
  SwaggerModule.setup(swaggerPath, app, document, {
    jsonDocumentUrl: `/${swaggerPath}-json`,
    yamlDocumentUrl: `/${swaggerPath}-yaml`,
  });
  app.use((req: Request, res: Response, next: NextFunction) => {
    const path = req.path ?? (req.url ? String(req.url).split('?')[0] : '');
    if (path === '/api' && req.method === 'GET') {
      res.redirect(301, '/api/');
      return;
    }
    next();
  });

  app.enableCors();
  await app.listen(port);
}
bootstrap();
