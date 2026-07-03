import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Contribution } from "../entities/contribution.entity";
import { ContributionStatus } from "../enums/contribution.enums";
import { SavingsStatementQueryDto } from "../dto/statements/savings-statement.query.dto";

@Injectable()
export class SavingsStatementsService {
  constructor(
    @InjectRepository(Contribution)
    private readonly contributionsRepo: Repository<Contribution>,
  ) {}

  async getMemberSavingsStatement(
    tenantId: string,
    tenantUserId: string,
    query: SavingsStatementQueryDto,
  ) {
    if (query.dateFrom && query.dateTo && query.dateFrom > query.dateTo) {
      throw new BadRequestException("dateFrom cannot be after dateTo.");
    }

    const qb = this.contributionsRepo
      .createQueryBuilder("contribution")
      .leftJoinAndSelect("contribution.journalEntry", "journalEntry")
      .where("contribution.tenantId = :tenantId", { tenantId })
      .andWhere("contribution.tenantUserId = :tenantUserId", { tenantUserId });

    if (query.dateFrom) {
      qb.andWhere("contribution.contributionDate >= :dateFrom", {
        dateFrom: query.dateFrom,
      });
    }

    if (query.dateTo) {
      qb.andWhere("contribution.contributionDate <= :dateTo", {
        dateTo: query.dateTo,
      });
    }

    qb.orderBy("contribution.contributionDate", "ASC").addOrderBy(
      "contribution.createdAt",
      "ASC",
    );

    const contributions = await qb.getMany();

    const posted = contributions.filter(
      (item) => item.status === ContributionStatus.POSTED,
    );

    const reversed = contributions.filter(
      (item) => item.status === ContributionStatus.REVERSED,
    );

    const totalPosted = this.sumMoney(posted.map((item) => item.amount));
    const totalReversed = this.sumMoney(reversed.map((item) => item.amount));

    return {
      tenantId,
      tenantUserId,
      dateFrom: query.dateFrom ?? null,
      dateTo: query.dateTo ?? null,
      totals: {
        postedContributionCount: posted.length,
        reversedContributionCount: reversed.length,
        totalPosted,
        totalReversed,
        netSavings: totalPosted,
      },
      lines: contributions.map((item) => ({
        id: item.id,
        reference: item.reference,
        contributionDate: item.contributionDate,
        amount: item.amount,
        source: item.source,
        status: item.status,
        notes: item.notes,
        journalEntryId: item.journalEntryId,
        journalEntryNumber: item.journalEntry?.entryNumber,
        reversedJournalEntryId: item.reversedJournalEntryId,
      })),
    };
  }

  async getCycleSavingsSummary(
    tenantId: string,
    cycleId: string,
    query: SavingsStatementQueryDto,
  ) {
    if (query.dateFrom && query.dateTo && query.dateFrom > query.dateTo) {
      throw new BadRequestException("dateFrom cannot be after dateTo.");
    }

    const qb = this.contributionsRepo
      .createQueryBuilder("contribution")
      .leftJoin("contribution.tenantUser", "tenantUser")
      .leftJoin("tenantUser.user", "user")
      .where("contribution.tenantId = :tenantId", { tenantId })
      .andWhere("contribution.cycleId = :cycleId", { cycleId });

    if (query.dateFrom) {
      qb.andWhere("contribution.contributionDate >= :dateFrom", {
        dateFrom: query.dateFrom,
      });
    }

    if (query.dateTo) {
      qb.andWhere("contribution.contributionDate <= :dateTo", {
        dateTo: query.dateTo,
      });
    }

    const rows = await qb
      .select("contribution.tenantUserId", "tenantUserId")
      .addSelect("user.email", "email")
      .addSelect("user.firstName", "firstName")
      .addSelect("user.lastName", "lastName")
      .addSelect(
        `
        COALESCE(
          SUM(
            CASE
              WHEN contribution.status = 'POSTED'
              THEN contribution.amount
              ELSE 0
            END
          ),
          0
        )
        `,
        "totalPosted",
      )
      .addSelect(
        `
        COALESCE(
          SUM(
            CASE
              WHEN contribution.status = 'REVERSED'
              THEN contribution.amount
              ELSE 0
            END
          ),
          0
        )
        `,
        "totalReversed",
      )
      .addSelect(
        `
        COUNT(
          CASE
            WHEN contribution.status = 'POSTED'
            THEN 1
          END
        )
        `,
        "postedContributionCount",
      )
      .groupBy("contribution.tenantUserId")
      .addGroupBy("user.email")
      .addGroupBy("user.firstName")
      .addGroupBy("user.lastName")
      .orderBy('"totalPosted"', "DESC")
      .getRawMany();

    const members = rows.map((row) => ({
      tenantUserId: row.tenantUserId,
      user: {
        email: row.email,
        firstName: row.firstName,
        lastName: row.lastName,
      },
      postedContributionCount: Number(row.postedContributionCount),
      totalPosted: this.normalizeMoney(row.totalPosted),
      totalReversed: this.normalizeMoney(row.totalReversed),
      netSavings: this.normalizeMoney(row.totalPosted),
    }));

    return {
      tenantId,
      cycleId,
      dateFrom: query.dateFrom ?? null,
      dateTo: query.dateTo ?? null,
      totals: {
        participantCountWithContributions: members.length,
        totalPosted: this.sumMoney(members.map((item) => item.totalPosted)),
        totalReversed: this.sumMoney(members.map((item) => item.totalReversed)),
        netSavings: this.sumMoney(members.map((item) => item.netSavings)),
      },
      members,
    };
  }

  private sumMoney(values: string[]): string {
    const cents = values.reduce((sum, value) => {
      return sum + Math.round(Number(value) * 100);
    }, 0);

    return (cents / 100).toFixed(2);
  }

  private normalizeMoney(value: string | number): string {
    return Number(value).toFixed(2);
  }
}