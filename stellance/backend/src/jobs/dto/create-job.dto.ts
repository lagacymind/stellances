import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsPositive,
  MaxLength,
} from 'class-validator';

export class CreateJobDto {
  @ApiProperty({ example: 'Build a Soroban escrow dApp' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @ApiProperty({ example: 'Looking for a Rust/Soroban developer...' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ example: 1200.0 })
  @IsNumber({ maxDecimalPlaces: 7 })
  @IsPositive()
  budget: number;

  @ApiProperty({ example: 'Smart Contracts' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  category: string;
}
