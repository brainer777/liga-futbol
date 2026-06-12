import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { APP_DEFAULTS } from './config/database.config';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  // Cabeceras de seguridad. CSP desactivado para no romper Swagger UI (la API
  // no sirve HTML propio); CORP en cross-origin para poder cargar /uploads
  // desde el frontend en otro origen.
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  // Detrás de un reverse proxy (Nginx) confiamos en el primer hop, así req.ip
  // es la IP real del cliente (necesario para que el rate-limiting sea por IP).
  app.getHttpAdapter().getInstance().set('trust proxy', 1);

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
