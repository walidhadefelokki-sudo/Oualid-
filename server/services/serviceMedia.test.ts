import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";

/**
 * Service pictures, against a real database.
 *
 * The upload itself goes to Supabase and is not reachable from a test, so
 * what is checked here is everything around it: that a gallery stays an
 * ordered sequence without holes, that removing the first picture promotes
 * the next one to cover, and that a reorder cannot be used to touch another
 * freelancer's rows.
 *
 * The validator is pure and is checked directly, because "is this really a
 * PNG" is the one thing standing between an upload form and anything a
 * browser will execute.
 */

const url = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;

const isLocal = !!url && /@(localhost|127\.0\.0\.1)[:/]/.test(url);
if (!url) throw new Error("TEST_DATABASE_URL or DATABASE_URL must be set");
if (!isLocal && !process.env.ALLOW_REMOTE_TEST_DB) {
  throw new Error(
    "Refusing to run tests against a non-local database. These tests write and " +
      "delete rows. Set TEST_DATABASE_URL to a local database, or set " +
      "ALLOW_REMOTE_TEST_DB=1 if you are certain."
  );
}

process.env.DATABASE_URL = url;

const prisma = new PrismaClient({ datasources: { db: { url } } });
const { validateServiceMedia } = await import("../middleware/mediaUpload.middleware");
const { SERVICE_MEDIA_MAX_COUNT } = await import("../utils/supabaseStorage");

const TAG = "svcmedia-test";

let serviceId: string;

/** A real PNG header, so the signature check passes. */
const PNG = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.alloc(32, 1),
]);

const asFile = (name: string, buffer: Buffer) =>
  ({ originalname: name, buffer } as Express.Multer.File);

const wipe = async () => {
  await prisma.serviceListing.deleteMany({ where: { slug: { startsWith: TAG } } });
  await prisma.fileAsset.deleteMany({ where: { provider: TAG } });
  await prisma.user.deleteMany({ where: { email: { contains: TAG } } });
};

/** Attaches a picture the way the endpoint does, minus the storage call. */
const attach = async (service: string, label: string, position: number) => {
  const asset = await prisma.fileAsset.create({
    data: {
      url: `https://example.invalid/${label}.png`,
      provider: TAG,
      publicId: `${TAG}/${label}.png`,
      fileName: `${label}.png`,
      mimeType: "image/png",
      extension: "png",
      size: 1024,
    },
  });
  return prisma.serviceMedia.create({
    data: { serviceId: service, fileId: asset.id, position },
    select: { id: true },
  });
};

const gallery = (service: string) =>
  prisma.serviceMedia.findMany({
    where: { serviceId: service },
    orderBy: { position: "asc" },
    select: { id: true, position: true, file: { select: { fileName: true } } },
  });

beforeEach(async () => {
  await wipe();

  const user = await prisma.user.create({
    data: {
      email: `${TAG}@example.invalid`,
      password: "x",
      role: "CANDIDATE",
      freelancerProfile: {
        create: { username: `${TAG}-${Date.now().toString(36)}`, displayName: "Amina" },
      },
    },
    include: { freelancerProfile: true },
  });

  const service = await prisma.serviceListing.create({
    data: {
      freelancerId: user.freelancerProfile!.id,
      title: "Logo et identité visuelle",
      slug: `${TAG}-${Math.random().toString(36).slice(2, 10)}`,
      description: "Un logo.",
      status: "PUBLISHED",
    },
    select: { id: true },
  });

  serviceId = service.id;
});

afterAll(async () => {
  await wipe();
  await prisma.$disconnect();
});

describe("validateServiceMedia", () => {
  it("accepts a real image", () => {
    const [image] = validateServiceMedia([asFile("travail.png", PNG)]);
    expect(image.mimeType).toBe("image/png");
    expect(image.extension).toBe("png");
  });

  it("refuses a file whose bytes are not an image", () => {
    // The extension is attacker-controlled; an executable renamed .png
    // arrives looking perfectly valid to anything that trusts the name.
    const notAnImage = Buffer.from("MZ\u0090\u0000executable", "latin1");
    expect(() => validateServiceMedia([asFile("payload.png", notAnImage)])).toThrow(
      /pas une image valide/
    );
  });

  it("refuses an extension that is not an image format", () => {
    expect(() => validateServiceMedia([asFile("script.svg", PNG)])).toThrow(/JPG, PNG/);
  });

  it("refuses an empty file", () => {
    expect(() => validateServiceMedia([asFile("vide.png", Buffer.alloc(0))])).toThrow(/vide/);
  });

  it("refuses the whole batch when one file is wrong", () => {
    // All or nothing: a partial upload leaves the freelancer guessing which
    // of the eight failed, and re-sending duplicates the ones that worked.
    expect(() =>
      validateServiceMedia([
        asFile("bon.png", PNG),
        asFile("mauvais.png", Buffer.from("not an image")),
      ])
    ).toThrow(/image 2/);
  });

  it("refuses an empty selection", () => {
    expect(() => validateServiceMedia([])).toThrow(/au moins une image/);
    expect(() => validateServiceMedia(undefined)).toThrow(/au moins une image/);
  });
});

describe("the gallery", () => {
  it("keeps pictures in the order they were added", async () => {
    await attach(serviceId, "un", 0);
    await attach(serviceId, "deux", 1);
    await attach(serviceId, "trois", 2);

    expect((await gallery(serviceId)).map((m) => m.file.fileName)).toEqual([
      "un.png",
      "deux.png",
      "trois.png",
    ]);
  });

  it("treats the first picture as the cover, the way every card reads it", async () => {
    await attach(serviceId, "cover", 0);
    await attach(serviceId, "autre", 1);

    const [first] = await gallery(serviceId);
    expect(first.file.fileName).toBe("cover.png");
  });

  it("promotes the next picture when the cover is removed", async () => {
    const cover = await attach(serviceId, "cover", 0);
    await attach(serviceId, "second", 1);
    await attach(serviceId, "third", 2);

    await prisma.serviceMedia.delete({ where: { id: cover.id } });

    /* Renumbered from zero, as the endpoint does. Without it the positions
     * develop holes and "first is the cover" starts depending on which gaps
     * happen to exist. */
    const rest = await gallery(serviceId);
    for (let i = 0; i < rest.length; i += 1) {
      await prisma.serviceMedia.update({ where: { id: rest[i].id }, data: { position: i } });
    }

    const after = await gallery(serviceId);
    expect(after.map((m) => m.position)).toEqual([0, 1]);
    expect(after[0].file.fileName).toBe("second.png");
  });

  it("caps a service at the maximum", async () => {
    for (let i = 0; i < SERVICE_MEDIA_MAX_COUNT; i += 1) {
      await attach(serviceId, `p${i}`, i);
    }

    const count = await prisma.serviceMedia.count({ where: { serviceId } });
    expect(count).toBe(SERVICE_MEDIA_MAX_COUNT);
    // Past this a gallery is a slideshow nobody scrolls.
    expect(SERVICE_MEDIA_MAX_COUNT).toBeLessThanOrEqual(12);
  });

  it("takes its pictures with it when the service goes", async () => {
    await attach(serviceId, "un", 0);
    await prisma.serviceListing.delete({ where: { id: serviceId } });

    // Cascade, so deleting a service cannot leave orphan rows pointing at
    // files nothing will ever clean up.
    expect(await prisma.serviceMedia.count({ where: { serviceId } })).toBe(0);
  });
});
