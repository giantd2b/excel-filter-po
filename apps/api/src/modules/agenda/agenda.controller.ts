import { Controller, Post, Body, UseGuards, Logger } from '@nestjs/common';
import { FirebaseAuthGuard } from '../../common/guards/auth.guard';
import axios from 'axios';

@Controller('agenda')
@UseGuards(FirebaseAuthGuard)
export class AgendaController {
  private readonly logger = new Logger(AgendaController.name);

  @Post('generate-background')
  async generateBackground(
    @Body() body: { theme: string; eventType: string },
  ) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return { error: 'Gemini API key not configured' };
    }

    const themePrompts: Record<string, string> = {
      rose: 'soft pink and rose watercolor floral border, lotus flowers, jasmine, pastel pink background',
      sage: 'soft green and sage watercolor floral border, lotus leaves, tropical foliage, pastel green background',
      cream: 'soft gold and cream watercolor floral border, golden lotus, marigold flowers, warm ivory background',
    };

    const themeDesc = themePrompts[body.theme] || themePrompts.sage;
    const prompt = `Create a beautiful Thai Buddhist ceremony invitation card background. Style: elegant watercolor illustration with ${themeDesc}. The design should have decorative floral elements in the corners and edges, leaving the center area mostly empty/clean for text overlay. Include subtle Thai art elements like lotus flowers and jasmine garlands. Serene, spiritual, celebratory feel. Vertical portrait orientation. No text in the image.`;

    // Try Imagen 4.0 Fast first, then fallback to gemini-2.5-flash-image
    const attempts = [
      {
        name: 'imagen-4.0-fast-generate-001',
        url: `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-fast-generate-001:predict?key=${apiKey}`,
        body: {
          instances: [{ prompt }],
          parameters: {
            sampleCount: 1,
            aspectRatio: '3:4',
            safetyFilterLevel: 'block_only_high',
          },
        },
        extract: (data: any) => {
          const pred = data?.predictions?.[0];
          if (pred?.bytesBase64Encoded) {
            return `data:image/png;base64,${pred.bytesBase64Encoded}`;
          }
          return null;
        },
      },
      {
        name: 'gemini-2.5-flash-image',
        url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${apiKey}`,
        body: {
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseModalities: ['IMAGE', 'TEXT'],
          },
        },
        extract: (data: any) => {
          const parts = data?.candidates?.[0]?.content?.parts || [];
          const img = parts.find((p: any) => p.inlineData);
          if (img?.inlineData) {
            return `data:${img.inlineData.mimeType};base64,${img.inlineData.data}`;
          }
          return null;
        },
      },
    ];

    for (const attempt of attempts) {
      try {
        this.logger.log(`Trying ${attempt.name}...`);
        const response = await axios.post(attempt.url, attempt.body, {
          headers: { 'Content-Type': 'application/json' },
          timeout: 90000,
        });

        const image = attempt.extract(response.data);
        if (image) {
          this.logger.log(`${attempt.name} succeeded`);
          return { image };
        }
        this.logger.warn(`${attempt.name} returned no image`);
      } catch (err: any) {
        const msg = err.response?.data?.error?.message || err.message;
        this.logger.warn(`${attempt.name} failed: ${msg}`);
      }
    }

    return { error: 'All image generation models failed. Please try again.' };
  }
}
