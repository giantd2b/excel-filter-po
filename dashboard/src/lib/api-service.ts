import { api } from "./api-client";
import { BankAccount } from "@/types/bank-account";
import { LINE_CHANNELS, FB_CHANNELS } from "@/types/inbox";

// ─── Users ──────────────────────────────────────────────────────────

interface UserListItem {
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
  lastId?: string | null,
  search?: string,
  channel?: string,
): Promise<UsersResult> {
  const params = new URLSearchParams({ limit: String(limitCount) });
  if (lastId) params.set("startAfter", lastId);
  if (search) params.set("search", search);
  if (channel) params.set("channel", channel);

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

export async function bulkMarkAsRead(ids?: string[], all?: boolean, channel?: string, channelType?: string): Promise<void> {
  await api.post("/users/bulk-read", { ids, all, channel, channelType });
}

// ─── Inbox: Send Message (via NestJS API) ───────────────────────────

interface SendMessageParams {
  oduserId: string;
  docId: string;
  text?: string;
  mediaType?: "image" | "video" | "file";
  mediaUrl?: string;
  previewUrl?: string;
  stickerId?: string;
  stickerPackageId?: string;
  channel: string;
  replyToId?: string;
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

// ─── IRIS Jobs Lookup ────────────────────────────────────────────────

export async function getCustomerJobs(customerId: string) {
  return api.get<{ jobs: any[]; matched: boolean; phone?: string }>(`/users/${customerId}/jobs`);
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
  images?: string[];
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

// ─── Knowledge Base ─────────────────────────────────────────────────

export interface KnowledgeEntry {
  id: string;
  service: string;
  category: string;
  question: string;
  answer: string;
  keywords: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export async function getKnowledgeEntries(params?: {
  service?: string;
  category?: string;
  search?: string;
  isActive?: boolean;
}): Promise<KnowledgeEntry[]> {
  const searchParams = new URLSearchParams();
  if (params?.service) searchParams.set("service", params.service);
  if (params?.category) searchParams.set("category", params.category);
  if (params?.search) searchParams.set("search", params.search);
  if (params?.isActive !== undefined)
    searchParams.set("isActive", String(params.isActive));
  const qs = searchParams.toString();
  return api.get<KnowledgeEntry[]>(`/knowledge${qs ? `?${qs}` : ""}`);
}

export async function createKnowledgeEntry(
  data: Omit<KnowledgeEntry, "id" | "createdAt" | "updatedAt">
): Promise<KnowledgeEntry> {
  return api.post<KnowledgeEntry>("/knowledge", data);
}

export async function updateKnowledgeEntry(
  id: string,
  data: Partial<Omit<KnowledgeEntry, "id" | "createdAt" | "updatedAt">>
): Promise<KnowledgeEntry> {
  return api.put<KnowledgeEntry>(`/knowledge/${id}`, data);
}

export async function deleteKnowledgeEntry(id: string): Promise<void> {
  await api.delete(`/knowledge/${id}`);
}

export async function bulkImportKnowledge(
  entries: Array<{
    service: string;
    category: string;
    question: string;
    answer: string;
    keywords?: string;
    sortOrder?: number;
  }>
): Promise<{ count: number }> {
  return api.post<{ count: number }>("/knowledge/import", entries);
}

// ─── AI System Prompt ────────────────────────────────────────────────

export async function getSystemPrompt(): Promise<{ prompt: string | null }> {
  return api.get<{ prompt: string | null }>("/knowledge/system-prompt");
}

export async function updateSystemPrompt(prompt: string): Promise<void> {
  await api.put("/knowledge/system-prompt", { prompt });
}

// ─── Customer Details ────────────────────────────────────────────────

export async function getCustomerDetails(id: string) {
  return api.get<any>(`/users/${id}/details`);
}

// ─── IRIS Jobs: create a job card from this chat customer ───────────

export interface CreateJobCardInput {
  name: string;
  due: string; // YYYY-MM-DD
  eventTime?: string; // HH:mm
  deposit?: number;
  balance?: number;
  telno?: string;
  desc?: string;
  slipUrl?: string;
  slipTime?: string;
}

export async function createJobCard(customerId: string, input: CreateJobCardInput) {
  return api.post<{ success: boolean; cardId?: string; error?: string }>(
    `/users/${customerId}/job-card`,
    input,
  );
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

export async function toggleCustomerPin(customerId: string) {
  return api.post(`/users/${customerId}/pin`, {});
}

// ─── Quotations Pipeline ──────────────────────────────────────────

export async function getQuotationPipeline(params: {
  status?: string;
  search?: string;
  matched?: string;
  dateFrom?: string;
  page?: number;
  limit?: number;
}) {
  const qs = new URLSearchParams();
  if (params.status) qs.set("status", params.status);
  if (params.search) qs.set("search", params.search);
  if (params.matched) qs.set("matched", params.matched);
  if (params.dateFrom) qs.set("dateFrom", params.dateFrom);
  if (params.page) qs.set("page", String(params.page));
  if (params.limit) qs.set("limit", String(params.limit));
  return api.get<any>(`/quotations/pipeline?${qs}`);
}

export async function getQuotationStats() {
  return api.get<any>("/quotations/stats");
}

export async function syncQuotations() {
  return api.get<any>("/quotations/sync");
}

export async function getUnmatchedCandidates(page = 1, limit = 20) {
  return api.get<any>(`/quotations/unmatched-candidates?page=${page}&limit=${limit}`);
}

export async function linkCustomerToQuote(phone: string, customerId: string, docNo?: string) {
  const params = new URLSearchParams({ phone, customerId });
  if (docNo) params.set("docNo", docNo);
  return api.post<any>(`/quotations/link-customer?${params}`, {});
}
