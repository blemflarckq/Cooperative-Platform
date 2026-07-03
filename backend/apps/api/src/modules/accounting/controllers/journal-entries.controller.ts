import { Body, Controller, Post, Get, Param, Query } from "@nestjs/common";
import { TenantId } from "../../../common/tenancy/tenant-id.decorator";
import { CurrentUser } from "../../../common/auth/current-user.decorator";
import { RequirePermissions } from "../../../common/rbac/require-permissions.decorator";
import { PostingEngineService } from "../posting/posting-engine.service";
import { PostManualJournalEntryDto } from "../dto/journal-entries/post-manual-journal-entry.dto";
import { JournalSourceModule } from "../enums/journal.enums";
import { JournalEntryResponseMapper } from "../mappers/journal-entry-response.mapper";
import { JournalEntriesService } from "../services/journal-entries.service";
import { ListJournalEntriesQueryDto } from "../dto/journal-entries/list-journal-entries.query.dto";
import { toPaginatedResult } from "../../../common/dto/paginated-result";
import { ReverseJournalEntryDto } from "../dto/journal-entries/reverse-journal-entry.dto";

@Controller("journal-entries")
export class JournalEntriesController {
  constructor(
    private readonly postingEngine: PostingEngineService,
    private readonly journalEntriesService: JournalEntriesService,
) {}

  /**
   * Manual journal posting endpoint.
   *
   * Important:
   * This endpoint does NOT create journal entries directly.
   * It delegates to PostingEngineService so the accounting invariants are
   * enforced in one place:
   * - account ownership validation
   * - active account validation
   * - positive money validation
   * - debit total equals credit total
   * - tenant-safe journal numbering
   * - outbox event creation
   */
  @Post("manual")
  @RequirePermissions("journal_entry:post_manual")
  async postManualJournalEntry(
    @TenantId() tenantId: string,
    @CurrentUser() actorUserId: string,
    @Body() dto: PostManualJournalEntryDto,
  ) {
    const entry = await this.postingEngine.postJournalEntry({
      tenantId,
      actorUserId,
      transactionDate: dto.transactionDate,
      description: dto.description,
      sourceModule: JournalSourceModule.MANUAL,
      sourceReference: dto.sourceReference,
      lines: dto.lines,
    });

    return JournalEntryResponseMapper.toResponse(entry);
  }

  @Get()
    @RequirePermissions("journal_entry:read")
    async findAll(
    @TenantId() tenantId: string,
    @Query() query: ListJournalEntriesQueryDto,
    ) {
    const [entities, total] = await this.journalEntriesService.findAll(
        tenantId,
        query,
    );

    return toPaginatedResult(
        JournalEntryResponseMapper.toList(entities),
        total,
        query.page,
        query.limit,
    );
    }

    @Get(":id")
    @RequirePermissions("journal_entry:read")
    async findOne(
    @TenantId() tenantId: string,
    @Param("id") id: string,
    ) {
    const entity = await this.journalEntriesService.findOne(tenantId, id);
    return JournalEntryResponseMapper.toResponse(entity);
    }

    @Post(":id/reverse")
    @RequirePermissions("journal_entry:reverse")
    async reverse(
    @TenantId() tenantId: string,
    @CurrentUser() actorUserId: string,
    @Param("id") id: string,
    @Body() dto: ReverseJournalEntryDto,
    ) {
    const entity = await this.journalEntriesService.reverse(
        tenantId,
        id,
        actorUserId,
        dto.reason,
    );

    return JournalEntryResponseMapper.toResponse(entity);
    }


}