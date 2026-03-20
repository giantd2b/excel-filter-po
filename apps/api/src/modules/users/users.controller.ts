import { Controller, Get, Post, Delete, Param, Query, Body, UseGuards, Req } from '@nestjs/common';
import { UsersService } from './users.service';
import { FirebaseAuthGuard } from '../../common/guards/auth.guard';

@Controller('users')
@UseGuards(FirebaseAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAll(
    @Query('limit') limit?: string,
    @Query('startAfter') startAfter?: string,
    @Query('channel') channel?: string,
  ) {
    return this.usersService.findAll(
      limit ? parseInt(limit, 10) : 50,
      startAfter,
      channel,
    );
  }

  @Get('stats')
  getStats(@Query('month') month?: string) {
    return this.usersService.getStats(month);
  }

  @Get('new')
  getNewCustomers(@Query('days') days?: string) {
    return this.usersService.getNewCustomers(days ? parseInt(days, 10) : 7);
  }

  @Get('tags')
  getAllTags() {
    return this.usersService.getAllTags();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Get(':id/details')
  getCustomerDetails(@Param('id') id: string) {
    return this.usersService.getCustomerDetails(id);
  }

  @Get(':id/notes')
  getNotes(@Param('id') id: string) {
    return this.usersService.getNotes(id);
  }

  @Post(':id/read')
  markAsRead(@Param('id') id: string) {
    return this.usersService.markAsRead(id);
  }

  @Post('bulk-read')
  async bulkMarkAsRead(@Body() body: { ids: string[] }) {
    let count = 0;
    for (const id of body.ids) {
      await this.usersService.markAsRead(id);
      count++;
    }
    return { success: true, count };
  }

  @Post(':id/tags')
  addTag(
    @Param('id') id: string,
    @Body() body: { name: string; color?: string },
  ) {
    return this.usersService.addTag(id, body.name, body.color);
  }

  @Delete(':id/tags/:tagId')
  removeTag(@Param('id') id: string, @Param('tagId') tagId: string) {
    return this.usersService.removeTag(id, tagId);
  }

  @Post(':id/notes')
  addNote(
    @Param('id') id: string,
    @Body() body: { text: string },
    @Req() req: any,
  ) {
    return this.usersService.addNote(
      id,
      body.text,
      req.user?.uid || 'unknown',
      req.user?.name || req.user?.email || 'Admin',
    );
  }

  @Delete('notes/:noteId')
  deleteNote(@Param('noteId') noteId: string) {
    return this.usersService.deleteNote(noteId);
  }

  @Post(':id/assign')
  assignTo(
    @Param('id') id: string,
    @Body() body: { adminId: string; adminName: string },
  ) {
    return this.usersService.assignTo(id, body.adminId, body.adminName);
  }

  @Post(':id/unassign')
  unassign(@Param('id') id: string) {
    return this.usersService.unassign(id);
  }

  @Post(':id/nickname')
  setNickname(
    @Param('id') id: string,
    @Body() body: { nickname: string | null },
  ) {
    return this.usersService.setNickname(id, body.nickname);
  }

  @Post(':id/status')
  setStatus(
    @Param('id') id: string,
    @Body() body: { status: 'OPEN' | 'FOLLOW_UP' | 'RESOLVED' },
  ) {
    return this.usersService.setStatus(id, body.status);
  }
}
