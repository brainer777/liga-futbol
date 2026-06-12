import { IsDateString, IsIn, IsNumber, IsOptional, IsPositive, IsString, IsUUID, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePagoDto {
  @IsUUID() inscripcionId: string;
  @Type(() => Number) @IsNumber() @IsPositive() monto: number;
  @IsIn(['efectivo', 'transferencia']) metodoPago: 'efectivo' | 'transferencia';
  @IsOptional() @IsString() @MaxLength(50) numeroRecibo?: string;
  @IsOptional() @IsString() @MaxLength(80) referenciaTransferencia?: string;
  @IsOptional() @IsString() @MaxLength(1000) observaciones?: string;
  @IsOptional() @IsString() comprobanteUrl?: string;
  @IsOptional() @IsDateString() fechaPago?: string;
}
