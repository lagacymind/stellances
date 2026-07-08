import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    example: 'alice@example.com',
    description: 'Email address for the account.',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'correct-horse-battery',
    description: 'Account password.',
  })
  @IsNotEmpty()
  password: string;
}
