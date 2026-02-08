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

  await app.listen(port);
}
bootstrap();
