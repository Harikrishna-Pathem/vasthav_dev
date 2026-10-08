import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { ConstituenciesController } from './constituencies.controller.js';
import { ConstituenciesService } from './constituencies.service.js';

@Module({
  imports: [AuthModule],
  controllers: [ConstituenciesController],
  providers: [ConstituenciesService],
})
export class ConstituenciesModule {}
