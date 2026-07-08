import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JobStatus, UserRole } from '../generated/prisma/client';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';

@Injectable()
export class JobsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(clientId: string, dto: CreateJobDto) {
    return this.prisma.job.create({
      data: {
        title: dto.title,
        description: dto.description,
        budget: dto.budget,
        category: dto.category,
        status: JobStatus.OPEN,
        clientId,
      },
    });
  }

  async findAll(filters?: { status?: JobStatus; clientId?: string }) {
    return this.prisma.job.findMany({
      where: {
        ...(filters?.status !== undefined && { status: filters.status }),
        ...(filters?.clientId !== undefined && { clientId: filters.clientId }),
      },
      include: {
        client: {
          select: { id: true, name: true, stellarPublicKey: true },
        },
        contract: { select: { id: true, status: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const job = await this.prisma.job.findUnique({
      where: { id },
      include: {
        client: {
          select: { id: true, name: true, stellarPublicKey: true },
        },
        contract: {
          select: { id: true, status: true, freelancerId: true },
        },
      },
    });
    if (!job) throw new NotFoundException(`Job ${id} not found`);
    return job;
  }

  async update(
    id: string,
    callerId: string,
    callerRole: UserRole,
    dto: UpdateJobDto,
  ) {
    const job = await this.findOne(id);

    if (job.clientId !== callerId && callerRole !== UserRole.ADMIN) {
      throw new ForbiddenException('Only the job owner can update this job');
    }
    if (job.status !== JobStatus.OPEN) {
      throw new BadRequestException('Only OPEN jobs can be updated');
    }

    return this.prisma.job.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.budget !== undefined && { budget: dto.budget }),
        ...(dto.category !== undefined && { category: dto.category }),
      },
    });
  }

  async cancel(id: string, callerId: string, callerRole: UserRole) {
    const job = await this.findOne(id);

    if (job.clientId !== callerId && callerRole !== UserRole.ADMIN) {
      throw new ForbiddenException('Only the job owner can cancel this job');
    }
    if (
      job.status === JobStatus.COMPLETED ||
      job.status === JobStatus.CANCELLED
    ) {
      throw new BadRequestException(`Job is already ${job.status}`);
    }
    if (job.contract) {
      throw new BadRequestException(
        'Cannot cancel a job that has an active contract',
      );
    }

    return this.prisma.job.update({
      where: { id },
      data: { status: JobStatus.CANCELLED },
    });
  }
}
