import { api } from "./api-client";
import { BankAccount } from "@/types/bank-account";
import { LINE_CHANNELS, FB_CHANNELS } from "@/types/inbox";

// ─── Dashboard Stats ────────────────────────────────────────────────

interface Stats {
  totalUsers: number;
  lineUsers: number;
  fbUsers: number;
  channelStats: Record<string, number>;
}

export async function getStats(): Promise<Stats> {
  const data = await api.get<{
    total: number;
    line: number;
    facebook: number;
    channels: Record<string, number>;
  }>("/users/stats");

  return {
    totalUsers: data.total,
    lineUsers: data.line,
    fbUsers: data.facebook,
    channelStats: data.channels,
  };
}

// ─── Users ──────────────────────────────────────────────────────────

export interface UserListItem {
  id: string;
  userId: string;
  displayName: string;
  pictureUrl: string;
  channel: string;
  lastmessagetime: number;
  timestamp: number;
}

interface UsersResult {
  users: UserListItem[];
  hasMore: boolean;
  nextLastId: string | null;
}

export async function getUsers(
  limitCount = 20,
  lastId?: string | null
): Promise<UsersResult> {
  const params = new URLSearchParams({ limit: String(limitCount) });
  if (lastId) params.set("startAfter", lastId);

  const data = await api.get<any[]>(`/users?${params}`);

  const users: UserListItem[] = data.map((u: any) => ({
    id: u.id,
    userId: u.userId || u.id,
    displayName: u.displayName || u.first_name || "ไม่ระบุชื่อ",
    pictureUrl: u.pictureUrl || u.profile_pic || "",
    channel: u.channel || "",
    lastmessagetime: u.lastmessagetime || 0,
    timestamp: u.timestamp || 0,
  }));

  const hasMore = users.length === limitCount;
  const nextLastId = users.length > 0 ? users[users.length - 1].id : null;

  return { users, hasMore, nextLastId };
}

// ─── User Detail ────────────────────────────────────────────────────

export async function getUserById(id: string) {
  return api.get<any>(`/users/${id}`);
}

// ─── New Users ──────────────────────────────────────────────────────

export interface NewUser {
  id: string;
  oderId: string;
  displayName: string;
  pictureUrl: string;
  channel: string;
  timestamp: number;
  lastmessagetime: number;
  messageCount: number;
  isFirstTime: boolean;
  firstMessage: string;
}

interface NewUsersResult {
  users: NewUser[];
  total: number;
}

export async function getNewUsers(
  days = 7,
  _limitCount = 100
): Promise<NewUsersResult> {
  const data = await api.get<any[]>(`/users/new?days=${days}`);

  const users: NewUser[] = data.map((u: any) => {
    const messageCount = u.lastmessage?.length || 0;
    return {
      id: u.id,
      oderId: u.userId || u.id,
      displayName: u.displayName || u.first_name || "ไม่ระบุชื่อ",
      pictureUrl: u.pictureUrl || u.profile_pic || "",
      channel: u.channel || "",
      timestamp: u.timestamp || 0,
      lastmessagetime: u.lastmessagetime || 0,
      messageCount,
      isFirstTime: messageCount <= 1,
      firstMessage: u.lastmessage?.[0]?.text || "",
    };
  });

  return { users, total: users.length };
}

// ─── Inbox Stats ────────────────────────────────────────────────────

interface ChannelStat {
  id: string;
  name: string;
  type: "line" | "facebook";
  unreadCount: number;
  totalConversations: number;
}

interface InboxStats {
  totalUnread: number;
  line: { totalUnread: number; channels: ChannelStat[] };
  facebook: { totalUnread: number; channels: ChannelStat[] };
}

export async function getInboxStats(): Promise<InboxStats> {
  // Inbox stats still computed client-side from the users API
  // because the NestJS API returns raw user data
  const data = await api.get<any[]>("/users?limit=1000");

  const channelData: Record<string, { unread: number; total: number }> = {};

  Object.keys(LINE_CHANNELS).forEach((key) => {
    channelData[key] = { unread: 0, total: 0 };
  });
  Object.keys(FB_CHANNELS).forEach((key) => {
    channelData[key] = { unread: 0, total: 0 };
  });

  data.forEach((u: any) => {
    const channel = u.channel || "";
    const unreadCount = u.unreadCount || 0;
    if (channelData[channel] && unreadCount > 0) {
      channelData[channel].unread += unreadCount;
      channelData[channel].total += 1;
    }
  });

  const lineChannels: ChannelStat[] = Object.entries(LINE_CHANNELS).map(
    ([id, config]) => ({
      id,
      name: config.name,
      type: "line" as const,
      unreadCount: channelData[id]?.unread || 0,
      totalConversations: channelData[id]?.total || 0,
    })
  );

  const fbChannels: ChannelStat[] = Object.entries(FB_CHANNELS).map(
    ([id, config]) => ({
      id,
      name: config.name,
      type: "facebook" as const,
      unreadCount: channelData[id]?.unread || 0,
      totalConversations: channelData[id]?.total || 0,
    })
  );

  const totalLineUnread = lineChannels.reduce(
    (sum, ch) => sum + ch.unreadCount,
    0
  );
  const totalFbUnread = fbChannels.reduce(
    (sum, ch) => sum + ch.unreadCount,
    0
  );

  return {
    totalUnread: totalLineUnread + totalFbUnread,
    line: { totalUnread: totalLineUnread, channels: lineChannels },
    facebook: { totalUnread: totalFbUnread, channels: fbChannels },
  };
}

