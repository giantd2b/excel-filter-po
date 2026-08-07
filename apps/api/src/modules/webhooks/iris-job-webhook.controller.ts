import {
  BadRequestException,
  Controller,
  HttpCode,
  Logger,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';
import { UsersService } from '../users/users.service';

const MAX_SKEW_MS = 5 * 60 * 1000;

/**
 * Real-time job events pushed from iris-job. The webhook is a TRIGGER, not a
 * data carrier: nextJobDate/nextJobTitle are a min over ALL of a phone's jobs,
 * which one event can't provide — so we re-run the existing lookup flow for
 * the affected phone. Signed with HMAC-SHA256 over the raw body
 * (X-Iris-Signature: sha256=<hex>, secret IRIS_JOB_WEBHOOK_SECRET).
 * The daily 18:00 tag-automation cron stays on as backstop.
 */
@Controller('webhooks/iris-job')
export class IrisJobWebhookController {
  private readonly logger = new Logger(IrisJobWebhookController.name);

  constructor(private users: UsersService) {}

  @Post()
  @HttpCode(200)
  async handle(@Req() req: any) {
    const secret = process.env.IRIS_JOB_WEBHOOK_SECRET;
    if (!secret) throw new UnauthorizedException('IRIS_JOB_WEBHOOK_SECRET not configured');
    const raw: Buffer | undefined = req.rawBody;
    if (!raw) throw new BadRequestException('raw body unavailable');

    const sig = String(req.headers['x-iris-signature'] ?? '');
    const expected = 'sha256=' + createHmac('sha256', secret).update(raw).digest('hex');
    if (sig.length !== expected.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
      throw new UnauthorizedException('invalid signature');
    }
    const ts = Number(req.headers['x-iris-timestamp'] ?? 0);
    if (!ts || Math.abs(Date.now() - ts) > MAX_SKEW_MS) {
      throw new UnauthorizedException('stale timestamp');
    }

    const telno: string = req.body?.job?.telno ?? '';
    if (!telno || telno === 'no-number') return { ok: true, action: 'no-phone' };

    const result = await this.users.refreshJobInfoForPhone(telno);
    this.logger.log(`iris-job ${req.body?.event}: refreshed ${result.refreshed ?? 0} customer(s) for ${telno}`);
    return { ok: true, ...result };
  }
}
