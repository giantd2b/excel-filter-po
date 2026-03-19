import { Injectable, Logger } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';

export interface SlipData {
  is_slip: boolean;
  bank_name?: string;
  amount?: string;
  date_time?: string;
  sender_name?: string;
  receiver_name?: string;
  reference_number?: string;
}

@Injectable()
export class SlipDetectionService {
  private readonly logger = new Logger(SlipDetectionService.name);

  async analyzeSlip(
    imageBuffer: Buffer,
    mimeType: string = 'image/jpeg',
  ): Promise<SlipData | null> {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY is not set');
    }

    const anthropic = new Anthropic();
    const base64Image = imageBuffer.toString('base64');

    try {
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mimeType as any,
                  data: base64Image,
                },
              },
              {
                type: 'text',
                text: `Analyze this image. If it is a Thai bank transfer slip, extract the following information and return ONLY a JSON object (no markdown, no code fences, no explanation):

{
  "is_slip": true,
  "bank_name": "ชื่อธนาคาร (ภาษาไทย)",
  "amount": "จำนวนเงิน (ตัวเลข เช่น 1500.00)",
  "date_time": "วันที่และเวลา",
  "sender_name": "ชื่อผู้โอน",
  "receiver_name": "ชื่อผู้รับ",
  "reference_number": "หมายเลขอ้างอิง"
}

If any field is not visible or unclear, use null for that field.
If this image is NOT a bank transfer slip, return ONLY: {"is_slip": false}`,
              },
            ],
          },
        ],
      });

      const text = (response.content[0] as any).text.trim();

      try {
        const data = JSON.parse(text);
        if (!data.is_slip) return null;
        return data;
      } catch {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const data = JSON.parse(jsonMatch[0]);
          if (!data.is_slip) return null;
          return data;
        }
        this.logger.error('Failed to parse Claude Vision response:', text);
        return null;
      }
    } catch (error: any) {
      this.logger.error('Claude Vision API error:', error.message);
      return null;
    }
  }
}
