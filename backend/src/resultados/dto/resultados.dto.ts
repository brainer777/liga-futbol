import { IsArray, IsBoolean, IsIn, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class ResultadoEventoDto {
  @IsIn(['gol', 'gol_en_contra', 'asistencia', 'amarilla', 'roja', 'doble_amarilla', 'cambio', 'otro'])
  tipo: 'gol' | 'gol_en_contra' | 'asistencia' | 'amarilla' | 'roja' | 'doble_amarilla' | 'cambio' | 'otro';

  @IsUUID() jugadorId: string;

  @IsUUID() equipoId: string;

  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(130) minuto?: number;

  @IsOptional() @IsString() @MaxLength(500) observaciones?: string;
}

export class RegistrarResultadoDto {
  @IsUUID() partidoId: string;

  @Type(() => Number) @IsInt() @Min(0) @Max(99) golesLocal: number;

  @Type(() => Number) @IsInt() @Min(0) @Max(99) golesVisitante: number;

  @IsOptional() @IsString() @MaxLength(2000) observaciones?: string;

  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => ResultadoEventoDto)
  eventos?: ResultadoEventoDto[];

  @IsOptional() @IsBoolean() cerrar?: boolean; // Si true, marca el partido como finalizado
}

export class UpdateResultadoDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(99) golesLocal?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(99) golesVisitante?: number;
  @IsOptional() @IsString() @MaxLength(2000) observaciones?: string;
}

export class CerrarResultadoDto {
  @IsOptional() @IsString() @MaxLength(2000) observaciones?: string;
}

export class UpdateSancionDto {
  @IsOptional() @IsIn(['pendiente', 'cumplida', 'condonada', 'anulada'])
  estado?: 'pendiente' | 'cumplida' | 'condonada' | 'anulada';

  @IsOptional() @Type(() => Number) @IsInt() @Min(0)
  fechasCumplidas?: number;
}
