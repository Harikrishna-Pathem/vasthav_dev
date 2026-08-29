import * as Joi from 'joi';

export const configuration = () => ({
  app: {
    nodeEnv: process.env.NODE_ENV ?? 'development',
    port: Number(process.env.PORT ?? 3000),
    apiPrefix: process.env.API_PREFIX ?? 'api',
    apiVersion: process.env.API_VERSION ?? 'v1',
    corsOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:5173').split(','),
  },
});

export function validateEnvironment(config: Record<string, unknown>): Record<string, unknown> {
  const schema = Joi.object({
    NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
    PORT: Joi.number().port().default(3000),
    API_PREFIX: Joi.string().default('api'),
    API_VERSION: Joi.string().default('v1'),
    CORS_ORIGINS: Joi.string().required(),
    DATABASE_URL: Joi.string().uri({ scheme: ['postgresql', 'postgres'] }).required(),
    JWT_ACCESS_SECRET: Joi.string().min(32).when('NODE_ENV', { is: 'production', then: Joi.required(), otherwise: Joi.optional() }),
    LOG_LEVEL: Joi.string().valid('fatal', 'error', 'warn', 'info', 'debug', 'trace').default('info'),
  }).unknown(true);
  const { error, value } = schema.validate(config, { abortEarly: false });
  if (error) throw new Error(`Invalid environment configuration: ${error.message}`);
  return value;
}
