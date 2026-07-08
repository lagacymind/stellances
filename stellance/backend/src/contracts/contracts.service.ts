import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EscrowService } from '../escrow/escrow.service';
import {
  ContractStatus,
  JobStatus,
  MilestoneStatus,
  UserRole,
} from '../generated/prisma/client';
import { CreateContractDto } from './dto/create-contract.dto';
import { ResolveDisputeDto } from './dto/contract-action.dto';

@Injectable()
export class ContractsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly escrow: EscrowService,
  ) {}

  /**
   * POST /contracts
   *
   * Creates Contract + Milestone records, marks Job IN_PROGRESS.
   * Returns an unsigned XDR for the client to sign with Freighter to call
   * fund() on the Soroban escrow contract (non-custodial: key never leaves browser).
   */
  async create(clientId: string, dto: CreateContractDto) {
    const job = await this.prisma.job.findUnique({
      where: { id: dto.jobId },
      include: { contract: true },
    });
    if (!job) throw new NotFoundException(`Job ${dto.jobId} not found`);
    if (job.clientId !== clientId)
      throw new ForbiddenException('You do not own this job');
    if (job.status !== JobStatus.OPEN)
      throw new BadRequestException('Job is not OPEN');
    if (job.contract) throw new ConflictException('Job already has a contract');

    const freelancer = await this.prisma.user.findUnique({
      where: { id: dto.freelancerId },
      select: { id: true, stellarPublicKey: true },
    });
    if (!freelancer) throw new NotFoundException('Freelancer not found');

    const client = await this.prisma.user.findUnique({
      where: { id: clientId },
      select: { id: true, stellarPublicKey: true },
    });
    if (!client) throw new NotFoundException('Client not found');

    const totalAmount = dto.milestones.reduce((sum, m) => sum + m.amount, 0);

    const contract = await this.prisma.$transaction(async (tx) => {
      const c = await tx.contract.create({
        data: {
          jobId: dto.jobId,
          clientId,
          freelancerId: dto.freelancerId,
          status: ContractStatus.ACTIVE,
        },
      });
      await tx.milestone.createMany({
        data: dto.milestones.map((m) => ({
          contractId: c.id,
          title: m.title,
          amount: m.amount,
          status: MilestoneStatus.PENDING,
        })),
      });
      await tx.job.update({
        where: { id: dto.jobId },
        data: { status: JobStatus.IN_PROGRESS },
      });
      return c;
    });

    // Build unsigned XDR for Freighter signing (best-effort)
    let fundXdr: string | null = null;
    if (client.stellarPublicKey && freelancer.stellarPublicKey) {
      try {
        const adminKey = this.escrow.getAdminPublicKey();
        const tokenContractId =
          process.env.STELLAR_TOKEN_CONTRACT_ID ??
          'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC';
        fundXdr = await this.escrow.buildFundXdr({
          contractId: contract.id,
          clientPublicKey: client.stellarPublicKey,
          freelancerPublicKey: freelancer.stellarPublicKey,
          adminPublicKey: adminKey,
          amountStroops: BigInt(Math.round(totalAmount * 10_000_000)),
          tokenContractId,
        });
      } catch {
        // Non-fatal: requires live Soroban RPC. Frontend can retry.
      }
    }

    const full = await this.findOne(contract.id, clientId, UserRole.CLIENT);
    return { contract: full, fundXdr };
  }

  /**
   * POST /contracts/:id/confirm-fund
   *
   * Frontend calls this after submitting the signed fund() tx to Horizon.
   * Backend verifies the tx hash exists on Horizon, then records it.
   */
  async confirmFund(id: string, callerId: string, txHash: string) {
    const contract = await this._getContractOrThrow(id);
    if (contract.clientId !== callerId)
      throw new ForbiddenException('Only the client can confirm funding');
    if (contract.escrowTxHash)
      throw new ConflictException('Escrow already confirmed');

    await this.escrow.verifyTransaction(txHash);

    return this.prisma.contract.update({
      where: { id },
      data: { escrowTxHash: txHash },
      include: { milestones: true },
    });
  }

  async findAll(callerId: string, callerRole: UserRole, filter?: 'client' | 'freelancer') {
    const where =
      callerRole === UserRole.ADMIN
        ? {}
        : filter === 'freelancer'
          ? { freelancerId: callerId }
          : { clientId: callerId };

    return this.prisma.contract.findMany({
      where,
      include: {
        milestones: true,
        job: { select: { id: true, title: true } },
        client: { select: { id: true, name: true } },
        freelancer: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, callerId: string, callerRole: UserRole) {
    const contract = await this._getContractOrThrow(id);
    if (
      callerRole !== UserRole.ADMIN &&
      contract.clientId !== callerId &&
      contract.freelancerId !== callerId
    ) {
      throw new ForbiddenException('Access denied');
    }
    return contract;
  }

  async submitMilestone(contractId: string, milestoneId: string, callerId: string) {
    const contract = await this._getContractOrThrow(contractId);
    if (contract.freelancerId !== callerId)
      throw new ForbiddenException('Only the freelancer can submit milestones');
    if (contract.status !== ContractStatus.ACTIVE)
      throw new BadRequestException('Contract is not ACTIVE');

    const milestone = contract.milestones.find((m) => m.id === milestoneId);
    if (!milestone) throw new NotFoundException('Milestone not found');
    if (milestone.status !== MilestoneStatus.PENDING)
      throw new BadRequestException('Milestone must be PENDING to submit');

    return this.prisma.milestone.update({
      where: { id: milestoneId },
      data: { status: MilestoneStatus.IN_REVIEW },
    });
  }

  /**
   * PATCH /contracts/:id/milestones/:mid/approve
   *
   * 1. Mark APPROVED
   * 2. Submit release_milestone() on Soroban (admin-signed, ~5s settlement)
   * 3. Record Payment with stellarTxHash
   * 4. Mark PAID
   * 5. Auto-complete contract if all milestones PAID
   */
  async approveMilestone(contractId: string, milestoneId: string, callerId: string) {
    const contract = await this._getContractOrThrow(contractId);
    if (contract.clientId !== callerId)
      throw new ForbiddenException('Only the client can approve milestones');
    if (contract.status !== ContractStatus.ACTIVE)
      throw new BadRequestException('Contract is not ACTIVE');

    const milestone = contract.milestones.find((m) => m.id === milestoneId);
    if (!milestone) throw new NotFoundException('Milestone not found');
    if (milestone.status !== MilestoneStatus.IN_REVIEW)
      throw new BadRequestException('Milestone must be IN_REVIEW to approve');

    await this.prisma.milestone.update({
      where: { id: milestoneId },
      data: { status: MilestoneStatus.APPROVED },
    });

    const amountStroops = BigInt(Math.round(Number(milestone.amount) * 10_000_000));
    const txHash = await this.escrow.submitReleaseMilestone({ contractId, amountStroops });

    await this.prisma.$transaction(async (tx) => {
      await tx.payment.create({
        data: { contractId, milestoneId, amount: milestone.amount, stellarTxHash: txHash },
      });
      await tx.milestone.update({
        where: { id: milestoneId },
        data: { status: MilestoneStatus.PAID },
      });
    });

    await this._maybeCompleteContract(contractId);

    return this.prisma.milestone.findUnique({
      where: { id: milestoneId },
      include: { payment: true },
    });
  }

  async dispute(contractId: string, callerId: string, reason: string) {
    void reason; // stored off-chain in a future disputes table
    const contract = await this._getContractOrThrow(contractId);
    if (contract.clientId !== callerId && contract.freelancerId !== callerId)
      throw new ForbiddenException('Only contract parties can raise a dispute');
    if (contract.status !== ContractStatus.ACTIVE)
      throw new BadRequestException('Contract must be ACTIVE to dispute');

    return this.prisma.contract.update({
      where: { id: contractId },
      data: { status: ContractStatus.DISPUTED },
    });
  }

  async resolveDispute(
    contractId: string,
    callerId: string,
    callerRole: UserRole,
    dto: ResolveDisputeDto,
  ) {
    void callerId;
    if (callerRole !== UserRole.ADMIN)
      throw new ForbiddenException('Only admins can resolve disputes');

    const contract = await this._getContractOrThrow(contractId);
    if (contract.status !== ContractStatus.DISPUTED)
      throw new BadRequestException('Contract is not DISPUTED');

    const decisionMap: Record<string, 0 | 1 | 2> = { release: 0, refund: 1, split: 2 };
    const decision = decisionMap[dto.decision];
    if (decision === undefined) throw new BadRequestException(`Unknown decision: ${dto.decision}`);

    const txHash = await this.escrow.submitResolveDispute({
      contractId,
      decision,
      freelancerBps: dto.freelancerBps ?? 0,
    });

    const finalStatus =
      dto.decision === 'refund' ? ContractStatus.CANCELLED : ContractStatus.COMPLETED;
    const remaining = await this._remainingAmount(contractId);

    await this.prisma.$transaction(async (tx) => {
      await tx.payment.create({
        data: { contractId, amount: remaining, stellarTxHash: txHash },
      });
      await tx.contract.update({
        where: { id: contractId },
        data: { status: finalStatus },
      });
    });

    return { resolved: true, txHash, status: finalStatus };
  }

  async cancel(contractId: string, callerId: string, callerRole: UserRole) {
    const contract = await this._getContractOrThrow(contractId);
    if (contract.clientId !== callerId && callerRole !== UserRole.ADMIN)
      throw new ForbiddenException('Only the client or admin can cancel');
    if (
      contract.status === ContractStatus.COMPLETED ||
      contract.status === ContractStatus.CANCELLED
    ) {
      throw new BadRequestException(`Contract is already ${contract.status}`);
    }
    if (contract.escrowTxHash && callerRole !== UserRole.ADMIN) {
      throw new ForbiddenException(
        'Escrow is funded — only an admin can cancel after funding',
      );
    }

    let txHash: string | undefined;
    if (contract.escrowTxHash) {
      txHash = await this.escrow.submitRefund(contractId);
    }

    const remaining = await this._remainingAmount(contractId);
    await this.prisma.$transaction(async (tx) => {
      if (txHash) {
        await tx.payment.create({
          data: { contractId, amount: remaining, stellarTxHash: txHash },
        });
      }
      await tx.contract.update({ where: { id: contractId }, data: { status: ContractStatus.CANCELLED } });
      await tx.job.update({ where: { id: contract.job.id }, data: { status: JobStatus.OPEN } });
    });

    return { cancelled: true, txHash };
  }

  private async _getContractOrThrow(id: string) {
    const contract = await this.prisma.contract.findUnique({
      where: { id },
      include: {
        milestones: true,
        payments: true,
        job: { select: { id: true, title: true, status: true } },
        client: { select: { id: true, name: true, stellarPublicKey: true } },
        freelancer: { select: { id: true, name: true, stellarPublicKey: true } },
      },
    });
    if (!contract) throw new NotFoundException(`Contract ${id} not found`);
    return contract;
  }

  private async _maybeCompleteContract(contractId: string) {
    const milestones = await this.prisma.milestone.findMany({
      where: { contractId },
      select: { status: true },
    });
    if (milestones.every((m) => m.status === MilestoneStatus.PAID)) {
      await this.prisma.contract.update({
        where: { id: contractId },
        data: { status: ContractStatus.COMPLETED },
      });
    }
  }

  private async _remainingAmount(contractId: string): Promise<number> {
    const [milestones, payments] = await Promise.all([
      this.prisma.milestone.findMany({ where: { contractId }, select: { amount: true } }),
      this.prisma.payment.findMany({ where: { contractId }, select: { amount: true } }),
    ]);
    const total = milestones.reduce((s, m) => s + Number(m.amount), 0);
    const paid = payments.reduce((s, p) => s + Number(p.amount), 0);
    return Math.max(0, total - paid);
  }
}
