import { IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class UpdateConfiguracionDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  nombreLiga?: string;

  // Color en formato triple HSL "H S% L%" (lo que consume la variable CSS
  // --primary del frontend). Ej: "142 70% 35%". El frontend convierte el hex
  // del color picker a este formato antes de enviar.
  @IsOptional()
  @IsString()
  @MaxLength(50)
  @Matches(/^\d{1,3}(\.\d+)?\s+\d{1,3}(\.\d+)?%\s+\d{1,3}(\.\d+)?%$/, {
    message:
      'colorPrimario debe tener el formato HSL "H S% L%" (ej: "142 70% 35%")',
  })
  colorPrimario?: string;
}
