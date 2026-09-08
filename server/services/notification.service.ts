import { NotificationType, ApplicationStatus } from "@prisma/client";
import prisma from "../utils/prisma";

/**
 * In-app notifications.
 *
 * Every function here is deliberately non-throwing. A notification always
 * accompanies something the user just did — an application was submitted, a
 * status was changed — and that action is already committed by the time we get
 * here. Letting a notification failure bubble up would turn a successful action
 * into an error the user retries, creating a duplicate of whatever they just
 * did. Failures are logged and swallowed.
 */

interface NotificationInput {
  userId: string;
  title: string;
  message: string;
  type?: NotificationType;
}

export const notify = async (input: NotificationInput): Promise<void> => {
  try {
    await prisma.notification.create({
      data: {
        userId: input.userId,
        title: input.title,
        message: input.message,
        type: input.type ?? NotificationType.INFO,
      },
    });
  } catch (err) {
    console.error(`Notification for user ${input.userId} failed:`, err);
  }
};

/** One insert for a batch, rather than one round trip per recipient. */
export const notifyMany = async (inputs: NotificationInput[]): Promise<void> => {
  if (inputs.length === 0) return;
  try {
    await prisma.notification.createMany({
      data: inputs.map((i) => ({
        userId: i.userId,
        title: i.title,
        message: i.message,
        type: i.type ?? NotificationType.INFO,
      })),
    });
  } catch (err) {
    console.error(`Batch of ${inputs.length} notifications failed:`, err);
  }
};

/**
 * How each application status reads to the candidate, and how it should feel.
 *
 * Written from the candidate's side: the recruiter's "Nouveau" is the
 * candidate's "envoyée", and a rejection should be plain and kind rather than
 * cheerful. Returns null for statuses not worth interrupting someone over —
 * PENDING is the state an application is already in when it is created, so
 * announcing it would be noise.
 */
const statusNotification = (
  status: ApplicationStatus,
  jobTitle: string,
  company: string
): { title: string; message: string; type: NotificationType } | null => {
  switch (status) {
    case "REVIEWING":
      return {
        title: "Votre candidature est en cours d'examen",
        message: `${company} examine votre candidature pour le poste de « ${jobTitle} ».`,
        type: NotificationType.INFO,
      };
    case "SHORTLISTED":
      return {
        title: "Vous êtes présélectionné(e) !",
        message: `${company} a retenu votre profil pour le poste de « ${jobTitle} ».`,
        type: NotificationType.SUCCESS,
      };
    case "INTERVIEW":
      return {
        title: "Entretien proposé",
        message: `${company} souhaite vous rencontrer pour le poste de « ${jobTitle} ».`,
        type: NotificationType.SUCCESS,
      };
    case "HIRED":
      return {
        title: "Félicitations, vous êtes recruté(e) !",
        message: `${company} vous a retenu(e) pour le poste de « ${jobTitle} ».`,
        type: NotificationType.SUCCESS,
      };
    case "REJECTED":
      return {
        title: "Candidature non retenue",
        message: `${company} n'a pas retenu votre candidature pour « ${jobTitle} ». Continuez, d'autres opportunités vous attendent.`,
        type: NotificationType.WARNING,
      };
    default:
      // PENDING: the state it was created in. Nothing changed.
      return null;
  }
};

/** Candidate: a recruiter moved their application to a new stage. */
export const notifyApplicationStatus = async (params: {
  candidateUserId: string;
  status: ApplicationStatus;
  jobTitle: string;
  company: string;
}): Promise<void> => {
  const content = statusNotification(params.status, params.jobTitle, params.company);
  if (!content) return;
  await notify({ userId: params.candidateUserId, ...content });
};

/** Recruiter: someone applied to one of their jobs. */
export const notifyNewApplication = async (params: {
  recruiterUserId: string;
  candidateName: string;
  jobTitle: string;
}): Promise<void> => {
  await notify({
    userId: params.recruiterUserId,
    title: "Nouvelle candidature",
    message: `${params.candidateName} a postulé au poste de « ${params.jobTitle} ».`,
    type: NotificationType.INFO,
  });
};

/** Candidate: a newly published job looks like a match for them. */
export const notifyJobMatch = async (params: {
  candidateUserIds: string[];
  jobTitle: string;
  company: string;
}): Promise<void> => {
  await notifyMany(
    params.candidateUserIds.map((userId) => ({
      userId,
      title: "Nouvelle offre pour vous",
      message: `« ${params.jobTitle} » chez ${params.company} correspond à votre profil.`,
      type: NotificationType.INFO,
    }))
  );
};
