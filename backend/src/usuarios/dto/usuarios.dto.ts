import { IsArray, IsEmail, IsOptional, IsString, MinLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Asignación de un rol a un usuario, anclada a una liga (multi-liga). El rol de
 * plataforma (Superadministrador) va SIN liga (`ligaSlug` null/ausente → ligaId
 * null); cualquier otro rol DEBE indicar la liga a la que aplica.
 */
export class RolAsignacionDto {
  @IsString() nombre: string;
  @IsOptional() @IsString() ligaSlug?: string | null;
}

export class CreateUsuarioDto {
  @IsString()
  @MinLength(2)
  nombre: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RolAsignacionDto)
  roles?: RolAsignacionDto[];
}

export class UpdateUsuarioDto {
  @IsOptional() @IsString() nombre?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() @MinLength(6) password?: string;
  @IsOptional() estado?: 'activo' | 'inactivo' | 'bloqueado';
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RolAsignacionDto)
  roles?: RolAsignacionDto[];
}
