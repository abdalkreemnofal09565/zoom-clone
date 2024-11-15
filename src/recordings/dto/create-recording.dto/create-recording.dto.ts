export class CreateRecordingDto {
    title: string;
    conference_id: number;
    tenantId: number;
    file_path: string;
    created_at?: Date;
    updated_at?: Date;
  }
  