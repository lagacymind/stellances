import { ApiProperty } from '@nestjs/swagger';
import {
  IsUUID,
  IsArray,
  IsString,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  MaxLength,
  ArrayMinSize,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class MilestoneInputDto {
  @ApiProperty({ example: 'Initial design mockups' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @ApiProperty({ example: 400.0 })
  @IsNumber({ maxDecimalPlaces: 7 })
  @IsPositive()
  amount: number;
}

export class CreateContractDto {
  @ApiProperty({ example: 'job-uuid-here' })
  @IsUUID()
  jobId: string;

  @ApiProperty({ example: 'freelancer-uuid-here' })
  @IsUUID()
  freelancerId: string;

  @ApiProperty({ type: [MilestoneInputDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => MilestoneInputDto)
  milestones: MilestoneInputDto[];
}
