import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateEquipoJugadorDto {
  @IsString() equipoId: string;
  @IsString() jugadorId: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(99) dorsal?: number;
  @IsOptional() @IsString() @MaxLength(50) posicion?: string;
}

export class UpdateEquipoJugadorDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(99) dorsal?: number;
  @IsOptional() @IsString() @MaxLength(50) posicion?: string;
  @IsOptional() @IsIn(['pendiente', 'habilitado', 'observado', 'rechazado', 'suspendido'])
  estadoHabilitacion?: string;
  @IsOptional() @IsString() @MaxLength(1000) motivoObservacion?: string;
}
