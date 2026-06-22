import { IsArray, IsDateString, IsIn, IsInt, IsObject, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class GenerarEliminatoriasDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(2) clasificadosPorGrupo?: number;
}

export class AvanzarEliminatoriaDto {
  /** Map partidoId → equipoId ganador, para resolver llaves empatadas (penales/repetición). */
  @IsOptional() @IsObject() ganadores?: Record<string, string>;
}

export class GenerarFixtureDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(2) @Max(32) cantidadGrupos?: number;
  @IsOptional() @IsIn([1, 2]) clasificadosPorGrupo?: 1 | 2;
  @IsOptional() gruposIdaVuelta?: boolean;
  @IsOptional() siembraOrdenada?: boolean;
  /** Si se pasa, no se vuelven a generar; útil para regenerar */
  @IsOptional() @IsString() fechaInicio?: string; // ISO date, se asigna como fecha_programada del primer cruce
  @IsOptional() @IsString() horaDefault?: string; // 'HH:mm' para asignar a los partidos
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(14) diasEntreJornadas?: number;
}

export class UpdatePartidoDto {
  @IsOptional() @IsDateString() fechaProgramada?: string;
  @IsOptional() @IsString() @MaxLength(8) horaProgramada?: string;
  @IsOptional() @IsString() @MaxLength(120) cancha?: string;
  @IsOptional() @IsUUID() arbitroId?: string;
  @IsOptional() @IsUUID() sedeId?: string;
  @IsOptional() @IsIn(['borrador', 'programado', 'en_juego', 'finalizado', 'suspendido', 'reprogramado', 'cancelado'])
  estado?: string;
  @IsOptional() @IsString() @MaxLength(2000) observaciones?: string;
}

export class ReprogramarPartidoDto {
  @IsOptional() @IsDateString() fechaProgramada?: string;
  @IsOptional() @IsString() @MaxLength(8) horaProgramada?: string;
  @IsOptional() @IsString() @MaxLength(120) cancha?: string;
  @IsString() @MaxLength(500) motivo: string;
}
