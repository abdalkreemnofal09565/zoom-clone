import { Injectable, Logger, NotFoundException } from '@nestjs/common';  // Import Logger here
import { CreateRecordingDto } from './dto/create-recording.dto/create-recording.dto';
import { UpdateRecordingDto } from './dto/update-recording.dto/update-recording.dto';
import { WebhookRecordingStartedDto } from './dto/webhook-start-recording.dto/webhook-start-recording.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RecordingsService {
  private recordings = []; // Temporary storage, replace with database logic
  
  private readonly logger = new Logger(RecordingsService.name);

  constructor(private readonly prisma: PrismaService) {}

   // Handle the webhook event when a recording starts
   async handleRecordingStartedEvent(payload: WebhookRecordingStartedDto) {
    const { data } = payload;
    const {
      recording_id,
      conference_id,
      tenant_id,
      session_id,
      recording_url,
      title,
      start_time,
      host_user_id,
      host_user_name,
      tenant_name,
    } = data;

    try {
      const tenantId = Number(tenant_id); // Convert tenant_id to number (if needed)

      // Save the recording data to the database using Prisma
      const recording = await this.prisma.recording.create({
        data: {
          title,
          conference_id: Number(conference_id), // Convert conference_id to number (if needed)
          tenantId: tenantId,
          file_path: recording_url,
          created_at: new Date(start_time),
          updated_at: new Date(),
        },
      });

      // Save session data if needed
      await this.prisma.session.update({
        where: {
          id: Number(session_id), // Convert session_id to number
        },
        data: {
          recording_url: recording_url,
        },
      });

      // Log the successful processing of the recording event
      this.logger.log('Recording started event processed successfully.');

      return { status: 'success', message: 'Recording start event received successfully.' };
    } catch (error) {
      // Handle any errors that might occur
      this.logger.error('Error processing recording start event', error);
      throw new NotFoundException('Failed to process recording start event.');
    }
  }

  
  create(createRecordingDto: CreateRecordingDto) {
    const newRecording = {
      id: Date.now(),
      ...createRecordingDto,
    };
    this.recordings.push(newRecording);
    return newRecording;
  }

  findAll() {
    return this.recordings;
  }

  findOne(id: number) {
    const recording = this.recordings.find((item) => item.id === id);
    if (!recording) {
      throw new NotFoundException(`Recording with ID ${id} not found.`);
    }
    return recording;
  }

  update(id: number, updateRecordingDto: UpdateRecordingDto) {
    const recordingIndex = this.recordings.findIndex((item) => item.id === id);
    if (recordingIndex === -1) {
      throw new NotFoundException(`Recording with ID ${id} not found.`);
    }
    this.recordings[recordingIndex] = {
      ...this.recordings[recordingIndex],
      ...updateRecordingDto,
    };
    return this.recordings[recordingIndex];
  }

  remove(id: number) {
    const recordingIndex = this.recordings.findIndex((item) => item.id === id);
    if (recordingIndex === -1) {
      throw new NotFoundException(`Recording with ID ${id} not found.`);
    }
    const [removedRecording] = this.recordings.splice(recordingIndex, 1);
    return removedRecording;
  }
}
