import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';
import { RecordingsModule } from './recordings/recordings.module';
import { SessionsModule } from './sessions/sessions.module';
import { ParticipantsModule } from './participants/participants.module';
import { ConferencesModule } from './conferences/conferences.module';

@Module({
  imports: [RecordingsModule, SessionsModule, ParticipantsModule, ConferencesModule],
  controllers: [AppController],
  providers: [AppService, PrismaService],
})
export class AppModule {}
