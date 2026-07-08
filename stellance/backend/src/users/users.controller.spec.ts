import { UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

type ReqWithUser = Request & { user?: { id?: string } };

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
  describe('GET /users/me', () => {
    it('returns the user profile without the password field', async () => {
      const findMock = jest.fn().mockResolvedValue(fullUser);
      const usersService = { findOneById: findMock } as unknown as UsersService;
      const controller = new UsersController(usersService);
      const req = { user: { id: fullUser.id } } as ReqWithUser;

      const result = await controller.me(req);

      expect(result).not.toHaveProperty('password');
      expect(result).toMatchObject({
        id: fullUser.id,
        email: fullUser.email,
        name: fullUser.name,
        role: 'CLIENT',
      });
      expect(findMock).toHaveBeenCalledWith(fullUser.id);
    });

    it('throws UnauthorizedException when req.user is missing', async () => {
      const findMock = jest.fn();
      const usersService = { findOneById: findMock } as unknown as UsersService;
      const controller = new UsersController(usersService);
      const req = {} as ReqWithUser;

      await expect(controller.me(req)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(findMock).not.toHaveBeenCalled();
    });

    it('throws UnauthorizedException when req.user.id is undefined', async () => {
      const findMock = jest.fn();
      const usersService = { findOneById: findMock } as unknown as UsersService;
      const controller = new UsersController(usersService);
      const req = { user: {} } as ReqWithUser;

      await expect(controller.me(req)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('throws UnauthorizedException when no user record is found in the database', async () => {
      const findMock = jest.fn().mockResolvedValue(null);
      const usersService = { findOneById: findMock } as unknown as UsersService;
      const controller = new UsersController(usersService);
      const req = { user: { id: 'non-existent-id' } } as ReqWithUser;

      await expect(controller.me(req)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('does not expose password in the returned profile', async () => {
      const findMock = jest
        .fn()
        .mockResolvedValue({ ...fullUser, tokenVersion: 5 });
      const usersService = { findOneById: findMock } as unknown as UsersService;
      const controller = new UsersController(usersService);
      const req = { user: { id: fullUser.id } } as ReqWithUser;

      const result = await controller.me(req);
      expect(result).not.toHaveProperty('password');
    });
  });
});
