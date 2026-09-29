-- The super admin's own diary: meetings, demos, calls, deadlines.
-- Distinct from Interview, which hangs off an Application.

CREATE TYPE "ScheduleType" AS ENUM ('MEETING', 'INTERVIEW', 'CALL', 'DEMO', 'DEADLINE', 'OTHER');
CREATE TYPE "ScheduleStatus" AS ENUM ('PLANNED', 'CONFIRMED', 'DONE', 'CANCELLED');

CREATE TABLE "ScheduleEvent" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "ScheduleType" NOT NULL DEFAULT 'MEETING',
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "allDay" BOOLEAN NOT NULL DEFAULT false,
    "location" TEXT,
    "notes" TEXT,
    "status" "ScheduleStatus" NOT NULL DEFAULT 'PLANNED',
    "hostId" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduleEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ScheduleGuest" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScheduleGuest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ScheduleEvent_startsAt_idx" ON "ScheduleEvent"("startsAt");
CREATE INDEX "ScheduleEvent_hostId_idx" ON "ScheduleEvent"("hostId");
CREATE INDEX "ScheduleGuest_eventId_idx" ON "ScheduleGuest"("eventId");
CREATE INDEX "ScheduleGuest_userId_idx" ON "ScheduleGuest"("userId");

-- SetNull on the people: losing a host or a guest account must not erase the
-- meeting from everyone else's calendar.
ALTER TABLE "ScheduleEvent" ADD CONSTRAINT "ScheduleEvent_hostId_fkey"
    FOREIGN KEY ("hostId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ScheduleEvent" ADD CONSTRAINT "ScheduleEvent_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Cascade here: a guest row has no meaning without its event.
ALTER TABLE "ScheduleGuest" ADD CONSTRAINT "ScheduleGuest_eventId_fkey"
    FOREIGN KEY ("eventId") REFERENCES "ScheduleEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ScheduleGuest" ADD CONSTRAINT "ScheduleGuest_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
