import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsNotEmpty, IsOptional, MinLength } from 'class-validator';
import { UserRole } from '../../generated/prisma/client';

export class RegisterDto {
  @ApiProperty({
    example: 'alice@example.com',
    description: 'Email address for the new account. Must be unique.',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'correct-horse-battery',
    description: 'Password — minimum 6 characters.',
    minLength: 6,
  })
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @ApiProperty({
    example: 'Alice Smith',
    description: 'Display name shown on the platform.',
  })
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    enum: UserRole,
    example: UserRole.CLIENT,
    description: 'Account role. Defaults to CLIENT if omitted.',
  })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}
