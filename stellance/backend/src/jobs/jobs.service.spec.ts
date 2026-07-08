import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { JobStatus, UserRole } from '../generated/prisma/client';
import { PrismaServiceMock } from '../test-utils/prisma.mock';

const CLIENT_ID = 'client-uuid-001';
const JOB_ID = 'job-uuid-001';

const baseJob = {
  id: JOB_ID,
  title: 'Build Soroban escrow',
  description: 'Need a Rust dev',
  budget: '1200.0000000',
  category: 'Smart Contracts',
  status: JobStatus.OPEN,
  clientId: CLIENT_ID,
  createdAt: new Date(),
  updatedAt: new Date(),
  client: { id: CLIENT_ID, name: 'Alice', stellarPublicKey: null },
  contract: null,
};

describe('JobsService', () => {
  function setup() {
    const prisma = new PrismaServiceMock() as any;
    // Overlay jest mocks on top of the mock class methods
    prisma.job = {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    };
    const service = new JobsService(prisma);
    return { prisma, service };
  }

  describe('create', () => {
    it('creates a job with OPEN status', async () => {
      const { prisma, service } = setup();
      prisma.job.create.mockResolvedValue(baseJob);

      const result = await service.create(CLIENT_ID, {
        title: 'Build Soroban escrow',
        description: 'Need a Rust dev',
        budget: 1200,
        category: 'Smart Contracts',
      });

      expect(prisma.job.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: JobStatus.OPEN, clientId: CLIENT_ID }),
        }),
      );
      expect(result.status).toBe(JobStatus.OPEN);
    });
  });

  describe('findOne', () => {
    it('returns the job when found', async () => {
      const { prisma, service } = setup();
      prisma.job.findUnique.mockResolvedValue(baseJob);
      const result = await service.findOne(JOB_ID);
      expect(result.id).toBe(JOB_ID);
    });

    it('throws NotFoundException when job does not exist', async () => {
      const { prisma, service } = setup();
      prisma.job.findUnique.mockResolvedValue(null);
      await expect(service.findOne('nonexistent')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('update', () => {
    it('updates job when caller is owner', async () => {
      const { prisma, service } = setup();
      prisma.job.findUnique.mockResolvedValue(baseJob);
      prisma.job.update.mockResolvedValue({ ...baseJob, title: 'Updated' });

      const result = await service.update(JOB_ID, CLIENT_ID, UserRole.CLIENT, { title: 'Updated' });
      expect(result.title).toBe('Updated');
    });

    it('throws ForbiddenException when caller is not owner', async () => {
      const { prisma, service } = setup();
      prisma.job.findUnique.mockResolvedValue(baseJob);

      await expect(
        service.update(JOB_ID, 'other-user', UserRole.FREELANCER, { title: 'X' }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('throws BadRequestException when job is not OPEN', async () => {
      const { prisma, service } = setup();
      prisma.job.findUnique.mockResolvedValue({ ...baseJob, status: JobStatus.IN_PROGRESS });

      await expect(
        service.update(JOB_ID, CLIENT_ID, UserRole.CLIENT, { title: 'X' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('cancel', () => {
    it('cancels an OPEN job', async () => {
      const { prisma, service } = setup();
      prisma.job.findUnique.mockResolvedValue(baseJob);
      prisma.job.update.mockResolvedValue({ ...baseJob, status: JobStatus.CANCELLED });

      const result = await service.cancel(JOB_ID, CLIENT_ID, UserRole.CLIENT);
      expect(result.status).toBe(JobStatus.CANCELLED);
    });

    it('throws BadRequestException when job has a contract', async () => {
      const { prisma, service } = setup();
      prisma.job.findUnique.mockResolvedValue({
        ...baseJob,
        contract: { id: 'contract-001', status: 'ACTIVE' },
      });

      await expect(
        service.cancel(JOB_ID, CLIENT_ID, UserRole.CLIENT),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});
