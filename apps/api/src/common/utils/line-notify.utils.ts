import axios from 'axios';

const GROUP_ID = process.env.LINE_GROUP_ID || 'C65701e283ed16aa48fd407edc5e6374f';

/**
 * Push arbitrary LINE messages (text / flex / image objects) to a user, group or
 * room id with an explicit channel access token. Never throws — LINE must never
 * fail the caller's request. Non-2xx responses are logged with the status and the
 * start of the body so a bad token (401) or quota problem (429) is visible in logs.
 */
export async function pushLineMessages(to: string, messages: unknown[], token: string): Promise<void> {
  if (!token || !to || !messages.length) {
    console.warn('[line] push skipped: missing token, destination or messages');
    return;
  }
  try {
    await axios({
      url: 'https://api.line.me/v2/bot/message/push',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      data: { to, messages },
      timeout: 10000,
    });
  } catch (error: any) {
    const status = error.response?.status;
    const body = error.response?.data ? JSON.stringify(error.response.data).slice(0, 200) : error.message;
    console.error(`[line] push to ${to} failed${status ? ` ${status}` : ''}: ${body}`);
  }
}

/** Slip alerts + daily slip report → the LINE_GROUP_ID group via LINE_GROUP_ACCESS_TOKEN. */
export async function pushGroupMessage(text: string): Promise<void> {
  const accessToken = process.env.LINE_GROUP_ACCESS_TOKEN;
  if (!accessToken) {
    console.warn('LINE_GROUP_ACCESS_TOKEN not set, skipping group notification');
    return;
  }
  await pushLineMessages(GROUP_ID, [{ type: 'text', text }], accessToken);
}
