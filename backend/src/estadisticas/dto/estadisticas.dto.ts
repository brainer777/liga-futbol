import { IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

/** Filtros comunes para las estadísticas globales (cruzando torneos). */
export class EstadisticasQueryDto {
  @IsOptional()
  @IsUUID()
  temporadaId?: string;

  @IsOptional()
  @IsUUID()
  categoriaId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
