const Anthropic = require("@anthropic-ai/sdk");

const anthropic = new Anthropic();

/**
 * Analyze an image buffer to detect and extract Thai bank transfer slip data.
 * Uses Claude Vision API for accurate structured extraction across all Thai banks.
 *
 * @param {Buffer} imageBuffer - The image data
 * @param {string} [mimeType="image/jpeg"] - MIME type of the image
 * @returns {Promise<Object|null>} Structured slip data or null if not a slip / on error
 */
async function analyzeSlip(imageBuffer, mimeType = "image/jpeg") {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set. Add it to functions/.env"
    );
  }

  const base64Image = imageBuffer.toString("base64");

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mimeType,
                data: base64Image,
              },
            },
            {
              type: "text",
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

    const text = response.content[0].text.trim();

    // Try direct JSON parse first
    try {
      const data = JSON.parse(text);
      if (!data.is_slip) return null;
      return data;
    } catch {
      // Fallback: extract JSON from response using regex
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[0]);
        if (!data.is_slip) return null;
        return data;
      }
      console.error("Failed to parse Claude Vision response:", text);
      return null;
    }
  } catch (error) {
    console.error("Claude Vision API error:", error.message);
    return null;
  }
}

module.exports = { analyzeSlip };
