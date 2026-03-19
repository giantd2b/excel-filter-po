import { Module } from '@nestjs/common';
import { FirebaseAuthGuard } from '../../common/guards/auth.guard';

@Module({
  providers: [FirebaseAuthGuard],
  exports: [FirebaseAuthGuard],
})
export class AuthModule {}
