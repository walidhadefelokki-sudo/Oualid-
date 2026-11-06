import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

/**
 * The e-mail a recruiter gets when somebody applies.
 *
 * Tested through a fake transport rather than against a mail server: what is
 * worth checking is what the message says, and in particular that a candidate
 * cannot put markup in it. The candidate's name and cover letter are typed by
 * whoever registered, and this message arrives in a recruiter's inbox under
 * Dar L'Emploi branding — raw interpolation would let an applicant forge a
 * link or a line of text that looks like it came from the platform.
 */

const sent: Array<{ to: string; subject: string; html: string; text?: string; from: string }> =
  [];

// Captures instead of sending. Set up before the module under test is
// imported, because it picks its transport once at load.
vi.mock("nodemailer", () => ({
  default: {
    createTransport: () => ({
      sendMail: async (message: any) => {
        sent.push(message);
        return { messageId: "test-message-id" };
      },
      verify: async () => true,
    }),
  },
}));

const ORIGINAL = { ...process.env };

// SMTP_HOST picks the (mocked) transport; no Resend key, so there is no second
// path that could reach the network.
process.env.SMTP_HOST = "smtp.test.invalid";
process.env.SMTP_PORT = "465";
process.env.EMAIL_USER = "test@darlemploi.dz";
process.env.EMAIL_FROM = "test@darlemploi.dz";
process.env.EMAIL_PASS = "unused-by-the-fake";
delete process.env.RESEND_API_KEY;
process.env.EMAIL_FROM_INFO = "info@test.invalid";
process.env.APP_URL = "https://www.darlemploi.dz";

const email = await import("./email");

const lastMessage = () => sent[sent.length - 1];

beforeAll(() => {
  sent.length = 0;
});

afterAll(() => {
  process.env = ORIGINAL;
});

describe("sendNewApplicationEmail", () => {
  it("names the candidate, the post and where to go next", async () => {
    const ok = await email.sendNewApplicationEmail("recruteur@example.invalid", {
      recruiterFirstName: "Yacine",
      candidateName: "Amina Belkacem",
      jobTitle: "Développeur Full Stack",
      company: "Makers Label",
      city: "Alger",
      coverLetter: "Bonjour, je suis très intéressée par ce poste.",
      appliedAt: new Date("2026-03-14T10:00:00Z"),
    });

    expect(ok).toBe(true);

    const m = lastMessage();
    expect(m.to).toBe("recruteur@example.invalid");
    expect(m.subject).toContain("Nouvelle candidature");
    expect(m.subject).toContain("Développeur Full Stack");

    expect(m.html).toContain("Yacine");
    expect(m.html).toContain("Amina Belkacem");
    expect(m.html).toContain("Makers Label");
    expect(m.html).toContain("Alger");
    expect(m.html).toContain("14/03/2026");

    // The one thing the recruiter is being asked to do.
    expect(m.html).toContain("https://www.darlemploi.dz/dashboard?tab=candidates");
    expect(m.text).toContain("https://www.darlemploi.dz/dashboard?tab=candidates");
  });

  it("escapes a candidate name that contains markup", async () => {
    await email.sendNewApplicationEmail("recruteur@example.invalid", {
      candidateName: '<a href="https://evil.test">Cliquez ici</a>',
      jobTitle: "Comptable",
    });

    const { html } = lastMessage();

    // The name is shown as text. A working anchor in this message would be a
    // link the platform appears to vouch for.
    expect(html).not.toContain('<a href="https://evil.test"');
    expect(html).toContain("&lt;a href=&quot;https://evil.test&quot;&gt;");
  });

  it("escapes markup in a cover letter too", async () => {
    await email.sendNewApplicationEmail("recruteur@example.invalid", {
      candidateName: "Karim",
      jobTitle: "Comptable",
      coverLetter: "<script>alert(1)</script> et <b>gras</b>",
    });

    const { html } = lastMessage();
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<b>gras</b>");
  });

  it("shortens a long cover letter instead of pasting the whole thing", async () => {
    const long = "a".repeat(900);

    await email.sendNewApplicationEmail("recruteur@example.invalid", {
      candidateName: "Karim",
      jobTitle: "Comptable",
      coverLetter: long,
    });

    const { html, text } = lastMessage();
    expect(html).not.toContain("a".repeat(500));
    expect(html).toContain("…");
    expect(text).toContain("…");
  });

  it("omits the cover letter block when there is none", async () => {
    await email.sendNewApplicationEmail("recruteur@example.invalid", {
      candidateName: "Karim",
      jobTitle: "Comptable",
    });

    const { html, text } = lastMessage();
    expect(html).not.toContain("Lettre de motivation");
    expect(text).not.toContain("Lettre de motivation");
  });

  it("still reads correctly with nothing but a name and a job title", async () => {
    const ok = await email.sendNewApplicationEmail("recruteur@example.invalid", {
      candidateName: "Karim",
      jobTitle: "Comptable",
    });

    expect(ok).toBe(true);

    const { html } = lastMessage();
    // A greeting rather than a blank space where a name would be.
    expect(html).toContain("Bonjour");
    expect(html).toContain("votre entreprise");
    expect(html).toContain("Non précisée");
  });

  it("sends from the transactional address, not the registration one", async () => {
    await email.sendNewApplicationEmail("recruteur@example.invalid", {
      candidateName: "Karim",
      jobTitle: "Comptable",
    });

    // info@ is for confirmations; register@ is account lifecycle. A recruiter
    // filtering on the sender should see this as the former.
    expect(lastMessage().from).toContain("info@test.invalid");
  });
});
