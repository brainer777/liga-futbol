import { Transform } from 'class-transformer';
import { IsEmail, IsOptional } from 'class-validator';
import { applyDecorators } from '@nestjs/common';

/**
 * @IsOptional() + @IsEmail() combo que además trata '' como "sin valor".
 * Los forms del frontend mandan '' (no undefined) en campos vacíos, y
 * class-validator's @IsOptional() solo bypassea con undefined/null.
 */
export function IsOptionalEmail() {
  return applyDecorators(
    IsOptional(),
    Transform(({ value }) => (value === '' ? undefined : value)),
    IsEmail(),
  );
}
