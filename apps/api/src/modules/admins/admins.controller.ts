import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  Req,
  UseGuards,
  ForbiddenException,
  Headers,
} from '@nestjs/common';
import { AdminsService } from './admins.service';
import { FirebaseAuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard, Roles } from '../../common/guards/roles.guard';
import { AdminRole } from '@prisma/client';

@Controller('admins')
@UseGuards(FirebaseAuthGuard, RolesGuard)
export class AdminsController {
  constructor(private readonly adminsService: AdminsService) {}

  @Get()
  @Roles('SUPER_ADMIN', 'ADMIN')
  findAll() {
    return this.adminsService.findAll();
  }

  @Get('me')
  getMe(@Req() req: any) {
    return req.admin;
  }

  @Get('online')
  getOnlineAdmins() {
    return this.adminsService.getOnlineAdmins();
  }

  @Post('heartbeat')
  async heartbeat(@Req() req: any) {
    await this.adminsService.updateLastSeen(req.admin.id);
    return { success: true };
  }

  @Post()
  @Roles('SUPER_ADMIN', 'ADMIN')
  async createAdmin(
    @Req() req: any,
    @Body() body: { email: string; name: string; role: AdminRole; password: string },
  ) {
    // Only SUPER_ADMIN can create SUPER_ADMIN or ADMIN
    if (
      req.admin.role !== 'SUPER_ADMIN' &&
      (body.role === 'SUPER_ADMIN' || body.role === 'ADMIN')
    ) {
      throw new ForbiddenException('Only SUPER_ADMIN can create ADMIN or SUPER_ADMIN accounts');
    }

    return this.adminsService.createAdmin(body.email, body.name, body.role, body.password);
  }

  @Put(':id')
  @Roles('SUPER_ADMIN', 'ADMIN')
  async update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { name?: string; avatar?: string; role?: AdminRole },
  ) {
    // Only SUPER_ADMIN can change roles
    if (body.role && req.admin.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Only SUPER_ADMIN can change roles');
    }

    // Prevent demoting yourself
    if (body.role && id === req.admin.id) {
      throw new ForbiddenException('Cannot change your own role');
    }

    return this.adminsService.update(id, body);
  }

  @Post(':id/deactivate')
  @Roles('SUPER_ADMIN')
  async deactivate(@Req() req: any, @Param('id') id: string) {
    if (id === req.admin.id) {
      throw new ForbiddenException('Cannot deactivate yourself');
    }
    return this.adminsService.deactivate(id);
  }

  @Post(':id/activate')
  @Roles('SUPER_ADMIN')
  activate(@Param('id') id: string) {
    return this.adminsService.activate(id);
  }

  // ─── API Keys ──────────────────────────────────────────────

  @Get('api-keys')
  @Roles('SUPER_ADMIN', 'ADMIN')
  getApiKeys() {
    return this.adminsService.getApiKeys();
  }

  @Post('api-keys')
  @Roles('SUPER_ADMIN', 'ADMIN')
  createApiKey(
    @Req() req: any,
    @Body() body: { name: string },
  ) {
    return this.adminsService.createApiKey(body.name, req.admin?.id || req.user?.uid);
  }

  @Post('api-keys/:id/deactivate')
  @Roles('SUPER_ADMIN', 'ADMIN')
  deactivateApiKey(@Param('id') id: string) {
    return this.adminsService.deactivateApiKey(id);
  }

  @Post('api-keys/:id/activate')
  @Roles('SUPER_ADMIN', 'ADMIN')
  activateApiKey(@Param('id') id: string) {
    return this.adminsService.activateApiKey(id);
  }

  @Delete('api-keys/:id')
  @Roles('SUPER_ADMIN')
  deleteApiKey(@Param('id') id: string) {
    return this.adminsService.deleteApiKey(id);
  }

  @Post('api-keys/:id/delete')
  @Roles('SUPER_ADMIN')
  deleteApiKeyPost(@Param('id') id: string) {
    return this.adminsService.deleteApiKey(id);
  }

  // ─── Push Tokens ────────────────────────────────────────────

  @Post('push-token')
  async registerPushToken(
    @Req() req: any,
    @Body() body: { token: string; platform: string },
  ) {
    return this.adminsService.registerPushToken(
      req.user?.uid || req.admin?.id,
      body.token,
      body.platform,
    );
  }

  // ─── Auth Logs ─────────────────────────────────────────────

  @Post('auth-log')
  async logAuth(
    @Req() req: any,
    @Body() body: { action: string; platform?: string },
    @Headers('x-forwarded-for') forwardedFor?: string,
    @Headers('user-agent') userAgent?: string,
  ) {
    const ip = forwardedFor || req.ip || req.connection?.remoteAddress;
    return this.adminsService.createAuthLog({
      adminId: req.user?.uid || req.admin?.id || 'unknown',
      email: req.user?.email || req.admin?.email || 'unknown',
      action: body.action,
      ip,
      userAgent,
      platform: body.platform,
    });
  }

  @Get('auth-logs')
  @Roles('SUPER_ADMIN', 'ADMIN')
  getAuthLogs(
    @Query('limit') limit?: string,
    @Query('adminId') adminId?: string,
  ) {
    return this.adminsService.getAuthLogs(
      limit ? parseInt(limit, 10) : 50,
      adminId,
    );
  }
}
