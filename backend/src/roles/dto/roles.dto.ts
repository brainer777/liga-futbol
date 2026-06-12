import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateRolDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  nombre: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  descripcion?: string;
}

export class UpdateRolDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  nombre?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  descripcion?: string;

  @IsOptional()
  estado?: 'activo' | 'inactivo';
}
