import Joi from 'joi';

export const configuration = () => ({
  app: {
    nodeEnv: process.env.NODE_ENV ?? 'development',
    port: Number(process.env.PORT ?? 3000),
    apiPrefix: process.env.API_PREFIX ?? 'api',
    apiVersion: process.env.API_VERSION ?? '1',
    corsOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:5173').split(','),
  },
  auth: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    accessTtl: process.env.JWT_ACCESS_TTL ?? '15m',
    refreshTtl: process.env.JWT_REFRESH_TTL ?? '30d',
  },
  mail: {
    host: process.env.MAIL_HOST?.trim() ?? '',
    port: process.env.MAIL_PORT ? Number(process.env.MAIL_PORT) : 587,
    secure: process.env.MAIL_SECURE === 'true',
    user: process.env.MAIL_USER?.trim() ?? '',
    password: process.env.MAIL_PASSWORD ?? '',
    from: process.env.MAIL_FROM?.trim() ?? '',
  },
});

export function validateEnvironment(config: Record<string, unknown>): Record<string, unknown> {
  const schema = Joi.object({
    NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
    PORT: Joi.number().port().default(3000),
    API_PREFIX: Joi.string().default('api'),
    API_VERSION: Joi.string().default('1'),
    CORS_ORIGINS: Joi.string().required(),
    DATABASE_URL: Joi.string().uri({ scheme: ['postgresql', 'postgres'] }).required(),
    JWT_ACCESS_SECRET: Joi.string().min(32).required(),
    JWT_REFRESH_SECRET: Joi.string().min(32).required(),
    JWT_ACCESS_TTL: Joi.string().default('15m'),
    JWT_REFRESH_TTL: Joi.string().default('30d'),
    MAIL_HOST: Joi.string().allow('').default(''),
    MAIL_PORT: Joi.number().port().default(587),
    MAIL_SECURE: Joi.boolean().default(false),
    MAIL_USER: Joi.string().allow('').default(''),
    MAIL_PASSWORD: Joi.string().allow('').default(''),
    MAIL_FROM: Joi.string().allow('').default(''),
    LOG_LEVEL: Joi.string().valid('fatal', 'error', 'warn', 'info', 'debug', 'trace').default('info'),
  }).unknown(true);
  const { error, value } = schema.validate(config, { abortEarly: false });
  if (error) throw new Error(`Invalid environment configuration: ${error.message}`);
  return value;
}
