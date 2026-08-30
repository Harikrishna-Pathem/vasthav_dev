import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { SurveysController } from './surveys.controller.js';
import { SurveysService } from './surveys.service.js';

@Module({
  imports: [AuthModule],
  controllers: [SurveysController],
  providers: [SurveysService],
})
export class SurveysModule {}
