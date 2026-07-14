import { ConflictException } from '@nestjs/common';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from '../generated/prisma/client';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const USER_ID = '00000000-0000-0000-0000-000000000001';
const STELLAR_KEY = 'GBRTMS47S23BWSFRDJ3DMEH2SVJN527SOGZVL2NWGUACOD4DUKQSJ3HR';

const baseUser = {
  id: USER_ID,
  email: 'alice@example.com',
  name: 'Alice',
  role: UserRole.CLIENT,
  password: '$argon2id$hashed',
  stellarPublicKey: null,
  tokenVersion: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
};

// ---------------------------------------------------------------------------
// Prisma stub
// ---------------------------------------------------------------------------

function makePrisma() {
  return {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };
}

function setup() {
  const prisma = makePrisma();
  const service = new UsersService(prisma as unknown as PrismaService);
  return { prisma, service };
}

// ---------------------------------------------------------------------------
// findOneByEmail()
// ---------------------------------------------------------------------------

describe('UsersService.findOneByEmail', () => {
  it('returns the user when found', async () => {
    const { prisma, service } = setup();
    prisma.user.findUnique.mockResolvedValue(baseUser);

    const result = await service.findOneByEmail('alice@example.com');

    expect(result).toEqual(baseUser);
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: 'alice@example.com' },
    });
  });

  it('returns null when no user matches the email', async () => {
    const { prisma, service } = setup();
    prisma.user.findUnique.mockResolvedValue(null);

    const result = await service.findOneByEmail('nobody@example.com');

    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// findOneById()
// ---------------------------------------------------------------------------

describe('UsersService.findOneById', () => {
  it('returns the user when found', async () => {
    const { prisma, service } = setup();
    prisma.user.findUnique.mockResolvedValue(baseUser);

    const result = await service.findOneById(USER_ID);

    expect(result).toEqual(baseUser);
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: USER_ID },
    });
  });

  it('returns null when no user matches the id', async () => {
    const { prisma, service } = setup();
    prisma.user.findUnique.mockResolvedValue(null);

    const result = await service.findOneById('non-existent-id');

    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// create()
// ---------------------------------------------------------------------------

describe('UsersService.create', () => {
  it('creates and returns a new user', async () => {
    const { prisma, service } = setup();
    prisma.user.create.mockResolvedValue(baseUser);

    const result = await service.create({
      email: 'alice@example.com',
      name: 'Alice',
      passwordHash: '$argon2id$hashed',
      role: UserRole.CLIENT,
    });

    expect(result).toEqual(baseUser);
    expect(prisma.user.create).toHaveBeenCalledWith({
      data: {
        email: 'alice@example.com',
        name: 'Alice',
        password: '$argon2id$hashed',
        role: UserRole.CLIENT,
      },
    });
  });

  it('maps passwordHash to the password field (never exposes raw hash key)', async () => {
    const { prisma, service } = setup();
    prisma.user.create.mockResolvedValue(baseUser);

    await service.create({
      email: 'bob@example.com',
      name: 'Bob',
      passwordHash: 'hash123',
      role: UserRole.FREELANCER,
    });

    const callArg = (
      prisma.user.create.mock.calls as Array<
        [{ data: Record<string, unknown> }]
      >
    )[0][0];
    // The Prisma column is called 'password', not 'passwordHash'
    expect(callArg.data).toHaveProperty('password', 'hash123');
    expect(callArg.data).not.toHaveProperty('passwordHash');
  });
});

// ---------------------------------------------------------------------------
// updateProfile()
// ---------------------------------------------------------------------------

describe('UsersService.updateProfile', () => {
  it('updates name when provided', async () => {
    const { prisma, service } = setup();
    prisma.user.update.mockResolvedValue({
      ...baseUser,
      name: 'Alice Updated',
    });

    const result = await service.updateProfile(USER_ID, {
      name: 'Alice Updated',
    });

    expect(result.name).toBe('Alice Updated');
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: USER_ID },
      data: { name: 'Alice Updated' },
    });
    // No stellarPublicKey uniqueness check when key is not provided
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('updates stellarPublicKey when the key is not already taken', async () => {
    const { prisma, service } = setup();
    // findUnique for uniqueness check returns null (key not taken)
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.update.mockResolvedValue({
      ...baseUser,
      stellarPublicKey: STELLAR_KEY,
    });

    const result = await service.updateProfile(USER_ID, {
      stellarPublicKey: STELLAR_KEY,
    });

    expect(result.stellarPublicKey).toBe(STELLAR_KEY);
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { stellarPublicKey: STELLAR_KEY },
      select: { id: true },
    });
    expect(prisma.user.update).toHaveBeenCalled();
  });

  it('allows updating to a key already owned by the same user', async () => {
    const { prisma, service } = setup();
    // findUnique returns the same user — same id, so no conflict
    prisma.user.findUnique.mockResolvedValue({ id: USER_ID });
    prisma.user.update.mockResolvedValue({
      ...baseUser,
      stellarPublicKey: STELLAR_KEY,
    });

    await expect(
      service.updateProfile(USER_ID, { stellarPublicKey: STELLAR_KEY }),
    ).resolves.toBeDefined();

    expect(prisma.user.update).toHaveBeenCalled();
  });

  it('throws ConflictException when stellarPublicKey is already registered to another account', async () => {
    const { prisma, service } = setup();
    // findUnique returns a DIFFERENT user
    prisma.user.findUnique.mockResolvedValue({ id: 'other-user-id' });

    await expect(
      service.updateProfile(USER_ID, { stellarPublicKey: STELLAR_KEY }),
    ).rejects.toBeInstanceOf(ConflictException);

    // DB update must NOT be called when the key is already taken
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('skips the uniqueness check entirely when no stellarPublicKey is provided', async () => {
    const { prisma, service } = setup();
    prisma.user.update.mockResolvedValue({ ...baseUser, name: 'New Name' });

    await service.updateProfile(USER_ID, { name: 'New Name' });

    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('omits undefined fields from the update payload', async () => {
    const { prisma, service } = setup();
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.update.mockResolvedValue({
      ...baseUser,
      stellarPublicKey: STELLAR_KEY,
    });

    await service.updateProfile(USER_ID, { stellarPublicKey: STELLAR_KEY });

    const callArg = (
      prisma.user.update.mock.calls as Array<
        [{ data: Record<string, unknown> }]
      >
    )[0][0];
    // name was not provided — must not appear in the update payload
    expect(callArg.data).not.toHaveProperty('name');
    expect(callArg.data).toHaveProperty('stellarPublicKey', STELLAR_KEY);
  });
});
