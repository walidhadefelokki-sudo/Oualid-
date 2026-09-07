import { createClient, SupabaseClient } from "@supabase/supabase-js";
import crypto from "crypto";
import { AppError } from "../middleware/error.middleware";

/**
 * File storage on Supabase Storage.
 *
 * Uses the service-role key, which bypasses row-level security and must never
 * reach the browser. That is why these variables are deliberately NOT named
 * with Vite's `VITE_` prefix: Vite inlines every `VITE_*` value into the client
 * bundle, so a service-role key under that prefix would be published to every
 * visitor. The frontend keeps its own anon key and never touches these buckets.
 *
 * Three buckets, with different privacy for different content:
 *
 *   cvs            private — a CV is a personal document; reachable only
 *                  through a short-lived signed URL
 *   presentations  private — a video of the candidate, same reasoning
 *   avatars        public  — a profile photo the candidate chose to show, and
 *                  one that appears in every recruiter list; a permanent URL
 *                  under an unguessable path keeps those lists a single query
 *                  instead of one signing round trip per row
 */

export const CV_BUCKET = process.env.SUPABASE_CV_BUCKET?.trim() || "cvs";
export const AVATAR_BUCKET =
  process.env.SUPABASE_AVATAR_BUCKET?.trim() || "avatars";
export const PRESENTATION_BUCKET =
  process.env.SUPABASE_PRESENTATION_BUCKET?.trim() || "presentations";

/** How long a generated download link stays valid. */
export const SIGNED_URL_TTL_SECONDS = 300;

/**
 * Longer for video: a presentation can be watched, paused and scrubbed, and a
 * link that dies mid-playback breaks seeking with no visible cause.
 */
export const VIDEO_URL_TTL_SECONDS = 2 * 60 * 60;

export const CV_MAX_BYTES = 10 * 1024 * 1024;
export const AVATAR_MAX_BYTES = 4 * 1024 * 1024;
/**
 * 50 MB, because that is Supabase's own per-file ceiling for the project.
 * A bucket cannot declare a limit above it — creating one is refused with
 * "The object exceeded the maximum allowed size" — so this has to track the
 * project setting. Raise the global limit under Storage > Settings first if
 * you ever need longer presentations, then raise this.
 *
 * Comfortable for the length of video this is for: a candidate introducing
 * themselves for a minute or two.
 */
export const VIDEO_MAX_BYTES = 50 * 1024 * 1024;

interface BucketConfig {
  public: boolean;
  fileSizeLimit: number;
}

const BUCKETS: Record<string, BucketConfig> = {
  [CV_BUCKET]: { public: false, fileSizeLimit: CV_MAX_BYTES },
  [PRESENTATION_BUCKET]: { public: false, fileSizeLimit: VIDEO_MAX_BYTES },
  [AVATAR_BUCKET]: { public: true, fileSizeLimit: AVATAR_MAX_BYTES },
};

let cachedClient: SupabaseClient | null = null;

export const isSupabaseStorageConfigured = (): boolean =>
  Boolean(
    process.env.SUPABASE_URL?.trim() && process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  );

const getClient = (): SupabaseClient => {
  if (cachedClient) return cachedClient;

  const url = process.env.SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !serviceRoleKey) {
    throw new AppError(
      "File storage is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
      500
    );
  }

  cachedClient = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cachedClient;
};

/**
 * Creates a bucket if it is missing, once per process, and converges its
 * settings if it is already there.
 *
 * Deliberately no MIME allow-list. The Content-Type on a direct upload is
 * whatever the browser decided to send, and browsers routinely send
 * application/octet-stream depending on what the OS has registered — so an
 * allow-list rejects real files while stopping nothing, since a hostile client
 * can name any type it likes. Format is instead proven from the file's own
 * bytes before anything is recorded. The size limit stays: that one is
 * enforced against the actual upload.
 */
const bucketReady = new Map<string, Promise<void>>();

