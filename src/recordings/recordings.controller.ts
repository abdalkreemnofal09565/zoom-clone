import { Controller, Post, Body, HttpCode, HttpStatus, Get, Param, Patch, Delete } from '@nestjs/common'; // Import Get here
import { RecordingsService } from './recordings.service';
import { WebhookRecordingStartedDto } from './dto/webhook-start-recording.dto/webhook-start-recording.dto';

@Controller('recordings')
export class RecordingsController {
  constructor(private readonly recordingsService: RecordingsService) {}

  // Handle the webhook when a recording starts
  @Post('webhook/recording-started')
  @HttpCode(HttpStatus.OK)
  async recordingStarted(@Body() payload: WebhookRecordingStartedDto) {
    return this.recordingsService.handleRecordingStartedEvent(payload);
  }

  // Other recording-related CRUD endpoints
  @Post()
  create(@Body() createRecordingDto) {
    return this.recordingsService.create(createRecordingDto);
  }

  @Get()
  findAll() {
    return this.recordingsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.recordingsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateRecordingDto) {
    return this.recordingsService.update(+id, updateRecordingDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.recordingsService.remove(+id);
  }
}
