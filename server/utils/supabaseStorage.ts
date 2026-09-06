import { createClient, SupabaseClient } from "@supabase/supabase-js";
import crypto from "crypto";
import { AppError } from "../middleware/error.middleware";

/**
 * Private CV storage on Supabase Storage.
 *
 * Uses the service-role key, which bypasses row-level security and must never
 * reach the browser. That is why these variables are deliberately NOT named
 * with Vite's `VITE_` prefix: Vite inlines every `VITE_*` value into the client
 * bundle, so a service-role key under that prefix would be published to every
 * visitor. The frontend keeps its own anon key and never touches this bucket.
 */
const BUCKET = process.env.SUPABASE_CV_BUCKET?.trim() || "cvs";

/** How long a generated download link stays valid. */
export const SIGNED_URL_TTL_SECONDS = 300;

const MAX_CV_BYTES = 10 * 1024 * 1024;

let cachedClient: SupabaseClient | null = null;

export const isSupabaseStorageConfigured = (): boolean =>
  Boolean(process.env.SUPABASE_URL?.trim() && process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());

const getClient = (): SupabaseClient => {
  if (cachedClient) return cachedClient;

  const url = process.env.SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !serviceRoleKey) {
    throw new AppError(
      "CV storage is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
      500
    );
  }

  cachedClient = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cachedClient;
};

/**
 * Creates the bucket if it is missing, once per process, and converges its
 * settings if it is already there.
 *
 * Private on purpose: a CV is personal data, so objects are reachable only
 * through a short-lived signed URL minted by an endpoint that has already
 * checked who is asking.
 *
 * Deliberately no MIME allow-list. The Content-Type on a direct upload is
 * whatever the browser decided to send, and browsers routinely send
 * application/octet-stream for .doc and .docx depending on what the OS has
 * registered — so an allow-list here rejects real CVs while stopping nothing,
 * since a hostile client can name any type it likes. Format is instead proven
 * from the file's own bytes at confirm time. The size limit stays: that one is
 * enforced against the actual upload and caps what an abandoned or malicious
 * direct upload can cost.
 */
const BUCKET_SETTINGS = {
  public: false,
  fileSizeLimit: MAX_CV_BYTES,
  // Explicitly null, not omitted: updateBucket only changes the fields it is
  // given, so leaving this out would silently preserve an allow-list set by an
  // earlier version of this code.
  allowedMimeTypes: null,
};

let bucketReady: Promise<void> | null = null;

const ensureBucket = async (): Promise<void> => {
  if (bucketReady) return bucketReady;

  bucketReady = (async () => {
    const storage = getClient().storage;
    const { error } = await storage.createBucket(BUCKET, BUCKET_SETTINGS);

    if (!error) return;

    if (!/already exists/i.test(error.message)) {
      throw new AppError(`Could not prepare CV storage: ${error.message}`, 500);
    }

    // The normal path after the first call. Re-apply the settings so a bucket
    // created by an older version of this code, or edited by hand in the
    // dashboard, cannot leave CVs public or uncapped.
    const { error: updateError } = await storage.updateBucket(BUCKET, BUCKET_SETTINGS);
    if (updateError) {
      throw new AppError(
        `Could not verify CV storage settings: ${updateError.message}`,
        500
      );
    }
  })();

  try {
    await bucketReady;
  } catch (err) {
    // Don't cache a failure — a transient outage would otherwise poison the
    // whole process until it restarts.
    bucketReady = null;
    throw err;
  }
};

/**
 * Stores one CV and returns its object path.
 *
 * The object name is generated, never taken from the upload: an attacker-chosen
 * filename is how path traversal and object overwrites happen. The candidate's
 * own name is kept separately in the database, for display only.
 */
export const uploadCvObject = async (params: {
  candidateProfileId: string;
  buffer: Buffer;
  extension: string;
  mimeType: string;
}): Promise<string> => {
  const { candidateProfileId, buffer, extension, mimeType } = params;

  await ensureBucket();

  const path = `${candidateProfileId}/${crypto.randomUUID()}.${extension}`;

  const { error } = await getClient()
    .storage.from(BUCKET)
    .upload(path, buffer, { contentType: mimeType, upsert: false });

  if (error) {
    throw new AppError(`CV upload failed: ${error.message}`, 502);
  }

  return path;
};

/**
 * A one-time URL the browser can upload straight to, skipping our server.
 *
 * Vercel caps a function's request body at 4.5 MB, so a 10 MB CV can never be
 * proxied through Express in production however the endpoint is written. The
 * browser sends the bytes to Supabase directly, then calls back to confirm —
 * and that confirmation is where the file is validated, because anything the
 * browser uploaded is by definition unverified.
 */
export const createCvUploadTicket = async (params: {
  candidateProfileId: string;
  extension: string;
}): Promise<{ path: string; token: string; signedUrl: string }> => {
  const { candidateProfileId, extension } = params;

  await ensureBucket();

  const path = `${candidateProfileId}/${crypto.randomUUID()}.${extension}`;

  const { data, error } = await getClient()
    .storage.from(BUCKET)
    .createSignedUploadUrl(path);

  if (error || !data) {
    throw new AppError(
      `Could not start the CV upload: ${error?.message ?? "unknown error"}`,
      502
    );
  }

  return { path, token: data.token, signedUrl: data.signedUrl };
};

/** Short-lived download link for a caller already proven authorised. */
export const createSignedCvUrl = async (
  path: string,
  expiresIn: number = SIGNED_URL_TTL_SECONDS
): Promise<string> => {
  const { data, error } = await getClient()
    .storage.from(BUCKET)
    .createSignedUrl(path, expiresIn);

  if (error || !data?.signedUrl) {
    throw new AppError(
      `Could not generate CV link: ${error?.message ?? "unknown error"}`,
      502
    );
  }

  return data.signedUrl;
};

/** Reads an object back into memory, for server-side text extraction. */
export const downloadCvObject = async (path: string): Promise<Buffer> => {
  const { data, error } = await getClient().storage.from(BUCKET).download(path);

  if (error || !data) {
    throw new AppError(
      `Could not read CV from storage: ${error?.message ?? "unknown error"}`,
      502
    );
  }

  return Buffer.from(await data.arrayBuffer());
};

/**
 * Deletes an object. Never throws: cleanup runs after the new CV is already
 * live, and a failed tidy-up must not turn a successful upload into an error.
 */
export const removeCvObject = async (path: string): Promise<void> => {
  try {
    const { error } = await getClient().storage.from(BUCKET).remove([path]);
    if (error) {
      console.error(`CV cleanup failed for ${path}: ${error.message}`);
    }
  } catch (err) {
    console.error(`CV cleanup failed for ${path}:`, err);
  }
};
