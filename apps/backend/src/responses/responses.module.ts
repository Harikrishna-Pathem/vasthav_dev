import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { ResponsesController } from './responses.controller.js';
import { ResponsesService } from './responses.service.js';

@Module({
  imports: [AuthModule],
  controllers: [ResponsesController],
  providers: [ResponsesService],
})
export class ResponsesModule {}