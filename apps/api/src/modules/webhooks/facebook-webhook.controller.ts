import { Controller, Get, Post, Req, Res, Query } from '@nestjs/common';
import { Request, Response } from 'express';
import { WebhookService } from './webhook.service';
import { getFacebookRecipientChannel } from '../../common/utils/channel-tokens';

@Controller('webhooks/facebook')
export class FacebookWebhookController {
  constructor(private readonly webhookService: WebhookService) {}

  @Get()
  verify(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') verifyToken: string,
    @Query('hub.challenge') challenge: string,
    @Res() res: Response,
  ) {
    const expectedToken = process.env.FB_VERIFY_TOKEN || 'itpoom';
    if (mode === 'subscribe' && verifyToken === expectedToken) {
      console.log('Facebook webhook verified');
      return res.status(200).send(challenge);
    }
    return res.sendStatus(403);
  }

  @Post()
  async handleFacebookWebhook(@Req() req: Request, @Res() res: Response) {
    const data = req.body;

    if (data.object !== 'page') {
      return res.sendStatus(200);
    }

    for (const entry of data.entry) {
      for (const event of entry.messaging || []) {
        if (!event.message) continue;

        const recipientID = event.recipient.id;
        const channelInfo = getFacebookRecipientChannel(recipientID);
        if (!channelInfo) continue;

        const fbToken = channelInfo.token;
        const fbbot = channelInfo.channel;

        if (event.message.text) {
          await this.webhookService.processFacebookTextMessage(
            event.sender.id,
            event.message,
            event.timestamp,
            fbToken,
            fbbot,
          );
        } else if (event.message.attachments) {
          const attachments = event.message.attachments;
          for (let i = 0; i < attachments.length; i++) {
            const attachment = attachments[i];
            const type = attachment.type; // image, video, audio, file
            const url = attachment.payload?.url;
            if (!url) continue;

            // Append index for multiple attachments to avoid duplicate message IDs
            const msgId = attachments.length > 1
              ? `${event.message.mid}_${i}`
              : event.message.mid;

            if (type === 'image') {
              await this.webhookService.processFacebookImageMessage(
                url,
                event.sender.id,
                msgId,
                fbToken,
                fbbot,
              );
            } else {
              // video, audio, file, sticker
              await this.webhookService.processFacebookMediaMessage(
                event.sender.id,
                msgId,
                event.timestamp,
                url,
                type,
                fbToken,
                fbbot,
              );
            }
          }
        } else if (event.message.sticker_id) {
          // Sticker-only message (no text, no attachments)
          await this.webhookService.processFacebookStickerMessage(
            event.sender.id,
            event.message,
            event.timestamp,
            fbToken,
            fbbot,
          );
        }
      }
    }

    return res.sendStatus(200);
  }
}
