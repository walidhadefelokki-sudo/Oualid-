-- CreateEnum
CREATE TYPE "FreelancerAvailability" AS ENUM ('FULL_TIME', 'PART_TIME', 'OCCASIONAL', 'UNAVAILABLE');

-- CreateEnum
CREATE TYPE "SellerLevel" AS ENUM ('NEW', 'LEVEL_1', 'LEVEL_2', 'TOP_RATED');

-- CreateEnum
CREATE TYPE "ModerationState" AS ENUM ('DRAFT', 'PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ServiceStatus" AS ENUM ('DRAFT', 'PENDING', 'PUBLISHED', 'PAUSED', 'EXPIRED', 'REJECTED');

-- CreateEnum
CREATE TYPE "PackageTier" AS ENUM ('BASIC', 'STANDARD', 'PREMIUM');

-- CreateEnum
CREATE TYPE "BudgetType" AS ENUM ('FIXED', 'HOURLY');

-- CreateEnum
CREATE TYPE "ProjectVisibility" AS ENUM ('PUBLIC', 'INVITE_ONLY');

-- CreateEnum
CREATE TYPE "FreelanceProjectStatus" AS ENUM ('DRAFT', 'PENDING', 'OPEN', 'IN_PROGRESS', 'CLOSED', 'COMPLETED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ProposalStatus" AS ENUM ('SENT', 'VIEWED', 'SHORTLISTED', 'SELECTED', 'REJECTED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "FreelanceOrderStatus" AS ENUM ('CREATED', 'IN_PROGRESS', 'DELIVERED', 'REVISION_REQUESTED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MilestoneStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'DELIVERED', 'APPROVED');

-- CreateEnum
CREATE TYPE "CreditEntryType" AS ENUM ('PURCHASE', 'SERVICE_PUBLICATION', 'PROPOSAL_SUBMISSION', 'BOOST_PURCHASE', 'REFUND', 'PROMOTION', 'TRIAL_GRANT', 'ADMIN_ADJUSTMENT', 'EXPIRATION');

-- CreateEnum
CREATE TYPE "MarketplacePaymentStatus" AS ENUM ('PENDING', 'AWAITING_REVIEW', 'PAID', 'REJECTED', 'FAILED', 'REFUNDED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "MarketplacePaymentMethod" AS ENUM ('CHARGILY_CIB', 'CHARGILY_EDAHABIA', 'CCP_TRANSFER', 'BARIDIMOB', 'BANK_TRANSFER', 'ADMIN_GRANT');

-- CreateEnum
CREATE TYPE "FreelancePlanTier" AS ENUM ('FREE', 'PRO', 'PREMIUM', 'AGENCY');

-- CreateEnum
CREATE TYPE "FreelanceSubscriptionStatus" AS ENUM ('ACTIVE', 'PAST_DUE', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "BoostPlacement" AS ENUM ('HOMEPAGE', 'CATEGORY', 'PROPOSAL');

-- CreateEnum
CREATE TYPE "PortfolioSectionType" AS ENUM ('HEADER', 'ABOUT', 'SKILLS', 'FEATURED_PROJECTS', 'SERVICES', 'EXPERIENCE', 'EDUCATION', 'CERTIFICATES', 'REVIEWS', 'CONTACT');

-- CreateEnum
CREATE TYPE "ReportReason" AS ENUM ('SCAM', 'FAKE_PROFILE', 'OFFENSIVE', 'SUSPICIOUS_PAYMENT', 'ABUSE', 'SPAM', 'OTHER');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('OPEN', 'REVIEWING', 'ACTIONED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "DisputeStatus" AS ENUM ('OPEN', 'REVIEWING', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "FavoriteTargetType" AS ENUM ('SERVICE', 'FREELANCER', 'PROJECT');

-- CreateEnum
CREATE TYPE "CustomOfferStatus" AS ENUM ('SENT', 'ACCEPTED', 'DECLINED', 'WITHDRAWN', 'EXPIRED');

-- CreateEnum
CREATE TYPE "PromoCodeKind" AS ENUM ('PERCENT_OFF', 'AMOUNT_OFF', 'BONUS_CREDITS');

-- CreateEnum
CREATE TYPE "StaffRole" AS ENUM ('ADMINISTRATOR', 'MODERATOR', 'FINANCE', 'SUPPORT');

-- CreateEnum
CREATE TYPE "CmsContentType" AS ENUM ('LEGAL_PAGE', 'HELP_ARTICLE', 'HOMEPAGE_BANNER', 'EMAIL_TEMPLATE', 'SMS_TEMPLATE');

-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "nif" TEXT,
ADD COLUMN     "registreCommerce" TEXT,
ADD COLUMN     "verifiedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "JobCategory" ADD COLUMN     "parentId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "phoneVerifiedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "FreelancerProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "title" TEXT,
    "bio" TEXT,
    "categoryId" TEXT,
    "wilaya" TEXT,
    "languages" "Language"[],
    "hourlyRate" DECIMAL(12,2),
    "availability" "FreelancerAvailability" NOT NULL DEFAULT 'OCCASIONAL',
    "level" "SellerLevel" NOT NULL DEFAULT 'NEW',
    "identityVerified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" TIMESTAMP(3),
    "trialClaimedAt" TIMESTAMP(3),
    "completedOrders" INTEGER NOT NULL DEFAULT 0,
    "ratingAverage" DECIMAL(3,2),
    "ratingCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FreelancerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FreelancerSkill" (
    "freelancerId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,

    CONSTRAINT "FreelancerSkill_pkey" PRIMARY KEY ("freelancerId","skillId")
);

-- CreateTable
CREATE TABLE "IdentityVerification" (
    "id" TEXT NOT NULL,
    "freelancerId" TEXT NOT NULL,
    "documentId" TEXT,
    "selfieId" TEXT,
    "state" "ModerationState" NOT NULL DEFAULT 'PENDING',
    "rejectionReason" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IdentityVerification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceListing" (
    "id" TEXT NOT NULL,
    "freelancerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "categoryId" TEXT,
    "description" TEXT NOT NULL,
    "status" "ServiceStatus" NOT NULL DEFAULT 'DRAFT',
    "rejectionReason" TEXT,
    "publishedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "views" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceListing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServicePackage" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "tier" "PackageTier" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(12,2) NOT NULL,
    "deliveryDays" INTEGER NOT NULL,
    "revisions" INTEGER NOT NULL DEFAULT 0,
    "features" TEXT[],

    CONSTRAINT "ServicePackage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceAddon" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "extraDays" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ServiceAddon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceFaq" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ServiceFaq_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceRequirement" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ServiceRequirement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceMedia" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ServiceMedia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceSkill" (
    "serviceId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,

    CONSTRAINT "ServiceSkill_pkey" PRIMARY KEY ("serviceId","skillId")
);

-- CreateTable
CREATE TABLE "FreelanceProject" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "companyId" TEXT,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "categoryId" TEXT,
    "budgetType" "BudgetType" NOT NULL DEFAULT 'FIXED',
    "budgetMin" DECIMAL(12,2),
    "budgetMax" DECIMAL(12,2),
    "deadline" TIMESTAMP(3),
    "remote" BOOLEAN NOT NULL DEFAULT true,
    "wilaya" TEXT,
    "visibility" "ProjectVisibility" NOT NULL DEFAULT 'PUBLIC',
    "status" "FreelanceProjectStatus" NOT NULL DEFAULT 'DRAFT',
    "rejectionReason" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FreelanceProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectSkill" (
    "projectId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,

    CONSTRAINT "ProjectSkill_pkey" PRIMARY KEY ("projectId","skillId")
);

-- CreateTable
CREATE TABLE "ProjectAttachment" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,

    CONSTRAINT "ProjectAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectInvite" (
    "projectId" TEXT NOT NULL,
    "freelancerId" TEXT NOT NULL,
    "invitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectInvite_pkey" PRIMARY KEY ("projectId","freelancerId")
);

-- CreateTable
CREATE TABLE "Proposal" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "freelancerId" TEXT NOT NULL,
    "coverLetter" TEXT NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "deliveryDays" INTEGER NOT NULL,
    "status" "ProposalStatus" NOT NULL DEFAULT 'SENT',
    "viewedAt" TIMESTAMP(3),
    "shortlistedAt" TIMESTAMP(3),
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Proposal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProposalAttachment" (
    "id" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,

    CONSTRAINT "ProposalAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FreelanceOrder" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "freelancerId" TEXT NOT NULL,
    "serviceId" TEXT,
    "packageId" TEXT,
    "projectId" TEXT,
    "agreedPrice" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'DZD',
    "deliveryDueAt" TIMESTAMP(3),
    "status" "FreelanceOrderStatus" NOT NULL DEFAULT 'CREATED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "FreelanceOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FreelanceOrderAddon" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "addonId" TEXT,
    "name" TEXT NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "FreelanceOrderAddon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderMilestone" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "amount" DECIMAL(12,2),
    "dueAt" TIMESTAMP(3),
    "status" "MilestoneStatus" NOT NULL DEFAULT 'PENDING',
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "OrderMilestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderDelivery" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "message" TEXT,
    "attempt" INTEGER NOT NULL DEFAULT 1,
    "revisionRequested" BOOLEAN NOT NULL DEFAULT false,
    "revisionNote" TEXT,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliveryFile" (
    "id" TEXT NOT NULL,
    "deliveryId" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,

    CONSTRAINT "DeliveryFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderEvent" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "actorId" TEXT,
    "fromStatus" "FreelanceOrderStatus",
    "toStatus" "FreelanceOrderStatus" NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FreelanceReview" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "qualityRating" INTEGER,
    "communicationRating" INTEGER,
    "deadlineRating" INTEGER,
    "comment" TEXT,
    "response" TEXT,
    "respondedAt" TIMESTAMP(3),
    "state" "ModerationState" NOT NULL DEFAULT 'APPROVED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FreelanceReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL,
    "orderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConversationParticipant" (
    "conversationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lastReadAt" TIMESTAMP(3),

    CONSTRAINT "ConversationParticipant_pkey" PRIMARY KEY ("conversationId","userId")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "body" TEXT,
    "flagged" BOOLEAN NOT NULL DEFAULT false,
    "flagReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MessageAttachment" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,

    CONSTRAINT "MessageAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreditWallet" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "balance" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreditWallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreditLedgerEntry" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "type" "CreditEntryType" NOT NULL,
    "delta" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "referenceType" TEXT,
    "referenceId" TEXT,
    "note" TEXT,
    "idempotencyKey" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreditLedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreditPack" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "credits" INTEGER NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'DZD',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreditPack_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FreelancePlan" (
    "id" TEXT NOT NULL,
    "tier" "FreelancePlanTier" NOT NULL,
    "name" TEXT NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'DZD',
    "maxActiveServices" INTEGER,
    "monthlyProposals" INTEGER,
    "maxPortfolioProjects" INTEGER,
    "prioritySearch" BOOLEAN NOT NULL DEFAULT false,
    "removableBranding" BOOLEAN NOT NULL DEFAULT false,
    "customSubdomain" BOOLEAN NOT NULL DEFAULT false,
    "weeklyBoosts" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FreelancePlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FreelanceSubscription" (
    "id" TEXT NOT NULL,
    "freelancerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "status" "FreelanceSubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "proposalsUsedThisPeriod" INTEGER NOT NULL DEFAULT 0,
    "periodStartedAt" TIMESTAMP(3) NOT NULL,
    "autoRenew" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FreelanceSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Boost" (
    "id" TEXT NOT NULL,
    "freelancerId" TEXT NOT NULL,
    "serviceId" TEXT,
    "proposalId" TEXT,
    "placement" "BoostPlacement" NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "pricePaid" DECIMAL(12,2),
    "creditsPaid" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Boost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketplacePayment" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "creditPackId" TEXT,
    "subscriptionId" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'DZD',
    "method" "MarketplacePaymentMethod" NOT NULL,
    "status" "MarketplacePaymentStatus" NOT NULL DEFAULT 'PENDING',
    "providerCheckoutId" TEXT,
    "providerPayload" JSONB,
    "paidAt" TIMESTAMP(3),
    "receiptId" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketplacePayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketplaceInvoice" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fileId" TEXT,

    CONSTRAINT "MarketplaceInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Portfolio" (
    "id" TEXT NOT NULL,
    "freelancerId" TEXT NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "template" TEXT NOT NULL DEFAULT 'default',
    "accentColor" TEXT NOT NULL DEFAULT '#173E7D',
    "fontFamily" TEXT NOT NULL DEFAULT 'default',
    "defaultLanguage" "Language" NOT NULL DEFAULT 'FR',
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "coverId" TEXT,
    "views" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Portfolio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PortfolioSection" (
    "id" TEXT NOT NULL,
    "portfolioId" TEXT NOT NULL,
    "type" "PortfolioSectionType" NOT NULL,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "position" INTEGER NOT NULL DEFAULT 0,
    "content" JSONB,

    CONSTRAINT "PortfolioSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PortfolioProject" (
    "id" TEXT NOT NULL,
    "portfolioId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "categoryId" TEXT,
    "role" TEXT,
    "tools" TEXT[],
    "clientName" TEXT,
    "externalUrl" TEXT,
    "videoUrl" TEXT,
    "completedAt" TIMESTAMP(3),
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL DEFAULT 0,
    "coverId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PortfolioProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PortfolioProjectMedia" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PortfolioProjectMedia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModerationRecord" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "state" "ModerationState" NOT NULL,
    "reason" TEXT,
    "moderatorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ModerationRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "serviceId" TEXT,
    "projectId" TEXT,
    "messageId" TEXT,
    "reportedUserId" TEXT,
    "reason" "ReportReason" NOT NULL,
    "detail" TEXT,
    "status" "ReportStatus" NOT NULL DEFAULT 'OPEN',
    "resolvedById" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "resolution" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dispute" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "openedById" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "detail" TEXT NOT NULL,
    "status" "DisputeStatus" NOT NULL DEFAULT 'OPEN',
    "assignedToId" TEXT,
    "resolution" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Dispute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Favorite" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "targetType" "FavoriteTargetType" NOT NULL,
    "targetId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Favorite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomOffer" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "freelancerId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(12,2) NOT NULL,
    "deliveryDays" INTEGER NOT NULL,
    "revisions" INTEGER NOT NULL DEFAULT 0,
    "status" "CustomOfferStatus" NOT NULL DEFAULT 'SENT',
    "expiresAt" TIMESTAMP(3),
    "respondedAt" TIMESTAMP(3),
    "orderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomOffer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromoCode" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "kind" "PromoCodeKind" NOT NULL,
    "value" DECIMAL(12,2) NOT NULL,
    "maxRedemptions" INTEGER,
    "maxPerUser" INTEGER DEFAULT 1,
    "redemptionCount" INTEGER NOT NULL DEFAULT 0,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PromoCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromoCodeRedemption" (
    "id" TEXT NOT NULL,
    "promoCodeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "paymentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PromoCodeRedemption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffMember" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "StaffRole" NOT NULL,
    "permissions" TEXT[],
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImpersonationSession" (
    "id" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "targetUserId" TEXT NOT NULL,
    "reason" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "ImpersonationSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CmsContent" (
    "id" TEXT NOT NULL,
    "type" "CmsContentType" NOT NULL,
    "slug" TEXT NOT NULL,
    "translations" JSONB NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CmsContent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FreelancerProfile_userId_key" ON "FreelancerProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "FreelancerProfile_username_key" ON "FreelancerProfile"("username");

-- CreateIndex
CREATE INDEX "FreelancerProfile_categoryId_idx" ON "FreelancerProfile"("categoryId");

-- CreateIndex
CREATE INDEX "FreelancerProfile_level_idx" ON "FreelancerProfile"("level");

-- CreateIndex
CREATE INDEX "FreelancerProfile_wilaya_idx" ON "FreelancerProfile"("wilaya");

-- CreateIndex
CREATE INDEX "FreelancerSkill_skillId_idx" ON "FreelancerSkill"("skillId");

-- CreateIndex
CREATE UNIQUE INDEX "IdentityVerification_freelancerId_key" ON "IdentityVerification"("freelancerId");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceListing_slug_key" ON "ServiceListing"("slug");

-- CreateIndex
CREATE INDEX "ServiceListing_freelancerId_idx" ON "ServiceListing"("freelancerId");

-- CreateIndex
CREATE INDEX "ServiceListing_categoryId_idx" ON "ServiceListing"("categoryId");

-- CreateIndex
CREATE INDEX "ServiceListing_status_publishedAt_idx" ON "ServiceListing"("status", "publishedAt");

-- CreateIndex
CREATE INDEX "ServiceListing_status_expiresAt_idx" ON "ServiceListing"("status", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "ServicePackage_serviceId_tier_key" ON "ServicePackage"("serviceId", "tier");

-- CreateIndex
CREATE INDEX "ServiceAddon_serviceId_idx" ON "ServiceAddon"("serviceId");

-- CreateIndex
CREATE INDEX "ServiceFaq_serviceId_idx" ON "ServiceFaq"("serviceId");

-- CreateIndex
CREATE INDEX "ServiceRequirement_serviceId_idx" ON "ServiceRequirement"("serviceId");

-- CreateIndex
CREATE INDEX "ServiceMedia_serviceId_idx" ON "ServiceMedia"("serviceId");

-- CreateIndex
CREATE INDEX "ServiceSkill_skillId_idx" ON "ServiceSkill"("skillId");

-- CreateIndex
CREATE UNIQUE INDEX "FreelanceProject_slug_key" ON "FreelanceProject"("slug");

-- CreateIndex
CREATE INDEX "FreelanceProject_clientId_idx" ON "FreelanceProject"("clientId");

-- CreateIndex
CREATE INDEX "FreelanceProject_categoryId_idx" ON "FreelanceProject"("categoryId");

-- CreateIndex
CREATE INDEX "FreelanceProject_status_publishedAt_idx" ON "FreelanceProject"("status", "publishedAt");

-- CreateIndex
CREATE INDEX "ProjectSkill_skillId_idx" ON "ProjectSkill"("skillId");

-- CreateIndex
CREATE INDEX "ProjectAttachment_projectId_idx" ON "ProjectAttachment"("projectId");

-- CreateIndex
CREATE INDEX "Proposal_freelancerId_status_idx" ON "Proposal"("freelancerId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Proposal_projectId_freelancerId_key" ON "Proposal"("projectId", "freelancerId");

-- CreateIndex
CREATE INDEX "ProposalAttachment_proposalId_idx" ON "ProposalAttachment"("proposalId");

-- CreateIndex
CREATE UNIQUE INDEX "FreelanceOrder_reference_key" ON "FreelanceOrder"("reference");

-- CreateIndex
CREATE INDEX "FreelanceOrder_clientId_status_idx" ON "FreelanceOrder"("clientId", "status");

-- CreateIndex
CREATE INDEX "FreelanceOrder_freelancerId_status_idx" ON "FreelanceOrder"("freelancerId", "status");

-- CreateIndex
CREATE INDEX "FreelanceOrderAddon_orderId_idx" ON "FreelanceOrderAddon"("orderId");

-- CreateIndex
CREATE INDEX "OrderMilestone_orderId_idx" ON "OrderMilestone"("orderId");

-- CreateIndex
CREATE INDEX "OrderDelivery_orderId_idx" ON "OrderDelivery"("orderId");

-- CreateIndex
CREATE INDEX "DeliveryFile_deliveryId_idx" ON "DeliveryFile"("deliveryId");

-- CreateIndex
CREATE INDEX "OrderEvent_orderId_createdAt_idx" ON "OrderEvent"("orderId", "createdAt");

-- CreateIndex
CREATE INDEX "FreelanceReview_targetId_idx" ON "FreelanceReview"("targetId");

-- CreateIndex
CREATE UNIQUE INDEX "FreelanceReview_orderId_authorId_key" ON "FreelanceReview"("orderId", "authorId");

-- CreateIndex
CREATE UNIQUE INDEX "Conversation_orderId_key" ON "Conversation"("orderId");

-- CreateIndex
CREATE INDEX "Conversation_updatedAt_idx" ON "Conversation"("updatedAt");

-- CreateIndex
CREATE INDEX "ConversationParticipant_userId_idx" ON "ConversationParticipant"("userId");

-- CreateIndex
CREATE INDEX "Message_conversationId_createdAt_idx" ON "Message"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "MessageAttachment_messageId_idx" ON "MessageAttachment"("messageId");

-- CreateIndex
CREATE UNIQUE INDEX "CreditWallet_userId_key" ON "CreditWallet"("userId");

-- CreateIndex
CREATE INDEX "CreditWallet_userId_idx" ON "CreditWallet"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CreditLedgerEntry_idempotencyKey_key" ON "CreditLedgerEntry"("idempotencyKey");

-- CreateIndex
CREATE INDEX "CreditLedgerEntry_walletId_createdAt_idx" ON "CreditLedgerEntry"("walletId", "createdAt");

-- CreateIndex
CREATE INDEX "CreditLedgerEntry_referenceType_referenceId_idx" ON "CreditLedgerEntry"("referenceType", "referenceId");

-- CreateIndex
CREATE UNIQUE INDEX "FreelancePlan_tier_key" ON "FreelancePlan"("tier");

-- CreateIndex
CREATE INDEX "FreelanceSubscription_freelancerId_status_idx" ON "FreelanceSubscription"("freelancerId", "status");

-- CreateIndex
CREATE INDEX "Boost_placement_startsAt_endsAt_idx" ON "Boost"("placement", "startsAt", "endsAt");

-- CreateIndex
CREATE INDEX "Boost_freelancerId_idx" ON "Boost"("freelancerId");

-- CreateIndex
CREATE UNIQUE INDEX "MarketplacePayment_reference_key" ON "MarketplacePayment"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "MarketplacePayment_providerCheckoutId_key" ON "MarketplacePayment"("providerCheckoutId");

-- CreateIndex
CREATE INDEX "MarketplacePayment_userId_status_idx" ON "MarketplacePayment"("userId", "status");

-- CreateIndex
CREATE INDEX "MarketplacePayment_status_createdAt_idx" ON "MarketplacePayment"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "MarketplaceInvoice_paymentId_key" ON "MarketplaceInvoice"("paymentId");

-- CreateIndex
CREATE UNIQUE INDEX "MarketplaceInvoice_number_key" ON "MarketplaceInvoice"("number");

-- CreateIndex
CREATE UNIQUE INDEX "Portfolio_freelancerId_key" ON "Portfolio"("freelancerId");

-- CreateIndex
CREATE UNIQUE INDEX "PortfolioSection_portfolioId_type_key" ON "PortfolioSection"("portfolioId", "type");

-- CreateIndex
CREATE INDEX "PortfolioProject_portfolioId_idx" ON "PortfolioProject"("portfolioId");

-- CreateIndex
CREATE INDEX "PortfolioProjectMedia_projectId_idx" ON "PortfolioProjectMedia"("projectId");

-- CreateIndex
CREATE INDEX "ModerationRecord_entityType_entityId_createdAt_idx" ON "ModerationRecord"("entityType", "entityId", "createdAt");

-- CreateIndex
CREATE INDEX "ModerationRecord_state_createdAt_idx" ON "ModerationRecord"("state", "createdAt");

-- CreateIndex
CREATE INDEX "Report_status_createdAt_idx" ON "Report"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Dispute_status_createdAt_idx" ON "Dispute"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Dispute_orderId_idx" ON "Dispute"("orderId");

-- CreateIndex
CREATE INDEX "Favorite_userId_createdAt_idx" ON "Favorite"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Favorite_userId_targetType_targetId_key" ON "Favorite"("userId", "targetType", "targetId");

-- CreateIndex
CREATE UNIQUE INDEX "CustomOffer_orderId_key" ON "CustomOffer"("orderId");

-- CreateIndex
CREATE INDEX "CustomOffer_conversationId_idx" ON "CustomOffer"("conversationId");

-- CreateIndex
CREATE INDEX "CustomOffer_freelancerId_status_idx" ON "CustomOffer"("freelancerId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "PromoCode_code_key" ON "PromoCode"("code");

-- CreateIndex
CREATE UNIQUE INDEX "PromoCodeRedemption_paymentId_key" ON "PromoCodeRedemption"("paymentId");

-- CreateIndex
CREATE INDEX "PromoCodeRedemption_promoCodeId_idx" ON "PromoCodeRedemption"("promoCodeId");

-- CreateIndex
CREATE INDEX "PromoCodeRedemption_userId_idx" ON "PromoCodeRedemption"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "StaffMember_userId_key" ON "StaffMember"("userId");

-- CreateIndex
CREATE INDEX "StaffMember_role_idx" ON "StaffMember"("role");

-- CreateIndex
CREATE INDEX "ImpersonationSession_staffId_startedAt_idx" ON "ImpersonationSession"("staffId", "startedAt");

-- CreateIndex
CREATE INDEX "ImpersonationSession_targetUserId_startedAt_idx" ON "ImpersonationSession"("targetUserId", "startedAt");

-- CreateIndex
CREATE INDEX "CmsContent_type_published_position_idx" ON "CmsContent"("type", "published", "position");

-- CreateIndex
CREATE UNIQUE INDEX "CmsContent_type_slug_key" ON "CmsContent"("type", "slug");

-- AddForeignKey
ALTER TABLE "JobCategory" ADD CONSTRAINT "JobCategory_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "JobCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FreelancerProfile" ADD CONSTRAINT "FreelancerProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FreelancerProfile" ADD CONSTRAINT "FreelancerProfile_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "JobCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FreelancerSkill" ADD CONSTRAINT "FreelancerSkill_freelancerId_fkey" FOREIGN KEY ("freelancerId") REFERENCES "FreelancerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FreelancerSkill" ADD CONSTRAINT "FreelancerSkill_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IdentityVerification" ADD CONSTRAINT "IdentityVerification_freelancerId_fkey" FOREIGN KEY ("freelancerId") REFERENCES "FreelancerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IdentityVerification" ADD CONSTRAINT "IdentityVerification_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "FileAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IdentityVerification" ADD CONSTRAINT "IdentityVerification_selfieId_fkey" FOREIGN KEY ("selfieId") REFERENCES "FileAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IdentityVerification" ADD CONSTRAINT "IdentityVerification_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceListing" ADD CONSTRAINT "ServiceListing_freelancerId_fkey" FOREIGN KEY ("freelancerId") REFERENCES "FreelancerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceListing" ADD CONSTRAINT "ServiceListing_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "JobCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServicePackage" ADD CONSTRAINT "ServicePackage_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "ServiceListing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceAddon" ADD CONSTRAINT "ServiceAddon_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "ServiceListing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceFaq" ADD CONSTRAINT "ServiceFaq_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "ServiceListing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceRequirement" ADD CONSTRAINT "ServiceRequirement_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "ServiceListing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceMedia" ADD CONSTRAINT "ServiceMedia_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "ServiceListing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceMedia" ADD CONSTRAINT "ServiceMedia_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "FileAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceSkill" ADD CONSTRAINT "ServiceSkill_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "ServiceListing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceSkill" ADD CONSTRAINT "ServiceSkill_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FreelanceProject" ADD CONSTRAINT "FreelanceProject_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FreelanceProject" ADD CONSTRAINT "FreelanceProject_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FreelanceProject" ADD CONSTRAINT "FreelanceProject_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "JobCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectSkill" ADD CONSTRAINT "ProjectSkill_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "FreelanceProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectSkill" ADD CONSTRAINT "ProjectSkill_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectAttachment" ADD CONSTRAINT "ProjectAttachment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "FreelanceProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectAttachment" ADD CONSTRAINT "ProjectAttachment_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "FileAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectInvite" ADD CONSTRAINT "ProjectInvite_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "FreelanceProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "FreelanceProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_freelancerId_fkey" FOREIGN KEY ("freelancerId") REFERENCES "FreelancerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProposalAttachment" ADD CONSTRAINT "ProposalAttachment_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "Proposal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProposalAttachment" ADD CONSTRAINT "ProposalAttachment_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "FileAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FreelanceOrder" ADD CONSTRAINT "FreelanceOrder_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FreelanceOrder" ADD CONSTRAINT "FreelanceOrder_freelancerId_fkey" FOREIGN KEY ("freelancerId") REFERENCES "FreelancerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FreelanceOrder" ADD CONSTRAINT "FreelanceOrder_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "ServiceListing"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FreelanceOrder" ADD CONSTRAINT "FreelanceOrder_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "ServicePackage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FreelanceOrder" ADD CONSTRAINT "FreelanceOrder_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "FreelanceProject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FreelanceOrderAddon" ADD CONSTRAINT "FreelanceOrderAddon_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "FreelanceOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FreelanceOrderAddon" ADD CONSTRAINT "FreelanceOrderAddon_addonId_fkey" FOREIGN KEY ("addonId") REFERENCES "ServiceAddon"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderMilestone" ADD CONSTRAINT "OrderMilestone_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "FreelanceOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderDelivery" ADD CONSTRAINT "OrderDelivery_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "FreelanceOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryFile" ADD CONSTRAINT "DeliveryFile_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "OrderDelivery"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryFile" ADD CONSTRAINT "DeliveryFile_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "FileAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderEvent" ADD CONSTRAINT "OrderEvent_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "FreelanceOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderEvent" ADD CONSTRAINT "OrderEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FreelanceReview" ADD CONSTRAINT "FreelanceReview_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "FreelanceOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FreelanceReview" ADD CONSTRAINT "FreelanceReview_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FreelanceReview" ADD CONSTRAINT "FreelanceReview_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "FreelanceOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationParticipant" ADD CONSTRAINT "ConversationParticipant_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationParticipant" ADD CONSTRAINT "ConversationParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageAttachment" ADD CONSTRAINT "MessageAttachment_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageAttachment" ADD CONSTRAINT "MessageAttachment_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "FileAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditWallet" ADD CONSTRAINT "CreditWallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditLedgerEntry" ADD CONSTRAINT "CreditLedgerEntry_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "CreditWallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditLedgerEntry" ADD CONSTRAINT "CreditLedgerEntry_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FreelanceSubscription" ADD CONSTRAINT "FreelanceSubscription_freelancerId_fkey" FOREIGN KEY ("freelancerId") REFERENCES "FreelancerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FreelanceSubscription" ADD CONSTRAINT "FreelanceSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FreelanceSubscription" ADD CONSTRAINT "FreelanceSubscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "FreelancePlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Boost" ADD CONSTRAINT "Boost_freelancerId_fkey" FOREIGN KEY ("freelancerId") REFERENCES "FreelancerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Boost" ADD CONSTRAINT "Boost_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "ServiceListing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Boost" ADD CONSTRAINT "Boost_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "Proposal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplacePayment" ADD CONSTRAINT "MarketplacePayment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplacePayment" ADD CONSTRAINT "MarketplacePayment_creditPackId_fkey" FOREIGN KEY ("creditPackId") REFERENCES "CreditPack"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplacePayment" ADD CONSTRAINT "MarketplacePayment_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "FreelanceSubscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplacePayment" ADD CONSTRAINT "MarketplacePayment_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "FileAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplacePayment" ADD CONSTRAINT "MarketplacePayment_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceInvoice" ADD CONSTRAINT "MarketplaceInvoice_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "MarketplacePayment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceInvoice" ADD CONSTRAINT "MarketplaceInvoice_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "FileAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Portfolio" ADD CONSTRAINT "Portfolio_freelancerId_fkey" FOREIGN KEY ("freelancerId") REFERENCES "FreelancerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Portfolio" ADD CONSTRAINT "Portfolio_coverId_fkey" FOREIGN KEY ("coverId") REFERENCES "FileAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortfolioSection" ADD CONSTRAINT "PortfolioSection_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "Portfolio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortfolioProject" ADD CONSTRAINT "PortfolioProject_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "Portfolio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortfolioProject" ADD CONSTRAINT "PortfolioProject_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "JobCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortfolioProject" ADD CONSTRAINT "PortfolioProject_coverId_fkey" FOREIGN KEY ("coverId") REFERENCES "FileAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortfolioProjectMedia" ADD CONSTRAINT "PortfolioProjectMedia_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "PortfolioProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortfolioProjectMedia" ADD CONSTRAINT "PortfolioProjectMedia_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "FileAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModerationRecord" ADD CONSTRAINT "ModerationRecord_moderatorId_fkey" FOREIGN KEY ("moderatorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "ServiceListing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "FreelanceProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_reportedUserId_fkey" FOREIGN KEY ("reportedUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "FreelanceOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_openedById_fkey" FOREIGN KEY ("openedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomOffer" ADD CONSTRAINT "CustomOffer_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomOffer" ADD CONSTRAINT "CustomOffer_freelancerId_fkey" FOREIGN KEY ("freelancerId") REFERENCES "FreelancerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomOffer" ADD CONSTRAINT "CustomOffer_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomOffer" ADD CONSTRAINT "CustomOffer_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "FreelanceOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromoCodeRedemption" ADD CONSTRAINT "PromoCodeRedemption_promoCodeId_fkey" FOREIGN KEY ("promoCodeId") REFERENCES "PromoCode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromoCodeRedemption" ADD CONSTRAINT "PromoCodeRedemption_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromoCodeRedemption" ADD CONSTRAINT "PromoCodeRedemption_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "MarketplacePayment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffMember" ADD CONSTRAINT "StaffMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImpersonationSession" ADD CONSTRAINT "ImpersonationSession_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImpersonationSession" ADD CONSTRAINT "ImpersonationSession_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CmsContent" ADD CONSTRAINT "CmsContent_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

