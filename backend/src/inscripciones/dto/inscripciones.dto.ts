import { IsDateString, IsNumber, IsOptional, IsPositive, IsString, IsUUID, Min, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateInscripcionDto {
  @IsUUID() torneoId: string;
  @IsUUID() equipoId: string;
  @Type(() => Number) @IsNumber() @IsPositive() costoInscripcion: number;
  @IsOptional() @IsDateString() fechaLimitePago?: string;
  @IsOptional() @IsString() @MaxLength(1000) observaciones?: string;
}

export class UpdateInscripcionDto {
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) costoInscripcion?: number;
  @IsOptional() @IsDateString() fechaLimitePago?: string;
  @IsOptional() @IsString() @MaxLength(1000) observaciones?: string;
  @IsOptional() estado?:
    | 'preinscrito'
    | 'pendiente_pago'
    | 'pago_parcial'
    | 'pagado'
    | 'aprobado'
    | 'observado'
    | 'rechazado'
    | 'vencido';
}
