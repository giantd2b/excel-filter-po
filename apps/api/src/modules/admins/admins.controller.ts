import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Req,
  UseGuards,
  ForbiddenException,
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
}
