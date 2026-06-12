import { IsDateString, IsIn, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateJugadorDto {
  @IsString() @MaxLength(150) nombres: string;
  @IsString() @MaxLength(150) apellidos: string;
  @IsDateString() fechaNacimiento: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1900) anioNacimiento?: number;
  @IsOptional() @IsIn(['DNI', 'CI', 'Pasaporte', 'Registro civil', 'Otro']) tipoDocumento?: string;
  @IsOptional() @IsString() @MaxLength(50) numeroDocumento?: string;
  @IsOptional() @IsString() @MaxLength(255) fotoUrl?: string;
  @IsOptional() @IsString() @MaxLength(1000) observaciones?: string;

  // Opcional: categoría a usar para validar la edad al crear
  @IsOptional() @IsString() categoriaId?: string;
}

export class UpdateJugadorDto {
  @IsOptional() @IsString() @MaxLength(150) nombres?: string;
  @IsOptional() @IsString() @MaxLength(150) apellidos?: string;
  @IsOptional() @IsDateString() fechaNacimiento?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1900) anioNacimiento?: number;
  @IsOptional() @IsIn(['DNI', 'CI', 'Pasaporte', 'Registro civil', 'Otro']) tipoDocumento?: string;
  @IsOptional() @IsString() @MaxLength(50) numeroDocumento?: string;
  @IsOptional() @IsString() @MaxLength(255) fotoUrl?: string;
  @IsOptional() @IsString() @MaxLength(1000) observaciones?: string;
  @IsOptional() @IsIn(['pendiente', 'habilitado', 'observado', 'rechazado', 'suspendido']) estadoValidacion?: string;
}
