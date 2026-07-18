// Types for Unified Inbox

export interface MessageReaction {
  emoji: string;
  adminName: string;
  adminId?: string;
}

export interface ReplyTo {
  id: string;
  text?: string;
  type: "incoming" | "outgoing";
  sender: "user" | "admin";
  mediaType?: string;
  adminName?: string;
}

export interface Message {
  id: string;
  text?: string;
  type: "incoming" | "outgoing";
  sender: "user" | "admin";
  timestamp: number;
  status?: "sending" | "sent" | "delivered" | "failed";
  adminId?: string;
  adminName?: string;
  mediaType?: "image" | "video" | "sticker";
  mediaUrl?: string;
  previewUrl?: string;
  quoteToken?: string;
  replyToId?: string;
  replyTo?: ReplyTo;
  reactions?: MessageReaction[];
}

export interface ChatUser {
  id: string;
  oduserId: string;
  displayName: string;
  pictureUrl: string;
  profile_pic?: string;
  channel: string;
  channelType: "line" | "facebook";
  timestamp: number;
  lastmessagetime: number;
  unreadCount: number;
  lastMessagePreview: string;
  first_name?: string;
  last_name?: string;
  nextJobDate?: string | null;
  nextJobTitle?: string | null;
  isPinned?: boolean;
}

export interface Channel {
  id: string;
  name: string;
  type: "line" | "facebook";
  unreadCount: number;
}

export interface ChannelConfig {
  id: string;
  name: string;
  type: "line" | "facebook";
  accessToken?: string;
  pageId?: string;
  destinationId?: string;
}

// LINE Channels Configuration
export const LINE_CHANNELS: Record<string, ChannelConfig> = {
  Line_IRIS: {
    id: "Line_IRIS",
    name: "IRIS",
    type: "line",
    destinationId: "U2d0595a5f7582621a650a46e99972109",
  },
  "Line_เติมบุญ": {
    id: "Line_เติมบุญ",
    name: "เติมบุญ",
    type: "line",
    destinationId: "Uf18fee4c17bb410a565889f27015ace0",
  },
  Line_Chon: {
    id: "Line_Chon",
    name: "Chon",
    type: "line",
    destinationId: "U55912d0c8784e0453127fe2ae2a7723e",
  },
  "Line_โต๊ะจีน": {
    id: "Line_โต๊ะจีน",
    name: "โต๊ะจีน",
    type: "line",
    destinationId: "U85b0000da2c00ce71e42c98dad76b2a9",
  },
  "Line_ไอริสเติมบุญ": {
    id: "Line_ไอริสเติมบุญ",
    name: "ไอริสเติมบุญ",
    type: "line",
    destinationId: "U01bce79462ed13d1e983d1e9f72dde27",
  },
  "Line_ทดสอบระบบ": {
    id: "Line_ทดสอบระบบ",
    name: "ทดสอบระบบ",
    type: "line",
    destinationId: "U08f3963a8a32d32cadb457dde35dc897",
  },
};

// Facebook Channels Configuration
export const FB_CHANNELS: Record<string, ChannelConfig> = {
  FB_IRIS: {
    id: "FB_IRIS",
    name: "IRIS",
    type: "facebook",
    pageId: "342502096352138",
  },
  FB_IRIS_RAYONG: {
    id: "FB_IRIS_RAYONG",
    name: "IRIS Rayong",
    type: "facebook",
    pageId: "100433364819860",
  },
  "FB_เติมบุญ": {
    id: "FB_เติมบุญ",
    name: "เติมบุญ",
    type: "facebook",
    pageId: "2323861754514969",
  },
  "FB_ชล": {
    id: "FB_ชล",
    name: "ชล",
    type: "facebook",
    pageId: "1179375335569460",
  },
  "FB_โต๊ะจีน": {
    id: "FB_โต๊ะจีน",
    name: "โต๊ะจีน",
    type: "facebook",
    pageId: "100315376073691",
  },
  "FB_ทดสอบระบบ": {
    id: "FB_ทดสอบระบบ",
    name: "ทดสอบระบบ",
    type: "facebook",
    pageId: "111545563829281",
  },
  "FB_ทดสอบระบบ2": {
    id: "FB_ทดสอบระบบ2",
    name: "ทดสอบระบบ2",
    type: "facebook",
    pageId: "2205446836437741",
  },
  "FB_กรีนเฮ้าส์": {
    id: "FB_กรีนเฮ้าส์",
    name: "กรีนเฮ้าส์",
    type: "facebook",
    pageId: "190328791785664",
  },
};

// All channels combined
export const ALL_CHANNELS: Record<string, ChannelConfig> = {
  ...LINE_CHANNELS,
  ...FB_CHANNELS,
};

// Helper to get channel type from channel name
export function getChannelType(channel: string): "line" | "facebook" {
  if (channel.startsWith("Line_")) return "line";
  if (channel.startsWith("FB_")) return "facebook";
  return "line"; // default
}
