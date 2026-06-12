import { IsBoolean, IsIn, IsInt, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateTorneoDto {
  @IsUUID() temporadaId: string;
  @IsUUID() categoriaId: string;
  @IsString() @MaxLength(150) nombre: string;

  @IsOptional() @IsString() @MaxLength(50) formato?: string;

  @IsOptional() @Type(() => Number) @IsInt() puntosVictoria?: number;
  @IsOptional() @Type(() => Number) @IsInt() puntosEmpate?: number;
  @IsOptional() @Type(() => Number) @IsInt() puntosDerrota?: number;

  @IsOptional() @IsString() @IsIn([
    'diferencia_goles',
    'gol_average',
    'enfrentamiento_directo',
    'goles_favor',
    'partido_extra',
  ])
  criterioDesempate?: string;

  @IsOptional() @IsBoolean() permiteReprogramacion?: boolean;
}

export class UpdateTorneoDto {
  @IsOptional() @IsString() @MaxLength(150) nombre?: string;
  @IsOptional() @IsString() @MaxLength(50) formato?: string;
  @IsOptional() @Type(() => Number) @IsInt() puntosVictoria?: number;
  @IsOptional() @Type(() => Number) @IsInt() puntosEmpate?: number;
  @IsOptional() @Type(() => Number) @IsInt() puntosDerrota?: number;
  @IsOptional() @IsString() criterioDesempate?: string;
  @IsOptional() @IsBoolean() permiteReprogramacion?: boolean;
  @IsOptional() @IsString() @IsIn(['borrador', 'activo', 'en_curso', 'finalizado', 'cancelado'])
  estado?: string;
}
