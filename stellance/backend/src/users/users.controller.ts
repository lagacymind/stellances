import {
  Controller,
  Get,
  Patch,
  Body,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import type { Request } from 'express';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import type { User } from '../generated/prisma/client';

interface AuthRequest extends Request {
  user?: { id?: string };
}

export type UserProfile = Omit<User, 'password'>;

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @ApiOperation({ summary: 'Get the authenticated user profile' })
  @Get('me')
  async me(@Req() req: AuthRequest): Promise<UserProfile> {
    const userId = req.user?.id;
    if (!userId) throw new UnauthorizedException();

    const user = await this.usersService.findOneById(userId);
    if (!user) throw new UnauthorizedException();

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...profile } = user;
    return profile;
  }

  @ApiOperation({
    summary:
      'Update profile — set name and/or Stellar public key for Freighter signing',
  })
  @Patch('me')
  async updateMe(
    @Req() req: AuthRequest,
    @Body() dto: UpdateProfileDto,
  ): Promise<UserProfile> {
    const userId = req.user?.id;
    if (!userId) throw new UnauthorizedException();

    const user = await this.usersService.updateProfile(userId, dto);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...profile } = user;
    return profile;
  }
}
