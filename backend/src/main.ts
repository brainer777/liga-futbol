import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { APP_DEFAULTS } from './config/database.config';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  app.setGlobalPrefix(APP_DEFAULTS.apiPrefix);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.enableCors({
    origin: APP_DEFAULTS.corsOrigin,
    credentials: true,
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Liga de Fútbol API')
    .setDescription('API REST para el sistema de gestión de liga de fútbol')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup(`${APP_DEFAULTS.apiPrefix}/docs`, app, document);

  await app.listen(APP_DEFAULTS.port);

  logger.log(`🚀 Backend listo en http://localhost:${APP_DEFAULTS.port}/${APP_DEFAULTS.apiPrefix}`);
  logger.log(`📚 Swagger UI: http://localhost:${APP_DEFAULTS.port}/${APP_DEFAULTS.apiPrefix}/docs`);
  logger.log(`❤️  Health:     http://localhost:${APP_DEFAULTS.port}/${APP_DEFAULTS.apiPrefix}/health`);
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('💥 Error fatal durante el bootstrap:', err);
  process.exit(1);
});
