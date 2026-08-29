import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppConfigService {
  constructor(private readonly config: ConfigService) {}
  get port(): number { return this.config.getOrThrow<number>('app.port'); }
  get apiPrefix(): string { return this.config.getOrThrow<string>('app.apiPrefix'); }
  get apiVersion(): string { return this.config.getOrThrow<string>('app.apiVersion'); }
  get corsOrigins(): string[] { return this.config.getOrThrow<string[]>('app.corsOrigins'); }
}
