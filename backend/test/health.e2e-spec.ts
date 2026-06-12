import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { HealthController } from '../src/health/health.controller';
import { PrismaService } from '../src/prisma/prisma.service';

/**
 * Smoke test e2e del endpoint de salud.
 *
 * Levanta SOLO el HealthController con un PrismaService mockeado, así no
 * arranca el PostgreSQL embebido (que descarga un binario y es lento/frágil
 * en CI). Ejercita la capa HTTP real vía supertest.
 *
 * Para un e2e "de verdad" contra la BD embebida habría que importar
 * AppModule completo; eso queda como trabajo futuro (ver README de tests).
 */
describe('Health (e2e)', () => {
  let app: INestApplication;

  describe('cuando la BD responde', () => {
    beforeAll(async () => {
      const moduleRef: TestingModule = await Test.createTestingModule({
        controllers: [HealthController],
        providers: [
          {
            provide: PrismaService,
            useValue: { $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]) },
          },
        ],
      }).compile();

      app = moduleRef.createNestApplication();
      await app.init();
    });

    afterAll(async () => {
      await app.close();
    });

    it('GET /health → 200 con status ok y database up', async () => {
      const res = await request(app.getHttpServer()).get('/health').expect(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.database).toBe('up');
      expect(res.body).toHaveProperty('timestamp');
      expect(res.body).toHaveProperty('uptime');
    });
  });

  describe('cuando la BD está caída', () => {
    let appDown: INestApplication;

    beforeAll(async () => {
      const moduleRef: TestingModule = await Test.createTestingModule({
        controllers: [HealthController],
        providers: [
          {
            provide: PrismaService,
            useValue: { $queryRaw: jest.fn().mockRejectedValue(new Error('no connection')) },
          },
        ],
      }).compile();

      appDown = moduleRef.createNestApplication();
      await appDown.init();
    });

    afterAll(async () => {
      await appDown.close();
    });

    it('GET /health → 200 pero database down (no tumba el endpoint)', async () => {
      const res = await request(appDown.getHttpServer()).get('/health').expect(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.database).toBe('down');
    });
  });
});
