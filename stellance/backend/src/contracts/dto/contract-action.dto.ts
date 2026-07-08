import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsInt, Min, Max } from 'class-validator';

export class ConfirmFundDto {
  @ApiProperty({
    example: 'abc123def456...',
    description: 'Stellar tx hash from the fund() Soroban invocation',
  })
  @IsString()
  @IsNotEmpty()
  txHash: string;
}

export class DisputeDto {
  @ApiProperty({ example: 'Deliverable did not match agreed specification' })
  @IsString()
  @IsNotEmpty()
  reason: string;
}

export class ResolveDisputeDto {
  @ApiProperty({ enum: ['release', 'refund', 'split'], example: 'split' })
  @IsString()
  @IsNotEmpty()
  decision: 'release' | 'refund' | 'split';

  @ApiProperty({
    example: 6000,
    description: 'Basis points (0-10000) for freelancer share in a split.',
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10000)
  freelancerBps?: number;
}
