import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { TranslationResolverService } from '../translations/translation-resolver.service.js';
import { QuestionsController } from './questions.controller.js';
import { QuestionsService } from './questions.service.js';

@Module({
  imports: [AuthModule],
  controllers: [QuestionsController],
  providers: [QuestionsService, TranslationResolverService],
})
export class QuestionsModule {}
