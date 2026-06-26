import { Global, Module } from '@nestjs/common';
import { TenantContextService } from './tenant-context.service';

/** Contexto de tenant (liga) por request. Global para inyectarlo en cualquier servicio. */
@Global()
@Module({
  providers: [TenantContextService],
  exports: [TenantContextService],
})
export class TenantModule {}
