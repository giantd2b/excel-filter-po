import axios from 'axios';

const GROUP_ID = process.env.LINE_GROUP_ID || 'C65701e283ed16aa48fd407edc5e6374f';

export async function pushGroupMessage(text: string): Promise<void> {
  const accessToken = process.env.LINE_GROUP_ACCESS_TOKEN;
  if (!accessToken) {
    console.warn('LINE_GROUP_ACCESS_TOKEN not set, skipping group notification');
    return;
  }

  try {
    await axios({
      url: 'https://api.line.me/v2/bot/message/push',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      data: {
        to: GROUP_ID,
        messages: [{ type: 'text', text }],
      },
    });
  } catch (error: any) {
    console.error('LINE group push failed:', error.response?.data || error.message);
  }
}
