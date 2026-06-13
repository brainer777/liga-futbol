import { IsDateString, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
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

  // Equipo al que se asigna el jugador al crearlo (obligatorio): la categoría
  // para validar la edad sale del equipo y el vínculo (EquipoJugador) se crea
  // en la misma transacción. La obligatoriedad se valida en el service para dar
  // un mensaje claro en español.
  @IsOptional() @IsString() equipoId?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(99) dorsal?: number;
  @IsOptional() @IsString() @MaxLength(50) posicion?: string;
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
