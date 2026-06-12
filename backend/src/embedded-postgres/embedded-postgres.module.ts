import { Global, Module } from '@nestjs/common';
import { EmbeddedPostgresService } from './embedded-postgres.service';

@Global()
@Module({
  providers: [EmbeddedPostgresService],
  exports: [EmbeddedPostgresService],
})
export class EmbeddedPostgresModule {}
