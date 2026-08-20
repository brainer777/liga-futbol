import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { IsOptionalEmail } from '../../common/validators';

export class CreateEquipoDto {
  @IsUUID() clubId: string;
  @IsUUID() categoriaId: string;
  @IsString() @MaxLength(150) nombre: string;
  @IsOptional() @IsString() @MaxLength(255) logoUrl?: string;
  @IsOptional() @IsString() @MaxLength(150) delegadoNombre?: string;
  @IsOptional() @IsString() @MaxLength(30) delegadoTelefono?: string;
  @IsOptionalEmail() delegadoEmail?: string;
}

export class UpdateEquipoDto {
  @IsOptional() @IsString() @MaxLength(150) nombre?: string;
  @IsOptional() @IsString() @MaxLength(255) logoUrl?: string;
  @IsOptional() @IsString() @MaxLength(150) delegadoNombre?: string;
  @IsOptional() @IsString() @MaxLength(30) delegadoTelefono?: string;
  @IsOptionalEmail() delegadoEmail?: string;
  @IsOptional() estado?: 'activo' | 'inactivo';
}
