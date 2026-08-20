import { IsOptional, IsString, MaxLength } from 'class-validator';
import { IsOptionalEmail } from '../../common/validators';

export class CreateArbitroDto {
  @IsString() @MaxLength(150) nombre: string;
  @IsOptional() @IsString() @MaxLength(30) telefono?: string;
  @IsOptionalEmail() email?: string;
}

export class UpdateArbitroDto {
  @IsOptional() @IsString() @MaxLength(150) nombre?: string;
  @IsOptional() @IsString() @MaxLength(30) telefono?: string;
  @IsOptionalEmail() email?: string;
  @IsOptional() estado?: 'activo' | 'inactivo';
}
