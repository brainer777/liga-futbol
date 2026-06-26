import { IsIn, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class CreateLigaDto {
  @IsString() @MinLength(2) @MaxLength(100) nombre: string;

  // Identificador en URLs públicas (/publico/:slug) y en el header X-Liga-Slug.
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'El slug debe ser minúsculas, números y guiones (kebab-case), p.ej. "liga-norte".',
  })
  slug: string;
}

export class UpdateLigaDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(100) nombre?: string;
  @IsOptional() @IsIn(['activo', 'inactivo']) estado?: 'activo' | 'inactivo';
}
