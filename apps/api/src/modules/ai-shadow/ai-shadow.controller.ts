import { BadRequestException, Body, Controller, ForbiddenException, Get, Param, Patch, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { FirebaseAuthGuard } from '../../common/guards/auth.guard';
import { AiShadowService, type AiShadowSettings } from './ai-shadow.service';

const canManage = (req: any) => req.admin?.role === 'SUPER_ADMIN' || req.admin?.role === 'ADMIN';

@Controller('ai-shadow')
@UseGuards(FirebaseAuthGuard)
export class AiShadowController {
  constructor(private readonly shadow: AiShadowService) {}

  @Get()
  list(
    @Query('channel') channel?: string,
    @Query('action') action?: string,
    @Query('rating') rating?: string,
    @Query('mode') mode?: string,
    @Query('run') run?: string,
    @Query('stage') stage?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.shadow.list({ channel, action, rating, mode, run: Number(run) || undefined, stage, page: Number(page) || 1, pageSize: Number(pageSize) || 30 });
  }

  @Get('stats')
  stats(@Query('channel') channel?: string, @Query('mode') mode?: string, @Query('run') run?: string) {
    return this.shadow.stats(channel, mode, Number(run) || undefined);
  }

  @Get('replay/runs')
  runs() {
    return this.shadow.replayRuns();
  }

  /** answer the same questions again as a new round (compare before/after a change) */
  @Post('replay/rerun')
  async rerun(@Body() body: { fromRun?: number }, @Req() req: any) {
    if (!canManage(req)) throw new ForbiddenException('เฉพาะ ADMIN / SUPER_ADMIN');
    try {
      return await this.shadow.startRerun(Number(body?.fromRun) || undefined);
    } catch (e: any) {
      throw new BadRequestException(e?.message || 'เริ่มไม่สำเร็จ');
    }
  }

  /** experiment: re-answer past real questions and compare with the admin's answer */
  @Post('replay')
  replay(@Body() body: { channels: string[]; count?: number; days?: number }, @Req() req: any) {
    if (!canManage(req)) throw new ForbiddenException('เฉพาะ ADMIN / SUPER_ADMIN');
    return this.shadow.startReplay({ channels: body?.channels || [], count: Number(body?.count) || 100, days: Number(body?.days) || 90 });
  }

  @Get('replay')
  replayStatus() {
    return this.shadow.getReplayJob();
  }

  /** exactly what the AI is allowed to answer from (live prices + confirmed facts + KB) */
  @Get('context')
  async context() {
    return { knowledge: await this.shadow.knowledgeText(true) };
  }

  @Get('settings')
  async settings() {
    return { settings: await this.shadow.getSettings(true), channels: await this.shadow.channelList() };
  }

  @Put('settings')
  saveSettings(@Body() body: Partial<AiShadowSettings>, @Req() req: any) {
    if (!canManage(req)) throw new ForbiddenException('เฉพาะ ADMIN / SUPER_ADMIN');
    return this.shadow.saveSettings(body || {});
  }

  @Patch(':id/rating')
  async rate(@Param('id') id: string, @Body() body: { rating: string | null; note?: string | null }, @Req() req: any) {
    try {
      return await this.shadow.rate(id, body?.rating ?? null, body?.note?.trim() || null, req.admin?.name || req.admin?.email || 'admin');
    } catch (e: any) {
      throw new BadRequestException(e?.message || 'ให้คะแนนไม่สำเร็จ');
    }
  }

  /** re-run one customer's latest turn now (for testing a prompt change) */
  @Post('run/:customerId')
  async runNow(@Param('customerId') customerId: string, @Body() body: { channel: string }, @Req() req: any) {
    if (!canManage(req)) throw new ForbiddenException('เฉพาะ ADMIN / SUPER_ADMIN');
    await this.shadow.run(customerId, body.channel);
    return { ok: true };
  }
}
