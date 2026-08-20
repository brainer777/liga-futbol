import { IsArray, IsBoolean, IsIn, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class ImportarJugadorFilaDto {
  @IsString() @MaxLength(150) club: string;
  @IsString() @MaxLength(150) categoria: string;
  @IsString() @MaxLength(150) nombres: string;
  @IsString() @MaxLength(150) apellidos: string;
  @IsString() fechaNacimiento: string;
  @IsOptional() @IsString() anioNacimiento?: string;
  @IsOptional() @IsIn(['DNI', 'CI', 'Pasaporte', 'Registro civil', 'Otro', '']) tipoDocumento?: string;
  @IsOptional() @IsString() @MaxLength(50) numeroDocumento?: string;
  @IsOptional() @IsString() dorsal?: string;
  @IsOptional() @IsString() @MaxLength(50) posicion?: string;
}

export class ImportarJugadoresDto {
  @IsArray() @ValidateNested({ each: true }) @Type(() => ImportarJugadorFilaDto)
  filas: ImportarJugadorFilaDto[];

  /** false (default) = solo valida y devuelve el diagnóstico por fila, sin crear nada. */
  @IsOptional() @IsBoolean() confirmar?: boolean;
}