// ─── Inbox: Mark as Read ────────────────────────────────────────────

export async function markAsRead(userId: string): Promise<void> {
  await api.post(`/users/${userId}/read`, {});
}

// ─── Inbox: Send Message (via NestJS API) ───────────────────────────

interface SendMessageParams {
  oduserId: string;
  docId: string;
  text?: string;
  mediaType?: "image" | "video";
  mediaUrl?: string;
  previewUrl?: string;
  channel: string;
}

interface SendMessageResult {
  success: boolean;
  messageId: string;
  timestamp: number;
}

export async function sendMessage(
  params: SendMessageParams
): Promise<SendMessageResult> {
  return api.post<SendMessageResult>("/messages/send", params);
}

// ─── Slip Records ───────────────────────────────────────────────────

export interface SlipRecord {
  id: string;
  link: string;
  bank_name?: string;
  amount?: number;
  date_time?: string;
  sender_name?: string;
  receiver_name?: string;
  reference_number?: string;
  detected_at: any;
}

export async function getSlipsByDate(date: Date): Promise<SlipRecord[]> {
  const dateStr = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");

  const data = await api.get<{ slips: SlipRecord[] }>(`/slips?date=${dateStr}`);
  return data.slips;
}

// ─── Bank Accounts ──────────────────────────────────────────────────

export async function getBankAccounts(): Promise<BankAccount[]> {
  return api.get<BankAccount[]>("/bank-accounts");
}

export async function createBankAccount(
  data: Omit<BankAccount, "id" | "createdAt" | "updatedAt">
): Promise<BankAccount> {
  return api.post<BankAccount>("/bank-accounts", data);
}

export async function updateBankAccount(
  id: string,
  data: Partial<Omit<BankAccount, "id" | "createdAt">>
): Promise<void> {
  await api.put(`/bank-accounts/${id}`, data);
}

export async function deleteBankAccount(id: string): Promise<void> {
  await api.delete(`/bank-accounts/${id}`);
}

// ─── Media Upload ────────────────────────────────────────────────────

export async function uploadChatMedia(
  file: File,
  docId: string
): Promise<{ url: string; previewUrl: string; mediaType: "image" | "video" }> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("docId", docId);
  return api.upload("/messages/upload", formData);
}

// ─── Quick Reply Templates ───────────────────────────────────────────

export interface ReplyTemplate {
  id: string;
  title: string;
  text: string;
  category?: string;
  order?: number;
}

export async function getTemplates(): Promise<ReplyTemplate[]> {
  return api.get<ReplyTemplate[]>("/templates");
}

export async function createTemplate(
  data: Omit<ReplyTemplate, "id">
): Promise<ReplyTemplate> {
  return api.post<ReplyTemplate>("/templates", data);
}

export async function updateTemplate(
  id: string,
  data: Partial<ReplyTemplate>
): Promise<void> {
  await api.put(`/templates/${id}`, data);
}

export async function deleteTemplate(id: string): Promise<void> {
  await api.delete(`/templates/${id}`);
}

// ─── Customer Details ────────────────────────────────────────────────

export async function getCustomerDetails(id: string) {
  return api.get<any>(`/users/${id}/details`);
}

// ─── CRM: Tags ──────────────────────────────────────────────────────

export async function getAllTags() {
  return api.get<{ id: string; name: string; color: string }[]>("/users/tags");
}

export async function addCustomerTag(
  customerId: string,
  name: string,
  color?: string
) {
  return api.post(`/users/${customerId}/tags`, { name, color });
}

export async function removeCustomerTag(customerId: string, tagId: string) {
  return api.delete(`/users/${customerId}/tags/${tagId}`);
}

// ─── CRM: Notes ─────────────────────────────────────────────────────

export async function getCustomerNotes(customerId: string) {
  return api.get<any[]>(`/users/${customerId}/notes`);
}

export async function addCustomerNote(customerId: string, text: string) {
  return api.post(`/users/${customerId}/notes`, { text });
}

export async function deleteCustomerNote(noteId: string) {
  return api.delete(`/users/notes/${noteId}`);
}

// ─── CRM: Assignment & Status ───────────────────────────────────────

export async function assignCustomer(
  customerId: string,
  adminId: string,
  adminName: string
) {
  return api.post(`/users/${customerId}/assign`, { adminId, adminName });
}

export async function unassignCustomer(customerId: string) {
  return api.post(`/users/${customerId}/unassign`, {});
}

export async function setCustomerNickname(
  customerId: string,
  nickname: string | null
) {
  return api.post(`/users/${customerId}/nickname`, { nickname });
}

export async function setCustomerStatus(
  customerId: string,
  status: "OPEN" | "FOLLOW_UP" | "RESOLVED"
) {
  return api.post(`/users/${customerId}/status`, { status });
}