const ensureBucket = async (bucket: string): Promise<void> => {
  const pending = bucketReady.get(bucket);
  if (pending) return pending;

  const settings = BUCKETS[bucket];
  if (!settings) {
    throw new AppError(`Unknown storage bucket: ${bucket}`, 500);
  }

  const task = (async () => {
    const storage = getClient().storage;
    const config = { ...settings, allowedMimeTypes: null };

    const { error } = await storage.createBucket(bucket, config);
    if (!error) return;

    if (!/already exists/i.test(error.message)) {
      throw new AppError(`Could not prepare storage: ${error.message}`, 500);
    }

    // The normal path after the first call. Re-apply the settings so a bucket
    // created by an older version of this code, or edited by hand in the
    // dashboard, cannot leave files public or uncapped when they should not be.
    const { error: updateError } = await storage.updateBucket(bucket, config);
    if (updateError) {
      throw new AppError(
        `Could not verify storage settings: ${updateError.message}`,
        500
      );
    }
  })();

  bucketReady.set(bucket, task);

  try {
    await task;
  } catch (err) {
    // Don't cache a failure — a transient outage would otherwise poison the
    // whole process until it restarts.
    bucketReady.delete(bucket);
    throw err;
  }
};

/**
 * An object path under a folder the caller owns.
 *
 * The name is generated, never taken from the upload: an attacker-chosen
 * filename is how path traversal and object overwrites happen. The user's own
 * filename is kept separately in the database, for display only.
 */
export const buildObjectPath = (ownerId: string, extension: string): string =>
  `${ownerId}/${crypto.randomUUID()}.${extension}`;

/** Object names this server issues: a UUID under an owner's own folder. */
export const OBJECT_NAME_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.[a-z0-9]{2,5}$/;

/* -------------------------------------------------------------------------- */
/*                                  generic                                   */
/* -------------------------------------------------------------------------- */

export const uploadObject = async (params: {
  bucket: string;
  path: string;
  buffer: Buffer;
  mimeType: string;
}): Promise<string> => {
  const { bucket, path, buffer, mimeType } = params;

  await ensureBucket(bucket);

  const { error } = await getClient()
    .storage.from(bucket)
    .upload(path, buffer, { contentType: mimeType, upsert: false });

  if (error) {
    throw new AppError(`Upload failed: ${error.message}`, 502);
  }

  return path;
};

/**
 * A one-time URL the browser can upload straight to, skipping our server.
 *
 * Vercel caps a function's request body at 4.5 MB, so a large file can never be
 * proxied through Express in production however the endpoint is written. The
 * browser sends the bytes to Supabase directly, then calls back to confirm —
 * and that confirmation is where the file is validated, because anything the
 * browser uploaded is by definition unverified.
 */
export const createUploadTicket = async (params: {
  bucket: string;
  path: string;
}): Promise<{ path: string; token: string; signedUrl: string }> => {
  const { bucket, path } = params;

  await ensureBucket(bucket);

  const { data, error } = await getClient()
    .storage.from(bucket)
    .createSignedUploadUrl(path);

  if (error || !data) {
    throw new AppError(
      `Could not start the upload: ${error?.message ?? "unknown error"}`,
      502
    );
  }

  return { path, token: data.token, signedUrl: data.signedUrl };
};

/** Short-lived download link for a caller already proven authorised. */
export const createSignedUrl = async (
  bucket: string,
  path: string,
  expiresIn: number = SIGNED_URL_TTL_SECONDS
): Promise<string> => {
  const { data, error } = await getClient()
    .storage.from(bucket)
    .createSignedUrl(path, expiresIn);

  if (error || !data?.signedUrl) {
    throw new AppError(
      `Could not generate link: ${error?.message ?? "unknown error"}`,
      502
    );
  }

  return data.signedUrl;
};

/**
 * Signs many paths in one call.
 *
 * Used by list endpoints, where signing row by row would mean one network
 * round trip per candidate.
 */
