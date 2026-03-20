import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import axios from 'axios';
import { PrismaService } from '../../common/providers/prisma.service';
import { FirebaseService } from '../../common/providers/firebase.service';
import { AdminRole } from '@prisma/client';

@Injectable()
export class AdminsService {
  private readonly logger = new Logger(AdminsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly firebase: FirebaseService,
  ) {}

  async findAll() {
    return this.prisma.admin.findMany({
      orderBy: [{ role: 'asc' }, { name: 'asc' }],
    });
  }

  async findOne(id: string) {
    const admin = await this.prisma.admin.findUnique({ where: { id } });
    if (!admin) throw new NotFoundException('Admin not found');
    return admin;
  }

  async findOrCreate(uid: string, email: string, name: string) {
    let admin = await this.prisma.admin.findUnique({ where: { id: uid } });

    if (!admin) {
      admin = await this.prisma.admin.create({
        data: {
          id: uid,
          email,
          name,
          role: 'AGENT',
        },
      });
    }

    return admin;
  }

  async update(id: string, data: { name?: string; avatar?: string; role?: AdminRole }) {
    const admin = await this.prisma.admin.findUnique({ where: { id } });
    if (!admin) throw new NotFoundException('Admin not found');

    return this.prisma.admin.update({
      where: { id },
      data,
    });
  }

  async deactivate(id: string) {
    const admin = await this.prisma.admin.findUnique({ where: { id } });
    if (!admin) throw new NotFoundException('Admin not found');

    return this.prisma.admin.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async activate(id: string) {
    const admin = await this.prisma.admin.findUnique({ where: { id } });
    if (!admin) throw new NotFoundException('Admin not found');

    return this.prisma.admin.update({
      where: { id },
      data: { isActive: true },
    });
  }

  async updateLastSeen(id: string) {
    return this.prisma.admin.update({
      where: { id },
      data: { lastSeenAt: new Date() },
    });
  }

  async getOnlineAdmins() {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    return this.prisma.admin.findMany({
      where: {
        isActive: true,
        lastSeenAt: { gte: fiveMinutesAgo },
      },
      orderBy: { name: 'asc' },
    });
  }

  async createAdmin(email: string, name: string, role: AdminRole, password: string) {
    // Create Firebase Auth user
    const firebaseUser = await this.firebase.auth.createUser({
      email,
      password,
      displayName: name,
    });

    // Create admin record in PostgreSQL
    return this.prisma.admin.create({
      data: {
        id: firebaseUser.uid,
        email,
        name,
        role,
      },
    });
  }

  // ─── API Keys ─────────────────────────────────────────────

  async getApiKeys() {
    return this.prisma.apiKey.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async createApiKey(name: string, createdBy: string) {
    const crypto = require('crypto');
    const key = 'iris-crm-' + crypto.randomBytes(24).toString('hex');
    return this.prisma.apiKey.create({
      data: { name, key, createdBy },
    });
  }

  async deactivateApiKey(id: string) {
    return this.prisma.apiKey.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async activateApiKey(id: string) {
    return this.prisma.apiKey.update({
      where: { id },
      data: { isActive: true },
    });
  }

  async deleteApiKey(id: string) {
    return this.prisma.apiKey.delete({ where: { id } });
  }

  async validateApiKey(key: string): Promise<boolean> {
    const apiKey = await this.prisma.apiKey.findUnique({ where: { key } });
    if (!apiKey || !apiKey.isActive) return false;
    // Update last used
    this.prisma.apiKey.update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date() },
    }).catch(() => {});
    return true;
  }

  // ─── Push Tokens ───────────────────────────────────────────

  async registerPushToken(adminId: string, token: string, platform: string) {
    // Upsert: if token exists, update adminId; if not, create
    return this.prisma.pushToken.upsert({
      where: { token },
      update: { adminId, platform },
      create: { adminId, token, platform },
    });
  }

  async sendPushToAllAdmins(title: string, body: string, data?: Record<string, any>) {
    try {
      const tokens = await this.prisma.pushToken.findMany();
      if (tokens.length === 0) return;

      const messages = tokens.map((t) => ({
        to: t.token,
        sound: 'default',
        title,
        body,
        data: data || {},
      }));

      // Send via Expo Push API (batches of 100)
      for (let i = 0; i < messages.length; i += 100) {
        const batch = messages.slice(i, i + 100);
        try {
          const response = await axios.post(
            'https://exp.host/--/api/v2/push/send',
            batch,
            {
              headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
              },
            },
          );

          // Remove invalid tokens
          const results = response.data?.data || [];
          for (let j = 0; j < results.length; j++) {
            if (results[j]?.status === 'error' &&
                (results[j]?.details?.error === 'DeviceNotRegistered' ||
                 results[j]?.details?.error === 'InvalidCredentials')) {
              await this.prisma.pushToken.delete({
                where: { token: batch[j].to },
              }).catch(() => {});
            }
          }
        } catch (err: any) {
          this.logger.warn(`Push send failed: ${err.message}`);
        }
      }
    } catch (err: any) {
      this.logger.error(`Push notification error: ${err.message}`);
    }
  }

  // ─── Auth Logs ─────────────────────────────────────────────

  async createAuthLog(data: {
    adminId: string;
    email: string;
    action: string;
    ip?: string;
    userAgent?: string;
    platform?: string;
  }) {
    return this.prisma.authLog.create({ data });
  }

  async getAuthLogs(limit = 50, adminId?: string) {
    const where: any = {};
    if (adminId) where.adminId = adminId;

    return this.prisma.authLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
