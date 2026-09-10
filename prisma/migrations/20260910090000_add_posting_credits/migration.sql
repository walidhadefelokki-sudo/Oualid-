-- Paid job postings a company still has available, bought as annonce packs.
--
-- Additive with a default, so every existing company starts at zero and no
-- row needs backfilling. Zero is correct: nobody has bought a pack yet, and
-- FREE and CORPORATE never read this column.
ALTER TABLE "Company" ADD COLUMN "postingCredits" INTEGER NOT NULL DEFAULT 0;
