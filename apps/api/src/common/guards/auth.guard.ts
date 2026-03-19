import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { FirebaseService } from '../providers/firebase.service';
import { PrismaService } from '../providers/prisma.service';

@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  constructor(
    private readonly firebase: FirebaseService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid authorization header');
    }

    const token = authHeader.split('Bearer ')[1];

    try {
      const decodedToken = await this.firebase.auth.verifyIdToken(token);
      request.user = decodedToken;

      // Auto-create or fetch admin profile from PostgreSQL
      const admin = await this.findOrCreateAdmin(
        decodedToken.uid,
        decodedToken.email || '',
        decodedToken.name || decodedToken.email?.split('@')[0] || 'Admin',
      );

      if (!admin.isActive) {
        throw new ForbiddenException('Admin account has been deactivated');
      }

      request.admin = admin;

      return true;
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  private async findOrCreateAdmin(uid: string, email: string, name: string) {
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
}
