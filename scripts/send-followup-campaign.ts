/**
 * One-off campaign: nudge the accounts that registered on a given day to
 * finish setting themselves up.
 *
 *   npx tsx scripts/send-followup-campaign.ts --day=2026-10-08            (dry run)
 *   npx tsx scripts/send-followup-campaign.ts --day=2026-10-08 --send
 *   npx tsx scripts/send-followup-campaign.ts --day=2026-10-08 --send --only=a@b.c
 *
 * Dry run by default. Sending several hundred messages to real people is not
 * something a mistyped flag should be able to start.
 *
 * Every attempt is appended to a log file as it happens, so a run that dies
 * halfway can be resumed with --resume instead of mailing everyone twice.
 */
import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import {
  sendCandidateProfileReminderEmail,
  sendRecruiterProfileReminderEmail,
} from '../server/utils/email';

const prisma = new PrismaClient();

const arg = (name: string): string | undefined => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit?.slice(name.length + 3);
};
const flag = (name: string) => process.argv.includes(`--${name}`);

const DAY = arg('day');
const SEND = flag('send');
const RESUME = flag('resume');
const ONLY = arg('only');
/** Pause between messages. The domain's SMTP server throttles a fast burst. */
const GAP_MS = Number(arg('gap') ?? 1200);
/** Always included, as a delivery check. */
const TEST_ADDRESS = 'salohsaloh2006@gmail.com';

// Not __dirname: this runs as an ES module, where it does not exist.
const LOG = path.join(process.cwd(), 'scripts', `campaign-${DAY}.log`);

interface Target {
  email: string;
  name: string | null;
  role: 'CANDIDATE' | 'RECRUITER';
}

/** Addresses already attempted, so --resume does not send twice. */
const alreadySent = (): Set<string> => {
  if (!RESUME || !fs.existsSync(LOG)) return new Set();
  return new Set(
    fs
      .readFileSync(LOG, 'utf8')
      .split('\n')
      .filter((l) => l.startsWith('OK '))
      .map((l) => l.slice(3).split(' ')[0].toLowerCase())
  );
};

const main = async () => {
  if (!DAY || !/^\d{4}-\d{2}-\d{2}$/.test(DAY)) {
    throw new Error('Pass the registration day, e.g. --day=2026-10-08');
  }

  // Local midnight to local midnight: "yesterday" means the day as it was
  // lived in Algeria, not a UTC window that would cut the evening off.
  const from = new Date(`${DAY}T00:00:00`);
  const to = new Date(from);
  to.setDate(to.getDate() + 1);

  const users = await prisma.user.findMany({
    where: {
      createdAt: { gte: from, lt: to },
      // A suspended or deleted account is not one to invite back in.
      status: { in: ['PENDING', 'ACTIVE'] },
      role: { in: ['CANDIDATE', 'RECRUITER'] },
    },
    orderBy: { createdAt: 'asc' },
    select: {
      email: true,
      firstName: true,
      role: true,
      recruiterProfile: {
        select: { companies: { select: { company: { select: { name: true } } }, take: 1 } },
      },
    },
  });

  // Addresses differing only in case are the same mailbox, and the table holds
  // both spellings for at least one person.
  const seen = new Set<string>();
  const targets: Target[] = [];
  for (const u of users) {
    const key = u.email.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    targets.push({
      email: u.email,
      name:
        u.role === 'RECRUITER'
          ? u.recruiterProfile?.companies?.[0]?.company?.name ?? null
          : u.firstName,
      role: u.role as Target['role'],
    });
  }

  // The test address joins both lists, as asked, unless it is already there.
  for (const role of ['CANDIDATE', 'RECRUITER'] as const) {
    if (!targets.some((t) => t.email.toLowerCase() === TEST_ADDRESS && t.role === role)) {
      targets.push({ email: TEST_ADDRESS, name: 'Saloh', role });
    }
  }

  const list = ONLY
    ? targets.filter((t) => t.email.toLowerCase() === ONLY.toLowerCase())
    : targets;

  const candidates = list.filter((t) => t.role === 'CANDIDATE');
  const recruiters = list.filter((t) => t.role === 'RECRUITER');

  console.log(`Jour d'inscription : ${DAY}`);
  console.log(`Candidats  : ${candidates.length}  (e-mail bilingue FR + AR)`);
  console.log(`Recruteurs : ${recruiters.length}  (e-mail FR)`);
  console.log(`Expéditeur : ${process.env.EMAIL_FROM_INFO ?? '(EMAIL_FROM_INFO non défini)'}`);
  console.log(`Liens vers : ${process.env.APP_URL ?? '(APP_URL non défini)'}`);
  console.log('');

  if (!SEND) {
    console.log('ESSAI À BLANC — rien n\'a été envoyé. Ajoutez --send pour envoyer.\n');
    for (const t of list) console.log(`  ${t.role.padEnd(10)} ${t.email}`);
    await prisma.$disconnect();
    return;
  }

  const done = alreadySent();
  let ok = 0;
  let failed = 0;
  let skipped = 0;

  for (const [i, t] of list.entries()) {
    if (done.has(t.email.toLowerCase())) {
      skipped++;
      continue;
    }

    const position = `[${i + 1}/${list.length}]`;
    try {
      const sent =
        t.role === 'CANDIDATE'
          ? await sendCandidateProfileReminderEmail(t.email, t.name)
          : await sendRecruiterProfileReminderEmail(t.email, t.name);

      if (sent) {
        ok++;
        fs.appendFileSync(LOG, `OK ${t.email} ${t.role} ${new Date().toISOString()}\n`);
        console.log(`${position} OK   ${t.role.padEnd(10)} ${t.email}`);
      } else {
        failed++;
        fs.appendFileSync(LOG, `FAIL ${t.email} ${t.role} refused\n`);
        console.log(`${position} FAIL ${t.role.padEnd(10)} ${t.email}  (refusé)`);
      }
    } catch (e) {
      failed++;
      const msg = e instanceof Error ? e.message : String(e);
      fs.appendFileSync(LOG, `FAIL ${t.email} ${t.role} ${msg}\n`);
      console.log(`${position} FAIL ${t.role.padEnd(10)} ${t.email}  ${msg}`);
    }

    if (i < list.length - 1) await new Promise((r) => setTimeout(r, GAP_MS));
  }

  console.log(`\nEnvoyés ${ok} | échecs ${failed} | déjà faits ${skipped}`);
  console.log(`Journal : ${LOG}`);
  await prisma.$disconnect();
};

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
