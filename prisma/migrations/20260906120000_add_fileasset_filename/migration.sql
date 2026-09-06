-- Original filename of an uploaded file, for display only.
--
-- Additive and nullable: every existing FileAsset keeps working and reads
-- back NULL, which the UI already handles by falling back to the URL. No
-- backfill, no data movement, no existing CV lost.
ALTER TABLE "FileAsset" ADD COLUMN "fileName" TEXT;
