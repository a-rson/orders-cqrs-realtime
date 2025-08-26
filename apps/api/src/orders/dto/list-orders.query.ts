import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class ListOrdersQuery {
  @IsString()
  tenantId!: string; // wymagamy jawnie; wszystko jest w kontekście tenant

  @IsOptional()
  @IsIn(['PENDING', 'PAID', 'CANCELLED'])
  status?: 'PENDING' | 'PAID' | 'CANCELLED';

  @IsOptional()
  @IsEmail()
  buyerEmail?: string;

  @IsOptional()
  @Transform(({ value }) => (value ? new Date(value) : undefined))
  from?: Date;

  @IsOptional()
  @Transform(({ value }) => (value ? new Date(value) : undefined))
  to?: Date;

  @Transform(({ value }) => parseInt(value ?? '1', 10))
  @IsInt()
  @Min(1)
  page: number = 1;

  @Transform(({ value }) => parseInt(value ?? '10', 10))
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 10;
}
