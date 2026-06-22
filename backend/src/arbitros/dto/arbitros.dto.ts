import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateArbitroDto {
  @IsString() @MaxLength(150) nombre: string;
  @IsOptional() @IsString() @MaxLength(30) telefono?: string;
  @IsOptional() @IsEmail() email?: string;
}

export class UpdateArbitroDto {
  @IsOptional() @IsString() @MaxLength(150) nombre?: string;
  @IsOptional() @IsString() @MaxLength(30) telefono?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() estado?: 'activo' | 'inactivo';
}
