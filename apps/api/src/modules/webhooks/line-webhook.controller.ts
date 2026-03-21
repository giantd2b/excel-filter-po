import { Controller, Post, Req, Res, Logger } from '@nestjs/common';
import { Request, Response } from 'express';
import { WebhookService } from './webhook.service';
import { getLineDestinationChannel } from '../../common/utils/channel-tokens';

@Controller('webhooks/line')
export class LineWebhookController {
  private readonly logger = new Logger(LineWebhookController.name);
  private _loggedEventKeys = false;

  constructor(private readonly webhookService: WebhookService) {}

  @Post()
  async handleLineWebhook(@Req() req: Request, @Res() res: Response) {
    const destination = req.body.destination;
    const events = req.body.events;

    const channelInfo = getLineDestinationChannel(destination);
    if (!channelInfo) {
      this.logger.warn(`Unknown LINE destination: ${destination}`);
      return res.end();
    }

    const { token: accessToken, channel: lineBot } = channelInfo;

    for (const event of events) {
      if (event.type !== 'message') continue;

      const sourceType = event.source?.type;
      const msgType = event.message.type;

      // Save markAsReadToken for all LINE message types (token is in event.message)
      const markToken = event.message?.markAsReadToken;
      if (markToken && event.source?.userId) {
        const customerId = `${event.source.userId}__${lineBot}`;
        this.webhookService.saveMarkAsReadToken(customerId, markToken).catch(() => {});
      }

      // Handle group/room messages
      if (sourceType === 'group' || sourceType === 'room') {
        await this.webhookService.processLineGroupMessage(
          event,
          accessToken,
          lineBot,
          sourceType,
        );
        continue;
      }

      // Handle 1-on-1 messages (source.type === "user")
      if (msgType === 'text') {
        await this.webhookService.processLineTextMessage(event, accessToken, lineBot);
      } else if (msgType === 'image') {
        await this.webhookService.processLineImageMessage(event, accessToken, lineBot);
      } else if (msgType === 'video' || msgType === 'audio' || msgType === 'file') {
        await this.webhookService.processLineMediaMessage(event, accessToken, lineBot, msgType);
      } else if (msgType === 'sticker') {
        await this.webhookService.processLineStickerMessage(event, accessToken, lineBot);
      } else if (msgType === 'location') {
        await this.webhookService.processLineLocationMessage(event, accessToken, lineBot);
      }
    }

    return res.end();
  }
}
