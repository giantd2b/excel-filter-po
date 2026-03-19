import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/providers/prisma.service';
import { FirebaseService } from '../../common/providers/firebase.service';
import { AdminRole } from '@prisma/client';

@Injectable()
export class AdminsService {
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
}
