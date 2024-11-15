-- CreateTable
CREATE TABLE "Conference" (
    "id" BIGSERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "host_user_id" BIGINT NOT NULL,
    "tenantId" INTEGER NOT NULL,
    "start_time" TIMESTAMP(3) NOT NULL,
    "end_time" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Conference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Recording" (
    "id" BIGSERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "conference_id" BIGINT NOT NULL,
    "tenantId" INTEGER NOT NULL,
    "file_path" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Recording_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" BIGSERIAL NOT NULL,
    "conference_id" BIGINT NOT NULL,
    "session_name" TEXT NOT NULL,
    "start_time" TIMESTAMP(3) NOT NULL,
    "end_time" TIMESTAMP(3),
    "recording_url" TEXT NOT NULL,
    "duration_seconds" INTEGER NOT NULL,
    "file_size_mb" DECIMAL(10,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Participant" (
    "id" BIGSERIAL NOT NULL,
    "session_id" BIGINT NOT NULL,
    "user_id" BIGINT NOT NULL,
    "join_time" TIMESTAMP(3) NOT NULL,
    "leave_time" TIMESTAMP(3) NOT NULL,
    "duration_seconds" INTEGER NOT NULL,

    CONSTRAINT "Participant_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Recording" ADD CONSTRAINT "Recording_conference_id_fkey" FOREIGN KEY ("conference_id") REFERENCES "Conference"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_conference_id_fkey" FOREIGN KEY ("conference_id") REFERENCES "Conference"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Participant" ADD CONSTRAINT "Participant_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "Session"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
