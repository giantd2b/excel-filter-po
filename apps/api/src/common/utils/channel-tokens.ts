/**
 * Channel token configuration.
 * All tokens are loaded from environment variables.
 */

export function getLineAccessToken(channel: string): string {
  const tokenMap: Record<string, string | undefined> = {
    Line_IRIS: process.env.LINE_TOKEN_IRIS,
    'Line_เติมบุญ': process.env.LINE_TOKEN_TERMBOON,
    'Line_ทดสอบระบบ': process.env.LINE_TOKEN_TEST,
    Line_Chon: process.env.LINE_TOKEN_CHON,
    'Line_โต๊ะจีน': process.env.LINE_TOKEN_TOHJEEN,
    'Line_ไอริสเติมบุญ': process.env.LINE_TOKEN_IRIS_TEMBOON,
  };

  const token = tokenMap[channel];
  if (!token) {
    throw new Error(`LINE access token not configured for channel: ${channel}`);
  }
  return token;
}

export function getLineDestinationChannel(destination: string): { token: string; channel: string } | null {
  const map: Record<string, { envKey: string; channel: string }> = {

    U2d0595a5f7582621a650a46e99972109: { envKey: 'LINE_TOKEN_IRIS', channel: 'Line_IRIS' },
    Uf18fee4c17bb410a565889f27015ace0: { envKey: 'LINE_TOKEN_TERMBOON', channel: 'Line_เติมบุญ' },
    U08f3963a8a32d32cadb457dde35dc897: { envKey: 'LINE_TOKEN_TEST', channel: 'Line_ทดสอบระบบ' },
    U55912d0c8784e0453127fe2ae2a7723e: { envKey: 'LINE_TOKEN_CHON', channel: 'Line_Chon' },
    U85b0000da2c00ce71e42c98dad76b2a9: { envKey: 'LINE_TOKEN_TOHJEEN', channel: 'Line_โต๊ะจีน' },
    U01bce79462ed13d1e983d1e9f72dde27: { envKey: 'LINE_TOKEN_IRIS_TEMBOON', channel: 'Line_ไอริสเติมบุญ' },
  };

  const entry = map[destination];
  if (!entry) return null;

  const token = process.env[entry.envKey];
  if (!token) return null;

  return { token, channel: entry.channel };
}

export function getFacebookRecipientChannel(recipientId: string): { token: string; channel: string } | null {
  const map: Record<string, { envKey: string; channel: string }> = {
    '342502096352138': { envKey: 'FB_IRIS_TOKEN', channel: 'FB_IRIS' },
    '100433364819860': { envKey: 'FB_IRIS_RAYONG_TOKEN', channel: 'FB_IRIS_RAYONG' },
    '2323861754514969': { envKey: 'FB_TERMBOON_TOKEN', channel: 'FB_เติมบุญ' },
    '1179375335569460': { envKey: 'FB_CHON_TOKEN', channel: 'FB_ชล' },
    '111545563829281': { envKey: 'FB_TEST_TOKEN', channel: 'FB_ทดสอบระบบ' },
    '2205446836437741': { envKey: 'FB_TEST2_TOKEN', channel: 'FB_ทดสอบระบบ2' },
    '100315376073691': { envKey: 'FB_TOHJEEN_TOKEN', channel: 'FB_โต๊ะจีน' },
  };

  const entry = map[recipientId];
  if (!entry) return null;

  const token = process.env[entry.envKey];
  if (!token) return null;

  return { token, channel: entry.channel };
}

export function getFacebookPageToken(channel: string): string {
  const tokenMap: Record<string, string | undefined> = {
    FB_IRIS: process.env.FB_IRIS_TOKEN,
    FB_IRIS_RAYONG: process.env.FB_IRIS_RAYONG_TOKEN,
    'FB_เติมบุญ': process.env.FB_TERMBOON_TOKEN,
    'FB_ชล': process.env.FB_CHON_TOKEN,
    'FB_โต๊ะจีน': process.env.FB_TOHJEEN_TOKEN,
    'FB_ทดสอบระบบ': process.env.FB_TEST_TOKEN,
    'FB_ทดสอบระบบ2': process.env.FB_TEST2_TOKEN,
  };

  const token = tokenMap[channel];
  if (!token) {
    throw new Error(`Facebook page token not configured for channel: ${channel}`);
  }
  return token;
}
