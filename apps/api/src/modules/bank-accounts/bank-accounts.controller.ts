import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { BankAccountsService, BankAccount } from './bank-accounts.service';
import { FirebaseAuthGuard } from '../../common/guards/auth.guard';

@Controller('bank-accounts')
@UseGuards(FirebaseAuthGuard)
export class BankAccountsController {
  constructor(private readonly bankAccountsService: BankAccountsService) {}

  @Get()
  findAll() {
    return this.bankAccountsService.findAll();
  }

  @Post()
  create(@Body() body: Omit<BankAccount, 'id'>) {
    return this.bankAccountsService.create(body);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() body: Partial<BankAccount>) {
    return this.bankAccountsService.update(id, body);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.bankAccountsService.softDelete(id);
  }
}
