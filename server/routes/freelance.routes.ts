import { Router } from "express";
import * as freelancePublic from "../controllers/freelancePublic.controller";
import * as freelancer from "../controllers/freelancer.controller";
import * as service from "../controllers/service.controller";
import * as project from "../controllers/project.controller";
import * as proposal from "../controllers/proposal.controller";
import * as order from "../controllers/order.controller";
import * as review from "../controllers/review.controller";
import * as portfolio from "../controllers/portfolio.controller";
import * as payment from "../controllers/marketplacePayment.controller";
import * as message from "../controllers/message.controller";
import * as customOffer from "../controllers/customOffer.controller";
import { protect } from "../middleware/auth.middleware";
import { handleServiceMediaUpload } from "../middleware/mediaUpload.middleware";

/**
 * Public marketplace reads. No `protect` here on purpose: a visitor browses
 * services, projects and freelancers before signing in, and the handlers
 * already restrict themselves to published content.
 */
const router = Router();

router.get("/categories", freelancePublic.listCategories);
router.get("/services", freelancePublic.listServices);
router.get("/projects", freelancePublic.listProjects);
router.get("/projects/by-slug/:slug", freelancePublic.getProject);
router.get("/services/by-slug/:slug", freelancePublic.getService);
router.get("/freelancers/:username", freelancePublic.getFreelancer);
router.get("/freelancers/:username/reviews", review.listPublicReviews);
router.get("/portfolio/:username", portfolio.getPublicPortfolio);

// The gateway posts here. Unauthenticated by nature — the signature over
// the raw bytes is what proves it came from Chargily.
router.post("/payments/webhook", payment.webhook);
router.get("/payments/options", payment.getPurchaseOptions);
router.get("/freelancers", freelancePublic.listFreelancers);
router.get("/pricing", freelancePublic.listPricing);

/* Signed-in freelancer. `protect` from here down.
 *
 * Any Dar L'Emploi account may activate a freelance profile — the
 * specification is explicit that one account switches between selling and
 * buying — so there is no restrictTo here. What a caller may do is decided
 * by whether they have a FreelancerProfile, not by their recruitment role. */
router.get("/me/activation", protect, freelancer.getActivationDraft);
router.post("/me/activate", protect, freelancer.activate);
router.get("/me/workspace", protect, freelancer.getMyWorkspace);
router.get("/me/wallet", protect, freelancer.getWallet);
router.get("/me/services", protect, freelancer.listMyServices);
router.get("/me/proposals", protect, freelancer.listMyProposals);
router.get("/me/orders", protect, freelancer.listMyOrders);
router.patch("/me/profile", protect, freelancer.updateMyProfile);

// The service editor. Every handler scopes its query to the caller's own
// profile rather than checking ownership after the fact.
router.post("/me/services", protect, service.createDraft);
router.get("/me/services/:id", protect, service.getMyService);
router.patch("/me/services/:id", protect, service.updateMyService);
router.post("/me/services/:id/submit", protect, service.submitMyService);
router.post("/me/services/:id/pause", protect, service.pauseMyService);
router.post("/me/services/:id/resume", protect, service.resumeMyService);
router.delete("/me/services/:id", protect, service.deleteMyService);

/* Pictures of the work. The first one is the cover every card already reads;
   until now nothing could put one there, so every service showed an initial. */
router.post(
  "/me/services/:id/media",
  protect,
  handleServiceMediaUpload,
  service.addServiceMedia
);
router.patch("/me/services/:id/media/order", protect, service.reorderServiceMedia);
router.delete("/me/services/:id/media/:mediaId", protect, service.removeServiceMedia);

// Client projects. Free: the platform earns from freelancers, and charging
// clients to post work would thin out the demand that makes a subscription
// worth paying for.
router.post("/me/projects", protect, project.createDraft);
router.get("/me/projects", protect, project.listMine);
router.get("/me/projects/:id", protect, project.getMine);
router.patch("/me/projects/:id", protect, project.updateMine);
router.post("/me/projects/:id/submit", protect, project.submitMine);
router.post("/me/projects/:id/close", protect, project.closeMine);
router.delete("/me/projects/:id", protect, project.deleteMine);
router.get("/me/projects/:id/proposals", protect, project.listProposalsReceived);

// Proposals, from both sides. The freelancer sends and withdraws; the
// client reads one in full and decides on it.
router.get("/projects/:projectId/eligibility", protect, proposal.getProposalEligibility);
router.post("/me/proposals", protect, proposal.submitProposal);
router.post("/me/proposals/:id/withdraw", protect, proposal.withdrawProposal);
router.get("/me/received-proposals/:id", protect, proposal.getProposalForClient);
router.post("/me/received-proposals/:id/decide", protect, proposal.decideProposal);

// Orders. The service decides who may do what; both parties share these
// routes and are told apart by the order they are a party to.
router.post("/me/orders/from-service", protect, order.createFromService);
router.get("/me/orders/:id", protect, order.getOrder);
router.post("/me/orders/:id/start", protect, order.startOrder);
router.post("/me/orders/:id/deliver", protect, order.deliverOrder);
router.post("/me/orders/:id/revision", protect, order.requestRevision);
router.post("/me/orders/:id/accept", protect, order.acceptOrder);
router.post("/me/orders/:id/cancel", protect, order.cancelOrder);

// Reviews. Only after a completed order, one per person per order.
router.get("/me/orders/:id/review", protect, review.getReviewState);
router.post("/me/orders/:id/review", protect, review.leaveReview);
router.post("/me/reviews/:id/reply", protect, review.replyToReview);

// The mini-portfolio editor.
router.get("/me/portfolio", protect, portfolio.getMyPortfolio);
router.patch("/me/portfolio", protect, portfolio.updateSettings);
router.put("/me/portfolio/sections", protect, portfolio.saveSections);
router.post("/me/portfolio/projects", protect, portfolio.addProject);
router.patch("/me/portfolio/projects/:id", protect, portfolio.updateProject);
router.delete("/me/portfolio/projects/:id", protect, portfolio.removeProject);

// Buying credits.
router.post("/me/payments", protect, payment.startPurchase);
router.get("/me/payments", protect, payment.listMyPayments);
router.get("/me/payments/:id", protect, payment.getPayment);
router.post("/me/payments/:id/receipt", protect, payment.attachReceipt);

// Messaging. The platform is where the conversation happens — every public
// page names people without giving a way to reach them — so these are the
// only channel there is. Polled rather than pushed; see the service.
router.post("/me/conversations", protect, message.openConversation);
router.get("/me/conversations", protect, message.listConversations);
router.get("/me/conversations/unread", protect, message.getUnreadCount);
router.get("/me/conversations/:id", protect, message.getConversation);
router.post("/me/conversations/:id/messages", protect, message.sendMessage);
router.post("/me/conversations/:id/read", protect, message.markConversationRead);

/* Offers quoted inside a thread.
   The marketplace sold two ways — a package off a service page, a proposal on
   a published project — and neither covers two people agreeing a figure for
   work that is not quite either. Accepting one creates an order. */
router.get("/me/conversations/:id/offers", protect, customOffer.listOffers);
router.post("/me/conversations/:id/offers", protect, customOffer.sendOffer);
router.post("/me/offers/:offerId/accept", protect, customOffer.acceptOffer);
router.post("/me/offers/:offerId/decline", protect, customOffer.declineOffer);
router.post("/me/offers/:offerId/withdraw", protect, customOffer.withdrawOffer);

export default router;
