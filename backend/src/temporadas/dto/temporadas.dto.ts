import { IsDateString, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateTemporadaDto {
  @IsString() @MaxLength(100) nombre: string;
  @Type(() => Number) @IsInt() @Min(2000) anio: number;
  @IsDateString() fechaInicio: string;
  @IsDateString() fechaFin: string;
}

export class UpdateTemporadaDto {
  @IsOptional() @IsString() @MaxLength(100) nombre?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(2000) anio?: number;
  @IsOptional() @IsDateString() fechaInicio?: string;
  @IsOptional() @IsDateString() fechaFin?: string;
  @IsOptional() estado?: 'activa' | 'cerrada' | 'planificada';
}
