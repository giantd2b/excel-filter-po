import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { join } from 'path';
import { FirebaseModule } from './common/providers/firebase.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { MessagesModule } from './modules/messages/messages.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { SlipsModule } from './modules/slips/slips.module';
import { ReportsModule } from './modules/reports/reports.module';
import { BankAccountsModule } from './modules/bank-accounts/bank-accounts.module';
import { InboxGatewayModule } from './modules/inbox-gateway/inbox-gateway.module';
import { TemplatesModule } from './modules/templates/templates.module';
import { AdminsModule } from './modules/admins/admins.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { KnowledgeModule } from './modules/knowledge/knowledge.module';
import { ExternalModule } from './modules/external/external.module';
import { AgendaModule } from './modules/agenda/agenda.module';
import { QuotationsModule } from './modules/quotations/quotations.module';
import { BookingsModule } from './modules/bookings/bookings.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    FirebaseModule,
    AuthModule,
    UsersModule,
    MessagesModule,
    WebhooksModule,
    SlipsModule,
    ReportsModule,
    BankAccountsModule,
    InboxGatewayModule,
    TemplatesModule,
    AdminsModule,
    AnalyticsModule,
    KnowledgeModule,
    ExternalModule,
    AgendaModule,
    QuotationsModule,
    BookingsModule,
  ],
})
export class AppModule {}
