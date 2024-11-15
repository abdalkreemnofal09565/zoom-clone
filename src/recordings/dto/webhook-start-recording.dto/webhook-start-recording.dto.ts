
export class WebhookRecordingStartedDto {
  event: string;

  data: {
    recording_id: string;

    conference_id: string;

    tenant_id: string;

    session_id: string;

    recording_url: string;

    title: string;

    start_time: string;

    host_user_id: string;

    host_user_name: string;

    tenant_name?: string;
  };
}