export const createSignedUrls = async (
  bucket: string,
  paths: string[],
  expiresIn: number = SIGNED_URL_TTL_SECONDS
): Promise<Map<string, string>> => {
  const result = new Map<string, string>();
  if (paths.length === 0) return result;

  const { data, error } = await getClient()
    .storage.from(bucket)
    .createSignedUrls(paths, expiresIn);

  if (error || !data) {
    // A list that cannot sign its media is still a useful list; the rows just
    // render without playable video rather than failing the whole request.
    console.error(`Batch signing failed for ${bucket}:`, error?.message);
    return result;
  }

  for (const entry of data) {
    if (entry.signedUrl && entry.path) result.set(entry.path, entry.signedUrl);
  }

  return result;
};

/** The permanent URL of an object in a public bucket. */
export const getPublicUrl = (bucket: string, path: string): string =>
  getClient().storage.from(bucket).getPublicUrl(path).data.publicUrl;

/** Reads an object back into memory. */
export const downloadObject = async (
  bucket: string,
  path: string
): Promise<Buffer> => {
  const { data, error } = await getClient().storage.from(bucket).download(path);

  if (error || !data) {
    throw new AppError(
      `Could not read from storage: ${error?.message ?? "unknown error"}`,
      502
    );
  }

  return Buffer.from(await data.arrayBuffer());
};

/**
 * Reads only the first bytes of an object.
 *
 * Enough to check a file signature without pulling a 100 MB video into a
 * serverless function's memory to look at sixteen bytes of it.
 */
export const downloadObjectHead = async (
  bucket: string,
  path: string,
  bytes = 4096
): Promise<Buffer> => {
  const signed = await createSignedUrl(bucket, path, 60);
  const response = await fetch(signed, {
    headers: { Range: `bytes=0-${bytes - 1}` },
  });

  if (!response.ok && response.status !== 206) {
    throw new AppError(
      `Could not read from storage (HTTP ${response.status}).`,
      502
    );
  }

  return Buffer.from(await response.arrayBuffer());
};

/** The stored size of an object, or null when it is not there. */
export const getObjectSize = async (
  bucket: string,
  path: string
): Promise<number | null> => {
  const lastSlash = path.lastIndexOf("/");
  const folder = lastSlash === -1 ? "" : path.slice(0, lastSlash);
  const name = path.slice(lastSlash + 1);

  const { data, error } = await getClient()
    .storage.from(bucket)
    .list(folder, { search: name, limit: 100 });

  if (error || !data) return null;

  const match = data.find((entry) => entry.name === name);
  if (!match) return null;

  return (match.metadata as { size?: number } | null)?.size ?? null;
};

/**
 * Deletes an object. Never throws: cleanup runs after the replacement is
 * already live, and a failed tidy-up must not turn a successful upload into
 * an error.
 */
export const removeObject = async (bucket: string, path: string): Promise<void> => {
  try {
    const { error } = await getClient().storage.from(bucket).remove([path]);
    if (error) {
      console.error(`Cleanup failed for ${bucket}/${path}: ${error.message}`);
    }
  } catch (err) {
    console.error(`Cleanup failed for ${bucket}/${path}:`, err);
  }
};

/* -------------------------------------------------------------------------- */
/*                          CV-specific conveniences                          */
/* -------------------------------------------------------------------------- */

export const uploadCvObject = async (params: {
  candidateProfileId: string;
  buffer: Buffer;
  extension: string;
  mimeType: string;
}): Promise<string> =>
  uploadObject({
    bucket: CV_BUCKET,
    path: buildObjectPath(params.candidateProfileId, params.extension),
    buffer: params.buffer,
    mimeType: params.mimeType,
  });

export const createCvUploadTicket = async (params: {
  candidateProfileId: string;
  extension: string;
}) =>
  createUploadTicket({
    bucket: CV_BUCKET,
    path: buildObjectPath(params.candidateProfileId, params.extension),
  });

export const createSignedCvUrl = (path: string, expiresIn?: number) =>
  createSignedUrl(CV_BUCKET, path, expiresIn);

export const downloadCvObject = (path: string) => downloadObject(CV_BUCKET, path);

export const removeCvObject = (path: string) => removeObject(CV_BUCKET, path);
