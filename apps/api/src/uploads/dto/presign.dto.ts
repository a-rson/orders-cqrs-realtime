import { IsInt, IsNotEmpty, IsString, Max, Min } from 'class-validator';

export class PresignRequestDto {
  @IsString()
  @IsNotEmpty()
  tenantId!: string;

  @IsString()
  @IsNotEmpty()
  filename!: string;

  @IsString()
  @IsNotEmpty()
  contentType!: string;

  @IsInt()
  @Min(1)
  @Max(50 * 1024 * 1024) // max 50MB
  size!: number;
}
