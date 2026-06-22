import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateSedeDto {
  @IsString() @MaxLength(150) nombre: string;
  @IsOptional() @IsString() @MaxLength(255) direccion?: string;
}

export class UpdateSedeDto {
  @IsOptional() @IsString() @MaxLength(150) nombre?: string;
  @IsOptional() @IsString() @MaxLength(255) direccion?: string;
  @IsOptional() estado?: 'activo' | 'inactivo';
}
