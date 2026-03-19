import { Global, Module } from '@nestjs/common';
import { FirebaseService } from './firebase.service';
import { PrismaService } from './prisma.service';
import { ReplyTokenCacheService } from './reply-token-cache.service';

@Global()
@Module({
  providers: [FirebaseService, PrismaService, ReplyTokenCacheService],
  exports: [FirebaseService, PrismaService, ReplyTokenCacheService],
})
export class FirebaseModule {}
