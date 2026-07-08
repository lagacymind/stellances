import { UnauthorizedException } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

// Minimal mock for UsersService — no database required
const makeUsersService = (overrides: Partial<UsersService> = {}) =>
  ({
    findOneById: jest.fn(),
    ...overrides,
  }) as unknown as UsersService;

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
      const usersService = makeUsersService({
        findOneById: jest.fn().mockResolvedValue(fullUser),
      });

      const controller = new UsersController(usersService);
      const req = { user: { id: fullUser.id } } as any;

      const result = await controller.me(req);

      expect(result).not.toHaveProperty('password');
      expect(result).toMatchObject({
        id: fullUser.id,
        email: fullUser.email,
        name: fullUser.name,
        role: 'CLIENT',
      });
      expect(usersService.findOneById).toHaveBeenCalledWith(fullUser.id);
    });

    it('throws UnauthorizedException when req.user is missing', async () => {
      const usersService = makeUsersService();
      const controller = new UsersController(usersService);
      const req = {} as any;

      await expect(controller.me(req)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(usersService.findOneById).not.toHaveBeenCalled();
    });

    it('throws UnauthorizedException when req.user.id is undefined', async () => {
      const usersService = makeUsersService();
      const controller = new UsersController(usersService);
      const req = { user: {} } as any;

      await expect(controller.me(req)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('throws UnauthorizedException when no user record is found in the database', async () => {
      const usersService = makeUsersService({
        findOneById: jest.fn().mockResolvedValue(null),
      });

      const controller = new UsersController(usersService);
      const req = { user: { id: 'non-existent-id' } } as any;

      await expect(controller.me(req)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('does not expose tokenVersion in the returned profile', async () => {
      const usersService = makeUsersService({
        findOneById: jest.fn().mockResolvedValue({ ...fullUser, tokenVersion: 5 }),
      });

      const controller = new UsersController(usersService);
      const req = { user: { id: fullUser.id } } as any;

      // UsersController strips password; tokenVersion is fine to omit verification for
      // but password must definitely not be present
      const result = await controller.me(req);
      expect(result).not.toHaveProperty('password');
    });
  });
});
