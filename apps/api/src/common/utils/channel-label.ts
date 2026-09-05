const CHANNEL_LABELS: Record<string, string> = { LINE: 'LINE', FACEBOOK: 'Facebook' };

/** "Line_IRIS" + LINE → "LINE IRIS"; "FB_Termboon" + FACEBOOK → "Facebook Termboon". */
export function channelLabel(channel: string, channelType?: string | null): string {
  const pretty = String(channel || '').replace(/^(Line|FB)_/i, '').replace(/_/g, ' ');
  const type = CHANNEL_LABELS[String(channelType || '').toUpperCase()];
  return type ? `${type} ${pretty}` : pretty;
}
