import { IsOptional, IsString, MaxLength } from 'class-validator';
import { IsOptionalEmail } from '../../common/validators';

export class CreateClubDto {
  @IsString() @MaxLength(150) nombre: string;
  @IsOptional() @IsString() @MaxLength(20) sigla?: string;
  @IsOptional() @IsString() @MaxLength(150) representante?: string;
  @IsOptional() @IsString() @MaxLength(30) telefono?: string;
  @IsOptionalEmail() email?: string;
  @IsOptional() @IsString() @MaxLength(255) direccion?: string;
  @IsOptional() @IsString() logoUrl?: string;
}

export class UpdateClubDto {
  @IsOptional() @IsString() @MaxLength(150) nombre?: string;
  @IsOptional() @IsString() @MaxLength(20) sigla?: string;
  @IsOptional() @IsString() @MaxLength(150) representante?: string;
  @IsOptional() @IsString() @MaxLength(30) telefono?: string;
  @IsOptionalEmail() email?: string;
  @IsOptional() @IsString() @MaxLength(255) direccion?: string;
  @IsOptional() @IsString() logoUrl?: string;
  @IsOptional() estado?: 'activo' | 'inactivo';
}
