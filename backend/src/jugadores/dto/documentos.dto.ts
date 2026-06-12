import { IsIn, IsInt, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateDocumentoDto {
  @IsString() jugadorId: string;
  @IsIn(['cedula', 'dni', 'pasaporte', 'partida_nacimiento', 'foto', 'autorizacion', 'otro'])
  tipoDocumento: string;
  @IsString() archivoUrl: string;
  @IsOptional() @IsString() @MaxLength(255) nombreArchivo?: string;
  @IsOptional() @IsString() @MaxLength(80) tipoArchivo?: string;
  @IsOptional() @IsInt() tamanoBytes?: number;
  @IsOptional() @IsString() @MaxLength(1000) observaciones?: string;
}

export class UpdateDocumentoDto {
  @IsOptional() @IsIn(['cedula', 'dni', 'pasaporte', 'partida_nacimiento', 'foto', 'autorizacion', 'otro'])
  tipoDocumento?: string;
  @IsOptional() @IsIn(['pendiente', 'aprobado', 'rechazado', 'vencido']) estado?: string;
  @IsOptional() @IsString() @MaxLength(1000) observaciones?: string;
}
