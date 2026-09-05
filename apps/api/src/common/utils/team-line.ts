import { pushLineMessages } from './line-notify.utils';

/** Plain-text push to the sales team LINE group (same group as new-booking alerts). Never throws. */
export async function pushTeamText(text: string): Promise<void> {
  const token = (process.env.IRIS_BOT_ACCESS_TOKEN || process.env.LINE_GROUP_ACCESS_TOKEN || '').trim();
  const groupId = (process.env.BOOKING_ALERT_LINE_GROUP_ID || 'C38f6000e5944ef97a36ca4aac736253a').trim();
  if (!token || !groupId) return;
  // LINE text messages are capped at 5000 chars
  await pushLineMessages(groupId, [{ type: 'text', text: text.length > 4900 ? `${text.slice(0, 4900)}…` : text }], token);
}
