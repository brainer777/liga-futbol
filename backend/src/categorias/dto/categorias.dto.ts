import { IsBoolean, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateCategoriaDto {
  @IsString()
  @MaxLength(30)
  nombre: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  edadMinima?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  edadMaxima?: number;

  @IsOptional()
  @IsBoolean()
  permiteSinCedula?: boolean;

  @IsOptional()
  @IsBoolean()
  validaPorAnioNacimiento?: boolean;
}

export class UpdateCategoriaDto {
  @IsOptional() @IsString() @MaxLength(30) nombre?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) edadMinima?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) edadMaxima?: number;
  @IsOptional() @IsBoolean() permiteSinCedula?: boolean;
  @IsOptional() @IsBoolean() validaPorAnioNacimiento?: boolean;
  @IsOptional() estado?: 'activo' | 'inactivo';
}
