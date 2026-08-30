import process from 'node:process';
process.env.CORS_ORIGINS = 'http://localhost:5173';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.JWT_ACCESS_SECRET = '12345678901234567890123456789012';
process.env.JWT_REFRESH_SECRET = 'abcdefghijklmnopqrstuvwxzy123456';

const { Test } = await import('@nestjs/testing');
const { VersioningType } = await import('@nestjs/common');
const { AppModule } = await import('./src/app.module.ts');
const { PrismaService } = await import('./src/database/prisma.service.ts');

const prisma = {
  user: {
    findFirst: async () => null,
    findMany: async () => [],
    count: async () => 0,
    create: async (data) => data,
    update: async ({ data }) => data,
    updateMany: async () => ({ count: 0 }),
  },
  refreshToken: { updateMany: async () => ({ count: 0 }) },
};

const mod = await Test.createTestingModule({ imports: [AppModule] })
  .overrideProvider(PrismaService)
  .useValue(prisma)
  .compile();

const app = mod.createNestApplication();
app.setGlobalPrefix('api');
app.enableVersioning({ type: VersioningType.URI, defaultVersion: 'v1' });
await app.init();
const router = app.getHttpServer()._events.request._router;
console.log(JSON.stringify(router.stack.filter((layer) => layer.route).map((layer) => ({
  path: layer.route.path,
  methods: Object.keys(layer.route.methods),
})), null, 2));
await app.close();
