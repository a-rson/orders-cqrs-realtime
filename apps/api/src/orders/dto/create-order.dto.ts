import {
  IsArray,
  IsEmail,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class BuyerDto {
  @IsEmail() email!: string;
  @IsString() @MaxLength(120) name!: string;
}

class ItemDto {
  @IsString() @MaxLength(120) sku!: string;
  @IsInt() @IsPositive() qty!: number;
  @IsNumber() @IsPositive() price!: number;
}

class AttachmentDto {
  @IsString() filename!: string;
  @IsString() contentType!: string;
  @IsNumber() @IsPositive() @Max(50 * 1024 * 1024) size!: number; // limit 50MB (na start)
  @IsString() storageKey!: string;
}

export class CreateOrderDto {
  @IsString() requestId!: string;
  @IsString() tenantId!: string;

  @ValidateNested()
  @Type(() => BuyerDto)
  buyer!: BuyerDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ItemDto)
  items!: ItemDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => AttachmentDto)
  attachment?: AttachmentDto;
}
