const Anthropic = require("@anthropic-ai/sdk");
const { createHash } = require("crypto");

const anthropic = new Anthropic();

// Pre-filter thresholds: typical Thai bank slips are 30KB–4MB JPEG/PNG.
// Skip tiny stickers/emojis and absurdly huge files to avoid wasted API calls.
const MIN_IMAGE_BYTES = 15 * 1024; // 15 KB
const MAX_IMAGE_BYTES = 6 * 1024 * 1024; // 6 MB
const ALLOWED_MIMES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

// In-memory result cache keyed by SHA-256 of the image bytes.
// Prevents re-billing the same image (common when customers resend).
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h
const CACHE_MAX_ENTRIES = 5000;
const cache = new Map();

function storeInCache(hash, data) {
  if (cache.size >= CACHE_MAX_ENTRIES) {
    const firstKey = cache.keys().next().value;
    if (firstKey) cache.delete(firstKey);
  }
  cache.set(hash, { data, timestamp: Date.now() });
}

/**
 * Analyze an image buffer to detect and extract Thai bank transfer slip data.
 * Uses Claude Haiku 4.5 Vision for accurate structured extraction across all Thai banks.
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

  // 1) Cheap pre-filter: size + mime type
  const size = imageBuffer ? imageBuffer.length : 0;
  if (size < MIN_IMAGE_BYTES) {
    console.debug(`Skipping slip detection: image too small (${size} bytes)`);
    return null;
  }
  if (size > MAX_IMAGE_BYTES) {
    console.warn(`Skipping slip detection: image too large (${size} bytes)`);
    return null;
  }
  if (!ALLOWED_MIMES.includes(mimeType)) {
    console.debug(`Skipping slip detection: unsupported mime ${mimeType}`);
    return null;
  }

  // 2) Dedupe cache by image hash
  const hash = createHash("sha256").update(imageBuffer).digest("hex");
  const cached = cache.get(hash);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    console.debug(`Slip detection cache hit for ${hash.slice(0, 12)}`);
    return cached.data;
  }

  const base64Image = imageBuffer.toString("base64");

  try {
    const response = await anthropic.messages.create({
      // Haiku 4.5 handles vision and is ~4-5x cheaper than Sonnet for this task.
      model: "claude-haiku-4-5-20251001",
      max_tokens: 512,
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

    let result = null;
    try {
      const data = JSON.parse(text);
      result = data.is_slip ? data : null;
    } catch {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[0]);
        result = data.is_slip ? data : null;
      } else {
        console.error("Failed to parse Claude Vision response:", text);
      }
    }

    storeInCache(hash, result);
    return result;
  } catch (error) {
    console.error("Claude Vision API error:", error.message);
    return null;
  }
}

module.exports = { analyzeSlip };
