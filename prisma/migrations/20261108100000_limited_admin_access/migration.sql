-- Limited administrators.
--
-- `restrictTo("ADMIN")` was the only check on the whole admin surface, so
-- every administrator could do everything: change anyone's role, delete
-- accounts, grant annonce credits, approve transfers, send a broadcast to the
-- entire database. There was no way to give somebody the moderation queue
-- without also giving them that.
--
-- An administrator is now either unrestricted or limited to named areas.

ALTER TABLE "User"
  ADD COLUMN "isSuperAdmin" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "adminScopes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

/* The administrators that already exist were unrestricted, and this migration
 * is not the place to take that away — locking the platform's own operators
 * out of the screen that could undo it is not a recoverable mistake.
 *
 * New administrators default to false and no scopes, so one created without
 * anyone deciding what they may touch can reach nothing. That is the right way
 * round: the dangerous default is the one nobody notices. */
UPDATE "User"
   SET "isSuperAdmin" = true
 WHERE "role" = 'ADMIN';

-- Looked up on every admin request.
CREATE INDEX IF NOT EXISTS "User_role_admin_idx" ON "User" ("role", "isSuperAdmin");
