import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/providers/prisma.service';
import { Prisma } from '@prisma/client';

interface ResponseTimeStats {
  summary: {
    avgMinutes: number;
    medianMinutes: number;
    fastestMinutes: number;
    slowestMinutes: number;
    totalConversations: number;
  };
  byHour: { hour: number; avgMinutes: number; count: number }[];
  byDayOfWeek: { day: number; dayName: string; avgMinutes: number; count: number }[];
  byChannel: { channel: string; avgMinutes: number; count: number }[];
  byAdmin: { adminName: string; avgMinutes: number; count: number }[];
}

interface MessageVolumeStats {
  daily: { date: string; incoming: number; outgoing: number }[];
  hourly: { hour: number; incoming: number; outgoing: number }[];
  byChannel: { channel: string; incoming: number; outgoing: number }[];
  totalIncoming: number;
  totalOutgoing: number;
}

interface AdminPerformanceStats {
  admins: {
    adminName: string;
    totalReplies: number;
    avgResponseMinutes: number;
    conversationsHandled: number;
  }[];
}

const THAI_DAYS = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getResponseTimeStats(
    startDate: string,
    endDate: string,
    channel?: string,
  ): Promise<ResponseTimeStats> {
    const startMs = new Date(startDate + 'T00:00:00+07:00').getTime();
    const endMs = new Date(endDate + 'T23:59:59.999+07:00').getTime();

    const channelFilter = channel
      ? Prisma.sql`AND c.channel = ${channel}`
      : Prisma.empty;

    // Calculate response times: for each incoming message, find the next outgoing message to the same customer
    const responseTimes = await this.prisma.$queryRaw<
      {
        response_minutes: number;
        hour_of_day: number;
        day_of_week: number;
        channel: string;
        admin_name: string | null;
        response_date: string;
      }[]
    >`
      WITH incoming AS (
        SELECT
          m.id,
          m.customer_id,
          m.timestamp AS incoming_ts,
          c.channel
        FROM messages m
        JOIN customers c ON c.id = m.customer_id
        WHERE m.type = 'INCOMING'
          AND m.timestamp >= ${startMs}::bigint
          AND m.timestamp <= ${endMs}::bigint
          ${channelFilter}
      ),
      responses AS (
        SELECT
          i.id AS incoming_id,
          i.customer_id,
          i.incoming_ts,
          i.channel,
          MIN(o.timestamp) AS response_ts,
          (SELECT o2.admin_name FROM messages o2
           WHERE o2.customer_id = i.customer_id
             AND o2.type = 'OUTGOING'
             AND o2.timestamp > i.incoming_ts
           ORDER BY o2.timestamp ASC LIMIT 1) AS admin_name
        FROM incoming i
        JOIN messages o ON o.customer_id = i.customer_id
          AND o.type = 'OUTGOING'
          AND o.timestamp > i.incoming_ts
        GROUP BY i.id, i.customer_id, i.incoming_ts, i.channel
      )
      SELECT
        ROUND(((response_ts - incoming_ts) / 60000.0)::numeric, 2)::float AS response_minutes,
        EXTRACT(HOUR FROM TO_TIMESTAMP(incoming_ts / 1000.0) AT TIME ZONE 'Asia/Bangkok')::int AS hour_of_day,
        EXTRACT(DOW FROM TO_TIMESTAMP(incoming_ts / 1000.0) AT TIME ZONE 'Asia/Bangkok')::int AS day_of_week,
        channel,
        COALESCE(admin_name, 'ไม่ระบุ') AS admin_name,
        TO_CHAR(TO_TIMESTAMP(incoming_ts / 1000.0) AT TIME ZONE 'Asia/Bangkok', 'YYYY-MM-DD') AS response_date
      FROM responses
      WHERE (response_ts - incoming_ts) < ${24 * 60 * 60 * 1000}::bigint
    `;

    if (responseTimes.length === 0) {
      return {
        summary: {
          avgMinutes: 0,
          medianMinutes: 0,
          fastestMinutes: 0,
          slowestMinutes: 0,
          totalConversations: 0,
        },
        byHour: [],
        byDayOfWeek: [],
        byChannel: [],
        byAdmin: [],
      };
    }

    // Summary
    const minutes = responseTimes.map((r) => r.response_minutes).sort((a, b) => a - b);
    const avg = minutes.reduce((s, v) => s + v, 0) / minutes.length;
    const median =
      minutes.length % 2 === 0
        ? (minutes[minutes.length / 2 - 1] + minutes[minutes.length / 2]) / 2
        : minutes[Math.floor(minutes.length / 2)];

    // Group by hour
    const hourMap = new Map<number, { total: number; count: number }>();
    for (let h = 0; h < 24; h++) hourMap.set(h, { total: 0, count: 0 });
    for (const r of responseTimes) {
      const entry = hourMap.get(r.hour_of_day)!;
      entry.total += r.response_minutes;
      entry.count++;
    }
    const byHour = Array.from(hourMap.entries()).map(([hour, { total, count }]) => ({
      hour,
      avgMinutes: count > 0 ? Math.round((total / count) * 100) / 100 : 0,
      count,
    }));

    // Group by day of week
    const dayMap = new Map<number, { total: number; count: number }>();
    for (let d = 0; d < 7; d++) dayMap.set(d, { total: 0, count: 0 });
    for (const r of responseTimes) {
      const entry = dayMap.get(r.day_of_week)!;
      entry.total += r.response_minutes;
      entry.count++;
    }
    const byDayOfWeek = Array.from(dayMap.entries()).map(([day, { total, count }]) => ({
      day,
      dayName: THAI_DAYS[day],
      avgMinutes: count > 0 ? Math.round((total / count) * 100) / 100 : 0,
      count,
    }));

    // Group by channel
    const channelMap = new Map<string, { total: number; count: number }>();
    for (const r of responseTimes) {
      if (!channelMap.has(r.channel)) channelMap.set(r.channel, { total: 0, count: 0 });
      const entry = channelMap.get(r.channel)!;
      entry.total += r.response_minutes;
      entry.count++;
    }
    const byChannel = Array.from(channelMap.entries()).map(([ch, { total, count }]) => ({
      channel: ch,
      avgMinutes: Math.round((total / count) * 100) / 100,
      count,
    }));

    // Group by admin
    const adminMap = new Map<string, { total: number; count: number }>();
    for (const r of responseTimes) {
      const name = r.admin_name;
      if (!adminMap.has(name)) adminMap.set(name, { total: 0, count: 0 });
      const entry = adminMap.get(name)!;
      entry.total += r.response_minutes;
      entry.count++;
    }
    const byAdmin = Array.from(adminMap.entries())
      .map(([adminName, { total, count }]) => ({
        adminName,
        avgMinutes: Math.round((total / count) * 100) / 100,
        count,
      }))
      .sort((a, b) => a.avgMinutes - b.avgMinutes);

    return {
      summary: {
        avgMinutes: Math.round(avg * 100) / 100,
        medianMinutes: Math.round(median * 100) / 100,
        fastestMinutes: Math.round(minutes[0] * 100) / 100,
        slowestMinutes: Math.round(minutes[minutes.length - 1] * 100) / 100,
        totalConversations: minutes.length,
      },
      byHour,
      byDayOfWeek,
      byChannel,
      byAdmin,
    };
  }

  async getMessageVolumeStats(
    startDate: string,
    endDate: string,
  ): Promise<MessageVolumeStats> {
    const startMs = new Date(startDate + 'T00:00:00+07:00').getTime();
    const endMs = new Date(endDate + 'T23:59:59.999+07:00').getTime();

    // Daily volume
    const daily = await this.prisma.$queryRaw<
      { date: string; incoming: bigint; outgoing: bigint }[]
    >`
      SELECT
        TO_CHAR(TO_TIMESTAMP(timestamp / 1000.0) AT TIME ZONE 'Asia/Bangkok', 'YYYY-MM-DD') AS date,
        COUNT(*) FILTER (WHERE type = 'INCOMING') AS incoming,
        COUNT(*) FILTER (WHERE type = 'OUTGOING') AS outgoing
      FROM messages
      WHERE timestamp >= ${startMs}::bigint AND timestamp <= ${endMs}::bigint
      GROUP BY date
      ORDER BY date
    `;

    // Hourly volume
    const hourly = await this.prisma.$queryRaw<
      { hour: number; incoming: bigint; outgoing: bigint }[]
    >`
      SELECT
        EXTRACT(HOUR FROM TO_TIMESTAMP(timestamp / 1000.0) AT TIME ZONE 'Asia/Bangkok')::int AS hour,
        COUNT(*) FILTER (WHERE type = 'INCOMING') AS incoming,
        COUNT(*) FILTER (WHERE type = 'OUTGOING') AS outgoing
      FROM messages
      WHERE timestamp >= ${startMs}::bigint AND timestamp <= ${endMs}::bigint
      GROUP BY hour
      ORDER BY hour
    `;

    // By channel
    const byChannel = await this.prisma.$queryRaw<
      { channel: string; incoming: bigint; outgoing: bigint }[]
    >`
      SELECT
        c.channel,
        COUNT(*) FILTER (WHERE m.type = 'INCOMING') AS incoming,
        COUNT(*) FILTER (WHERE m.type = 'OUTGOING') AS outgoing
      FROM messages m
      JOIN customers c ON c.id = m.customer_id
      WHERE m.timestamp >= ${startMs}::bigint AND m.timestamp <= ${endMs}::bigint
      GROUP BY c.channel
      ORDER BY (COUNT(*)) DESC
    `;

    const totalIncoming = daily.reduce((s, d) => s + Number(d.incoming), 0);
    const totalOutgoing = daily.reduce((s, d) => s + Number(d.outgoing), 0);

    return {
      daily: daily.map((d) => ({
        date: d.date,
        incoming: Number(d.incoming),
        outgoing: Number(d.outgoing),
      })),
      hourly: hourly.map((h) => ({
        hour: h.hour,
        incoming: Number(h.incoming),
        outgoing: Number(h.outgoing),
      })),
      byChannel: byChannel.map((c) => ({
        channel: c.channel,
        incoming: Number(c.incoming),
        outgoing: Number(c.outgoing),
      })),
      totalIncoming,
      totalOutgoing,
    };
  }

  async getAdminPerformanceStats(
    startDate: string,
    endDate: string,
  ): Promise<AdminPerformanceStats> {
    const startMs = new Date(startDate + 'T00:00:00+07:00').getTime();
    const endMs = new Date(endDate + 'T23:59:59.999+07:00').getTime();

    const admins = await this.prisma.$queryRaw<
      {
        admin_name: string;
        total_replies: bigint;
        avg_response_minutes: number | null;
        conversations_handled: bigint;
      }[]
    >`
      WITH admin_replies AS (
        SELECT
          COALESCE(m.admin_name, 'ไม่ระบุ') AS admin_name,
          m.customer_id,
          m.timestamp AS reply_ts
        FROM messages m
        WHERE m.type = 'OUTGOING'
          AND m.sender = 'ADMIN'
          AND m.timestamp >= ${startMs}::bigint
          AND m.timestamp <= ${endMs}::bigint
          AND m.admin_name IS NOT NULL
      ),
      with_response_time AS (
        SELECT
          ar.admin_name,
          ar.customer_id,
          ar.reply_ts,
          (SELECT MAX(im.timestamp) FROM messages im
           WHERE im.customer_id = ar.customer_id
             AND im.type = 'INCOMING'
             AND im.timestamp < ar.reply_ts) AS last_incoming_ts
        FROM admin_replies ar
      )
      SELECT
        admin_name,
        COUNT(*)::bigint AS total_replies,
        ROUND(AVG(
          CASE
            WHEN last_incoming_ts IS NOT NULL
              AND (reply_ts - last_incoming_ts) < ${24 * 60 * 60 * 1000}::bigint
            THEN (reply_ts - last_incoming_ts) / 60000.0
            ELSE NULL
          END
        )::numeric, 2)::float AS avg_response_minutes,
        COUNT(DISTINCT customer_id)::bigint AS conversations_handled
      FROM with_response_time
      GROUP BY admin_name
      ORDER BY avg_response_minutes ASC NULLS LAST
    `;

    return {
      admins: admins.map((a) => ({
        adminName: a.admin_name,
        totalReplies: Number(a.total_replies),
        avgResponseMinutes: a.avg_response_minutes ?? 0,
        conversationsHandled: Number(a.conversations_handled),
      })),
    };
  }

  async getDashboardStats() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
    const weekAgo = new Date(today); weekAgo.setDate(today.getDate() - 7);
    const monthAgo = new Date(today); monthAgo.setDate(today.getDate() - 30);
    const prevMonthStart = new Date(today); prevMonthStart.setDate(today.getDate() - 60);

    const [
      totalCustomers,
      totalMessages,
      todayMessages,
      yesterdayMessages,
      weekMessages,
      monthMessages,
      prevMonthMessages,
      newCustomersToday,
      newCustomersWeek,
      newCustomersMonth,
      newCustomersPrevMonth,
      unreadCount,
      followUpCount,
      pendingQuotes,
    ] = await Promise.all([
      this.prisma.customer.count(),
      this.prisma.message.count(),
      this.prisma.message.count({ where: { timestamp: { gte: today.getTime() } } }),
      this.prisma.message.count({ where: { timestamp: { gte: yesterday.getTime(), lt: today.getTime() } } }),
      this.prisma.message.count({ where: { timestamp: { gte: weekAgo.getTime() } } }),
      this.prisma.message.count({ where: { timestamp: { gte: monthAgo.getTime() } } }),
      this.prisma.message.count({ where: { timestamp: { gte: prevMonthStart.getTime(), lt: monthAgo.getTime() } } }),
      this.prisma.customer.count({ where: { firstContactAt: { gte: today } } }),
      this.prisma.customer.count({ where: { firstContactAt: { gte: weekAgo } } }),
      this.prisma.customer.count({ where: { firstContactAt: { gte: monthAgo } } }),
      this.prisma.customer.count({ where: { firstContactAt: { gte: prevMonthStart, lt: monthAgo } } }),
      this.prisma.customer.count({ where: { unreadCount: { gt: 0 } } }),
      this.prisma.customer.count({ where: { status: 'FOLLOW_UP' } }),
      this.prisma.customer.count({ where: { tags: { some: { tag: { name: 'ลูกค้าจองงานแล้ว' } } }, nextJobDate: { gte: today } } }),
    ]);

    // Messages per day (last 14 days)
    const dailyMessages = await this.prisma.$queryRaw<any[]>`
      SELECT
        TO_CHAR(TO_TIMESTAMP(timestamp / 1000), 'YYYY-MM-DD') as date,
        COUNT(*) FILTER (WHERE type = 'INCOMING') as incoming,
        COUNT(*) FILTER (WHERE type = 'OUTGOING') as outgoing
      FROM messages
      WHERE timestamp >= ${weekAgo.getTime() - 7 * 86400000}
      GROUP BY date
      ORDER BY date
    `;

    // New customers per day (last 14 days)
    const dailyNewCustomers = await this.prisma.$queryRaw<any[]>`
      SELECT DATE(first_contact_at) as date, COUNT(*) as count
      FROM customers
      WHERE first_contact_at >= ${new Date(today.getTime() - 14 * 86400000)}
      GROUP BY DATE(first_contact_at)
      ORDER BY date
    `;

    // Top channels by activity (last 30 days)
    const channelActivity = await this.prisma.$queryRaw<any[]>`
      SELECT c.channel, c.channel_type,
        COUNT(DISTINCT c.id) as customers,
        COUNT(m.id) as messages
      FROM customers c
      LEFT JOIN messages m ON m.customer_id = c.id AND m.timestamp >= ${monthAgo.getTime()}
      WHERE c.last_message_at >= ${monthAgo}
      GROUP BY c.channel, c.channel_type
      ORDER BY messages DESC
    `;

    // Upcoming jobs this week
    const upcomingJobs = await this.prisma.customer.findMany({
      where: {
        nextJobDate: { gte: today, lte: new Date(today.getTime() + 7 * 86400000) },
      },
      select: {
        id: true,
        displayName: true,
        nickname: true,
        nextJobDate: true,
        nextJobTitle: true,
        channel: true,
        channelType: true,
      },
      orderBy: { nextJobDate: 'asc' },
      take: 10,
    });

    // Recent customers needing attention (unread > 0, sorted by oldest unread)
    const needsAttention = await this.prisma.customer.findMany({
      where: { unreadCount: { gt: 0 } },
      select: {
        id: true,
        displayName: true,
        nickname: true,
        unreadCount: true,
        lastMessageAt: true,
        channel: true,
        channelType: true,
        pictureUrl: true,
      },
      orderBy: { lastMessageAt: 'asc' },
      take: 10,
    });

    const msgGrowth = prevMonthMessages > 0
      ? Math.round(((monthMessages - prevMonthMessages) / prevMonthMessages) * 100)
      : 0;
    const custGrowth = newCustomersPrevMonth > 0
      ? Math.round(((newCustomersMonth - newCustomersPrevMonth) / newCustomersPrevMonth) * 100)
      : 0;

    return {
      overview: {
        totalCustomers,
        totalMessages,
        todayMessages,
        yesterdayMessages,
        weekMessages,
        monthMessages,
        msgGrowth,
        newCustomersToday,
        newCustomersWeek,
        newCustomersMonth,
        custGrowth,
        unreadCount,
        followUpCount,
        pendingQuotes,
      },
      dailyMessages: dailyMessages.map((d: any) => ({
        date: d.date,
        incoming: Number(d.incoming),
        outgoing: Number(d.outgoing),
      })),
      dailyNewCustomers: dailyNewCustomers.map((d: any) => ({
        date: d.date instanceof Date ? d.date.toISOString().split('T')[0] : String(d.date).split('T')[0],
        count: Number(d.count),
      })),
      channelActivity: channelActivity.map((c: any) => ({
        channel: c.channel,
        channelType: c.channel_type === 'LINE' ? 'line' : 'facebook',
        customers: Number(c.customers),
        messages: Number(c.messages),
      })),
      upcomingJobs: upcomingJobs.map((j) => ({
        id: j.id,
        displayName: j.nickname || j.displayName,
        jobDate: j.nextJobDate?.toISOString().split('T')[0],
        jobTitle: j.nextJobTitle,
        channel: j.channel,
        channelType: j.channelType === 'LINE' ? 'line' : 'facebook',
      })),
      needsAttention: needsAttention.map((c) => ({
        id: c.id,
        displayName: c.nickname || c.displayName,
        unreadCount: c.unreadCount,
        lastMessageAt: c.lastMessageAt?.toISOString(),
        channel: c.channel,
        channelType: c.channelType === 'LINE' ? 'line' : 'facebook',
        pictureUrl: c.pictureUrl,
      })),
    };
  }

  async getCustomerAnalytics(startDate: string, endDate: string) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    // 1. New customers per day
    const newCustomersDaily = await this.prisma.$queryRaw<any[]>`
      SELECT DATE(first_contact_at) as date, COUNT(*) as count
      FROM customers
      WHERE first_contact_at BETWEEN ${start} AND ${end}
      GROUP BY DATE(first_contact_at)
      ORDER BY date
    `;

    // 2. Customers by channel type
    const byChannelType = await this.prisma.$queryRaw<any[]>`
      SELECT channel_type, COUNT(*) as count
      FROM customers
      WHERE first_contact_at BETWEEN ${start} AND ${end}
      GROUP BY channel_type
    `;

    // 3. Customers by channel
    const byChannel = await this.prisma.$queryRaw<any[]>`
      SELECT channel, COUNT(*) as count
      FROM customers
      WHERE first_contact_at BETWEEN ${start} AND ${end}
      GROUP BY channel
      ORDER BY count DESC
    `;

    // 4. Top customers by message count (in period)
    const topCustomers = await this.prisma.$queryRaw<any[]>`
      SELECT c.id, c.display_name, c.nickname, c.channel, c.channel_type, c.picture_url,
             COUNT(m.id) as message_count,
             MIN(m.timestamp) as first_msg,
             MAX(m.timestamp) as last_msg
      FROM customers c
      JOIN messages m ON m.customer_id = c.id
      WHERE m.timestamp BETWEEN ${start.getTime()} AND ${end.getTime()}
        AND m.type = 'INCOMING'
      GROUP BY c.id, c.display_name, c.nickname, c.channel, c.channel_type, c.picture_url
      ORDER BY message_count DESC
      LIMIT 20
    `;

    // 5. Customer status breakdown
    const byStatus = await this.prisma.$queryRaw<any[]>`
      SELECT status, COUNT(*) as count
      FROM customers
      WHERE last_message_at BETWEEN ${start} AND ${end}
      GROUP BY status
    `;

    // 6. Customers with tags breakdown
    const tagStats = await this.prisma.$queryRaw<any[]>`
      SELECT t.name, t.color, COUNT(ct.customer_id) as count
      FROM tags t
      JOIN customer_tags ct ON ct.tag_id = t.id
      JOIN customers c ON c.id = ct.customer_id
      WHERE c.last_message_at BETWEEN ${start} AND ${end}
      GROUP BY t.id, t.name, t.color
      ORDER BY count DESC
      LIMIT 15
    `;

    // 7. Returning vs new (customers who messaged in period but first contact was before)
    const returningCount = await this.prisma.customer.count({
      where: {
        lastMessageAt: { gte: start, lte: end },
        firstContactAt: { lt: start },
      },
    });
    const newCount = await this.prisma.customer.count({
      where: {
        firstContactAt: { gte: start, lte: end },
      },
    });

    // 8. Total active in period
    const activeCount = await this.prisma.customer.count({
      where: {
        lastMessageAt: { gte: start, lte: end },
      },
    });

    // 9. Customers with phone number
    const withPhone = await this.prisma.customer.count({
      where: {
        lastMessageAt: { gte: start, lte: end },
        phoneNumber: { not: null },
      },
    });

    return {
      summary: {
        active: activeCount,
        new: newCount,
        returning: returningCount,
        withPhone,
        phoneRate: activeCount > 0 ? Math.round((withPhone / activeCount) * 100) : 0,
      },
      newCustomersDaily: newCustomersDaily.map((d: any) => ({
        date: d.date instanceof Date ? d.date.toISOString().split('T')[0] : String(d.date).split('T')[0],
        count: Number(d.count),
      })),
      byChannelType: byChannelType.map((c: any) => ({
        type: c.channel_type,
        count: Number(c.count),
      })),
      byChannel: byChannel.map((c: any) => ({
        channel: c.channel,
        count: Number(c.count),
      })),
      topCustomers: topCustomers.map((c: any) => ({
        id: c.id,
        displayName: c.nickname || c.display_name,
        channel: c.channel,
        channelType: c.channel_type === 'LINE' ? 'line' : 'facebook',
        pictureUrl: c.picture_url,
        messageCount: Number(c.message_count),
      })),
      byStatus: byStatus.map((s: any) => ({
        status: s.status,
        count: Number(s.count),
      })),
      tagStats: tagStats.map((t: any) => ({
        name: t.name,
        color: t.color,
        count: Number(t.count),
      })),
    };
  }
}
