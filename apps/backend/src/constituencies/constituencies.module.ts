import { Module } from '@nestjs/common';
import { ConstituenciesController } from './constituencies.controller.js';
import { ConstituenciesService } from './constituencies.service.js';

@Module({ controllers: [ConstituenciesController], providers: [ConstituenciesService] })
export class ConstituenciesModule {}
