import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, MaxLength, Matches } from 'class-validator';

export class UpdateProfileDto {
  @ApiProperty({ example: 'Alice Smith', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiProperty({
    example: 'GCEZWKCA5VLDNRLN3RPRJMRZOX3Z6G5CHCGZBL0NC4LS6LD2XHYACR7',
    description: 'Stellar public key (G... address) — required to sign escrow transactions via Freighter',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Matches(/^G[A-Z2-7]{55}$/, {
    message: 'stellarPublicKey must be a valid Stellar public key (starts with G, 56 chars)',
  })
  stellarPublicKey?: string;
}
