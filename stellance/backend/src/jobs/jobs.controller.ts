import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import type { Request } from 'express';
import { JobsService } from './jobs.service';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { JobStatus, UserRole } from '../generated/prisma/client';

interface AuthRequest extends Request {
  user: { id: string; role: UserRole };
}

@ApiTags('jobs')
@ApiBearerAuth()
@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @ApiOperation({ summary: 'Post a new job (CLIENT only)' })
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Req() req: AuthRequest, @Body() dto: CreateJobDto) {
    return this.jobsService.create(req.user.id, dto);
  }

  @ApiOperation({ summary: 'List all open jobs (marketplace)' })
  @ApiQuery({ name: 'status', enum: JobStatus, required: false })
  @ApiQuery({ name: 'mine', type: Boolean, required: false })
  @Get()
  findAll(
    @Req() req: AuthRequest,
    @Query('status') status?: JobStatus,
    @Query('mine') mine?: string,
  ) {
    const clientId = mine === 'true' ? req.user.id : undefined;
    return this.jobsService.findAll({ status, clientId });
  }

  @ApiOperation({ summary: 'Get a single job by id' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.jobsService.findOne(id);
  }

  @ApiOperation({ summary: 'Update a job (owner / admin)' })
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Req() req: AuthRequest,
    @Body() dto: UpdateJobDto,
  ) {
    return this.jobsService.update(id, req.user.id, req.user.role, dto);
  }

  @ApiOperation({ summary: 'Cancel a job (owner / admin)' })
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  cancel(@Param('id') id: string, @Req() req: AuthRequest) {
    return this.jobsService.cancel(id, req.user.id, req.user.role);
  }
}
