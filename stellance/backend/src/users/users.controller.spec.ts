import { UnauthorizedException, ConflictException } from '@nestjs/common';
import type { Request } from 'express';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

type AuthReq = Request & { user?: { id?: string } };

const fullUser = {
  id: '00000000-0000-0000-0000-000000000001',
  email: 'alice@example.com',
  name: 'Alice Smith',
  role: 'CLIENT' as const,
  password: '$argon2id$hashed',
  stellarPublicKey: null,
  tokenVersion: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('UsersController', () => {
  function setup() {
    const usersService = {
      findOneById: jest.fn(),
      updateProfile: jest.fn(),
    } as unknown as UsersService;
    const controller = new UsersController(usersService);
    return { usersService, controller };
  }

  describe('GET /users/me', () => {
    it('returns profile without password', async () => {
      const { usersService, controller } = setup();
      (usersService.findOneById as jest.Mock).mockResolvedValue(fullUser);
      const req = { user: { id: fullUser.id } } as AuthReq;

      const result = await controller.me(req);

      expect(result).not.toHaveProperty('password');
      expect(result).toMatchObject({ id: fullUser.id, email: fullUser.email });
    });

    it('throws UnauthorizedException when req.user is missing', async () => {
      const { controller } = setup();
      await expect(controller.me({} as AuthReq)).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('throws UnauthorizedException when user not found in db', async () => {
      const { usersService, controller } = setup();
      (usersService.findOneById as jest.Mock).mockResolvedValue(null);
      await expect(
        controller.me({ user: { id: 'ghost' } } as AuthReq),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe('PATCH /users/me', () => {
    it('updates stellarPublicKey and returns profile without password', async () => {
      const stellar = 'GCEZWKCA5VLDNRLN3RPRJMRZOX3Z6G5CHCGZBL0NC4LS6LD2XHYACR7';
      const { usersService, controller } = setup();
      (usersService.updateProfile as jest.Mock).mockResolvedValue({
        ...fullUser,
        stellarPublicKey: stellar,
      });
      const req = { user: { id: fullUser.id } } as AuthReq;

      const result = await controller.updateMe(req, { stellarPublicKey: stellar });

      expect(result).not.toHaveProperty('password');
      expect(result.stellarPublicKey).toBe(stellar);
      expect(usersService.updateProfile).toHaveBeenCalledWith(fullUser.id, {
        stellarPublicKey: stellar,
      });
    });

    it('throws UnauthorizedException when req.user is missing', async () => {
      const { controller } = setup();
      await expect(
        controller.updateMe({} as AuthReq, { name: 'X' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('propagates ConflictException from service when key is taken', async () => {
      const { usersService, controller } = setup();
      (usersService.updateProfile as jest.Mock).mockRejectedValue(
        new ConflictException('Stellar public key already registered to another account'),
      );
      await expect(
        controller.updateMe(
          { user: { id: fullUser.id } } as AuthReq,
          { stellarPublicKey: 'GCEZWKCA5VLDNRLN3RPRJMRZOX3Z6G5CHCGZBL0NC4LS6LD2XHYACR7' },
        ),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });
});
