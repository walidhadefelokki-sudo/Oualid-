-- Adds storage for the in-app CV Maker so a candidate can save their CV and
-- come back to edit it later. Nullable, so every existing row stays valid.
ALTER TABLE "CandidateProfile" ADD COLUMN "cvBuilderData" JSONB;
