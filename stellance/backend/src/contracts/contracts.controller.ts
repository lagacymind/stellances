import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Req,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import type { Request } from 'express';
import { ContractsService } from './contracts.service';
import { CreateContractDto } from './dto/create-contract.dto';
import { ConfirmFundDto, DisputeDto, ResolveDisputeDto } from './dto/contract-action.dto';
import { UserRole } from '../generated/prisma/client';

interface AuthRequest extends Request {
  user: { id: string; role: UserRole };
}

@ApiTags('contracts')
@ApiBearerAuth()
@Controller('contracts')
export class ContractsController {
  constructor(private readonly contractsService: ContractsService) {}

  @ApiOperation({ summary: 'Create a contract + milestones (CLIENT)' })
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Req() req: AuthRequest, @Body() dto: CreateContractDto) {
    return this.contractsService.create(req.user.id, dto);
  }

  @ApiOperation({ summary: 'List contracts for the authenticated user' })
  @ApiQuery({ name: 'as', enum: ['client', 'freelancer'], required: false })
  @Get()
  findAll(
    @Req() req: AuthRequest,
    @Query('as') as_?: 'client' | 'freelancer',
  ) {
    return this.contractsService.findAll(req.user.id, req.user.role, as_);
  }

  @ApiOperation({ summary: 'Get one contract by id' })
  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: AuthRequest) {
    return this.contractsService.findOne(id, req.user.id, req.user.role);
  }

  @ApiOperation({ summary: 'Confirm escrow funded — submit Stellar tx hash (CLIENT)' })
  @Post(':id/confirm-fund')
  @HttpCode(HttpStatus.OK)
  confirmFund(
    @Param('id') id: string,
    @Req() req: AuthRequest,
    @Body() dto: ConfirmFundDto,
  ) {
    return this.contractsService.confirmFund(id, req.user.id, dto.txHash);
  }

  @ApiOperation({ summary: 'Freelancer submits a milestone for review' })
  @Patch(':id/milestones/:mid/submit')
  @HttpCode(HttpStatus.OK)
  submitMilestone(
    @Param('id') id: string,
    @Param('mid') mid: string,
    @Req() req: AuthRequest,
  ) {
    return this.contractsService.submitMilestone(id, mid, req.user.id);
  }

  @ApiOperation({ summary: 'Client approves a milestone — triggers on-chain release_milestone()' })
  @Patch(':id/milestones/:mid/approve')
  @HttpCode(HttpStatus.OK)
  approveMilestone(
    @Param('id') id: string,
    @Param('mid') mid: string,
    @Req() req: AuthRequest,
  ) {
    return this.contractsService.approveMilestone(id, mid, req.user.id);
  }

  @ApiOperation({ summary: 'Raise a dispute on a contract' })
  @Post(':id/dispute')
  @HttpCode(HttpStatus.OK)
  dispute(
    @Param('id') id: string,
    @Req() req: AuthRequest,
    @Body() dto: DisputeDto,
  ) {
    return this.contractsService.dispute(id, req.user.id, dto.reason);
  }

  @ApiOperation({ summary: 'Admin resolves a dispute' })
  @Patch('admin/:id/resolve')
  @HttpCode(HttpStatus.OK)
  resolve(
    @Param('id') id: string,
    @Req() req: AuthRequest,
    @Body() dto: ResolveDisputeDto,
  ) {
    return this.contractsService.resolveDispute(id, req.user.id, req.user.role, dto);
  }

  @ApiOperation({ summary: 'Cancel a contract' })
  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  cancel(@Param('id') id: string, @Req() req: AuthRequest) {
    return this.contractsService.cancel(id, req.user.id, req.user.role);
  }
}
