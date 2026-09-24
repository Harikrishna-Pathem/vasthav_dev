import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { configuration, validateEnvironment } from './config/configuration.js';
import { AppConfigService } from './config/app-config.service.js';
import { DatabaseModule } from './database/database.module.js';
import { HealthModule } from './health/health.module.js';
import { AuthModule } from './auth/auth.module.js';
import { UsersModule } from './users/users.module.js';
import { SurveysModule } from './surveys/surveys.module.js';
import { QuestionsModule } from './questions/questions.module.js';
import { ResponsesModule } from './responses/responses.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration], validate: validateEnvironment }),
    LoggerModule.forRoot({ pinoHttp: { level: process.env.LOG_LEVEL ?? 'info', genReqId: (req) => req.headers['x-request-id']?.toString() ?? crypto.randomUUID(), redact: ['req.headers.authorization', 'req.headers.cookie'] } }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    DatabaseModule,
    HealthModule,
    AuthModule,
    UsersModule,
    SurveysModule,
    QuestionsModule,
    ResponsesModule,
  ],
  providers: [AppConfigService],
})
export class AppModule {}
