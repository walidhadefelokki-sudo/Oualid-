import React, { useState, useEffect } from 'react';
import CVBuilder from "./cv/CVBuilder";
import CVDocument, { CVDocumentData } from "./cv/CVDocument";
import CVDirectory from "./recruiter/CVDirectory";
import QuizResults from "./recruiter/QuizResults";
import OralPresentationResults from "./recruiter/OralPresentationResults";
import PreselectedCandidates from "./recruiter/PreselectedCandidates";
import AIFilterResults, { AICandidate } from "./recruiter/AIFilterResults";
import aiAnalysisService from "../services/aiAnalysis.service";
import jobService from "../services/job.service";
import applicationService, { ApplicationStatus } from "../services/application.service";
import OralPresentationCard from "./candidate/OralPresentationCard";
import OralPresentationViewer from "./recruiter/OralPresentationViewer";
import AIQuiz from "./candidate/AIQuiz";
import CandidatesSection from './recruiter/CandidatesSection.tsx';
import { 
  BarChart3, 
  Briefcase, 
  ClipboardList, 
  Bookmark, 
  FileText, 
  User, 
  Bell, 
  Settings,
  LogOut,
  Menu,
  X,
  Search,
  MapPin,
  TrendingUp,
  ChevronRight,
  ChevronLeft,
  Filter,
  PlusCircle,
  Users as UsersIcon,
  Building2,
  LayoutDashboard,
  Cpu,
  Gem,
  CheckCircle2,
  Check,
  Clock,
  Camera,
  ChevronDown,
  ChevronUp,
  Zap,
  AlertTriangle,
  Mail,
  Phone,
  MessageCircle,
  MessageSquare,
  CheckSquare,
  Ban,
  MoreHorizontal,
  Save,
  Download,
  Lock,
  Shield,
  Smartphone,
  Globe,
  Trash2,
  Eye,
  Key,
  CreditCard,
  History,
  HelpCircle,
  Plus,
  Info,
  Copy,
  BookOpen,
  Code2,
  Activity,
  Sparkles,
  Send,
  UserPlus,
  Play,
  Pause,
  Award,
  Star,
  Volume2,
  Brain,
  Crown,
  Pencil,
  Upload,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Logo from './Logo';
import html2canvas from "html2canvas-pro";
import { jsPDF } from "jspdf";
import { useRef } from "react";
import { supabase } from '../supabase';
import { getNotifications, markNotificationRead, markAllNotificationsRead } from '../services/notifications';
import candidateProfileService from '../services/candidateProfile.service';
import { WILAYAS } from '../constants';
import { translations, Language } from '../translations';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  query, 
  where, 
  onSnapshot, 
  serverTimestamp,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

// Language proficiency, shared by the CV preview and the PDF export so the
// bar in the on-screen CV and the bar in the downloaded file always agree.
// Keyed by both the French and Arabic labels offered in the CV editor's
// level dropdown.
const LANGUAGE_LEVELS: { labels: string[]; percent: number }[] = [
  { labels: ['Natif', 'أصلي'], percent: 100 },
  { labels: ['Courant', 'بطلاقة'], percent: 85 },
  { labels: ['Intermédiaire', 'متوسط'], percent: 60 },
  { labels: ['Débutant', 'مبتدئ'], percent: 30 },
];

// Falls back to the Intermédiaire weighting for anything unrecognised (the
// language name is free text, but the level always comes from the dropdown).
export const languageLevelPercent = (level: string): number =>
  LANGUAGE_LEVELS.find((l) => l.labels.includes(level))?.percent ?? 60;

interface SidebarItemProps {
  icon: React.ElementType;
  label: string;
  active?: boolean;
  onClick: () => void;
}

type RecruiterTier =
  | 'free'
  | 'paid'
  | 'corporate';

// TODO: verify this matches the real shape used elsewhere in the app.
// Not present in the original snippet provided — added as a placeholder
// so `TIER_ACCESS[recruiterTier]` below doesn't throw a "not defined" error.
// Replace with your actual tier-access config/import if it lives elsewhere.
const TIER_ACCESS: Record<RecruiterTier, any> = {
  free: {},
  paid: {},
  corporate: {},
};

const SidebarItem = ({ icon: Icon, label, active, onClick }: SidebarItemProps) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group ${
      active 
        ? 'bg-[#173E7D] text-white shadow-lg shadow-blue-900/20' 
        : 'text-gray-500 hover:bg-white hover:text-[#173E7D] hover:shadow-md'
    }`}
  >
    <Icon size={20} className={active ? 'text-white' : 'text-gray-400 group-hover:text-[#173E7D]'} />
    <span className="font-bold text-sm tracking-tight whitespace-nowrap overflow-hidden text-ellipsis">{label}</span>
  </button>
);

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <div className="px-6 mt-8 mb-4">
    <span className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">{children}</span>
  </div>
);

interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  type: string;
  remote: string;
  salary: string;
  salaryMin: number;
  description: string;
  requirements: string[];
  benefits: string[];
  logo: string;
  sector: string;
}

interface JobCardProps {
  job: Job;
  isSaved: boolean;
  onToggleSave: (id: string) => void;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
}
function TierLockedScreen({
  title,
  description,
  requiredTier,
  icon: Icon,
  onUpgrade,
}: {
  title: string;
  description: string;
  requiredTier: 'Premium' | 'Corporate';
  icon: React.ComponentType<{ size?: number }>;
  onUpgrade: () => void;
}) {
  const isCorporate = requiredTier === 'Corporate';
  return (
    <div className="flex flex-col items-center justify-center text-center py-24 px-8 bg-white rounded-[3rem] border border-gray-100 shadow-sm">
      <div
        className={`w-20 h-20 rounded-3xl flex items-center justify-center mb-8 ${
          isCorporate
            ? 'bg-gradient-to-br from-[#D4AF37]/10 to-[#173E7D]/10 text-[#D4AF37]'
            : 'bg-blue-50 text-[#173E7D]'
        }`}
      >
        <Icon size={32} />
      </div>
      <span
        className={`mb-4 inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
          isCorporate
            ? 'bg-gradient-to-r from-[#D4AF37] to-[#F0D989] text-[#0B1E3D]'
            : 'bg-[#173E7D] text-white'
        }`}
      >
        {isCorporate ? <Crown size={12} /> : <Sparkles size={12} />}
        Plan {requiredTier} requis
      </span>
      <h3 className="text-2xl font-black text-[#173E7D] tracking-tight mb-3">{title}</h3>
      <p className="text-gray-400 font-medium max-w-md mb-8">{description}</p>
      <button
        onClick={onUpgrade}
        className={`px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${
          isCorporate
            ? 'bg-gradient-to-r from-[#D4AF37] to-[#F0D989] text-[#0B1E3D] hover:brightness-105 shadow-lg shadow-black/10'
            : 'bg-[#173E7D] text-white hover:bg-[#F68D58] shadow-lg shadow-blue-900/20'
        }`}
      >
        Passer à {requiredTier}
      </button>
    </div>
  );
}
export default function Dashboard({ 
  user: initialUser, 
  // Add isDemo to props
  language, 
  setLanguage,
  onGoHome,
  onLogout,
  isDemo = false
}: { 
  user: any; 
  language: Language; 
  setLanguage: (lang: Language) => void; 
  onGoHome: () => void;
  onLogout?: () => void;
  isDemo?: boolean;
}) {
  // Use a default user if none provided (especially for demo mode/crash prevention)
  const user = initialUser || {
    uid: 'anonymous',
    displayName: 'Utilisateur',
    email: '',
    role: 'candidate',
    photoURL: ''
  };

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // The full uploaded CV, not just its URL. profileData.resumeUrl kept only the
  // link, so there was nothing to show the candidate beyond "View current CV" —
  // no file type, no size, no confirmation of what actually landed.
  const [cvAsset, setCvAsset] = useState<import('../services/candidateProfile.service').CVFileAsset | null>(null);
  const [selectedPresentationCandidate, setSelectedPresentationCandidate] =
    useState<any>(null);
  const t = (key: string, variables?: Record<string, any>) => {
    const keys = key.split('.');
    let result: any = translations[language] || translations['fr'] || translations['en'];
    for (const k of keys) {
      if (result && result[k]) result = result[k];
      else return key;
    }
    if (variables && typeof result === 'string') {
      Object.entries(variables).forEach(([k, v]) => {
        result = result.replace(`{${k}}`, v);
      });
    }
    return result;
  };

  const lt = (en: string, fr: string, ar: string) => {
    if (language === 'ar') return ar;
    if (language === 'fr') return fr;
    return en;
  };

  const isRTL = language === 'ar';

  // ---------------------------------------------------------------------
  // FIX: previously declared twice (once via useState defaulting to
  // 'corporate', once derived from user?.recruiterTier). Merged into a
  // single useState initialized from the user's actual tier, with a
  // useEffect to keep it in sync if `user` loads/updates asynchronously.
  // ---------------------------------------------------------------------
  const [recruiterTier, setRecruiterTier] = useState<RecruiterTier>(
    (user?.recruiterTier as RecruiterTier) || 'free'
  );

  useEffect(() => {
    if (user?.recruiterTier) {
      setRecruiterTier(user.recruiterTier as RecruiterTier);
    }
  }, [user?.recruiterTier]);

  const access = TIER_ACCESS[recruiterTier];

  const handleWhatsAppContact = (phoneNumber: string, candidateName: string) => {
    const message = encodeURIComponent(`Bonjour ${candidateName}, nous avons bien reçu votre candidature sur Algeria Jobs. Souhaitez-vous fixer un entretien ?`);
    window.open(`https://wa.me/${phoneNumber.replace(/[^0-9]/g, '')}?text=${message}`, '_blank');
  };
  const [candidateQuizAnswers, setCandidateQuizAnswers] =
  useState<Record<string, number[]>>({});

  const [candidateQuizFinished, setCandidateQuizFinished] =
    useState<Record<string, boolean>>({});

  const [candidateQuizScores, setCandidateQuizScores] =
    useState<Record<string, number>>({});
    const [activeOralRecording, setActiveOralRecording] =
  useState<boolean>(false);

  const [candidateList, setCandidateList] = useState([]);
  const [quizResults, setQuizResults] = useState([]);
  const [oralPresentationResults, setOralPresentationResults] = useState([]);
  const [preselectedCandidates, setPreselectedCandidates] = useState([]);
  const [aiCandidates, setAiCandidates] = useState([]);

  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [loadingQuiz, setLoadingQuiz] = useState(false);
  const [loadingPresentations, setLoadingPresentations] = useState(false);
  const [loadingPreselected, setLoadingPreselected] = useState(false);
  const [loadingAI, setLoadingAI] = useState(false);

  const mapApplicationStatus = (status: ApplicationStatus): string => {
    switch (status) {
      case "PENDING":
        return "Nouveau";
      case "REJECTED":
        return "Refusé";
      case "HIRED":
        return "Recruté";
      default:
        return "En cours";
    }
  };

  const loadCandidates = async () => {
    try {
      setLoadingCandidates(true);

      const jobs = await jobService.getRecruiterJobs();

      const groups = await Promise.all(
        jobs.map(async (job) => {
          let applications: Awaited<
            ReturnType<typeof applicationService.getJobApplications>
          > = [];

          try {
            applications = await applicationService.getJobApplications(
              job.id
            );
          } catch (error) {
            console.error(
              `Failed to load applications for job ${job.id}:`,
              error
            );
          }

          return {
            jobId: job.id,
            jobTitle: job.title,
            publishedAt: job.publishedAt
              ? new Date(job.publishedAt).toLocaleDateString("fr-FR")
              : undefined,
            candidates: applications.map((application) => {
              const user = application.candidate.user;

              return {
                id: application.id,
                candidateId: application.candidate.id,
                name: `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim(),
                role: application.candidate.currentJobTitle ?? "",
                avatar: user.avatarUrl ?? undefined,
                status: mapApplicationStatus(application.status),
                match: Math.round(application.aiScore ?? 0),
                exp: application.candidate.yearsExperience
                  ? `${application.candidate.yearsExperience} ans`
                  : undefined,
                location:
                  application.candidate.city ??
                  application.candidate.wilaya ??
                  undefined,
                email: user.email,
                phone: user.phone ?? undefined,
                quizScore: application.quiz?.attempt?.aiScore
                  ? Math.round(application.quiz.attempt.aiScore)
                  : undefined,
                hasPresentation: !!application.oralPresentation?.video,
                skills: application.candidate.skills ?? [],
                aiSummary: application.aianalysis?.strengths?.[0],
                strengths: application.aianalysis?.strengths ?? [],
                weaknesses: application.aianalysis?.weaknesses ?? [],
              };
            }),
          };
        })
      );

      setCandidatesByJob(groups);
    } catch (error) {
      console.error("Failed to load candidates:", error);
      setCandidatesByJob([]);
    } finally {
      setLoadingCandidates(false);
    }
  };
  const loadQuizResults = () => {};
  const loadPresentations = () => {};
  const loadPreselectedCandidates = () => {};

  const categorizeMatch = (score: number) => {
    if (score >= 80) return "Excellent match";
    if (score >= 60) return "Bon match";
    return "Match partiel";
  };

  const loadAICandidates = async () => {
    try {
      setLoadingAI(true);

      const { items } = await aiAnalysisService.getRecruiterAnalyses();

      const mapped: AICandidate[] = items.map((analysis) => {
        const { application } = analysis;
        const { candidate } = application;
        const user = candidate.user;
        const match = Math.round(analysis.overallScore ?? 0);

        return {
          id: application.id,
          name: `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim(),
          role: application.job?.title ?? candidate.currentJobTitle ?? "",
          exp: candidate.yearsExperience
            ? `${candidate.yearsExperience} years`
            : "",
          location: candidate.city ?? candidate.wilaya ?? "",
          match,
          category: categorizeMatch(match),
          summary: analysis.strengths?.[0] ?? "",
          email: user.email,
          phone: user.phone ?? "",
          scores: {
            exp: Math.round(analysis.experienceScore ?? 0),
            skills: Math.round(analysis.skillsScore ?? 0),
            edu: Math.round(analysis.educationScore ?? 0),
          },
          strengths: analysis.strengths ?? [],
          weaknesses: analysis.weaknesses ?? [],
        };
      });

      setAiCandidates(mapped);
    } catch (error) {
      console.error("Failed to load AI candidates:", error);
      setAiCandidates([]);
    } finally {
      setLoadingAI(false);
    }
  };

  const updateCandidateStatus = async (
    candidate: any,
    status: ApplicationStatus,
    successMessage: string
  ) => {
    if (!candidate?.id) return;

    try {
      await applicationService.updateStatus(candidate.id, status);
      await loadCandidates();
      alert(successMessage);
    } catch (error: any) {
      console.error(`Failed to update status to ${status}:`, error);
      const message = error?.response?.data?.message || error.message;
      alert(lt(`Error: ${message}`, `Erreur: ${message}`, `خطأ: ${message}`));
    }
  };

  const handleOpenCV = () => {};
  const handleInterview = (candidate: any) =>
    updateCandidateStatus(
      candidate,
      "INTERVIEW",
      lt(
        "Candidate moved to interview stage.",
        "Candidat déplacé vers l'étape entretien.",
        "تم نقل المرشح إلى مرحلة المقابلة."
      )
    );
  const handleHire = (candidate: any) =>
    updateCandidateStatus(
      candidate,
      "HIRED",
      lt("Candidate hired!", "Candidat recruté !", "تم توظيف المرشح!")
    );
  const handleReject = (candidate: any) =>
    updateCandidateStatus(
      candidate,
      "REJECTED",
      lt(
        "Candidate rejected.",
        "Candidat refusé.",
        "تم رفض المرشح."
      )
    );
  const handleOpenCandidate = () => {};
  const handleViewPresentation = () => {};
  const handleEmail = (candidate: any) => {
    if (!candidate?.email) return;
    window.open(`mailto:${candidate.email}`, "_blank");
  };
  const handleShortlist = (candidate: any) =>
    updateCandidateStatus(
      candidate,
      "SHORTLISTED",
      lt(
        "Candidate shortlisted.",
        "Candidat présélectionné.",
        "تمت إضافة المرشح إلى القائمة المختصرة."
      )
    );

  const [oralRecordingUrl, setOralRecordingUrl] =
    useState<string | null>(null);
  const [cvSearchQuery, setCvSearchQuery] = useState('');
  const [cvExperienceFilter, setCvExperienceFilter] = useState('All');  
  const PremiumBadge = () => (
    <div className="flex items-center gap-1.5 px-2 py-0.5 bg-gradient-to-r from-amber-400 to-orange-500 text-white rounded-md text-[8px] font-black uppercase tracking-wider shadow-sm">
      <Gem size={10} />
      <span>Premium 2026</span>
    </div>
  );

  useEffect(() => {
    if (!isDemo && user?.role === 'employer') {
      loadCandidates();
      loadAICandidates();
    }
    loadQuizResults();
    loadPresentations();
    loadPreselectedCandidates();

    if (user && !isDemo) {
      candidateProfileService
        .getMyCV()
        .then((resume) => {
          if (resume?.url) {
            setCvAsset(resume);
            setProfileData(prev => ({ ...prev, resumeUrl: resume.url }));
          }
        })
        .catch(() => null);

      // Load the candidate's real saved profile so the Profile page
      // shows actual data instead of placeholders, and so Save
      // Changes doesn't overwrite fields the user never touched.
      candidateProfileService
        .getMyProfile()
        .then((fullUser) => {
          const cp = fullUser?.candidateProfile;
          setProfileData(prev => ({
            ...prev,
            name: [fullUser?.firstName, fullUser?.lastName].filter(Boolean).join(' ') || prev.name,
            email: fullUser?.email || prev.email,
            phone: cp?.phone ?? prev.phone,
            wilaya: cp?.wilaya ?? prev.wilaya,
            bio: cp?.bio ?? prev.bio,
            jobTitle: cp?.currentJobTitle ?? prev.jobTitle,
            location: cp?.city || cp?.wilaya || prev.location,
            resumeUrl: cp?.resume?.url ?? prev.resumeUrl,
          }));
          if (fullUser?.avatar?.url) {
            setAvatarUrl(fullUser.avatar.url);
          }
        })
        .catch(() => null);
    }

    if (!user || isDemo) return;

    // Fetch notifications from our own API, then poll periodically to
    // pick up new ones (replaces the old Supabase realtime subscription).
    let cancelled = false;
    const fetchNotifications = async () => {
      try {
        const data = await getNotifications();
        if (!cancelled) setNotifications(data);
      } catch (err) {
        console.error("Error fetching notifications:", err);
      }
    };

    fetchNotifications();
    const intervalId = setInterval(fetchNotifications, 30000);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [user, isDemo]);

  /** Accepted CV formats — must match the Cloudinary folder's allowed_formats. */
  const CV_EXTENSIONS = ['pdf', 'doc', 'docx'];
  const CV_MAX_BYTES = 10 * 1024 * 1024;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Reset the input immediately so re-picking the same file still fires
    // onChange — otherwise a failed upload cannot be retried with that file.
    e.target.value = '';
    if (!file || !user) return;

    if (isDemo) {
      showToast(
        lt(
          'Sign in to upload your CV.',
          'Connectez-vous pour téléverser votre CV.',
          'سجّل الدخول لرفع سيرتك الذاتية.'
        ),
        'error'
      );
      return;
    }

    // Validate before uploading: the server rejects these too, but a local
    // check gives an instant, specific reason instead of a failed round trip.
    const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
    if (!CV_EXTENSIONS.includes(extension)) {
      showToast(
        lt(
          `Unsupported format (.${extension}). Use PDF, DOC or DOCX.`,
          `Format non pris en charge (.${extension}). Utilisez PDF, DOC ou DOCX.`,
          `صيغة غير مدعومة (.${extension}). استخدم PDF أو DOC أو DOCX.`
        ),
        'error'
      );
      return;
    }
    if (file.size > CV_MAX_BYTES) {
      showToast(
        lt('Your CV must be under 10 MB.', 'Votre CV doit faire moins de 10 Mo.', 'يجب أن يقل حجم سيرتك عن 10 ميغابايت.'),
        'error'
      );
      return;
    }

    setIsUploading(true);
    try {
      const resume = await candidateProfileService.uploadCV(file);

      // Keep the whole asset so the profile can show what was uploaded, and
      // carry the original filename, which the backend does not store.
      setCvAsset(resume ? { ...resume, fileName: file.name } as any : null);
      setProfileData(prev => ({ ...prev, resumeUrl: resume?.url || '' }));
      showToast(lt('CV uploaded successfully!', 'CV téléversé avec succès !', 'تم رفع السيرة الذاتية بنجاح!'));
    } catch (error: any) {
      console.error('Error uploading file:', error);
      const message = error?.response?.data?.message || error.message;
      showToast(lt(`Error: ${message}`, `Erreur : ${message}`, `خطأ: ${message}`), 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const [activeTab, setActiveTab] = useState(user?.role === 'employer' ? 'employer-dashboard' : 'jobs');

  // Lightweight in-app toast, used instead of window.alert() for outcomes the
  // user should see without a blocking popup (e.g. publishing a job offer).
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const showToast = (message: string, type: 'success' | 'error' = 'success') =>
    setToast({ message, type });

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  const [sourcingJobFilter, setSourcingJobFilter] = useState('Tous les postes');
  const [settingsTab, setSettingsTab] = useState('general');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [helpAction, setHelpAction] = useState<string | null>(null);
  const [contactEmail, setContactEmail] = useState('');
  const [contactSubject, setContactSubject] = useState('');
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [profileVisible, setProfileVisible] = useState(true);
  const [hideCurrentEmployer, setHideCurrentEmployer] = useState(false);
  const [notificationChannels, setNotificationChannels] = useState({
    email: true,
    push: true,
    sms: false
  });
  const [notificationTypes, setNotificationTypes] = useState({
    jobAlerts: true,
    applications: true,
    newsletter: false
  });
  const [preferredRoles, setPreferredRoles] = useState(['UX Designer', 'Product Manager', 'Frontend Developer']);
  const [preferredLocations, setPreferredLocations] = useState(['Alger', 'Oran', 'Télétravail']);
  const [salaryRange, setSalaryRange] = useState(120000);
  // One flag drives two different things: the desktop sidebar's width, and the
  // mobile drawer. Defaulting to `true` therefore opened the drawer over the
  // page the moment a phone reached the dashboard. Start open only at the `lg`
  // breakpoint, where "open" means the expanded desktop rail rather than an
  // overlay.
  const [isSidebarOpen, setIsSidebarOpen] = useState(
    () => typeof window === 'undefined' || window.innerWidth >= 1024
  );
  const [isInvitingMember, setIsInvitingMember] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [isSendingInvite, setIsSendingInvite] = useState(false);
  const [showInviteSimulation, setShowInviteSimulation] = useState<any>(null);
  const [teamMembers, setTeamMembers] = useState([
    { name: "Walid Hadef", email: "walid@company.dz", role: "Admin", status: lt('Active', 'Actif', 'نشط') },
    { name: "Amine Ben", email: "amine@company.dz", role: lt('Recruiter', 'Recruteur', 'مسؤول توظيف'), status: lt('Active', 'Actif', 'نشط') },
    { name: "Sara Dz", email: "sara@company.dz", role: lt('Recruiter', 'Recruteur', 'مسؤول توظيف'), status: lt('Pending', 'En attente', 'قيد الانتظار') }
  ]);
  const [aiFilterStep, setAiFilterStep] = useState<'select' | 'results'>('select');
  const [selectedJobForAI, setSelectedJobForAI] = useState('Développeur Full Stack — 23 candidatures');
  const [showApplyConfirmation, setShowApplyConfirmation] = useState(false);
  const [aiPriorities, setAiPriorities] = useState<string[]>(['Expérience', 'Compétences techniques']);
  const availablePriorities = [
    'Expérience',
    'Compétences techniques',
    'Formation',
    'Soft Skills',
    'Localisation',
    'Disponibilité',
    'Langues'
  ];
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [expandedCandidateId, setExpandedCandidateId] = useState<number | null>(null);
  const [showContactOptions, setShowContactOptions] = useState(false);
  const [billingView, setBillingView] = useState<'current' | 'plans' | 'payment'>('current');
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState<'CCP' | 'Baridimob' | 'EDAHABIA' | null>(null);
  const [cardInfo, setCardInfo] = useState({
    number: '',
    expiry: '',
    cvc: '',
    name: ''
  });
  const [showBillingSuccess, setShowBillingSuccess] = useState(false);
  const [billingSuccessMessage, setBillingSuccessMessage] = useState('');

  // Firebase Invitation & Notification Logic
  useEffect(() => {
    if (!user || isDemo) return;

    // Skip real Firestore logic if user is not authenticated in Firebase
    if (!auth.currentUser) return;

    // Listen for notifications (especially for invitation acceptance)
    const q = query(
      collection(db, 'notifications'), 
      where('userId', '==', user.uid),
      where('read', '==', false)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const notification = change.doc.data();
          // If it's an invitation acceptance, we can handle it
          if (notification.type === 'invitation_accepted') {
            // Optional: Show a specific UI alert
          }
        }
      });
    }, (error) => {
      // Gracefully handle permission errors
      if (error.code === 'permission-denied') {
        console.warn("Firestore permissions denied - expected in demo mode without auth");
      } else {
        handleFirestoreError(error, OperationType.LIST, 'notifications');
      }
    });

    return () => unsubscribe();
  }, [user, isDemo]);

  // Saved jobs are currently client-side only (see toggleSaveJob) since
  // there is no backend endpoint for them yet.

  const handleSendInvite = async () => {
    if (!inviteEmail || !user) return;
    setIsSendingInvite(true);
    try {
      const invitationData = {
        email: inviteEmail,
        inviterId: user.uid,
        inviterName: user.displayName || 'Recruteur',
        status: 'pending',
        createdAt: serverTimestamp()
      };
      const docRef = await addDoc(collection(db, 'invitations'), invitationData);
      
      // Simulate sending email
      setTimeout(() => {
        setShowInviteSimulation({
          id: docRef.id,
          ...invitationData
        });
        setIsSendingInvite(false);
        setIsInvitingMember(false);
        setInviteEmail('');
      }, 1500);

    } catch (error) {
      console.error("Error sending invite:", error);
      setIsSendingInvite(false);
    }
  };

  const handleAcceptInvite = async (invitation: any) => {
    try {
      // 1. Update invitation status to 'accepted'
      await updateDoc(doc(db, 'invitations', invitation.id), {
        status: 'accepted',
        acceptedAt: serverTimestamp()
      });

      // 2. Notify the inviter
      await addDoc(collection(db, 'notifications'), {
        userId: invitation.inviterId,
        title: lt('Invitation accepted', 'Invitation acceptée', 'تم قبول الدعوة'),
        message: lt(
          `${invitation.email} accepted your invitation to join the team.`,
          `${invitation.email} a accepté votre invitation à rejoindre l'équipe.`,
          `${invitation.email} قبل دعوتك للانضمام إلى الفريق.`
        ),
        type: 'invitation_accepted',
        invitationId: invitation.id,
        inviteeEmail: invitation.email,
        read: false,
        createdAt: serverTimestamp()
      });

      setShowInviteSimulation(null);
      alert(lt('Invitation accepted successfully!', 'Invitation acceptée avec succès !', 'تم قبول الدعوة بنجاح!'));
    } catch (error) {
      console.error("Error accepting invite:", error);
    }
  };

  const handleGrantAccess = async (notification: any) => {
    try {
      // 1. Update invitation status to 'approved'
      await updateDoc(doc(db, 'invitations', notification.invitationId), {
        status: 'approved',
        approvedAt: serverTimestamp()
      });

      // 2. Mark notification as read
      await updateDoc(doc(db, 'notifications', notification.id), {
        read: true
      });

      // 3. Add to local team members list (simulated)
      setTeamMembers(prev => [...prev, {
        name: notification.inviteeEmail.split('@')[0],
        email: notification.inviteeEmail,
        role: lt('Recruiter', 'Recruteur', 'مسؤول توظيف'),
        status: lt('Active', 'Actif', 'نشط')
      }]);

      alert(lt('Access granted successfully!', 'Accès accordé avec succès !', 'تم منح الوصول بنجاح!'));
    } catch (error) {
      console.error("Error granting access:", error);
    }
  };


  // -----------------------------------------------------------------------
  // ⚠️ FILE TRUNCATED HERE IN YOUR ORIGINAL PASTE
  // Everything below this point (the `return (...)` JSX, remaining handlers
  // like setSavedJobs/setProfileData state, and the closing `}` of the
  // component) was not included in what you gave me. Paste the rest of
  // your actual file below this comment before using this as a full file.
  // -----------------------------------------------------------------------


  const renderSidebar = () => {
    if (user?.role === 'employer') {
    return (
      <div className="flex flex-col h-full">
        <div className="p-8">
          <Logo size="md" onClick={onGoHome} />
          <div className="inline-flex items-center px-3 py-1 bg-blue-50 text-[#173E7D] rounded-lg text-[10px] font-black tracking-wider uppercase mt-2">
            Recruteur
          </div>
        </div>

        <div className="flex-1 px-4 space-y-2 overflow-y-auto no-scrollbar">

          {/* ====================== */}
          {/* PRINCIPAL */}
          {/* ====================== */}

          <SectionLabel>Principal</SectionLabel>

          <SidebarItem
            icon={LayoutDashboard}
            label="Tableau de bord"
            active={activeTab === 'employer-dashboard'}
            onClick={() => setActiveTab('employer-dashboard')}
          />

          <SidebarItem
            icon={PlusCircle}
            label="Publier une offre"
            active={activeTab === 'post-job'}
            onClick={() => setActiveTab('post-job')}
          />

          <SidebarItem
            icon={Briefcase}
            label="Mes offres"
            active={activeTab === 'manage-jobs'}
            onClick={() => setActiveTab('manage-jobs')}
          />

          <SidebarItem
            icon={UsersIcon}
            label="Candidatures"
            active={activeTab === 'candidates'}
            onClick={() => setActiveTab('candidates')}
          />

          {/* ====================== */}
          {/* PREMIUM + CORPORATE */}
          {/* ====================== */}

          {(recruiterTier === 'paid' ||
            recruiterTier === 'corporate') && (
            <>
              <SectionLabel>IA & Innovation</SectionLabel>

              <SidebarItem
                icon={Zap}
                label="Filtrage IA"
                active={activeTab === 'ai-filter'}
                onClick={() => setActiveTab('ai-filter')}
              />

              <SidebarItem
                icon={BookOpen}
                label="Répertoire CV"
                active={activeTab === 'repertoire-cv'}
                onClick={() => setActiveTab('repertoire-cv')}
              />
            </>
          )}

          {/* ====================== */}
          {/* CORPORATE ONLY */}
          {/* ====================== */}

          {recruiterTier === 'corporate' && (
            <>
              <SectionLabel>Corporate</SectionLabel>

              <SidebarItem
                icon={Volume2}
                label="Présentations orales"
                active={activeTab === 'oral-results'}
                onClick={() => setActiveTab('oral-results')}
              />

              <SidebarItem
                icon={Award}
                label="Résultats Quiz"
                active={activeTab === 'quiz-results'}
                onClick={() => setActiveTab('quiz-results')}
              />

              <SidebarItem
                icon={Star}
                label="Préselection"
                active={activeTab === 'preselected'}
                onClick={() => setActiveTab('preselected')}
              />

              <SidebarItem
                icon={Building2}
                label="Mon entreprise"
                active={activeTab === 'profile'}
                onClick={() => setActiveTab('profile')}
              />
            </>
          )}

          {/* ====================== */}
          {/* COMPTE */}
          {/* ====================== */}

          <SectionLabel>Compte</SectionLabel>

          <SidebarItem
            icon={Gem}
            label={t('subscription')}
            active={activeTab === 'subscription'}
            onClick={() => setActiveTab('subscription')}
          />

          <div className="relative">
            <SidebarItem
              icon={Bell}
              label="Notifications"
              active={activeTab === 'notifications'}
              onClick={() => setActiveTab('notifications')}
            />

            {notifications.filter(n => !n.is_read).length > 0 && (
              <span className="absolute top-3 right-4 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            )}
          </div>

          <SidebarItem
            icon={Settings}
            label="Paramètres"
            active={activeTab === 'settings'}
            onClick={() => setActiveTab('settings')}
          />
        </div>

        <div className="p-6 border-t border-gray-100">
          <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl">
            <img
              src={displayPhotoURL || 'https://i.pravatar.cc/150?u=oualid'}
              alt={user.displayName}
              className="w-10 h-10 rounded-xl object-cover"
              referrerPolicy="no-referrer"
            />

            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-[#173E7D] truncate">
                {user.displayName}
              </p>

              <p className="text-[10px] text-gray-400 truncate">
                {user.email}
              </p>
            </div>

            <button
              onClick={handleLogout}
              className="text-gray-400 hover:text-red-500 transition-colors"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </div>
    );
  }

    return (
      <div className="flex flex-col h-full">
        <div className="p-8">
          <Logo size="md" onClick={onGoHome} />
        </div>

        <div className="flex-1 px-4 space-y-2 overflow-y-auto no-scrollbar">
          <SectionLabel>{t('main') || 'Principal'}</SectionLabel>
          <SidebarItem icon={LayoutDashboard} label={t('dashboard')} active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
          <SidebarItem icon={Briefcase} label={t('jobs')} active={activeTab === 'jobs'} onClick={() => setActiveTab('jobs')} />
          <SidebarItem icon={ClipboardList} label={t('myApplications')} active={activeTab === 'applications'} onClick={() => setActiveTab('applications')} />
          <SidebarItem icon={Bookmark} label={t('saved')} active={activeTab === 'saved'} onClick={() => setActiveTab('saved')} />
          
          <SectionLabel>{t('tools')}</SectionLabel>
          <SidebarItem icon={FileText} label={t('cvMaker')} active={activeTab === 'cv-maker'} onClick={() => setActiveTab('cv-maker')} />
          <SidebarItem icon={User} label={t('myProfile')} active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} />
          
          <SectionLabel>{t('account')}</SectionLabel>
          <div className="relative">
            <SidebarItem icon={Bell} label={t('notifications')} active={activeTab === 'notifications'} onClick={() => setActiveTab('notifications')} />
            {notifications.filter(n => !n.is_read).length > 0 && (
              <span className="absolute top-3 right-4 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            )}
          </div>
          <SidebarItem icon={Settings} label={t('settings')} active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
        </div>

        <div className="p-8 border-t border-gray-100">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-500 hover:bg-red-50 transition-all font-bold text-sm"
          >
            <LogOut size={20} />
            {t('logout')}
          </button>
        </div>
      </div>
    );
  };

  const JobCard: React.FC<JobCardProps> = ({ job, isSaved, onToggleSave }) => (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      whileHover={{ y: -15, scale: 1.02 }}
      onClick={() => setSelectedJob(job)}
      className="bg-white p-10 rounded-[3.5rem] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.05)] border-2 border-[#173E7D] transition-all duration-500 group cursor-pointer relative overflow-hidden flex flex-col h-full"
    >
      {/* Decorative background element */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gray-50 rounded-bl-[4rem] -z-0 group-hover:bg-[#173E7D]/5 transition-colors" />

      {/* Header: Logo & Badges */}
      <div className="relative z-10 flex justify-between items-start mb-10">
        <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-gray-50 overflow-hidden group-hover:scale-110 transition-transform duration-500">
          <img 
            src={job.logo} 
            alt={job.company} 
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
            onError={(e) => {
              (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${job.company}&background=173E7D&color=fff`;
            }}
          />
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className="px-5 py-2 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-100/50">
            {job.type}
          </span>
          <span className="px-5 py-2 bg-blue-50 text-[#173E7D] rounded-full text-[10px] font-black uppercase tracking-widest border border-blue-100/50">
            {job.remote}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 flex-1 flex flex-col">
        <h4 className="text-2xl font-black text-[#173E7D] group-hover:text-[#F68D58] transition-colors leading-tight mb-3">
          {job.title}
        </h4>
        <div className="flex items-center gap-2 text-gray-400 font-bold uppercase tracking-wider text-[10px] mb-6">
          <Building2 size={14} className="text-[#F68D58]" />
          {job.company}
        </div>

        <p className="text-gray-500 text-sm leading-relaxed line-clamp-2 font-medium mb-6">
          {job.description}
        </p>

        {/* Requirements Tags */}
        <div className="flex flex-wrap gap-2 pt-2 mb-8">
          {job.requirements.slice(0, 3).map((req, idx) => (
            <span key={idx} className="px-3 py-1 bg-gray-50 text-gray-400 text-[10px] font-bold rounded-lg border border-gray-100">
              {req}
            </span>
          ))}
          {job.requirements.length > 3 && (
            <span className="px-3 py-1 bg-gray-50 text-gray-400 text-[10px] font-bold rounded-lg border border-gray-100">
              +{job.requirements.length - 3}
            </span>
          )}
        </div>

        {/* Meta Info */}
        <div className="flex items-center gap-6 text-[10px] text-gray-400 mb-10 font-bold uppercase tracking-widest mt-auto">
          <div className="flex items-center gap-2">
            <MapPin size={16} className="text-[#F68D58]" />
            {job.location}
          </div>
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-[#F68D58]" />
            {lt('2 days ago', 'Il y a 2j', 'منذ يومين')}
          </div>
        </div>

        {/* Footer: Actions (estimated salary intentionally not shown) */}
        <div className="relative z-10 flex items-center justify-end pt-8 mt-8 border-t border-gray-50">
          <div className="flex items-center gap-3">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onToggleSave(job.id);
              }}
              className={`p-4 rounded-2xl transition-all ${
                isSaved 
                  ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' 
                  : 'bg-gray-50 text-gray-300 hover:text-[#F68D58] hover:bg-orange-50'
              }`}
            >
              <Bookmark size={20} fill={isSaved ? "currentColor" : "none"} />
            </button>
            <button 
              className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center text-[#173E7D] group-hover:bg-[#F68D58] group-hover:text-white transition-all duration-500 shadow-sm"
            >
              <ChevronRight size={28} className={isRTL ? 'rotate-180' : ''} />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );

  // Profile State
  const [profileData, setProfileData] = useState({
    name: user?.displayName || 'Ahmed Benali',
    email: user?.email || 'ahmed.benali@email.com',
    phone: '+213 555 123 456',
    wilaya: 'Alger',
    bio: '',
    jobTitle: 'Développeur Full Stack',
    location: 'Alger',
    resumeUrl: user?.resumeUrl || user?.resume_url || ''
  });

  // Locally overrides user.photoURL everywhere it's rendered once the
  // candidate uploads a new profile picture, without needing App.tsx to
  // expose a setUser callback down to this component.
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const displayPhotoURL = avatarUrl || user?.photoURL;

  const handleChangePhotoClick = () => {
    if (isDemo) {
      alert(lt(
        'Create an account to change your profile picture.',
        'Créez un compte pour changer votre photo de profil.',
        'أنشئ حسابًا لتغيير صورة ملفك الشخصي.'
      ));
      return;
    }
    avatarInputRef.current?.click();
  };

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert(lt('Please choose an image file.', 'Veuillez choisir un fichier image.', 'يرجى اختيار ملف صورة.'));
      if (avatarInputRef.current) avatarInputRef.current.value = '';
      return;
    }

    try {
      setUploadingAvatar(true);
      const url = await candidateProfileService.updateAvatar(file);
      if (url) setAvatarUrl(url);
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      const message = error?.response?.data?.message || error?.message;
      alert(lt(
        `Unable to update your profile picture.${message ? ` (${message})` : ''}`,
        `Impossible de mettre à jour la photo de profil.${message ? ` (${message})` : ''}`,
        `تعذر تحديث صورة الملف الشخصي.${message ? ` (${message})` : ''}`
      ));
    } finally {
      setUploadingAvatar(false);
      if (avatarInputRef.current) avatarInputRef.current.value = '';
    }
  };

  // CV Maker State
  const [cvModel, setCvModel] = useState('moderne');
  const [cvSection, setCvSection] = useState('info');
  const [isSavingCV, setIsSavingCV] = useState(false);
  const [isLoadingCV, setIsLoadingCV] = useState(false);
  const [cvLastSavedAt, setCvLastSavedAt] = useState<string | null>(null);
  const [cvData, setCvData] = useState({
    name: user?.displayName || 'Votre nom',
    // Shown under the name in the generated CV. Falls back to the most recent
    // job title when left empty.
    title: '',
    email: user?.email || '',
    phone: '',
    address: '',
    linkedin: '',
    portfolio: '',
    summary: '',
    experiences: [
      { 
        company: lt('Example Tech', 'Exemple Tech', 'شركة مثال تيك'), 
        role: lt('Developer', 'Développeur', 'مطور'), 
        period: lt('2022 - Present', '2022 - Présent', '2022 - الحالي'), 
        desc: lt('Developing innovative web solutions.', 'Développement de solutions web innovantes.', 'تطوير حلول ويب مبتكرة.'),
        missions: ''
      }
    ],
    education: [
      { 
        school: lt('University of Algiers', 'Université d\'Alger', 'جامعة الجزائر'), 
        degree: lt('Master in Computer Science', 'Master en Informatique', 'ماستر في المعلوماتية'), 
        year: '2021' 
      }
    ],
    skills: ['React', 'TypeScript', 'Tailwind CSS', 'Node.js'],
    languages: [
      { name: language === 'ar' ? 'العربية' : 'Arabe', level: language === 'ar' ? 'أصلي' : 'Natif' },
      { name: 'Français', level: language === 'ar' ? 'بطلاقة' : 'Courant' },
      { name: 'Anglais', level: language === 'ar' ? 'متوسط' : 'Intermédiaire' }
    ]
  });

  // Reopen the CV Maker with whatever the candidate saved last time. Runs once
  // per signed-in candidate; demo accounts keep the sample CV. Fields absent
  // from an older save fall back to the current defaults, so adding a field to
  // the CV Maker later cannot break existing saves.
  useEffect(() => {
    if (!user || isDemo || user.role === 'employer') return;

    let cancelled = false;
    setIsLoadingCV(true);

    candidateProfileService
      .getCvBuilder()
      .then((saved) => {
        if (cancelled || !saved) return;
        setCvData((prev) => ({ ...prev, ...saved }));
        setCvLastSavedAt(null);
      })
      .catch((error) => {
        // Never block the CV Maker on a failed load — the candidate can still
        // build a CV from scratch and save it.
        console.error('Could not load saved CV:', error);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingCV(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user?.uid, isDemo]);

  const [candidatesByJob, setCandidatesByJob] = useState<any[]>([]);

  const [selectedCandidateCV, setSelectedCandidateCV] = useState<any>(null);

  // --- Real CV behind the recruiter's candidate viewer --------------------
  // The viewer used to render a hardcoded summary, experience list, skill set
  // and language list, so every candidate looked identical. It now loads the
  // candidate's actual CV document and renders it through the same CVDocument
  // component the candidate sees.
  const emptyCvDocument: CVDocumentData = {
    name: '',
    experiences: [],
    education: [],
    skills: [],
    languages: [],
  };
  const [candidateCvDoc, setCandidateCvDoc] = useState<CVDocumentData | null>(null);
  const [candidateCvPhoto, setCandidateCvPhoto] = useState<string | null>(null);
  const [candidateCvHasBuilt, setCandidateCvHasBuilt] = useState(true);
  const [candidateCvLoading, setCandidateCvLoading] = useState(false);
  const [candidateCvError, setCandidateCvError] = useState<string | null>(null);

  useEffect(() => {
    // The candidate's CandidateProfile id — what the CV endpoint is keyed on.
    const candidateId =
      selectedCandidateCV?.candidateId ??
      selectedCandidateCV?.candidateProfileId ??
      selectedCandidateCV?.id;

    if (!selectedCandidateCV) {
      setCandidateCvDoc(null);
      setCandidateCvError(null);
      return;
    }

    if (isDemo || !candidateId) {
      // Demo sessions have no backend candidate to read; show whatever the
      // demo row already carries rather than an error.
      setCandidateCvDoc({
        ...emptyCvDocument,
        name: selectedCandidateCV.name ?? '',
        title: selectedCandidateCV.role ?? '',
        email: selectedCandidateCV.email ?? '',
        phone: selectedCandidateCV.phone ?? '',
        address: selectedCandidateCV.location ?? '',
      });
      setCandidateCvPhoto(selectedCandidateCV.avatar ?? null);
      setCandidateCvHasBuilt(true);
      return;
    }

    let cancelled = false;
    setCandidateCvLoading(true);
    setCandidateCvError(null);

    candidateProfileService
      .getCandidateCvDocument(candidateId)
      .then((res) => {
        if (cancelled) return;
        setCandidateCvDoc(res.document as CVDocumentData);
        setCandidateCvPhoto(res.photoUrl);
        setCandidateCvHasBuilt(res.hasBuiltCv);
      })
      .catch((err) => {
        console.error('Could not load candidate CV:', err);
        if (!cancelled) {
          setCandidateCvError(
            err?.response?.data?.message ||
              lt('Could not load this CV.', 'Impossible de charger ce CV.', 'تعذر تحميل هذه السيرة.')
          );
        }
      })
      .finally(() => {
        if (!cancelled) setCandidateCvLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedCandidateCV, isDemo]);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  // Separate from `selectedJob` above on purpose: `selectedJob` drives the
  // candidate-facing job-details modal (expects full listing fields like
  // requirements/benefits/salary). The recruiter's own posted-job objects
  // (from postedJobs) don't have that shape, so "Gérer" must not reuse
  // `selectedJob` — doing so crashed the page (selectedJob.requirements
  // was undefined).
  const [selectedManagedJob, setSelectedManagedJob] = useState<any | null>(null);
  const [savedJobs, setSavedJobs] = useState<string[]>([]);
  const [postedJobs, setPostedJobs] = useState<import('../services/job.service').RecruiterJobCard[]>([]);

  const loadPostedJobs = async () => {
    try {
      const jobs = await jobService.getRecruiterJobs();
      setPostedJobs(jobs);
    } catch (error) {
      console.error('Failed to load recruiter jobs:', error);
      setPostedJobs([]);
    }
  };

  useEffect(() => {
    if (!isDemo && user?.role === 'employer') {
      loadPostedJobs();
    }
  }, [isDemo, user?.role]);

  // Display-label (French UI) -> backend enum maps. See prisma/schema.prisma.
  const JOB_TYPE_MAP: Record<string, string> = {
    'Temps plein': 'FULL_TIME',
    'CDI': 'FULL_TIME',
    'Temps partiel': 'PART_TIME',
    'Freelance': 'FREELANCE',
    'Stage': 'INTERNSHIP',
    'CDD': 'CONTRACT',
  };
  const EXPERIENCE_MAP: Record<string, string> = {
    'Débutant (0-2 ans)': 'JUNIOR',
    'Confirmé (3-5 ans)': 'MID',
    'Senior (5-10 ans)': 'SENIOR',
    'Expert (10+ ans)': 'LEAD',
  };

  // Backend enum -> French label, for pre-filling the edit form's selects.
  // Not simply the inverse of the maps above: both 'Temps plein' and 'CDI'
  // encode to FULL_TIME, so decoding has to pick one canonical label.
  const JOB_TYPE_LABEL: Record<string, string> = {
    FULL_TIME: 'CDI',
    PART_TIME: 'Temps partiel',
    FREELANCE: 'Freelance',
    INTERNSHIP: 'Stage',
    CONTRACT: 'CDD',
    TEMPORARY: 'CDD',
  };
  const EXPERIENCE_LABEL: Record<string, string> = {
    INTERN: 'Débutant (0-2 ans)',
    JUNIOR: 'Débutant (0-2 ans)',
    MID: 'Confirmé (3-5 ans)',
    SENIOR: 'Senior (5-10 ans)',
    LEAD: 'Expert (10+ ans)',
    MANAGER: 'Expert (10+ ans)',
  };

  // --- Editing an existing job offer -------------------------------------
  // The recruiter's job cards (postedJobs) only carry summary fields, so
  // opening the editor fetches the full record via GET /jobs/:id first.
  const [editingJobId, setEditingJobId] = useState<string | null>(null);
  const [isLoadingEditJob, setIsLoadingEditJob] = useState(false);
  const [isSavingJob, setIsSavingJob] = useState(false);
  const [editJobData, setEditJobData] = useState({
    title: '',
    description: '',
    wilaya: 'Alger',
    type: 'CDI',
    experience: 'Confirmé (3-5 ans)',
    salaryMin: '',
    salaryMax: '',
    status: 'PUBLISHED',
  });

  const openEditJob = async (jobId: string) => {
    setEditingJobId(jobId);
    setIsLoadingEditJob(true);
    try {
      const job = await jobService.getJob(jobId);
      setEditJobData({
        title: job.title || '',
        description: job.description || '',
        wilaya: job.wilaya || job.location || 'Alger',
        type: JOB_TYPE_LABEL[job.type] || 'CDI',
        experience: EXPERIENCE_LABEL[job.experienceLevel || ''] || 'Confirmé (3-5 ans)',
        salaryMin: job.salaryMin != null ? String(job.salaryMin) : '',
        salaryMax: job.salaryMax != null ? String(job.salaryMax) : '',
        status: job.status || 'PUBLISHED',
      });
    } catch (error: any) {
      console.error('Failed to load job for editing:', error);
      showToast(
        lt('Could not load this offer.', "Impossible de charger cette offre.", 'تعذر تحميل هذا العرض.'),
        'error'
      );
      setEditingJobId(null);
    } finally {
      setIsLoadingEditJob(false);
    }
  };

  const handleUpdateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingJobId) return;
    if (!editJobData.title.trim() || !editJobData.description.trim()) {
      showToast(
        lt(
          'Please fill in all required fields.',
          'Veuillez remplir tous les champs obligatoires.',
          'يرجى ملء جميع الحقول المطلوبة.'
        ),
        'error'
      );
      return;
    }

    setIsSavingJob(true);
    try {
      await jobService.updateJob(editingJobId, {
        title: editJobData.title,
        description: editJobData.description,
        location: editJobData.wilaya,
        wilaya: editJobData.wilaya,
        type: (JOB_TYPE_MAP[editJobData.type] || 'FULL_TIME') as any,
        experienceLevel: (EXPERIENCE_MAP[editJobData.experience] || 'MID') as any,
        salaryMin: editJobData.salaryMin ? Number(editJobData.salaryMin) : undefined,
        salaryMax: editJobData.salaryMax ? Number(editJobData.salaryMax) : undefined,
        status: editJobData.status,
      });
      await loadPostedJobs();
      setEditingJobId(null);
      showToast(
        lt('Offer updated successfully!', 'Offre mise à jour avec succès !', 'تم تحديث العرض بنجاح!')
      );
    } catch (error: any) {
      console.error('Failed to update job:', error);
      const message = error?.response?.data?.message || error.message;
      showToast(lt(`Error: ${message}`, `Erreur: ${message}`, `خطأ: ${message}`), 'error');
    } finally {
      setIsSavingJob(false);
    }
  };

  const [newJobData, setNewJobData] = useState({
    title: '',
    sector: 'Technologie',
    wilaya: 'Alger',
    type: 'CDI',
    experience: 'Confirmé (3-5 ans)',
    salaryMin: '',
    salaryMax: '',
    description: '',
    requirements: '',
    benefits: '',
    deadline: ''
  });

  const handlePostJob = async (e: React.FormEvent) => {
    e.preventDefault();

    // Demo sessions carry no JWT, so posting would fail at `protect` with an
    // opaque "Not authorized to access this route". Say so plainly instead.
    if (isDemo || !user) {
      showToast(
        lt(
          'Demo mode: sign in with a recruiter account to publish a real offer.',
          'Mode démo : connectez-vous avec un compte recruteur pour publier une vraie offre.',
          'وضع التجربة: سجّل الدخول بحساب موظِّف لنشر عرض حقيقي.'
        ),
        'error'
      );
      return;
    }

    if (!newJobData.title || !newJobData.description) {
      alert(language === 'ar' ? 'يرجى ملء جميع الحقول المطلوبة.' : 'Veuillez remplir tous les champs obligatoires.');
      return;
    }

    try {
      await jobService.createJob({
        title: newJobData.title,
        description: newJobData.description,
        location: newJobData.wilaya,
        wilaya: newJobData.wilaya,
        type: (JOB_TYPE_MAP[newJobData.type] || 'FULL_TIME') as any,
        experienceLevel: (EXPERIENCE_MAP[newJobData.experience] || 'MID') as any,
        salaryMin: newJobData.salaryMin ? Number(newJobData.salaryMin) : undefined,
        salaryMax: newJobData.salaryMax ? Number(newJobData.salaryMax) : undefined,
      });

      await loadPostedJobs();

      setNewJobData({
        title: '',
        sector: 'Technologie',
        type: 'CDI',
        salaryMin: '',
        salaryMax: '',
        description: '',
        requirements: '',
        benefits: '',
        deadline: '',
        wilaya: 'Alger',
        experience: 'Confirmé (3-5 ans)'
      } as any);

      showToast(
        lt(
          'Your job offer has been published successfully!',
          'Votre offre a été publiée avec succès !',
          'تم نشر عرضك بنجاح!'
        )
      );
      setActiveTab('manage-jobs');
    } catch (error: any) {
      console.error('Error posting job:', error);
      const message = error?.response?.data?.message || error.message;
      showToast(lt(`Error: ${message}`, `Erreur: ${message}`, `خطأ: ${message}`), 'error');
    }
  };
  const cvPreviewRef = useRef<HTMLDivElement>(null);
  const handleApplyToJob = async (jobId: string) => {
    if (!user) {
      alert(language === 'ar' ? 'يرجى تسجيل الدخول للتقديم.' : 'Veuillez vous connecter pour postuler.');
      return;
    }

    try {
      await applicationService.applyToJob(jobId);
      alert(language === 'ar' ? 'تم إرسال طلبك بنجاح!' : 'Votre candidature a été envoyée avec succès !');
    } catch (error: any) {
      console.error('Error applying to job:', error);
      const message = error?.response?.data?.message || error.message;
      alert(lt(`Error: ${message}`, `Erreur: ${message}`, `خطأ: ${message}`));
    }
  };

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWilaya, setSelectedWilaya] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedSalary, setSelectedSalary] = useState('');
  const [selectedSector, setSelectedSector] = useState('');

  // NOTE: there is no backend endpoint for saved jobs yet (the SavedJob
  // Prisma model exists but has no controller/route). This keeps saves
  // in-memory for the session rather than writing to the old, disconnected
  // Firestore 'saved_jobs' collection. Persisting across sessions/devices
  // needs a real backend endpoint.
  const toggleSaveJob = (id: string) => {
    setSavedJobs((prev) =>
      prev.includes(id) ? prev.filter((j) => j !== id) : [...prev, id]
    );
  };


  // Maps the backend JobType enum to the localized label used by the
  // job-type filter dropdown (best-effort -- the backend has 6 enum
  // values, the filter UI has 5 French/Arabic labels).
  const mapJobType = (type: string): string => {
    const map: Record<string, [string, string]> = {
      FULL_TIME: ['CDI', 'دوام كامل'],
      CONTRACT: ['CDD', 'عقد محدد المدة'],
      TEMPORARY: ['CDD', 'عقد محدد المدة'],
      PART_TIME: ['CDI', 'دوام كامل'],
      INTERNSHIP: ['Stage', 'تدريب'],
      FREELANCE: ['Freelance', 'عمل حر'],
    };
    const [fr, ar] = map[type] || [type, type];
    return language === 'ar' ? ar : fr;
  };

  const mapBackendJobToFrontend = (job: any): Job => ({
    id: job.id,
    title: job.title,
    company: job.company?.name || '',
    location: job.location,
    type: mapJobType(job.type),
    remote: job.remote
      ? (language === 'ar' ? 'عن بعد' : 'Télétravail')
      : (language === 'ar' ? 'في الموقع' : 'Sur site'),
    salary: job.salaryMin
      ? `${Math.round(job.salaryMin / 1000)}k${job.salaryMax ? ` - ${Math.round(job.salaryMax / 1000)}k` : ''} ${job.currency || 'DZD'}`
      : (language === 'ar' ? 'غير محدد' : 'Non précisé'),
    salaryMin: job.salaryMin || 0,
    description: job.description,
    requirements: [],
    benefits: [],
    logo: job.company?.logo?.url || 'https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&q=80&w=200',
    sector: job.category?.name || '',
  });

  const [realJobs, setRealJobs] = useState<Job[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadJobs = async () => {
      try {
        setLoadingJobs(true);
        const jobs = await jobService.getAllJobs();
        if (!cancelled) {
          setRealJobs(jobs.map(mapBackendJobToFrontend));
        }
      } catch (error) {
        console.error('Failed to load jobs:', error);
        if (!cancelled) setRealJobs([]);
      } finally {
        if (!cancelled) setLoadingJobs(false);
      }
    };

    loadJobs();
    return () => { cancelled = true; };
  }, [language]);

  const handleLogout = async () => {
    try {
      if (onLogout) {
        onLogout();
      } else {
        localStorage.removeItem('token');
        onGoHome();
      }
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    if (isDemo) {
      alert(lt('Profile updated successfully (Demo)!', 'Profil mis à jour avec succès (Démo) !', 'تم تحديث الملف الشخصي بنجاح (تجربة)!'));
      return;
    }

    try {
      const [firstName, ...rest] = (profileData.name || '').trim().split(' ');
      const lastName = rest.join(' ');

      await candidateProfileService.updateProfile({
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        phone: profileData.phone,
        wilaya: profileData.wilaya,
        city: profileData.location,
        bio: profileData.bio,
        currentJobTitle: profileData.jobTitle,
      });

      alert(language === 'ar' ? 'تم تحديث الملف الشخصي بنجاح!' : 'Profil mis à jour avec succès !');
    } catch (error: any) {
      console.error("Error saving profile:", error);
      const message = error?.response?.data?.message;
      alert(
        language === 'ar'
          ? `خطأ أثناء تحديث الملف الشخصي.${message ? ` (${message})` : ''}`
          : `Erreur lors de la mise à jour du profil.${message ? ` (${message})` : ''}`
      );
    }
  };

  // Saves the CV Maker document to our own backend (CandidateProfile.
  // cvBuilderData). Previously this wrote to a Supabase `cvs` table belonging
  // to a different, legacy project, so nothing the candidate typed actually
  // came back when they returned.
  const handleSaveCV = async () => {
    if (!user || isDemo) {
      showToast(
        lt(
          'Sign in to save your CV.',
          'Connectez-vous pour sauvegarder votre CV.',
          'سجّل الدخول لحفظ سيرتك الذاتية.'
        ),
        'error'
      );
      return;
    }

    setIsSavingCV(true);
    try {
      const updatedAt = await candidateProfileService.saveCvBuilder(cvData);
      setCvLastSavedAt(updatedAt);
      showToast(
        lt('CV saved successfully!', 'CV sauvegardé avec succès !', 'تم حفظ السيرة الذاتية بنجاح!')
      );
    } catch (error: any) {
      console.error('Error saving CV:', error);
      const message = error?.response?.data?.message || error.message;
      showToast(
        lt(
          `Could not save your CV: ${message}`,
          `Impossible de sauvegarder le CV : ${message}`,
          `تعذر حفظ السيرة الذاتية: ${message}`
        ),
        'error'
      );
    } finally {
      setIsSavingCV(false);
    }
  };
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isGeneratingEmployerPDF, setIsGeneratingEmployerPDF] = useState(false);

function handlePrintCVElement(id: string): Promise<void> {
    return new Promise((resolve) => {
      const printContent = document.getElementById(id);
      if (!printContent) {
        alert(language === 'ar' ? 'حدث خطأ: لم يتم العثور على نموذج السيرة الذاتية.' : 'Erreur: Conteneur de CV non trouvé.');
        resolve();
        return;
      }
      
      const iframe = document.createElement('iframe');
      iframe.style.position = 'absolute';
      iframe.style.width = '0px';
      iframe.style.height = '0px';
      iframe.style.border = 'none';
      document.body.appendChild(iframe);
      
      const doc = iframe.contentWindow?.document;
      if (doc) {
        doc.open();
        
        // Clone all style elements and stylesheet links on the main page with absolute URLs to ensure style fidelity
        const parentStyles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
          .map(el => {
            const outer = el.outerHTML;
            if (el.tagName.toLowerCase() === 'link') {
              const href = el.getAttribute('href');
              if (href && !href.startsWith('http')) {
                try {
                  const absUrl = new URL(href, window.location.href).href;
                  return `<link rel="stylesheet" href="${absUrl}">`;
                } catch (e) {
                  return `<link rel="stylesheet" href="${window.location.origin}${href}">`;
                }
              }
            }
            return outer;
          })
          .join('\n');
        
        const isRtlLang = language === 'ar';
        
        doc.write(`
          <!DOCTYPE html>
          <html dir="${isRtlLang ? 'rtl' : 'ltr'}" lang="${language}">
            <head>
              <title>${language === 'ar' ? 'السيرة الذاتية' : 'Curriculum Vitae'}</title>
              ${parentStyles}
              <style>
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;900&display=swap');
                * {
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                }
                body {
                  font-family: 'Inter', sans-serif;
                  background: white;
                  color: black;
                  padding: 10px;
                  margin: 0;
                  box-sizing: border-box;
                }
                .pdf-export {
                  width: 100% !important;
                  max-width: 100% !important;
                  min-width: 100% !important;
                }
                @media print {
                  @page {
                    size: A4;
                    margin: 8mm;
                  }
                  body {
                    background: white;
                  }
                  .no-print { display: none !important; }
                }
              </style>
            </head>
            <body>
              <div class="${printContent.className} pdf-export" style="box-shadow: none !important; border: none !important; border-radius: 0 !important; max-width: 100% !important; margin: 0 !important;">
                ${printContent.innerHTML}
              </div>
              <script>
                const hideElements = () => {
                  const items = document.querySelectorAll('button, .no-print');
                  items.forEach(el => el.style.setProperty('display', 'none', 'important'));
                };
                
                window.onload = function() {
                  hideElements();
                  setTimeout(() => {
                    window.focus();
                    window.print();
                    setTimeout(() => {
                      window.frameElement.remove();
                    }, 1000);
                  }, 500);
                };
              </script>
            </body>
          </html>
        `);
        doc.close();
      }
      resolve();
    });
  }  
async function generatePDFDirectly(elementId: string, filename: string): Promise<void> {
    const originalElement = document.getElementById(elementId);
    if (!originalElement) {
      alert(language === 'ar' ? 'حدث خطأ: لم يتم العثور على نموذج السيرة الذاتية.' : 'Erreur: Conteneur de CV non trouvé.');
      return;
    }

    const tryBuildPDF = async (withImages: boolean): Promise<boolean> => {
      // 1. Clone the element to perform mutations without affecting the screen rendering
      const clone = originalElement.cloneNode(true) as HTMLElement;
      
      // 2. Wrap and paint with physical viewport coordinates to force stylesheet layout evaluation
      clone.style.position = 'fixed';
      clone.style.top = '0';
      clone.style.left = '0';
      clone.style.width = '1024px'; // Set standard fixed width for rendering pixel accuracy
      clone.style.height = 'auto';
      clone.style.maxHeight = 'none';
      clone.style.overflow = 'visible';
      clone.style.zIndex = '-9999';
      clone.style.opacity = '0.99'; // fully rendered by Chrome/Webkit paint engines
      clone.style.boxShadow = 'none';
      
      // 3. Force multi-column styling using the override utilities
      clone.classList.add('pdf-export');
      
      const cleanConstraints = (el: HTMLElement) => {
        // Inline styles
        el.style.maxHeight = 'none';
        el.style.overflow = 'visible';
        el.style.boxShadow = 'none';
        
        // Remove interactive elements and scroll elements
        if (el.classList) {
          el.classList.remove('overflow-y-auto');
          el.classList.remove('max-h-[90vh]');
          el.classList.remove('max-h-[85vh]');
          el.classList.remove('max-h-[80vh]');
          el.classList.remove('shadow-2xl');
        }

        // Inline OKLCH styles or CSS variables override
        if (el.style) {
          if (el.style.color && el.style.color.includes('oklch')) {
            el.style.color = '#173E7D';
          }
          if (el.style.backgroundColor && el.style.backgroundColor.includes('oklch')) {
            el.style.backgroundColor = '#ffffff';
          }
          if (el.style.borderColor && el.style.borderColor.includes('oklch')) {
            el.style.borderColor = '#e5e7eb';
          }
        }

        // Handle image removals or crossorigin
        if (el instanceof HTMLImageElement) {
          if (!withImages) {
            // Replace the image element with a friendly fallback user initials container
            const placeholder = document.createElement('div');
            placeholder.className = "w-full h-full bg-blue-100 flex items-center justify-center text-blue-800 font-bold text-3xl rounded-[3rem]";
            placeholder.innerText = cvData.name ? cvData.name.charAt(0).toUpperCase() : 'CV';
            el.replaceWith(placeholder);
          } else {
            el.crossOrigin = 'anonymous';
            // Force re-trigger request with CORS rules
            const src = el.src;
            el.src = '';
            el.src = src;
          }
        }
        
        for (const child of Array.from(el.children)) {
          cleanConstraints(child as HTMLElement);
        }
      };
      
      cleanConstraints(clone);
      document.body.appendChild(clone);

      // Temporary monkey-patch for computed styles to handle OKLCH colors for html2canvas
      const originalGetComputedStyle = window.getComputedStyle;
      window.getComputedStyle = function(el, pseudoElt) {
        const style = originalGetComputedStyle(el, pseudoElt);
        return new Proxy(style, {
          get(target, prop) {
            if (prop === 'getPropertyValue') {
              return (name: string) => {
                const value = target.getPropertyValue(name);
                if (typeof value === 'string' && value.includes('oklch')) {
                  if (name.includes('background')) return '#ffffff';
                  if (name.includes('border')) return '#e5e7eb';
                  return '#173E7D';
                }
                return value;
              };
            }
            const value = Reflect.get(target, prop);
            
            // CRITICAL FIX: Bind functions to target to restore context and prevent Illegal invocation
            if (typeof value === 'function') {
              return value.bind(target);
            }
            
            if (typeof value === 'string' && value.includes('oklch')) {
              if (prop === 'backgroundColor') return '#ffffff';
              if (prop === 'borderColor') return '#e5e7eb';
              return '#173E7D';
            }
            return value;
          }
        });
      };

      try {
        await new Promise((resolve) => setTimeout(resolve, 500));
        
        const canvas = await html2canvas(clone, {
          scale: 2,
          useCORS: true,
          allowTaint: false,
          logging: false,
          backgroundColor: '#ffffff',
          windowWidth: 1024,
          windowHeight: clone.scrollHeight || undefined
        });

        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
          orientation: 'p',
          unit: 'mm',
          format: 'a4',
          compress: true
        });

        const imgWidth = 210;
        const pageHeight = 297;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        let heightLeft = imgHeight;
        let position = 0;

        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
        heightLeft -= pageHeight;

        while (heightLeft >= 0) {
          position = heightLeft - imgHeight;
          pdf.addPage();
          pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
          heightLeft -= pageHeight;
        }

        pdf.save(`${filename}.pdf`);
        return true;
      } catch (err) {
        console.error('Render attempt failed, withImages =', withImages, err);
        return false;
      } finally {
        window.getComputedStyle = originalGetComputedStyle;
        if (clone.parentNode) {
          clone.parentNode.removeChild(clone);
        }
      }
    };

    let success = await tryBuildPDF(true);
    if (!success) {
      success = await tryBuildPDF(false);
    }
    if (!success) {
      // Last resort: skip the visual snapshot entirely and build a plain
      // text PDF directly from the CV Maker's own data, so this always
      // ends in a real downloaded file instead of opening the print dialog.
      if (elementId === 'cv-preview-container') {
        generateTextPDF(filename);
      } else {
        await handlePrintCVElement(elementId);
      }
    }
  }
  // Guaranteed-to-work fallback: builds the CV as a plain vector-text PDF
  // straight from cvData (no screenshot, no fonts/colors that can fail).
  // Used only if the visual html2canvas snapshot fails twice, so the user
  // always gets a real downloaded .pdf file and never a print dialog.
  // Loads an image URL and returns it as a circular PNG data URL, so the photo
  // can be placed in the PDF as a circle (jsPDF's addImage is rectangle-only).
  // Returns null on any failure — a CORS-blocked avatar must not break the
  // download, the caller falls back to drawing initials.
  async function loadCircularPhoto(url: string, px = 320): Promise<string | null> {
    try {
      const blob = await (await fetch(url, { mode: 'cors' })).blob();
      const bitmap = await createImageBitmap(blob);
      const canvas = document.createElement('canvas');
      canvas.width = px;
      canvas.height = px;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      ctx.beginPath();
      ctx.arc(px / 2, px / 2, px / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      // Cover-fit the source into the square so faces aren't distorted.
      const side = Math.min(bitmap.width, bitmap.height);
      ctx.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, px, px);
      return canvas.toDataURL('image/png');
    } catch {
      return null;
    }
  }

  /**
   * Builds the candidate's CV as a real vector-text PDF.
   *
   * Deliberately NOT an html2canvas screenshot: an image of text is invisible
   * to applicant tracking systems. Everything here is selectable, searchable
   * text in a single logical reading order.
   *
   * Layout: navy sidebar (~31% width) carrying photo, contact, skills and
   * languages; white main column carrying name, title, profile, experience and
   * education. One accent colour (the brand navy), generous white space, dates
   * right-aligned — per the agreed design brief.
   */
  async function generateProfessionalCvPDF(filename: string): Promise<void> {
    const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4', compress: true });

    const PAGE_W = 210;
    const PAGE_H = 297;
    const SIDEBAR_W = 66;
    const SIDE_PAD = 10;
    const SIDE_X = SIDE_PAD;
    const SIDE_W = SIDEBAR_W - SIDE_PAD * 2;
    const MAIN_X = SIDEBAR_W + 12;
    const MAIN_W = PAGE_W - MAIN_X - 15;
    const BOTTOM = 280;

    const NAVY: [number, number, number] = [23, 62, 125];
    const INK: [number, number, number] = [38, 45, 58];
    const BODY: [number, number, number] = [72, 82, 96];
    const MUTED: [number, number, number] = [130, 140, 153];
    const RULE: [number, number, number] = [223, 227, 233];
    const SIDE_TEXT: [number, number, number] = [214, 224, 238];
    const SIDE_MUTED: [number, number, number] = [150, 170, 200];

    const paintSidebar = () => {
      pdf.setFillColor(...NAVY);
      pdf.rect(0, 0, SIDEBAR_W, PAGE_H, 'F');
    };

    paintSidebar();

    let y = 0; // main column cursor
    let sy = 0; // sidebar cursor

    const ensureMain = (needed: number) => {
      if (y + needed > BOTTOM) {
        pdf.addPage();
        paintSidebar();
        y = 24;
      }
    };

    // ---------- Sidebar ----------
    sy = 18;

    const photo = displayPhotoURL ? await loadCircularPhoto(displayPhotoURL) : null;
    const photoSize = 34;
    const photoX = (SIDEBAR_W - photoSize) / 2;
    if (photo) {
      pdf.addImage(photo, 'PNG', photoX, sy, photoSize, photoSize);
    } else {
      pdf.setFillColor(255, 255, 255);
      pdf.circle(SIDEBAR_W / 2, sy + photoSize / 2, photoSize / 2, 'F');
      pdf.setTextColor(...NAVY);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(24);
      pdf.text((cvData.name || 'CV').trim().charAt(0).toUpperCase(), SIDEBAR_W / 2, sy + photoSize / 2 + 3.2, {
        align: 'center',
      });
    }
    sy += photoSize + 14;

    const sideHeading = (label: string) => {
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8);
      pdf.setTextColor(255, 255, 255);
      pdf.text(label.toUpperCase(), SIDE_X, sy, { charSpace: 0.6 });
      sy += 2.2;
      pdf.setDrawColor(90, 120, 165);
      pdf.setLineWidth(0.3);
      pdf.line(SIDE_X, sy, SIDE_X + SIDE_W, sy);
      sy += 5.5;
    };

    const sideLine = (text: string, muted = false) => {
      if (!text) return;
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8.4);
      pdf.setTextColor(...(muted ? SIDE_MUTED : SIDE_TEXT));
      const lines = pdf.splitTextToSize(text, SIDE_W);
      pdf.text(lines, SIDE_X, sy);
      sy += lines.length * 3.7 + 1.6;
    };

    const contactItems = [
      cvData.phone,
      cvData.email,
      cvData.address,
      (cvData as any).linkedin,
      (cvData as any).portfolio,
    ].filter(Boolean) as string[];

    if (contactItems.length) {
      sideHeading(language === 'ar' ? 'الاتصال' : 'Contact');
      contactItems.forEach((c) => sideLine(c));
      sy += 4;
    }

    if (cvData.skills?.length) {
      sideHeading(language === 'ar' ? 'المهارات' : 'Compétences');
      cvData.skills.filter(Boolean).forEach((s) => sideLine(`· ${s}`));
      sy += 4;
    }

    if (cvData.languages?.length) {
      sideHeading(language === 'ar' ? 'اللغات' : 'Langues');
      cvData.languages.filter((l) => l.name).forEach((l) => {
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(8.4);
        pdf.setTextColor(255, 255, 255);
        pdf.text(l.name, SIDE_X, sy);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(7.4);
        pdf.setTextColor(...SIDE_MUTED);
        pdf.text(l.level || '', SIDE_X + SIDE_W, sy, { align: 'right' });
        sy += 2.4;
        pdf.setFillColor(60, 88, 132);
        pdf.roundedRect(SIDE_X, sy, SIDE_W, 1.3, 0.6, 0.6, 'F');
        pdf.setFillColor(255, 255, 255);
        pdf.roundedRect(SIDE_X, sy, (SIDE_W * languageLevelPercent(l.level)) / 100, 1.3, 0.6, 0.6, 'F');
        sy += 6;
      });
    }

    // ---------- Main column ----------
    y = 26;

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(25);
    pdf.setTextColor(...NAVY);
    const nameLines = pdf.splitTextToSize((cvData.name || 'Votre Nom').toUpperCase(), MAIN_W);
    pdf.text(nameLines, MAIN_X, y, { charSpace: 0.3 });
    y += nameLines.length * 9;

    const professionalTitle = (cvData as any).title || cvData.experiences?.[0]?.role || '';
    if (professionalTitle) {
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      pdf.setTextColor(...MUTED);
      pdf.text(professionalTitle.toUpperCase(), MAIN_X, y, { charSpace: 1.1 });
      y += 6;
    }

    pdf.setDrawColor(...NAVY);
    pdf.setLineWidth(0.7);
    pdf.line(MAIN_X, y, MAIN_X + 18, y);
    y += 9;

    const mainHeading = (label: string) => {
      ensureMain(16);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(9.5);
      pdf.setTextColor(...NAVY);
      pdf.text(label.toUpperCase(), MAIN_X, y, { charSpace: 0.8 });
      y += 2.4;
      pdf.setDrawColor(...RULE);
      pdf.setLineWidth(0.3);
      pdf.line(MAIN_X, y, MAIN_X + MAIN_W, y);
      y += 6;
    };

    const paragraph = (text: string) => {
      if (!text) return;
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9.6);
      pdf.setTextColor(...BODY);
      const lines = pdf.splitTextToSize(text, MAIN_W);
      ensureMain(lines.length * 4.4 + 3);
      pdf.text(lines, MAIN_X, y);
      y += lines.length * 4.4 + 3;
    };

    // One bullet per line, or per sentence when the candidate wrote a block of
    // prose — achievement bullets read far better than a paragraph.
    const bullets = (text: string) => {
      if (!text) return;
      const parts = text.includes('\n')
        ? text.split('\n')
        : text.split(/(?<=\.)\s+/);
      parts
        .map((p) => p.trim().replace(/^[-•·]\s*/, ''))
        .filter(Boolean)
        .forEach((p) => {
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(9.4);
          pdf.setTextColor(...BODY);
          const lines = pdf.splitTextToSize(p, MAIN_W - 4.5);
          ensureMain(lines.length * 4.3 + 1.5);
          pdf.setTextColor(...NAVY);
          pdf.text('•', MAIN_X, y);
          pdf.setTextColor(...BODY);
          pdf.text(lines, MAIN_X + 4.5, y);
          y += lines.length * 4.3 + 1.5;
        });
      y += 2;
    };

    // Title on the left, dates right-aligned on the same baseline.
    const entryHeader = (title: string, right: string, subtitle: string) => {
      ensureMain(14);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(10.6);
      pdf.setTextColor(...INK);
      pdf.text(title, MAIN_X, y);
      if (right) {
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8.6);
        pdf.setTextColor(...MUTED);
        pdf.text(right, MAIN_X + MAIN_W, y, { align: 'right' });
      }
      y += 4.6;
      if (subtitle) {
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(9.2);
        pdf.setTextColor(...NAVY);
        pdf.text(subtitle, MAIN_X, y);
        y += 5;
      }
    };

    if (cvData.summary) {
      mainHeading(language === 'ar' ? 'الملف الشخصي' : 'Profil');
      paragraph(cvData.summary);
      y += 3;
    }

    const realExperiences = (cvData.experiences || []).filter((e) => e.role || e.company);
    if (realExperiences.length) {
      mainHeading(language === 'ar' ? 'الخبرة المهنية' : 'Expérience Professionnelle');
      realExperiences.forEach((exp) => {
        entryHeader(exp.role || '', exp.period || '', exp.company || '');
        bullets([exp.missions, exp.desc].filter(Boolean).join('\n'));
      });
      y += 1;
    }

    const realEducation = (cvData.education || []).filter((e) => e.degree || e.school);
    if (realEducation.length) {
      mainHeading(language === 'ar' ? 'التعليم' : 'Formation');
      realEducation.forEach((edu) => {
        entryHeader(edu.degree || '', edu.year || '', edu.school || '');
        y += 2;
      });
      y += 1;
    }

    // Rendered only when the CV Maker gains editors for them; the layout is
    // ready so no PDF change is needed when that data starts arriving.
    const projects = (cvData as any).projects as
      | { name?: string; description?: string; tech?: string; link?: string }[]
      | undefined;
    if (projects?.length) {
      mainHeading(language === 'ar' ? 'المشاريع' : 'Projets');
      projects.filter((p) => p.name).forEach((p) => {
        entryHeader(p.name || '', p.tech || '', '');
        paragraph([p.description, p.link].filter(Boolean).join(' — '));
      });
    }

    const certifications = (cvData as any).certifications as
      | { name?: string; issuer?: string; year?: string }[]
      | undefined;
    if (certifications?.length) {
      mainHeading(language === 'ar' ? 'الشهادات' : 'Certifications');
      certifications.filter((c) => c.name).forEach((c) => {
        ensureMain(7);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(9.6);
        pdf.setTextColor(...INK);
        pdf.text(c.name || '', MAIN_X, y);
        if (c.year) {
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(8.6);
          pdf.setTextColor(...MUTED);
          pdf.text(c.year, MAIN_X + MAIN_W, y, { align: 'right' });
        }
        y += 4.2;
        if (c.issuer) {
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(8.8);
          pdf.setTextColor(...BODY);
          pdf.text(c.issuer, MAIN_X, y);
          y += 5;
        }
      });
    }

    pdf.save(`${filename}.pdf`);
  }

  function generateTextPDF(filename: string): void {
    const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
    const marginX = 18;
    const pageWidth = 210;
    const contentWidth = pageWidth - marginX * 2;
    let y = 22;

    const ensureSpace = (needed: number) => {
      if (y + needed > 285) {
        pdf.addPage();
        y = 22;
      }
    };

    const addHeading = (text: string) => {
      ensureSpace(12);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(13);
      pdf.setTextColor(23, 62, 125); // #173E7D
      pdf.text(text, marginX, y);
      y += 2;
      pdf.setDrawColor(230, 230, 230);
      pdf.line(marginX, y, pageWidth - marginX, y);
      y += 7;
    };

    const addParagraph = (text: string, size = 10.5, color: [number, number, number] = [55, 65, 81]) => {
      if (!text) return;
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(size);
      pdf.setTextColor(...color);
      const lines = pdf.splitTextToSize(text, contentWidth);
      ensureSpace(lines.length * 5 + 2);
      pdf.text(lines, marginX, y);
      y += lines.length * 5 + 3;
    };

    // Name + contact header
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(22);
    pdf.setTextColor(23, 62, 125);
    pdf.text(cvData.name || 'CV', marginX, y);
    y += 8;

    const contactParts = [cvData.email, cvData.phone, cvData.address].filter(Boolean);
    if (contactParts.length) {
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      pdf.setTextColor(107, 114, 128);
      pdf.text(contactParts.join('  •  '), marginX, y);
      y += 10;
    } else {
      y += 4;
    }

    if (cvData.summary) {
      addHeading(language === 'ar' ? 'نبذة' : 'Résumé');
      addParagraph(cvData.summary);
    }

    if (cvData.experiences?.length) {
      addHeading(language === 'ar' ? 'الخبرة المهنية' : 'Expérience professionnelle');
      cvData.experiences.forEach((exp) => {
        ensureSpace(14);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(11);
        pdf.setTextColor(17, 24, 39);
        pdf.text(`${exp.role || ''}${exp.company ? ' — ' + exp.company : ''}`, marginX, y);
        y += 5;
        if (exp.period) {
          pdf.setFont('helvetica', 'italic');
          pdf.setFontSize(9.5);
          pdf.setTextColor(107, 114, 128);
          pdf.text(exp.period, marginX, y);
          y += 5;
        }
        addParagraph(exp.desc || '');
        y += 1;
      });
    }

    if (cvData.education?.length) {
      addHeading(language === 'ar' ? 'التعليم' : 'Formation');
      cvData.education.forEach((edu) => {
        ensureSpace(10);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(11);
        pdf.setTextColor(17, 24, 39);
        pdf.text(edu.degree || '', marginX, y);
        y += 5;
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(9.5);
        pdf.setTextColor(107, 114, 128);
        pdf.text(`${edu.school || ''}${edu.year ? ' — ' + edu.year : ''}`, marginX, y);
        y += 7;
      });
    }

    if (cvData.skills?.length) {
      addHeading(language === 'ar' ? 'المهارات' : 'Compétences');
      addParagraph(cvData.skills.join('  •  '));
    }

    if (cvData.languages?.length) {
      addHeading(language === 'ar' ? 'اللغات' : 'Langues');
      // Mirrors the proficiency bars in the on-screen preview: label + level on
      // one line, then a track with an orange fill sized by languageLevelPercent.
      const barWidth = contentWidth * 0.45;
      const barHeight = 1.6;
      cvData.languages.forEach((l) => {
        if (!l.name) return;
        ensureSpace(11);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(10.5);
        pdf.setTextColor(23, 62, 125);
        pdf.text(l.name, marginX, y);

        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(9);
        pdf.setTextColor(107, 114, 128);
        pdf.text(l.level || '', marginX + barWidth, y, { align: 'right' });
        y += 2.5;

        pdf.setFillColor(233, 235, 238);
        pdf.roundedRect(marginX, y, barWidth, barHeight, 0.8, 0.8, 'F');
        pdf.setFillColor(246, 141, 88); // #F68D58
        pdf.roundedRect(
          marginX,
          y,
          (barWidth * languageLevelPercent(l.level)) / 100,
          barHeight,
          0.8,
          0.8,
          'F'
        );
        y += barHeight + 5;
      });
      y += 2;
    }

    pdf.save(`${filename}.pdf`);
  }

  const handleDownloadPDF = async () => {
    setIsGeneratingPDF(true);
    try {
      // Arabic still goes through the screenshot path: the vector generator
      // uses jsPDF's built-in Helvetica, which has no Arabic glyphs and no RTL
      // shaping, so real-text output would come out as boxes. Latin-script CVs
      // get the designed, ATS-readable vector layout.
      if (language === 'ar') {
        await generatePDFDirectly('cv-preview-container', cvData.name || 'CV');
      } else {
        await generateProfessionalCvPDF(cvData.name || 'CV');
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      // Never leave the user without a file: fall back to the snapshot path.
      try {
        await generatePDFDirectly('cv-preview-container', cvData.name || 'CV');
      } catch (fallbackError) {
        console.error('Fallback PDF generation also failed:', fallbackError);
        showToast(
          lt('Could not generate the PDF.', 'Impossible de générer le PDF.', 'تعذر إنشاء ملف PDF.'),
          'error'
        );
      }
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleDownloadEmployerPDF = async () => {
    setIsGeneratingEmployerPDF(true);
    try {
      await generatePDFDirectly('employer-cv-view-container', selectedCandidateCV?.name || 'CV_Candidat');
    } catch (error) {
      console.error('Error generating Employer PDF:', error);
    } finally {
      setIsGeneratingEmployerPDF(false);
    }
  };
  
  const renderContent = () => {
    if (user?.role === 'employer') {
      switch (activeTab) {
        case "repertoire-cv":
          return (
            <CVDirectory
              candidates={candidateList}
              recruiterPlan={recruiterTier}
              loading={loadingCandidates}
              onRefresh={loadCandidates}
              onOpenCV={handleOpenCV}
            />
          );

        case "quiz-results":
          return (
            <QuizResults
              candidates={quizResults}
              recruiterPlan={recruiterTier}
              loading={loadingQuiz}
              onRefresh={loadQuizResults}
              onOpenCandidate={handleOpenCandidate}
            />
          );

        case "oral-results":
          return (
            <OralPresentationResults
              candidates={oralPresentationResults}
              recruiterPlan={recruiterTier}
              loading={loadingPresentations}
              onRefresh={loadPresentations}
              onViewPresentation={handleViewPresentation}
            />
          );

        case "preselected":
          return (
            <PreselectedCandidates
              candidates={preselectedCandidates}
              recruiterPlan={recruiterTier}
              loading={loadingPreselected}
              onRefresh={loadPreselectedCandidates}
              onOpenCV={handleOpenCV}
              onInterview={handleInterview}
              onHire={handleHire}
              onReject={handleReject}
            />
          );

        case "ai-filter":
          return (
            <AIFilterResults
              candidates={aiCandidates}
              recruiterPlan={recruiterTier}
              loading={loadingAI}
              onRefresh={loadAICandidates}
              onOpenCandidate={handleOpenCandidate}
            />
          );
        case 'employer-dashboard':
          return (
            <div className="space-y-10">
              {/* Welcome & Quick Actions */}
              <div className={`flex flex-col lg:flex-row lg:items-center justify-between gap-6 ${isRTL ? 'lg:flex-row-reverse' : ''}`}>
                <div className={isRTL ? 'text-right' : ''}>
                  <h1 className="text-4xl font-display font-black text-[#173E7D] tracking-tight">
                    {language === 'ar' ? 'مرحباً بك،' : 'Bienvenue,'} {user?.displayName?.split(' ')[0]} !
                  </h1>
                  <p className="text-gray-500 mt-2 text-lg font-medium">
                    {language === 'ar' ? 'إليك ما يحدث في حملات التوظيف الخاصة بك اليوم.' : 'Voici ce qui se passe dans vos campagnes de recrutement aujourd\'hui.'}
                  </p>
                </div>
                <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <button 
                    onClick={() => setActiveTab('post-job')}
                    className="bg-[#F68D58] text-white px-8 py-4 rounded-2xl font-bold hover:bg-[#e57d47] transition-all shadow-lg shadow-orange-500/20 flex items-center gap-2"
                  >
                    <PlusCircle size={20} />
                    {t('postJob')}
                  </button>
                  <button className="bg-white text-[#173E7D] border border-gray-100 px-6 py-4 rounded-2xl font-bold hover:bg-gray-50 transition-all shadow-sm flex items-center gap-2">
                    <FileText size={20} />
                    {language === 'ar' ? 'تقارير' : 'Rapports'}
                  </button>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { label: 'Offres actives', value: '8', change: '+2', icon: Briefcase, color: 'emerald' },
                  { label: 'Candidatures', value: '145', change: '+23%', icon: UsersIcon, color: 'blue' },
                  { label: 'Filtrés par IA', value: '42', change: 'Top 30%', icon: Cpu, color: 'purple' },
                  { label: 'Recrutements', value: '6', change: '+2', icon: CheckCircle2, color: 'orange' },
                ].map((stat, i) => (
                  <motion.div 
                    key={i}
                    whileHover={{ y: -5 }}
                    className="bg-white p-10 rounded-[3.5rem] border border-gray-100 shadow-[0_20px_40px_-10px_rgba(0,0,0,0.03)] hover:shadow-[0_40px_80px_-15px_rgba(0,0,0,0.06)] transition-all duration-500 group relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-24 h-24 bg-gray-50 rounded-bl-[3rem] -z-0 group-hover:bg-[#173E7D]/5 transition-colors" />
                    <div className="relative z-10 flex justify-between items-start mb-8">
                      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-500 shadow-sm ${
                        stat.color === 'emerald' ? 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white' :
                        stat.color === 'blue' ? 'bg-blue-50 text-[#173E7D] group-hover:bg-[#173E7D] group-hover:text-white' :
                        stat.color === 'purple' ? 'bg-purple-50 text-purple-600 group-hover:bg-purple-600 group-hover:text-white' :
                        'bg-orange-50 text-[#F68D58] group-hover:bg-[#F68D58] group-hover:text-white'
                      }`}>
                        <stat.icon size={24} />
                      </div>
                      <span className={`text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full shadow-sm border ${
                        stat.color === 'emerald' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                        stat.color === 'blue' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                        stat.color === 'purple' ? 'bg-purple-50 text-purple-600 border-purple-100' :
                        'bg-orange-50 text-orange-600 border-orange-100'
                      }`}>
                        {stat.change}
                      </span>
                    </div>
                    <div className="relative z-10">
                      <p className="text-5xl font-black text-[#173E7D] tracking-tighter group-hover:text-[#F68D58] transition-colors">{stat.value}</p>
                      <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em] mt-3">{stat.label}</p>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Main Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Recent Applications */}
                <div className="lg:col-span-2 bg-white rounded-[3rem] border border-gray-100 p-10 shadow-sm">
                  <div className="flex justify-between items-center mb-10">
                    <div>
                      <h3 className="text-2xl font-black text-[#173E7D] tracking-tight">Dernières candidatures</h3>
                      <p className="text-gray-400 text-sm font-medium mt-1">Gérez vos nouveaux talents en un coup d'œil.</p>
                    </div>
                    <button className="text-sm font-black text-[#F68D58] hover:underline uppercase tracking-widest">
                      Voir tout
                    </button>
                  </div>
                  <div className="space-y-8">
                    {[
                      { name: 'Ahmed Benali', role: 'Dev Full Stack', score: 92, location: 'Alger', time: 'Il y a 1h', avatar: 'https://i.pravatar.cc/150?u=ahmed', email: 'ahmed.benali@email.dz', phone: '+213 550 12 34 56' },
                      { name: 'Fatima Zohra Kaci', role: 'Analyste Données', score: 87, location: 'Oran', time: 'Il y a 3h', avatar: 'https://i.pravatar.cc/150?u=fatima', email: 'fatima.kaci@email.dz', phone: '+213 660 98 76 54' },
                      { name: 'Mohammed Saidi', role: 'Designer UI/UX', score: 78, location: 'Constantine', time: 'Il y a 6h', avatar: 'https://i.pravatar.cc/150?u=mohammed', email: 'm.saidi@email.dz', phone: '+213 770 11 22 33' },
                      { name: 'Amina Bouzid', role: 'Comptable', score: 85, location: 'Blida', time: 'Il y a 1j', avatar: 'https://i.pravatar.cc/150?u=amina', email: 'amina.b@email.dz', phone: '+213 555 44 33 22' },
                    ].map((candidate, i) => (
                      <div key={i} className="flex items-center justify-between group p-4 hover:bg-gray-50 rounded-3xl transition-all cursor-pointer">
                        <div className="flex items-center gap-6">
                          <div className="relative">
                            <div className="w-16 h-16 bg-blue-50 rounded-2xl overflow-hidden border-2 border-white shadow-sm">
                              <img src={candidate.avatar} alt={candidate.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            </div>
                            <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-white rounded-full shadow-md flex items-center justify-center border border-gray-50">
                              <span className="text-[10px] font-black text-emerald-600">{candidate.score}%</span>
                            </div>
                          </div>
                          <div>
                            <p className="text-lg font-black text-[#173E7D] group-hover:text-[#F68D58] transition-colors">{candidate.name}</p>
                            <p className="text-sm text-gray-400 font-bold uppercase tracking-wider">{candidate.role}</p>
                          </div>
                        </div>
                        <div className="text-right hidden sm:block">
                          <p className="text-sm font-black text-[#173E7D]">{candidate.location}</p>
                          <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-1">{candidate.time}</p>
                        </div>
                        <button className="p-3 bg-white border border-gray-100 rounded-xl text-gray-400 group-hover:text-[#F68D58] group-hover:border-[#F68D58] transition-all">
                          <ChevronRight size={20} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right Column: Active Jobs & AI Insights */}
                <div className="space-y-8">
                  <div className="bg-[#173E7D] rounded-[3rem] p-10 text-white shadow-xl shadow-blue-900/20 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl" />
                    <h3 className="text-xl font-black mb-8 relative z-10">Offres actives</h3>
                    <div className="space-y-6 relative z-10">
                      {[
                        { title: 'Full Stack Dev', apps: 23, trend: 'up' },
                        { title: 'Data Analyst', apps: 18, trend: 'stable' },
                        { title: 'UI/UX Designer', apps: 12, trend: 'up' },
                      ].map((job, i) => (
                        <div key={i} className="flex justify-between items-center group cursor-pointer">
                          <div>
                            <p className="font-bold text-sm group-hover:text-[#F68D58] transition-colors">{job.title}</p>
                            <p className="text-[10px] text-blue-200 font-bold uppercase tracking-widest mt-1">{job.apps} candidatures</p>
                          </div>
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${job.trend === 'up' ? 'bg-emerald-400/20 text-emerald-400' : 'bg-blue-400/20 text-blue-400'}`}>
                            <TrendingUp size={14} />
                          </div>
                        </div>
                      ))}
                    </div>
                    <button 
                      onClick={() => setActiveTab('manage-jobs')}
                      className="w-full mt-10 py-4 bg-white/10 hover:bg-white/20 rounded-2xl font-bold text-sm transition-all border border-white/10"
                    >
                      Gérer toutes les offres
                    </button>
                  </div>

                  <div className="bg-white rounded-[3rem] border border-gray-100 p-10 shadow-sm">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center">
                        <Cpu size={20} />
                      </div>
                      <h3 className="text-lg font-black text-[#173E7D]">IA Insights</h3>
                    </div>
                    <p className="text-sm text-gray-500 leading-relaxed font-medium">
                      Votre offre "Full Stack Dev" attire des profils très qualifiés. Nous vous suggérons de contacter Ahmed Benali en priorité.
                    </p>
                    <div className="mt-6 p-4 bg-purple-50 rounded-2xl border border-purple-100">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-[10px] font-black text-purple-600 uppercase tracking-widest">Qualité moyenne</span>
                        <span className="text-sm font-black text-purple-600">84%</span>
                      </div>
                      <div className="w-full h-2 bg-purple-200 rounded-full overflow-hidden">
                        <div className="w-[84%] h-full bg-purple-600 rounded-full" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        case 'manage-jobs':
          return (
            <div className="space-y-8">
              <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div className={isRTL ? 'text-right' : ''}>
                  <h2 className="text-4xl font-display font-black text-[#173E7D] tracking-tight">{t('manageJobs')}</h2>
                  <p className="text-gray-500 mt-1 font-medium">Suivez et gérez vos annonces de recrutement.</p>
                </div>
                <button 
                  onClick={() => setActiveTab('post-job')}
                  className="bg-[#F68D58] text-white px-8 py-4 rounded-2xl font-bold hover:bg-[#e57d47] transition-all shadow-lg shadow-orange-500/20 flex items-center gap-2"
                >
                  <PlusCircle size={20} />
                  {t('postJob')}
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                {postedJobs.map((job) => (
                  <motion.div 
                    key={job.id} 
                    whileHover={{ y: -10, scale: 1.02 }}
                    className="bg-white p-10 rounded-[3.5rem] border border-gray-100 shadow-sm hover:shadow-[0_20px_50px_rgba(23,62,125,0.08)] transition-all duration-500 group relative overflow-hidden flex flex-col"
                  >
                    <div className="absolute top-0 right-0 w-24 h-24 bg-gray-50 rounded-bl-[3rem] -z-0 group-hover:bg-[#173E7D]/5 transition-colors" />
                    
                    <div className="flex justify-between items-start mb-8 relative z-10">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center bg-blue-50 text-[#173E7D] group-hover:bg-[#173E7D] group-hover:text-white transition-all duration-500 shadow-sm shadow-blue-100`}>
                        <Briefcase size={22} />
                      </div>
                      <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border shadow-sm ${
                        job.status === 'PUBLISHED' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-gray-100 text-gray-400 border-gray-200'
                      }`}>
                        {job.status === 'PUBLISHED' ? lt('Active', 'Active', 'نشط') : lt('Closed', 'Fermée', 'مغلقة')}
                      </span>
                    </div>

                    <div className="relative z-10 mb-8 flex-1">
                      <h3 className="text-2xl font-black text-[#173E7D] group-hover:text-[#F68D58] transition-colors tracking-tight line-clamp-2 min-h-[4rem]">{job.title}</h3>
                      <div className="flex items-center gap-3 text-[10px] font-black text-gray-400 uppercase tracking-widest mt-2">
                        <Clock size={14} className="text-[#F68D58]" />
                        {lt('Published on ', 'Publiée le ', 'نشرت في ')} {job.publishedAt ? new Date(job.publishedAt).toLocaleDateString('fr-FR') : '—'}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-10 relative z-10">
                      <div className="bg-gray-50/80 backdrop-blur-sm p-5 rounded-3xl border border-gray-100 group-hover:bg-white transition-colors">
                        <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest mb-1.5">{lt('Applications', 'Candidatures', 'التقديمات')}</p>
                        <p className="text-2xl font-black text-[#173E7D]">{job.applicationsCount}</p>
                      </div>
                      <div className="bg-gray-50/80 backdrop-blur-sm p-5 rounded-3xl border border-gray-100 group-hover:bg-white transition-colors">
                        <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest mb-1.5">IA Match</p>
                        <p className="text-2xl font-black text-[#F68D58]">{job.averageMatch != null ? `${job.averageMatch}%` : '—'}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 relative z-10">
                      <button 
                        onClick={() => {
                          setSelectedManagedJob(job);
                          setActiveTab('candidates');
                        }}
                        className="flex-1 bg-[#173E7D] text-white py-5 rounded-[1.5rem] font-black text-[10px] uppercase tracking-[0.2em] hover:bg-blue-800 hover:scale-[1.02] active:scale-95 transition-all duration-500 shadow-xl shadow-blue-900/10"
                      >
                        {lt('Manage', 'Gérer', 'عمليات')}
                      </button>
                      <button
                        className="w-14 h-14 bg-white border border-gray-100 rounded-2xl flex items-center justify-center text-gray-400 hover:text-[#173E7D] hover:border-blue-100 hover:bg-blue-50 transition-all"
                        onClick={() => openEditJob(job.id)}
                        title={lt('Edit', 'Modifier', 'تعديل')}
                      >
                        <Pencil size={20} />
                      </button>
                      <button
                        className="w-14 h-14 bg-white border border-gray-100 rounded-2xl flex items-center justify-center text-gray-400 hover:text-red-500 hover:border-red-100 hover:bg-red-50 transition-all"
                        onClick={async () => {
                          if (!confirm(lt('Delete this job?', 'Supprimer cette offre ?', 'حذف هذا العرض؟'))) return;
                          try {
                            await jobService.deleteJob(job.id);
                            setPostedJobs((prev) => prev.filter((j) => j.id !== job.id));
                          } catch (error) {
                            console.error('Failed to delete job:', error);
                          }
                        }}
                        title={lt('Delete', 'Supprimer', 'حذف')}
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          );
          case 'candidates':
  return (
    <CandidatesSection
      candidatesByJob={candidatesByJob}
      isRTL={isRTL}
      t={t}
      setSelectedCandidateCV={setSelectedCandidateCV}
      selectedPresentationCandidate={selectedPresentationCandidate}
      setSelectedPresentationCandidate={setSelectedPresentationCandidate}
      OralPresentationViewer={OralPresentationViewer}
      handleWhatsAppContact={handleWhatsAppContact}
      handleInterview={handleInterview}
      handleHire={handleHire}
      handleReject={handleReject}
      handleEmail={handleEmail}
      handleShortlist={handleShortlist}
      // NEW — tier-gated visibility inside the Candidatures view
      canViewOralPresentation={access.oralPresentation}
      canViewPreselection={access.preselection}
      onRequestUpgrade={() => setActiveTab('subscription')}
      // handleViewQuiz omitted — no per-candidate quiz detail modal yet
    />
  );
        // case 'candidates':
        //   return (
        //     <>
        //     <div className="space-y-16">
        //       <div className={`flex flex-col md:flex-row md:items-end justify-between gap-6 ${isRTL ? 'text-right' : ''}`}>
        //         <div>
        //           <h2 className="text-5xl font-display font-black text-[#173E7D] tracking-tighter">{t('candidates')}</h2>
        //           <p className="text-gray-500 mt-2 text-lg font-medium">Gérez vos talents par offre d'emploi avec une analyse prédictive par IA.</p>
        //         </div>
        //         <div className="flex items-center gap-3">
        //           <div className="bg-white px-6 py-3 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-3">
        //             <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
        //             <span className="text-xs font-black text-[#173E7D] uppercase tracking-widest">12 Nouveaux aujourd'hui</span>
        //           </div>
        //         </div>
        //       </div>
              
        //       <div className="space-y-24">
        //         {candidatesByJob.map((group, groupIdx) => (
        //           <motion.div 
        //             key={groupIdx} 
        //             initial={{ opacity: 0, y: 30 }}
        //             animate={{ opacity: 1, y: 0 }}
        //             transition={{ delay: groupIdx * 0.15, duration: 0.8, ease: "easeOut" }}
        //             className="relative"
        //           >
        //             {/* Job Header Section */}
        //             <div className="flex flex-col items-center mb-12">
        //               <div className="relative z-10 bg-white px-10 py-6 rounded-[3rem] border border-gray-100 shadow-xl shadow-blue-900/5 flex flex-col items-center gap-2 group hover:scale-105 transition-transform duration-500">
        //                 <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#173E7D] text-white px-4 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.3em]">
        //                   Offre Active
        //                 </div>
        //                 <h3 className="text-2xl font-black text-[#173E7D] uppercase tracking-[0.15em] flex items-center gap-4">
        //                   <div className="w-10 h-10 bg-orange-50 text-[#F68D58] rounded-xl flex items-center justify-center shadow-inner">
        //                     <Briefcase size={20} />
        //                   </div>
        //                   {group.jobTitle}
        //                   <div className="bg-blue-50 text-[#173E7D] w-10 h-10 rounded-full flex items-center justify-center text-sm border border-blue-100 font-black">
        //                     {group.candidates.length}
        //                   </div>
        //                 </h3>
        //                 <div className="flex items-center gap-3 text-[11px] font-bold text-gray-400 uppercase tracking-[0.2em] mt-1">
        //                   <Clock size={14} className="text-[#F68D58]" />
        //                   Publiée le <span className="text-[#173E7D]">{group.publishedAt}</span>
        //                 </div>
        //               </div>
        //               <div className="absolute top-1/2 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gray-100 to-transparent -z-0"></div>
        //             </div>

        //             {/* Candidates Grid */}
        //             <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-10">
        //               {group.candidates.map((candidate: any, i) => (
        //                 <motion.div 
        //                   key={i} 
        //                   whileHover={{ y: -10, scale: 1.02 }}
        //                   className={`bg-white p-10 rounded-[3.5rem] border border-gray-100 shadow-sm hover:shadow-[0_20px_50px_rgba(23,62,125,0.08)] transition-all duration-500 group relative overflow-hidden ${isRTL ? 'text-right' : ''}`}
        //                 >
        //                   {/* Decorative Background Element */}
        //                   <div className="absolute -top-20 -right-20 w-40 h-40 bg-blue-50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-3xl"></div>
                          
        //                   {/* Status & Match Header */}
        //                   <div className="flex justify-between items-start mb-8 relative z-10">
        //                     <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-sm ${
        //                       candidate.status === 'Nouveau' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
        //                       candidate.status === 'En cours' ? 'bg-blue-50 text-blue-600 border-blue-100' :
        //                       candidate.status === 'Refusé' ? 'bg-red-50 text-red-600 border-red-100' :
        //                       'bg-gray-50 text-gray-600 border-gray-100'
        //                     }`}>
        //                       {candidate.status}
        //                     </span>
        //                     <div className="flex flex-col items-end">
        //                       <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest mb-1">Score IA</span>
        //                       <span className="text-2xl font-black text-[#173E7D] tracking-tighter">{candidate.match}%</span>
        //                     </div>
        //                   </div>

        //                   {/* Profile Info */}
        //                   <div className="flex flex-col items-center text-center space-y-6 relative z-10">
        //                     <div className="relative">
        //                       <div className="w-32 h-32 rounded-[2.5rem] overflow-hidden border-8 border-gray-50 shadow-2xl group-hover:rotate-3 transition-all duration-500">
        //                         <img src={candidate.avatar} alt={candidate.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
        //                       </div>
        //                       <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-emerald-500 text-white rounded-2xl flex items-center justify-center shadow-lg border-4 border-white">
        //                         <CheckCircle2 size={18} />
        //                       </div>
        //                     </div>

        //                     <div className="space-y-1">
        //                       <h4 className="text-2xl font-black text-[#173E7D] group-hover:text-[#F68D58] transition-colors tracking-tight">{candidate.name}</h4>
        //                       <p className="text-gray-400 font-bold uppercase tracking-[0.2em] text-[10px]">{candidate.role}</p>
        //                     </div>

        //                     {/* Stats Bento */}
        //                     <div className="grid grid-cols-2 gap-3 w-full">
        //                       <div className="bg-gray-50/80 backdrop-blur-sm p-4 rounded-3xl border border-gray-100 group-hover:bg-white transition-colors">
        //                         <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest mb-1">Expérience</p>
        //                         <p className="text-sm font-black text-[#173E7D]">{candidate.exp}</p>
        //                       </div>
        //                       <div className="bg-gray-50/80 backdrop-blur-sm p-4 rounded-3xl border border-gray-100 group-hover:bg-white transition-colors">
        //                         <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest mb-1">Localisation</p>
        //                         <p className="text-sm font-black text-[#173E7D]">Alger</p>
        //                       </div>
        //                     </div>

        //                     {/* Action Button */}
        //                     <div className="grid grid-cols-5 gap-3 w-full">
        //                       <button 
        //                         onClick={() => setSelectedCandidateCV(candidate)}
        //                         className="col-span-3 bg-[#173E7D] text-white py-5 rounded-[1.5rem] font-black text-[10px] uppercase tracking-[0.2em] hover:bg-blue-800 hover:scale-[1.02] active:scale-95 transition-all duration-500 shadow-xl shadow-blue-900/10 flex items-center justify-center gap-2 group/btn"
        //                       >
        //                         <span>Voir Profil</span>
        //                         <ChevronRight size={14} className={`group-hover/btn:translate-x-1 transition-transform ${isRTL ? 'rotate-180' : ''}`} />
        //                       </button>
        //                       <button 
        //                         onClick={() => handleWhatsAppContact('+213555555555', candidate.name)}
        //                         className="col-span-1 bg-[#25D366] text-white py-5 rounded-[1.5rem] font-black hover:scale-[1.02] active:scale-95 transition-all duration-500 shadow-xl shadow-green-500/10 flex items-center justify-center"
        //                         title="Contact WhatsApp"
        //                       >
        //                         <MessageCircle size={20} />
        //                       </button>
        //                       <button
        //                         onClick={() => setSelectedPresentationCandidate(candidate)}
        //                         className="col-span-1 bg-gradient-to-br from-purple-500 to-pink-500 text-white py-5 rounded-[1.5rem] font-black hover:scale-[1.02] active:scale-95 transition-all duration-500 shadow-xl shadow-purple-500/10 flex items-center justify-center"
        //                         title="View Oral Presentation"
        //                       >
        //                         <Camera size={20} />
        //                       </button>
        //                     </div>
        //                   </div>
        //                 </motion.div>
        //               ))}
        //             </div>
        //           </motion.div>
        //         ))}
        //       </div>
        //     </div>
        //     <AnimatePresence>
        //       {selectedPresentationCandidate && (
        //         <motion.div
        //           className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-8"
        //           initial={{ opacity: 0 }}
        //           animate={{ opacity: 1 }}
        //           exit={{ opacity: 0 }}
        //         >
        //           <motion.div
        //             initial={{ scale: .9, opacity: 0 }}
        //             animate={{ scale: 1, opacity: 1 }}
        //             exit={{ scale: .9, opacity: 0 }}
        //             className="bg-white rounded-[2rem] w-full max-w-4xl p-8 relative"
        //           >

        //             <button
        //               onClick={() => setSelectedPresentationCandidate(null)}
        //               className="absolute right-6 top-6"
        //             >
        //               <X size={24} />
        //             </button>

        //             <h2 className="text-3xl font-black text-[#173E7D] mb-8">
        //               Oral Presentation
        //             </h2>

        //             <OralPresentationViewer
        //               candidateId={selectedPresentationCandidate.id}
        //             />

        //           </motion.div>
        //         </motion.div>
        //       )}
        //     </AnimatePresence>
        //     </>
        //   );
        case 'sourcing-ia': {
          // NEW: Corporate-only tab
          if (!access.sourcingIA) {
            return (
              <TierLockedScreen
                title="Répertoire CV & Sourcing IA"
                description="Accédez à une base de talents qualifiés qui n'ont pas encore postulé, classés par pertinence pour vos offres. Réservé au plan Corporate."
                requiredTier="Corporate"
                icon={UsersIcon}
                onUpgrade={() => setActiveTab('subscription')}
              />
            );
          }

          return (
            <div className="space-y-12">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-4xl font-display font-black text-[#173E7D] tracking-tight">Sourcing IA Stratégique</h2>
                    <PremiumBadge />
                  </div>
                  <p className="text-gray-500 font-medium max-w-2xl">
                    Découvrez des talents "dormants" qui n'ont pas encore postulé mais dont le profil correspond à 95% à vos besoins. Propulsé par Gemini Pro.
                  </p>
                </div>
                <div className="bg-white p-2 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-2">
                  <select 
                    value={sourcingJobFilter}
                    onChange={(e) => setSourcingJobFilter(e.target.value)}
                    className="bg-transparent border-none text-sm font-bold text-[#173E7D] focus:ring-0 px-4 py-2"
                  >
                    <option>Tous les postes</option>
                    <option>Dev Full Stack</option>
                    <option>Data Analyst</option>
                    <option>Chef de Projet</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {[
                  { name: 'Kamel Driss', role: 'DevOps Engineer', location: 'Alger', match: 98, exp: '8 ans', tags: ['Kubernetes', 'Cloud Computing'], score: 'Excellent' },
                  { name: 'Sami Rahmani', role: 'Architecte Cloud', location: 'Oran', match: 94, exp: '12 ans', tags: ['AWS', 'Azure'], score: 'Profil Rare' },
                  { name: 'Lydia Meziane', role: 'Lead Data Scientist', location: 'Bejaia', match: 91, exp: '6 ans', tags: ['Python', 'MLOps'], score: 'Top Talent' },
                ].map((talent, i) => (
                  <div key={i} className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all group overflow-hidden relative">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-purple-50 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-purple-100 transition-colors" />
                    
                    <div className="flex justify-between items-start mb-6 relative z-10">
                      <div className="w-20 h-20 rounded-2xl bg-gray-50 border-4 border-white shadow-lg overflow-hidden">
                        <img src={`https://i.pravatar.cc/150?u=${talent.name}`} alt="" className="w-full h-full object-cover" />
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] font-black text-purple-600 uppercase tracking-widest mb-1">Match IA</div>
                        <div className="text-3xl font-black text-[#173E7D]">{talent.match}%</div>
                      </div>
                    </div>

                    <div className="relative z-10">
                      <h4 className="text-xl font-black text-[#173E7D] mb-1">{talent.name}</h4>
                      <p className="text-xs font-bold text-[#F68D58] uppercase tracking-wider mb-4">{talent.role}</p>
                      
                      <div className="flex flex-wrap gap-2 mb-6">
                        {talent.tags.map(t => (
                          <span key={t} className="px-3 py-1 bg-gray-50 text-gray-500 rounded-lg text-[9px] font-black uppercase tracking-wider border border-gray-100 group-hover:bg-white transition-colors">
                            {t}
                          </span>
                        ))}
                      </div>

                      <div className="grid grid-cols-2 gap-4 mb-8">
                        <div className="bg-gray-50 p-4 rounded-2xl group-hover:bg-white transition-colors">
                          <p className="text-[8px] text-gray-400 font-black uppercase tracking-widest mb-1">Expérience</p>
                          <p className="text-sm font-black text-[#173E7D]">{talent.exp}</p>
                        </div>
                        <div className="bg-purple-50 p-4 rounded-2xl">
                          <p className="text-[8px] text-purple-400 font-black uppercase tracking-widest mb-1">Status IA</p>
                          <p className="text-sm font-black text-purple-600">{talent.score}</p>
                        </div>
                      </div>

                      <button 
                        onClick={() => alert('Contacting talent...')}
                        className="w-full bg-[#173E7D] text-white py-4 rounded-2xl font-bold text-sm hover:bg-[#F68D58] transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/10"
                      >
                        <Zap size={18} />
                        Débloquer & Contacter
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
          }
        case 'analytics-wilaya':
          return (
            <div className="space-y-12">
              <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm overflow-hidden relative">
                <div className="absolute top-10 right-10 flex gap-4">
                  <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                    <span className="text-xs font-black uppercase tracking-widest">Temps Réel</span>
                  </div>
                  <PremiumBadge />
                </div>

                <h2 className="text-4xl font-display font-black text-[#173E7D] tracking-tight mb-2">Carte de Chaleur des Talents</h2>
                <p className="text-gray-500 font-medium mb-10 max-w-xl">
                  Découvrez la concentration des candidats qualifiés par région en Algérie pour optimiser votre recrutement local.
                </p>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                  <div className="bg-gray-50 rounded-[2rem] p-8 min-h-[400px] flex items-center justify-center relative border border-gray-100">
                    <div className="text-center">
                      <MapPin size={64} className="text-[#173E7D]/10 mx-auto mb-6" />
                      <p className="text-gray-400 font-black text-sm uppercase tracking-widest">Heatmap interactive activée</p>
                      <p className="text-xs text-gray-400 mt-2">Visualisation des 48 Wilayas disponible en plan Entreprise</p>
                    </div>
                    {/* Simplified Heatmap Overlay */}
                    <div className="absolute inset-0 p-10 flex flex-col justify-center space-y-4">
                       <div className="flex items-center gap-4">
                         <div className="w-full bg-blue-100 h-8 rounded-xl overflow-hidden relative">
                           <div className="absolute inset-0 bg-blue-600 w-[85%]" />
                           <span className="absolute inset-y-0 left-4 flex items-center text-[10px] font-black text-white uppercase">Alger (42%)</span>
                         </div>
                       </div>
                       <div className="flex items-center gap-4">
                         <div className="w-full bg-blue-100 h-8 rounded-xl overflow-hidden relative">
                           <div className="absolute inset-0 bg-blue-400 w-[15%]" />
                           <span className="absolute inset-y-0 left-4 flex items-center text-[10px] font-black text-[#173E7D] uppercase tracking-widest">Oran (15%)</span>
                         </div>
                       </div>
                       <div className="flex items-center gap-4">
                         <div className="w-full bg-blue-100 h-8 rounded-xl overflow-hidden relative">
                           <div className="absolute inset-0 bg-blue-300 w-[10%]" />
                           <span className="absolute inset-y-0 left-4 flex items-center text-[10px] font-black text-[#173E7D] uppercase tracking-widest">Constantine (10%)</span>
                         </div>
                       </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <h4 className="text-xl font-black text-[#173E7D] tracking-tight">Top Regions ce mois-ci</h4>
                    {[
                      { region: 'Alger Centre', count: 1240, trend: '+12%', color: 'blue' },
                      { region: 'Oran Ouest', count: 860, trend: '+18%', color: 'emerald' },
                      { region: 'Sétif / Bordj', count: 540, trend: '-2%', color: 'orange' },
                      { region: 'Annaba / Skikda', count: 420, trend: '+5%', color: 'purple' },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center justify-between p-6 bg-white border border-gray-100 rounded-3xl hover:border-[#173E7D] transition-all cursor-pointer group">
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-${item.color}-50 text-${item.color}-600 group-hover:bg-${item.color}-600 group-hover:text-white transition-colors`}>
                            <TrendingUp size={20} />
                          </div>
                          <div>
                            <p className="font-black text-[#173E7D] group-hover:text-[#F68D58] transition-colors">{item.region}</p>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{item.count} Talents actifs</p>
                          </div>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-[10px] font-black ${item.trend.startsWith('+') ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-600'}`}>
                          {item.trend}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        case 'subscription':
          return (
            <div className="space-y-8">
              <div className={isRTL ? 'text-right' : ''}>
                <h2 className="text-4xl font-display font-black text-[#173E7D] tracking-tight">Abonnement</h2>
                <p className="text-gray-500 mt-1 font-medium">Choisissez le plan qui correspond à vos besoins de croissance.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {[
                  { name: 'Gratuit', price: '0', features: ["1 offre d'emploi gratuite"], color: 'gray', icon: <Zap size={32} /> },
                  { name: 'Annonces', price: '5 900', features: ["Publication d'offres payantes", 'Multi-comptes (Gestionnaire)'], color: 'orange', popular: true, icon: <Briefcase size={32} /> },
                  { name: 'Corporate', price: 'Sur mesure', features: ['Publication illimitée', 'Filtrage par IA Gemini', 'Répertoire CV & Support'], color: 'blue', icon: <Building2 size={32} /> },
                ].map((plan, i) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    whileHover={{ y: -15, scale: 1.02 }}
                    transition={{ duration: 0.5 }}
                    className={`group relative bg-white p-12 rounded-[3.5rem] flex flex-col h-full border transition-all duration-500 overflow-hidden ${
                      plan.popular 
                        ? 'border-[#F68D58] shadow-[0_40px_100px_-20px_rgba(246,141,88,0.2)] z-10' 
                        : 'border-gray-100 shadow-[0_40px_80px_-15px_rgba(0,0,0,0.03)] hover:shadow-[0_40px_100px_-20px_rgba(0,0,0,0.08)]'
                    }`}
                  >
                    {/* Decorative corner */}
                    <div className={`absolute top-0 right-0 w-32 h-32 rounded-bl-[4rem] -z-0 ${plan.popular ? 'bg-[#F68D58]/5' : 'bg-gray-50'}`} />

                    {plan.popular && (
                      <div className="absolute top-8 right-8 bg-[#F68D58] text-white px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl whitespace-nowrap z-20">
                        {lt('Most Popular', 'Plus populaire', 'الأكثر شعبية')}
                      </div>
                    )}

                    <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mb-10 shadow-inner group-hover:scale-110 group-hover:rotate-3 transition-all duration-700 relative z-10 ${
                      plan.popular ? 'bg-orange-50 text-[#F68D58]' : 'bg-gray-50 text-gray-400'
                    }`}>
                      {plan.icon}
                    </div>

                    <div className="relative z-10 mb-8">
                      <h3 className="text-3xl font-black text-[#173E7D] mb-2 tracking-tight">{plan.name}</h3>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
                        {plan.name === 'Gratuit' ? 'Pour tester nos services' : plan.name === 'Pro' ? 'Packs flexibles' : 'Solution annuelle'}
                      </p>
                    </div>

                        <div className="relative z-10 mb-12">
                          <div className="flex items-baseline gap-2">
                            <span className={plan.price === 'Sur mesure' ? "text-4xl font-black text-[#173E7D] tracking-tighter uppercase" : "text-6xl font-black text-[#173E7D] tracking-tighter"}>{plan.price}</span>
                            {plan.price !== 'Sur mesure' && <span className="text-gray-400 font-bold text-xl uppercase tracking-widest">DA</span>}
                          </div>
                          {plan.name === 'Annonces' && (
                            <div className="mt-3 inline-flex px-4 py-1.5 bg-orange-100/50 text-[#F68D58] rounded-full text-[9px] font-black uppercase tracking-[0.2em] border border-orange-200/30">
                              PAR OFFRE
                            </div>
                          )}
                        </div>

                    <ul className="relative z-10 space-y-5 mb-16 flex-1">
                      <p className="text-[9px] font-black text-[#173E7D]/30 uppercase tracking-[0.3em] mb-6">Ce qui est inclus</p>
                      {plan.features.map((f, j) => (
                        <li key={j} className="flex items-start gap-4 group/item">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 border shadow-sm transition-transform group-hover/item:scale-110 ${
                            plan.popular ? 'bg-orange-50 text-[#F68D58] border-orange-100' : 'bg-emerald-50 text-emerald-500 border-emerald-100'
                          }`}>
                            <Check size={12} strokeWidth={4} />
                          </div>
                          <span className="text-sm font-bold text-gray-600">{f}</span>
                        </li>
                      ))}
                    </ul>

                    <button 
                      onClick={() => {
                        setSelectedPlan(plan);
                        setSettingsTab('billing');
                        setBillingView('payment');
                        setActiveTab('settings');
                      }}
                      className={`relative z-10 w-full py-6 rounded-[2rem] font-black text-[11px] uppercase tracking-[0.2em] transition-all duration-500 ${
                        plan.popular 
                          ? 'bg-[#F68D58] text-white shadow-[0_20px_40px_-5px_rgba(246,141,88,0.3)] hover:bg-[#e57d47]' 
                          : 'bg-white text-[#173E7D] border-2 border-[#173E7D] hover:bg-[#173E7D] hover:text-white'
                      }`}
                    >
                      {lt('Choose this plan', 'Choisir ce plan', 'اختيار هذه الباقة')}
                    </button>
                  </motion.div>
                ))}
              </div>
            </div>
          );
        case 'post-job':
          return (
            <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 p-12 space-y-12">
              <div className={`flex items-center gap-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400">
                  <PlusCircle size={32} />
                </div>
                <div className={isRTL ? 'text-right' : ''}>
                  <h2 className="text-3xl font-display font-bold text-[#173E7D]">{t('postJob')}</h2>
                  <p className="text-gray-500 mt-1">Remplissez les détails pour attirer les meilleurs candidats</p>
                </div>
              </div>

              <form onSubmit={handlePostJob} className="space-y-10">
                <div className={`space-y-3 ${isRTL ? 'text-right' : ''}`}>
                  <label className="text-sm font-bold text-gray-900">{t('position')} *</label>
                  <input 
                    type="text" 
                    required
                    placeholder="ex: Développeur Full Stack Senior" 
                    value={newJobData.title}
                    onChange={(e) => setNewJobData({...newJobData, title: e.target.value})}
                    className={`w-full px-6 py-4 rounded-2xl border border-gray-100 outline-none focus:border-[#173E7D] transition-all bg-white text-gray-700 ${isRTL ? 'text-right' : ''}`} 
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className={`space-y-3 ${isRTL ? 'text-right' : ''}`}>
                    <label className="text-sm font-bold text-gray-900">{t('sector')} *</label>
                    <select 
                      value={newJobData.sector}
                      onChange={(e) => setNewJobData({...newJobData, sector: e.target.value})}
                      className={`w-full px-6 py-4 rounded-2xl border border-gray-100 outline-none focus:border-[#173E7D] transition-all bg-white text-gray-700 ${isRTL ? 'text-right' : ''}`}
                    >
                      <option>Technologie</option>
                      <option>Santé</option>
                      <option>Finance</option>
                      <option>Éducation</option>
                      <option>Construction</option>
                      <option>Commerce</option>
                    </select>
                  </div>
                  <div className={`space-y-3 ${isRTL ? 'text-right' : ''}`}>
                    <label className="text-sm font-bold text-gray-900">Wilaya *</label>
                    <select 
                      value={newJobData.wilaya}
                      onChange={(e) => setNewJobData({...newJobData, wilaya: e.target.value})}
                      className={`w-full px-6 py-4 rounded-2xl border border-gray-100 outline-none focus:border-[#173E7D] transition-all bg-white text-gray-700 ${isRTL ? 'text-right' : ''}`}
                    >
                      {WILAYAS.map(w => <option key={w} value={w}>{w}</option>)}
                    </select>
                  </div>
                  <div className={`space-y-3 ${isRTL ? 'text-right' : ''}`}>
                    <label className="text-sm font-bold text-gray-900">{t('contractType')} *</label>
                    <select 
                      value={newJobData.type}
                      onChange={(e) => setNewJobData({...newJobData, type: e.target.value})}
                      className={`w-full px-6 py-4 rounded-2xl border border-gray-100 outline-none focus:border-[#173E7D] transition-all bg-white text-gray-700 ${isRTL ? 'text-right' : ''}`}
                    >
                      <option>Temps plein</option>
                      <option>Temps partiel</option>
                      <option>Freelance</option>
                      <option>Stage</option>
                      <option>CDI</option>
                      <option>CDD</option>
                    </select>
                  </div>
                  <div className={`space-y-3 ${isRTL ? 'text-right' : ''}`}>
                    <label className="text-sm font-bold text-gray-900">Niveau d'expérience *</label>
                    <select 
                      value={newJobData.experience}
                      onChange={(e) => setNewJobData({...newJobData, experience: e.target.value})}
                      className={`w-full px-6 py-4 rounded-2xl border border-gray-100 outline-none focus:border-[#173E7D] transition-all bg-white text-gray-700 ${isRTL ? 'text-right' : ''}`}
                    >
                      <option>Débutant (0-2 ans)</option>
                      <option>Confirmé (3-5 ans)</option>
                      <option>Senior (5-10 ans)</option>
                      <option>Expert (10+ ans)</option>
                    </select>
                  </div>
                  <div className={`space-y-3 ${isRTL ? 'text-right' : ''}`}>
                    <label className="text-sm font-bold text-gray-900">Salaire minimum (DZD/mois)</label>
                    <input 
                      type="number" 
                      placeholder="ex: 80000" 
                      value={newJobData.salaryMin}
                      onChange={(e) => setNewJobData({...newJobData, salaryMin: e.target.value})}
                      className={`w-full px-6 py-4 rounded-2xl border border-gray-100 outline-none focus:border-[#173E7D] transition-all bg-white text-gray-700 ${isRTL ? 'text-right' : ''}`} 
                    />
                  </div>
                  <div className={`space-y-3 ${isRTL ? 'text-right' : ''}`}>
                    <label className="text-sm font-bold text-gray-900">Salaire maximum (DZD/mois)</label>
                    <input 
                      type="number" 
                      placeholder="ex: 150000" 
                      value={newJobData.salaryMax}
                      onChange={(e) => setNewJobData({...newJobData, salaryMax: e.target.value})}
                      className={`w-full px-6 py-4 rounded-2xl border border-gray-100 outline-none focus:border-[#173E7D] transition-all bg-white text-gray-700 ${isRTL ? 'text-right' : ''}`} 
                    />
                  </div>
                </div>

                <div className={`space-y-3 ${isRTL ? 'text-right' : ''}`}>
                  <label className="text-sm font-bold text-gray-900">Description du poste *</label>
                  <textarea 
                    rows={6} 
                    required
                    placeholder="Décrivez les responsabilités, l'environnement de travail..." 
                    value={newJobData.description}
                    onChange={(e) => setNewJobData({...newJobData, description: e.target.value})}
                    className={`w-full px-6 py-4 rounded-2xl border border-gray-100 outline-none focus:border-[#173E7D] transition-all bg-white text-gray-700 resize-none ${isRTL ? 'text-right' : ''}`} 
                  />
                </div>

                <div className={`space-y-3 ${isRTL ? 'text-right' : ''}`}>
                  <label className="text-sm font-bold text-gray-900">Exigences (une par ligne)</label>
                  <textarea 
                    rows={4} 
                    placeholder="Maîtrise de React.js&#10;3+ ans d'expérience&#10;Français courant" 
                    value={newJobData.requirements}
                    onChange={(e) => setNewJobData({...newJobData, requirements: e.target.value})}
                    className={`w-full px-6 py-4 rounded-2xl border border-gray-100 outline-none focus:border-[#173E7D] transition-all bg-white text-gray-700 resize-none ${isRTL ? 'text-right' : ''}`} 
                  />
                </div>

                <div className={`space-y-3 ${isRTL ? 'text-right' : ''}`}>
                  <label className="text-sm font-bold text-gray-900">Avantages (une par ligne)</label>
                  <textarea 
                    rows={4} 
                    placeholder="Assurance maladie&#10;Transport assuré&#10;Prime de performance" 
                    value={newJobData.benefits}
                    onChange={(e) => setNewJobData({...newJobData, benefits: e.target.value})}
                    className={`w-full px-6 py-4 rounded-2xl border border-gray-100 outline-none focus:border-[#173E7D] transition-all bg-white text-gray-700 resize-none ${isRTL ? 'text-right' : ''}`} 
                  />
                </div>

                <div className={`space-y-3 ${isRTL ? 'text-right' : ''}`}>
                  <label className="text-sm font-bold text-gray-900">Date limite de candidature</label>
                  <input 
                    type="date" 
                    value={newJobData.deadline}
                    onChange={(e) => setNewJobData({...newJobData, deadline: e.target.value})}
                    className={`w-full px-6 py-4 rounded-2xl border border-gray-100 outline-none focus:border-[#173E7D] transition-all bg-white text-gray-700 ${isRTL ? 'text-right' : ''}`} 
                  />
                </div>

                <div className="pt-8 border-t border-gray-100 flex flex-col md:flex-row gap-4">
                  <button type="submit" className="flex-1 bg-[#0F172A] text-white px-12 py-5 rounded-full font-bold hover:bg-[#1e293b] transition-all shadow-xl shadow-slate-900/20 flex items-center justify-center gap-3">
                    🚀 Publier l'offre
                  </button>
                  <button type="button" className="flex-1 bg-white text-gray-900 border border-gray-200 px-12 py-5 rounded-full font-bold hover:bg-gray-50 transition-all flex items-center justify-center gap-3">
                    Sauvegarder brouillon
                  </button>
                </div>
              </form>
            </div>
          );
        case 'profile':
          return (
            <div className="bg-white rounded-[3rem] shadow-sm border border-gray-100 p-12 space-y-12">
              <div className={isRTL ? 'text-right' : ''}>
                <h2 className="text-4xl font-display font-black text-[#173E7D] tracking-tight">{t('companyProfile')}</h2>
                <p className="text-gray-500 mt-1 font-medium">Gérez les informations de votre entreprise visibles par les candidats.</p>
              </div>
              
              <div className="flex flex-col md:flex-row gap-12">
                <div className="flex flex-col items-center gap-4">
                  <div className="w-40 h-40 rounded-[2.5rem] overflow-hidden border-4 border-gray-50 shadow-lg group relative">
                    <img src={user?.photoURL || 'https://picsum.photos/seed/company/200/200'} alt="Logo de l'entreprise" className="w-full h-full object-cover" />
                    <button className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                      <Camera size={24} />
                    </button>
                  </div>
                  <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Logo de l'entreprise</p>
                </div>

                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className={`space-y-3 ${isRTL ? 'text-right' : ''}`}>
                    <label className="text-sm font-black text-[#173E7D] uppercase tracking-widest">{t('company')}</label>
                    <input type="text" defaultValue="TechDz Solutions" className={`w-full px-6 py-4 rounded-2xl border border-gray-100 outline-none focus:border-[#173E7D] transition-all bg-gray-50/50 text-gray-700 font-bold ${isRTL ? 'text-right' : ''}`} />
                  </div>
                  <div className={`space-y-3 ${isRTL ? 'text-right' : ''}`}>
                    <label className="text-sm font-black text-[#173E7D] uppercase tracking-widest">Secteur</label>
                    <input type="text" defaultValue="Technologie" className={`w-full px-6 py-4 rounded-2xl border border-gray-100 outline-none focus:border-[#173E7D] transition-all bg-gray-50/50 text-gray-700 font-bold ${isRTL ? 'text-right' : ''}`} />
                  </div>
                  <div className={`space-y-3 ${isRTL ? 'text-right' : ''}`}>
                    <label className="text-sm font-black text-[#173E7D] uppercase tracking-widest">Site Web</label>
                    <input type="url" defaultValue="https://techdz.com" className={`w-full px-6 py-4 rounded-2xl border border-gray-100 outline-none focus:border-[#173E7D] transition-all bg-gray-50/50 text-gray-700 font-bold ${isRTL ? 'text-right' : ''}`} />
                  </div>
                  <div className={`space-y-3 ${isRTL ? 'text-right' : ''}`}>
                    <label className="text-sm font-black text-[#173E7D] uppercase tracking-widest">Taille</label>
                    <select className={`w-full px-6 py-4 rounded-2xl border border-gray-100 outline-none focus:border-[#173E7D] transition-all bg-gray-50/50 text-gray-700 font-bold ${isRTL ? 'text-right' : ''}`}>
                      <option>1-10 employés</option>
                      <option>11-50 employés</option>
                      <option>51-200 employés</option>
                      <option>201+ employés</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className={`space-y-3 ${isRTL ? 'text-right' : ''}`}>
                <label className="text-sm font-black text-[#173E7D] uppercase tracking-widest">À propos de l'entreprise</label>
                <textarea rows={4} defaultValue="Leader dans le développement de solutions logicielles innovantes en Algérie..." className={`w-full px-6 py-4 rounded-2xl border border-gray-100 outline-none focus:border-[#173E7D] transition-all bg-gray-50/50 text-gray-700 font-bold resize-none ${isRTL ? 'text-right' : ''}`} />
              </div>

              <div className="flex justify-end pt-6 border-t border-gray-50">
                <button 
                  onClick={handleSaveProfile}
                  className="bg-[#173E7D] text-white px-12 py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-[#1e4fa1] transition-all shadow-lg shadow-blue-900/10"
                >
                  Sauvegarder les modifications
                </button>
              </div>
            </div>
          );
        case 'settings':
          return (
            <div className="space-y-8 pb-12">
              <div className={isRTL ? 'text-right' : ''}>
                <h2 className="text-4xl font-display font-bold text-[#173E7D] tracking-tight">{t('settings')}</h2>
                <p className="text-gray-500 mt-2">
                  {language === 'ar' 
                    ? 'إدارة تفضيلاتك وأمان حساب التوظيف الخاص بك.' 
                    : 'Gérez vos préférences et la sécurité de votre compte recruteur.'}
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column - Navigation/Categories */}
                <div className="lg:col-span-1 space-y-4">
                  <div className="bg-white rounded-3xl border border-gray-100 p-4 shadow-sm sticky top-8">
                    <nav className="space-y-1">
                      {[
                        { id: 'general', icon: Globe, label: t('language') },
                        { id: 'security', icon: Lock, label: t('settings_new.accountSecurity') },
                        { id: 'notifications', icon: Bell, label: t('settings_new.notificationsPrefs') },
                        { id: 'privacy', icon: Shield, label: t('settings_new.privacy') },
                        { id: 'team', icon: UsersIcon, label: t('settings_new.team') },
                        { id: 'billing', icon: CreditCard, label: t('subscription') },
                        { id: 'history', icon: History, label: language === 'ar' ? 'سجل النشاط' : 'Historique' },
                        { id: 'help', icon: HelpCircle, label: t('settings_new.helpSupport') }
                      ].map((item) => (
                        <button
                          key={item.id}
                          onClick={() => setSettingsTab(item.id)}
                          className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all font-bold text-sm ${
                            isRTL ? 'flex-row-reverse text-right' : 'text-left'
                          } ${
                            settingsTab === item.id 
                              ? 'bg-[#173E7D] text-white shadow-lg shadow-blue-200/50' 
                              : 'hover:bg-gray-50 text-gray-500 hover:text-[#173E7D]'
                          }`}
                        >
                          <item.icon size={20} />
                          {item.label}
                        </button>
                      ))}
                    </nav>
                  </div>
                </div>

                {/* Right Column - Content */}
                <div className="lg:col-span-2 space-y-8">
                  {settingsTab === 'general' && (
                    <div className="bg-white rounded-[2.5rem] border border-gray-100 p-10 shadow-sm space-y-8">
                      <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <div className="w-12 h-12 bg-blue-50 text-[#173E7D] rounded-2xl flex items-center justify-center">
                          <Globe size={24} />
                        </div>
                        <h3 className="text-xl font-bold text-[#173E7D]">{t('language')}</h3>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <button 
                          onClick={() => setLanguage('fr')}
                          className={`flex items-center justify-between p-6 rounded-2xl border-2 transition-all ${
                            language === 'fr' 
                              ? 'border-[#F68D58] bg-orange-50/50 shadow-lg shadow-orange-200/20' 
                              : 'border-gray-100 hover:border-gray-200 bg-white'
                          } ${isRTL ? 'flex-row-reverse' : ''}`}
                        >
                          <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm text-2xl">🇫🇷</div>
                            <div className={isRTL ? 'text-right' : 'text-left'}>
                              <div className="font-bold text-[#173E7D] text-lg">{t('french')}</div>
                              <div className="text-xs text-gray-400">Français</div>
                            </div>
                          </div>
                          {language === 'fr' && (
                            <div className="w-6 h-6 bg-[#F68D58] rounded-full flex items-center justify-center text-white">
                              <CheckCircle2 size={14} />
                            </div>
                          )}
                        </button>

                        <button 
                          onClick={() => setLanguage('ar')}
                          className={`flex items-center justify-between p-6 rounded-2xl border-2 transition-all ${
                            language === 'ar' 
                              ? 'border-[#F68D58] bg-orange-50/50 shadow-lg shadow-orange-200/20' 
                              : 'border-gray-100 hover:border-gray-200 bg-white'
                          } ${isRTL ? 'flex-row-reverse' : ''}`}
                        >
                          <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm text-2xl">🇩🇿</div>
                            <div className={isRTL ? 'text-right' : 'text-left'}>
                              <div className="font-bold text-[#173E7D] text-lg">{t('arabic')}</div>
                              <div className="text-xs text-gray-400">العربية</div>
                            </div>
                          </div>
                          {language === 'ar' && (
                            <div className="w-6 h-6 bg-[#F68D58] rounded-full flex items-center justify-center text-white">
                              <CheckCircle2 size={14} />
                            </div>
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {settingsTab === 'team' && (
                    <div className="bg-white rounded-[2.5rem] border border-gray-100 p-10 shadow-sm space-y-8">
                      <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                          <div className="w-12 h-12 bg-blue-50 text-[#173E7D] rounded-2xl flex items-center justify-center">
                            <UsersIcon size={24} />
                          </div>
                          <h3 className="text-xl font-bold text-[#173E7D]">{t('settings_new.team')}</h3>
                        </div>
                        {!isInvitingMember && (
                          <button 
                            onClick={() => setIsInvitingMember(true)}
                            className="px-6 py-3 bg-[#173E7D] text-white rounded-xl font-bold text-sm hover:bg-blue-800 transition-all flex items-center gap-2"
                          >
                            <Plus size={18} />
                            {t('settings_new.inviteMember')}
                          </button>
                        )}
                      </div>

                      {isInvitingMember && (
                        <motion.div 
                          initial={{ opacity: 0, y: -20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="p-6 bg-blue-50/50 rounded-3xl border border-blue-100 space-y-4"
                        >
                          <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center text-[#173E7D] shadow-sm">
                              <Mail size={20} />
                            </div>
                            <div className={`flex-1 ${isRTL ? 'text-right' : ''}`}>
                              <h4 className="font-bold text-[#173E7D]">{lt('Invite a new member', 'Inviter un nouveau membre', 'دعوة عضو جديد')}</h4>
                              <p className="text-xs text-gray-500">{lt('Enter the email of the person you want to invite.', 'Entrez l\'adresse e-mail de la personne que vous souhaitez inviter.', 'أدخل البريد الإلكتروني للشخص الذي تريد دعوته.')}</p>
                            </div>
                          </div>
                          <div className={`flex gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <input 
                              type="email" 
                              value={inviteEmail}
                              onChange={(e) => setInviteEmail(e.target.value)}
                              placeholder="email@exemple.com"
                              className={`flex-1 px-6 py-3 rounded-xl border border-blue-100 outline-none focus:border-[#173E7D] transition-all bg-white text-gray-700 font-bold ${isRTL ? 'text-right' : ''}`}
                            />
                            <button 
                              onClick={handleSendInvite}
                              disabled={isSendingInvite || !inviteEmail}
                              className="px-8 py-3 bg-[#173E7D] text-white rounded-xl font-bold text-sm hover:bg-blue-800 transition-all disabled:opacity-50 flex items-center gap-2"
                            >
                              {isSendingInvite ? (
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              ) : (
                                <Send size={18} />
                              )}
                              {language === 'ar' ? 'إرسال' : 'Envoyer'}
                            </button>
                            <button 
                              onClick={() => {
                                setIsInvitingMember(false);
                                setInviteEmail('');
                              }}
                              className="px-6 py-3 bg-white text-gray-500 border border-gray-200 rounded-xl font-bold text-sm hover:bg-gray-50 transition-all"
                            >
                              {lt('Cancel', 'Annuler', 'إلغاء')}
                            </button>
                          </div>
                        </motion.div>
                      )}

                      {/* Pending Access Requests (Notifications) */}
                      {notifications.filter(n => n.type === 'invitation_accepted' && !n.is_read).length > 0 && (
                        <div className="space-y-4">
                          <h4 className={`text-sm font-black text-[#F68D58] uppercase tracking-widest ${isRTL ? 'text-right' : ''}`}>
                            {lt('Pending Access Requests', 'Demandes d\'accès en attente', 'طلبات الوصول المعلقة')}
                          </h4>
                          {notifications.filter(n => n.type === 'invitation_accepted' && !n.is_read).map((notif, i) => (
                            <div key={i} className={`flex items-center justify-between p-6 bg-orange-50 border border-orange-100 rounded-3xl ${isRTL ? 'flex-row-reverse' : ''}`}>
                              <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-[#F68D58] shadow-sm">
                                  <UserPlus size={24} />
                                </div>
                                <div className={isRTL ? 'text-right' : ''}>
                                  <div className="font-bold text-[#173E7D]">{notif.title}</div>
                                  <div className="text-sm text-gray-600">{notif.message}</div>
                                </div>
                              </div>
                              <button 
                                onClick={() => handleGrantAccess(notif)}
                                className="px-6 py-3 bg-[#F68D58] text-white rounded-xl font-bold text-sm hover:bg-[#e57d47] transition-all shadow-lg shadow-orange-200/50"
                              >
                                {language === 'ar' ? 'منح الوصول' : 'Donner accès'}
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="space-y-4">
                        <h4 className={`text-sm font-black text-gray-400 uppercase tracking-widest ${isRTL ? 'text-right' : ''}`}>
                          {language === 'ar' ? 'أعضاء الفريق' : 'Membres de l\'équipe'}
                        </h4>
                        {teamMembers.map((member, i) => (
                          <div key={i} className={`flex items-center justify-between p-4 bg-gray-50 rounded-2xl ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center font-bold text-[#173E7D] shadow-sm">
                                {member.name.charAt(0)}
                              </div>
                              <div className={isRTL ? 'text-right' : ''}>
                                <div className="font-bold text-[#173E7D]">{member.name}</div>
                                <div className="text-xs text-gray-400">{member.email}</div>
                              </div>
                            </div>
                            <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                              <span className="text-xs font-bold text-gray-500 bg-gray-200 px-3 py-1 rounded-full">{member.role}</span>
                              <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-md ${member.status === (language === 'ar' ? 'نشط' : 'Actif') ? 'bg-emerald-100 text-emerald-600' : 'bg-orange-100 text-orange-600'}`}>
                                {member.status}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {settingsTab === 'help' && (
                    <div className="bg-white rounded-[2.5rem] border border-gray-100 p-10 shadow-sm space-y-8">
                      {!helpAction ? (
                        <>
                          <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <div className="w-12 h-12 bg-blue-50 text-[#173E7D] rounded-2xl flex items-center justify-center">
                              <HelpCircle size={24} />
                            </div>
                            <h3 className="text-xl font-bold text-[#173E7D]">{t('settings_new.helpSupport')}</h3>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {[
                              { id: 'help-center', title: t('settings_new.helpCenter'), desc: lt('Full guides and tutorials', 'Guides et tutoriels complets', 'أدلة ودروس كاملة'), icon: BookOpen },
                              { id: 'direct-support', title: t('settings_new.directSupport'), desc: lt('Contact our team 24/7', 'Contactez notre équipe 24/7', 'اتصل بفريقنا 24/7'), icon: MessageSquare },
                            ].map((item, i) => (
                              <button 
                                key={i} 
                                onClick={() => setHelpAction(item.id)}
                                className={`p-6 bg-gray-50 rounded-2xl hover:bg-gray-100 transition-all flex items-start gap-4 ${isRTL ? 'flex-row-reverse text-right' : 'text-left'}`}
                              >
                                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-[#173E7D] shadow-sm shrink-0">
                                  <item.icon size={20} />
                                </div>
                                <div>
                                  <div className="font-bold text-[#173E7D]">{item.title}</div>
                                  <div className="text-xs text-gray-400 mt-1">{item.desc}</div>
                                </div>
                              </button>
                            ))}
                          </div>
                        </>
                      ) : helpAction === 'help-center' ? (
                        <div className="space-y-8">
                          <button onClick={() => setHelpAction(null)} className={`flex items-center gap-2 text-[#173E7D] font-bold hover:gap-3 transition-all ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <ChevronLeft size={20} className={isRTL ? 'rotate-180' : ''} />
                            {language === 'ar' ? 'العودة' : 'Retour'}
                          </button>
                          <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <div className="w-12 h-12 bg-blue-50 text-[#173E7D] rounded-2xl flex items-center justify-center">
                              <BookOpen size={24} />
                            </div>
                            <h3 className="text-xl font-bold text-[#173E7D]">{t('settings_new.helpCenter')}</h3>
                          </div>
                          <article className={`prose prose-blue max-w-none ${isRTL ? 'text-right' : ''}`}>
                            <h4 className="text-2xl font-bold text-[#173E7D]">Comment utiliser la plateforme Dar L'emploi</h4>
                            <div className="mt-6 space-y-6 text-gray-600">
                              <p>
                                Bienvenue sur Dar L'emploi, la plateforme leader pour le recrutement en Algérie. 
                                Voici un guide rapide pour commencer :
                              </p>
                              <ul className="space-y-4 list-disc list-inside">
                                <li><strong>Publiez vos offres :</strong> Utilisez notre éditeur intuitif pour créer des offres d'emploi attrayantes.</li>
                                <li><strong>Gérez les candidatures :</strong> Suivez l'état de chaque candidat en temps réel dans votre tableau de bord.</li>
                                <li><strong>Utilisez l'IA :</strong> Notre algorithme de filtrage intelligent vous aide à identifier les meilleurs profils en quelques secondes.</li>
                                <li><strong>Collaborez en équipe :</strong> Invitez vos collègues et gérez les accès pour un processus de recrutement fluide.</li>
                              </ul>
                            </div>
                          </article>
                        </div>
                      ) : (
                        <div className="space-y-8">
                          <button onClick={() => setHelpAction(null)} className={`flex items-center gap-2 text-[#173E7D] font-bold hover:gap-3 transition-all ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <ChevronLeft size={20} className={isRTL ? 'rotate-180' : ''} />
                            {language === 'ar' ? 'العودة' : 'Retour'}
                          </button>
                          <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <div className="w-12 h-12 bg-blue-50 text-[#173E7D] rounded-2xl flex items-center justify-center">
                              <MessageSquare size={24} />
                            </div>
                            <h3 className="text-xl font-bold text-[#173E7D]">{t('settings_new.directSupport')}</h3>
                          </div>
                          
                          <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div className={`space-y-2 ${isRTL ? 'text-right' : ''}`}>
                                <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Adresse Email</label>
                                <input 
                                  type="email" 
                                  value={contactEmail}
                                  onChange={(e) => setContactEmail(e.target.value)}
                                  placeholder="votre@email.com"
                                  className={`w-full px-6 py-4 rounded-2xl border border-gray-100 outline-none focus:border-[#173E7D] transition-all bg-gray-50/50 text-gray-700 font-bold ${isRTL ? 'text-right' : ''}`} 
                                />
                              </div>
                              <div className={`space-y-2 ${isRTL ? 'text-right' : ''}`}>
                                <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Sujet</label>
                                <input 
                                  type="text" 
                                  value={contactSubject}
                                  onChange={(e) => setContactSubject(e.target.value)}
                                  placeholder="Comment pouvons-nous vous aider ?"
                                  className={`w-full px-6 py-4 rounded-2xl border border-gray-100 outline-none focus:border-[#173E7D] transition-all bg-gray-50/50 text-gray-700 font-bold ${isRTL ? 'text-right' : ''}`} 
                                />
                              </div>
                            </div>
                            <button className="w-full py-5 bg-[#173E7D] text-white rounded-2xl font-black uppercase tracking-widest hover:bg-[#0A1118] transition-all shadow-xl shadow-blue-900/20">
                              Envoyer le message
                            </button>

                            <div className={`p-8 bg-blue-50 rounded-[2rem] text-[#173E7D] font-bold text-center ${isRTL ? 'text-right' : ''}`}>
                              <p className="text-2xl">Contactez nous sur le : <span className="text-[#F68D58]">+213 542 98 23 46</span></p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {settingsTab === 'billing' && (
                    <div className="bg-white rounded-[2.5rem] border border-gray-100 p-10 shadow-sm space-y-8">
                      {showBillingSuccess && (
                        <motion.div 
                          initial={{ opacity: 0, y: -20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="p-6 bg-emerald-50 border border-emerald-100 rounded-3xl flex items-center gap-4 text-emerald-700 font-bold"
                        >
                          <CheckCircle2 className="shrink-0" />
                          <p>{billingSuccessMessage}</p>
                          <button onClick={() => setShowBillingSuccess(false)} className="ml-auto text-emerald-400 hover:text-emerald-600">
                            <X size={20} />
                          </button>
                        </motion.div>
                      )}
                      {billingView === 'current' ? (
                        <>
                          <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <div className="w-12 h-12 bg-orange-50 text-[#F68D58] rounded-2xl flex items-center justify-center">
                              <CreditCard size={24} />
                            </div>
                            <h3 className="text-xl font-bold text-[#173E7D]">{t('subscription')}</h3>
                          </div>

                          <div className="p-8 bg-gray-50 rounded-3xl border border-gray-100">
                            <div className={`flex items-center justify-between mb-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
                              <div>
                                <div className="text-sm text-gray-400 mb-1">{lt('Current Plan', 'Plan actuel', 'الخطة الحالية')}</div>
                                <div className="text-2xl font-black text-[#173E7D]">Plan Pro</div>
                              </div>
                              <div className="px-4 py-2 bg-emerald-100 text-emerald-600 rounded-xl text-xs font-black uppercase tracking-widest">
                                {lt('Active', 'Actif', 'نشط')}
                              </div>
                            </div>
                            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div className="h-full bg-[#F68D58] w-2/3"></div>
                            </div>
                            <div className={`flex justify-between mt-4 text-xs font-bold text-gray-400 ${isRTL ? 'flex-row-reverse' : ''}`}>
                              <span>{lt('20 days remaining', '20 jours restants', '20 يوم متبقية')}</span>
                              <span>{lt('Renewal on April 15', 'Renouvellement le 15 Avril', 'تجديد في 15 أفريل')}</span>
                            </div>
                          </div>

                          <div className="space-y-4">
                            <h4 className={`font-bold text-[#173E7D] ${isRTL ? 'text-right' : ''}`}>{lt('Payment Methods', 'Modes de paiement', 'طرق الدفع')}</h4>
                            <div className={`p-6 border border-gray-100 rounded-2xl flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                              <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                <div className="w-12 h-8 bg-gray-100 rounded flex items-center justify-center font-bold text-gray-400 text-[10px]">VISA</div>
                                <div className={isRTL ? 'text-right' : ''}>
                                  <div className="font-bold text-[#173E7D]">•••• •••• •••• 4242</div>
                                  <div className="text-xs text-gray-400">Expire 12/25</div>
                                </div>
                              </div>
                              <button className="text-[#F68D58] font-bold text-sm hover:underline">
                                {lt('Edit', 'Modifier', 'تعديل')}
                              </button>
                            </div>
                          </div>

                          <div className="pt-6 border-t border-gray-50">
                            <button 
                              onClick={() => setBillingView('plans')}
                              className="w-full py-4 bg-[#173E7D] text-white rounded-2xl font-black uppercase tracking-widest hover:bg-blue-800 transition-all shadow-lg shadow-blue-900/10"
                            >
                              {lt('Upgrade Plan', 'Mettre à niveau le plan', 'ترقية الخطة')}
                            </button>
                          </div>
                        </>
                      ) : billingView === 'plans' ? (
                        <div className="space-y-8">
                          <button onClick={() => setBillingView('current')} className={`flex items-center gap-2 text-[#173E7D] font-bold hover:gap-3 transition-all ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <ChevronLeft size={20} className={isRTL ? 'rotate-180' : ''} />
                            {language === 'ar' ? 'العودة' : 'Retour'}
                          </button>
                          
                          <div className={isRTL ? 'text-right' : ''}>
                            <h3 className="text-2xl font-bold text-[#173E7D]">{lt('Choose your plan', 'Choisissez votre plan', 'اختر خطتك')}</h3>
                            <p className="text-gray-400">{lt('Select the package that fits your recruitment needs.', 'Sélectionnez le forfait qui correspond à vos besoins de recrutement.', 'اختر الباقة التي تناسب احتياجات توظيفك.')}</p>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {[
                              { id: 'Gratuit', name: 'Gratuit', price: '0', features: ["1 offre d'emploi gratuite"], icon: <Zap size={32} /> },
                              { id: 'Annonces', name: 'Annonces', price: '5 900', features: ["Publication d'offres payantes", 'Multi-comptes (Gestionnaire)'], popular: true, icon: <Briefcase size={32} /> },
                              { id: 'Corporate', name: 'Corporate', price: 'Sur mesure', features: ['Publication illimitée', 'Filtrage par IA Gemini', 'Répertoire CV & Support'], icon: <Building2 size={32} /> }
                            ].map((plan, i) => (
                              <motion.div 
                                key={plan.id}
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.1 }}
                                whileHover={{ y: -10 }}
                                className={`group relative bg-white p-10 rounded-[3.5rem] flex flex-col h-full border transition-all duration-500 overflow-hidden ${
                                  plan.popular 
                                    ? 'border-[#F68D58] shadow-[0_30px_60px_-15px_rgba(246,141,88,0.15)] z-10' 
                                    : 'border-gray-100 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.03)] hover:shadow-[0_30px_60px_-15px_rgba(0,0,0,0.06)]'
                                }`}
                              >
                                {/* Decorative corner */}
                                <div className={`absolute top-0 right-0 w-24 h-24 rounded-bl-[3rem] -z-0 ${plan.popular ? 'bg-[#F68D58]/5' : 'bg-gray-50'}`} />

                                {plan.popular && (
                                  <div className="absolute top-6 right-6 bg-[#F68D58] text-white px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest shadow-lg z-20">
                                    {lt('Most Popular', 'Populaire', 'الأكثر شعبية')}
                                  </div>
                                )}

                                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-8 shadow-inner group-hover:scale-110 transition-transform duration-500 relative z-10 ${
                                  plan.popular ? 'bg-orange-50 text-[#F68D58]' : 'bg-gray-50 text-gray-400'
                                }`}>
                                  {React.cloneElement(plan.icon as React.ReactElement, { size: 24 })}
                                </div>

                                <div className="relative z-10 mb-6">
                                  <h4 className="text-2xl font-black text-[#173E7D] mb-1 tracking-tight">{plan.name}</h4>
                                  <div className="flex items-baseline gap-1">
                                    <span className={plan.price === 'Sur mesure' ? "text-2xl font-black text-[#173E7D] tracking-tighter uppercase" : "text-4xl font-black text-[#173E7D] tracking-tighter"}>{plan.price}</span>
                                    {plan.price !== 'Sur mesure' && <span className="text-gray-400 font-bold text-sm uppercase tracking-widest">DA</span>}
                                  </div>
                                  {plan.name === 'Annonces' && (
                                    <div className="mt-2 inline-flex px-3 py-1 bg-orange-100/50 text-[#F68D58] rounded-full text-[8px] font-black uppercase tracking-[0.2em] border border-orange-200/30">
                                      PAR OFFRE
                                    </div>
                                  )}
                                </div>

                                <ul className="relative z-10 space-y-4 mb-10 flex-1">
                                  {plan.features.map((f, i) => (
                                    <li key={i} className={`flex items-start gap-3 group/item ${isRTL ? 'flex-row-reverse' : ''}`}>
                                      <div className={`p-1 rounded-full shrink-0 mt-0.5 ${plan.popular ? 'bg-orange-50 text-[#F68D58]' : 'bg-emerald-50 text-emerald-500'}`}>
                                        <Check size={12} strokeWidth={4} />
                                      </div>
                                      <span className="text-xs font-bold text-gray-500">{f}</span>
                                    </li>
                                  ))}
                                </ul>

                                <button 
                                  onClick={() => {
                                    if (plan.id === 'Gratuit') {
                                      setBillingSuccessMessage(lt('Free plan activated successfully!', 'Plan Gratuit activé avec succès !', 'تم تفعيل الخطة المجانية بنجاح!'));
                                      setShowBillingSuccess(true);
                                      setBillingView('current');
                                    } else {
                                      setSelectedPlan(plan);
                                      setBillingView('payment');
                                    }
                                  }}
                                  className={`relative z-10 w-full py-5 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all duration-500 ${
                                    plan.popular 
                                      ? 'bg-[#F68D58] text-white shadow-lg shadow-orange-500/20 hover:bg-[#e57d47]' 
                                      : 'bg-white text-[#173E7D] border-2 border-[#173E7D] hover:bg-[#173E7D] hover:text-white'
                                  }`}
                                >
                                  {plan.id === 'Gratuit' ? lt('Activate', 'Activer', 'تفعيل') : lt('Choose', 'Choisir', 'اختيار')}
                                </button>
                              </motion.div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-8">
                          <button onClick={() => setBillingView('plans')} className={`flex items-center gap-2 text-[#173E7D] font-bold hover:gap-3 transition-all ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <ChevronLeft size={20} className={isRTL ? 'rotate-180' : ''} />
                            {language === 'ar' ? 'العودة' : 'Retour'}
                          </button>

                          <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <div className={isRTL ? 'text-right' : ''}>
                              <h3 className="text-2xl font-bold text-[#173E7D]">{lt('Secure Payment', 'Paiement Sécurisé', 'الدفع الآمن')}</h3>
                              <p className="text-gray-400">{lt('Complete your subscription to the plan', 'Complétez votre abonnement au plan', 'أكمل اشتراكك في باقة')} <span className="text-[#173E7D] font-bold">{selectedPlan?.name}</span></p>
                            </div>
                            <div className="text-right">
                              <div className="text-xs text-gray-400 uppercase font-black tracking-widest">{lt('Total to pay', 'Total à payer', 'إجمالي الدفع')}</div>
                              <div className="text-3xl font-black text-[#F68D58]">{selectedPlan?.price} DA</div>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                            {/* Payment Methods */}
                            <div className="space-y-6">
                              <h4 className={`font-bold text-[#173E7D] ${isRTL ? 'text-right' : ''}`}>{lt('Choose a payment method', 'Choisir une méthode de paiement', 'اختر وسيلة الدفع')}</h4>
                              <div className="grid grid-cols-1 gap-4">
                                {[
                                  { id: 'EDAHABIA', name: 'EDAHABIA', icon: '💳' },
                                  { id: 'Baridimob', name: 'Baridimob', icon: '📱' },
                                  { id: 'CCP', name: 'CCP', icon: '🏦' }
                                ].map((method) => (
                                  <button 
                                    key={method.id}
                                    onClick={() => setPaymentMethod(method.id as any)}
                                    className={`p-6 rounded-2xl border-2 transition-all flex items-center justify-between ${paymentMethod === method.id ? 'border-[#F68D58] bg-orange-50/50' : 'border-gray-100 hover:border-gray-200 bg-white'} ${isRTL ? 'flex-row-reverse' : ''}`}
                                  >
                                    <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                      <div className="text-2xl">{method.icon}</div>
                                      <span className="font-bold text-[#173E7D]">{method.name}</span>
                                    </div>
                                    {paymentMethod === method.id && (
                                      <div className="w-6 h-6 bg-[#F68D58] rounded-full flex items-center justify-center text-white">
                                        <CheckCircle2 size={14} />
                                      </div>
                                    )}
                                  </button>
                                ))}
                              </div>
                              <div className="flex items-center justify-center gap-2 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Propulsé par</span>
                                <span className="font-black text-[#173E7D] italic">Chargily Pay</span>
                              </div>
                            </div>

                            {/* Card Details */}
                            <div className="bg-gray-50 rounded-[2rem] p-8 border border-gray-100 space-y-6">
                              <h4 className={`font-bold text-[#173E7D] ${isRTL ? 'text-right' : ''}`}>{language === 'ar' ? 'معلومات البطاقة' : 'Informations de la carte'}</h4>
                              
                              <div className="space-y-4">
                                <div className={`space-y-2 ${isRTL ? 'text-right' : ''}`}>
                                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{language === 'ar' ? 'رقم البطاقة' : 'Numéro de carte'}</label>
                                  <div className="relative">
                                    <input 
                                      type="text" 
                                      placeholder="0000 0000 0000 0000"
                                      value={cardInfo.number}
                                      onChange={(e) => setCardInfo({...cardInfo, number: e.target.value})}
                                      className={`w-full px-6 py-4 rounded-xl border border-gray-200 outline-none focus:border-[#F68D58] transition-all bg-white text-gray-700 font-bold ${isRTL ? 'text-right' : ''}`}
                                    />
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300">
                                      <CreditCard size={20} />
                                    </div>
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                  <div className={`space-y-2 ${isRTL ? 'text-right' : ''}`}>
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{language === 'ar' ? 'تاريخ الانتهاء' : "Date d'expiration"}</label>
                                    <input 
                                      type="text" 
                                      placeholder="MM/YY"
                                      value={cardInfo.expiry}
                                      onChange={(e) => setCardInfo({...cardInfo, expiry: e.target.value})}
                                      className={`w-full px-6 py-4 rounded-xl border border-gray-200 outline-none focus:border-[#F68D58] transition-all bg-white text-gray-700 font-bold ${isRTL ? 'text-right' : ''}`}
                                    />
                                  </div>
                                  <div className={`space-y-2 ${isRTL ? 'text-right' : ''}`}>
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">CVC</label>
                                    <input 
                                      type="text" 
                                      placeholder="123"
                                      value={cardInfo.cvc}
                                      onChange={(e) => setCardInfo({...cardInfo, cvc: e.target.value})}
                                      className={`w-full px-6 py-4 rounded-xl border border-gray-200 outline-none focus:border-[#F68D58] transition-all bg-white text-gray-700 font-bold ${isRTL ? 'text-right' : ''}`}
                                    />
                                  </div>
                                </div>

                                <div className={`space-y-2 ${isRTL ? 'text-right' : ''}`}>
                                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{language === 'ar' ? 'الاسم على البطاقة' : 'Nom sur la carte'}</label>
                                  <input 
                                    type="text" 
                                    placeholder="NOM PRENOM"
                                    value={cardInfo.name}
                                    onChange={(e) => setCardInfo({...cardInfo, name: e.target.value})}
                                    className={`w-full px-6 py-4 rounded-xl border border-gray-200 outline-none focus:border-[#F68D58] transition-all bg-white text-gray-700 font-bold ${isRTL ? 'text-right' : ''}`}
                                  />
                                </div>
                              </div>

                              <button 
                                onClick={() => {
                                  setBillingSuccessMessage(language === 'ar' ? 'تم الدفع بنجاح عبر Chargily Pay!' : 'Paiement effectué avec succès via Chargily Pay !');
                                  setShowBillingSuccess(true);
                                  setBillingView('current');
                                }}
                                disabled={!paymentMethod || !cardInfo.number}
                                className="w-full py-5 bg-[#F68D58] text-white rounded-2xl font-black uppercase tracking-widest hover:bg-[#e57d47] transition-all shadow-xl shadow-orange-900/20 disabled:opacity-50"
                              >
                                {language === 'ar' ? 'تأكيد الدفع' : 'Confirmer le paiement'}
                              </button>
                              
                              <div className="flex items-center justify-center gap-2 text-gray-400">
                                <Lock size={12} />
                                <span className="text-[10px] font-bold uppercase tracking-widest">{language === 'ar' ? 'دفع مشفر SSL 256 بت' : 'Paiement crypté SSL 256-bit'}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {settingsTab === 'security' && (
                    <div className="space-y-8">
                      <div className="bg-white rounded-[2.5rem] border border-gray-100 p-10 shadow-sm space-y-8">
                        <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                          <div className="w-12 h-12 bg-blue-50 text-[#173E7D] rounded-2xl flex items-center justify-center">
                            <Lock size={24} />
                          </div>
                          <h3 className="text-xl font-bold text-[#173E7D]">{t('settings_new.accountSecurity')}</h3>
                        </div>
                        
                        <div className="space-y-6">
                          {/* Changer le mot de passe */}
                          <div className="p-6 bg-gray-50 rounded-2xl space-y-4">
                            <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                              <div className={isRTL ? 'text-right' : ''}>
                                <div className="font-bold text-[#173E7D]">{t('settings_new.changePassword')}</div>
                                <div className="text-xs text-gray-400">
                                  {language === 'ar' ? 'آخر تغيير قبل 3 أشهر' : 'Dernière modification il y a 3 mois'}
                                </div>
                              </div>
                              <button 
                                onClick={() => setIsChangingPassword(!isChangingPassword)}
                                className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold text-[#173E7D] hover:bg-gray-100 transition-all"
                              >
                                {isChangingPassword ? (language === 'ar' ? 'إلغاء' : 'Annuler') : (language === 'ar' ? 'تغيير' : 'Modifier')}
                              </button>
                            </div>

                            {isChangingPassword && (
                              <div className="pt-4 border-t border-gray-200 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                    <label className={`block text-xs font-bold text-gray-500 ${isRTL ? 'text-right' : ''}`}>
                                      {language === 'ar' ? 'كلمة المرور الجديدة' : 'Nouveau mot de passe'}
                                    </label>
                                    <input 
                                      type="password"
                                      value={newPassword}
                                      onChange={(e) => setNewPassword(e.target.value)}
                                      className={`w-full p-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#173E7D] outline-none text-sm ${isRTL ? 'text-right' : ''}`}
                                      placeholder="••••••••"
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <label className={`block text-xs font-bold text-gray-500 ${isRTL ? 'text-right' : ''}`}>
                                      {language === 'ar' ? 'تأكيد كلمة المرور' : 'Confirmation du mot de passe'}
                                    </label>
                                    <input 
                                      type="password"
                                      value={confirmPassword}
                                      onChange={(e) => setConfirmPassword(e.target.value)}
                                      className={`w-full p-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#173E7D] outline-none text-sm ${isRTL ? 'text-right' : ''}`}
                                      placeholder="••••••••"
                                    />
                                  </div>
                                </div>
                                <div className={`flex ${isRTL ? 'justify-start' : 'justify-end'}`}>
                                  <button 
                                    onClick={() => {
                                      if (!newPassword || !confirmPassword) {
                                        alert(language === 'ar' ? 'يرجى ملء جميع الحقول.' : 'Veuillez remplir tous les champs.');
                                        return;
                                      }
                                      if (newPassword !== confirmPassword) {
                                        alert(language === 'ar' ? 'كلمات المرور غير متطابقة.' : 'Les mots de passe ne correspondent pas.');
                                        return;
                                      }
                                      alert(language === 'ar' ? 'تم تحديث كلمة المرور بنجاح!' : 'Mot de passe mis à jour avec succès !');
                                      setIsChangingPassword(false);
                                      setNewPassword('');
                                      setConfirmPassword('');
                                    }}
                                    className="px-6 py-2 bg-[#173E7D] text-white rounded-xl text-sm font-bold hover:bg-blue-800 transition-all"
                                  >
                                    {language === 'ar' ? 'حفظ' : 'Enregistrer'}
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Authentification à deux facteurs */}
                          <div className={`p-6 bg-gray-50 rounded-2xl flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <div className={isRTL ? 'text-right' : ''}>
                              <div className="font-bold text-[#173E7D]">{t('settings_new.twoFactor')}</div>
                              <div className="text-xs text-gray-400">
                                {language === 'ar' ? 'أضف طبقة أمان إضافية' : 'Ajoutez une couche de sécurité supplémentaire'}
                              </div>
                            </div>
                            <div className="w-12 h-6 bg-gray-200 rounded-full relative cursor-pointer">
                              <div className={`absolute ${isRTL ? 'right-1' : 'left-1'} top-1 w-4 h-4 bg-white rounded-full shadow-sm`} />
                            </div>
                          </div>

                          {/* Email de récupération */}
                          <div className={`p-6 bg-gray-50 rounded-2xl flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-gray-400 shadow-sm">
                                <Shield size={20} />
                              </div>
                              <div className={isRTL ? 'text-right' : 'text-left'}>
                                <div className="font-bold text-[#173E7D]">Email de récupération</div>
                                <div className="text-xs text-gray-400">walid***@gmail.com</div>
                              </div>
                            </div>
                            <button className="text-sm font-bold text-[#173E7D] hover:underline">Modifier</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {settingsTab === 'notifications' && (
                    <div className="bg-white rounded-[2.5rem] border border-gray-100 p-10 shadow-sm space-y-8">
                      <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <div className="w-12 h-12 bg-orange-50 text-[#F68D58] rounded-2xl flex items-center justify-center">
                          <Bell size={24} />
                        </div>
                        <h3 className="text-xl font-bold text-[#173E7D]">{t('settings_new.notificationsPrefs')}</h3>
                      </div>

                      <div className="space-y-8">
                        <div className="space-y-4">
                          <h4 className={`text-xs font-black text-gray-400 uppercase tracking-widest ${isRTL ? 'text-right' : ''}`}>Canaux de réception</h4>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {[
                              { label: "Email", icon: Mail, active: true },
                              { label: "Push", icon: Bell, active: true }
                            ].map((channel, i) => (
                              <button key={i} className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all ${channel.active ? 'border-[#173E7D] bg-blue-50/30' : 'border-gray-100 hover:border-gray-200'} ${isRTL ? 'flex-row-reverse' : ''}`}>
                                <channel.icon size={18} className={channel.active ? 'text-[#173E7D]' : 'text-gray-400'} />
                                <span className={`font-bold text-sm ${channel.active ? 'text-[#173E7D]' : 'text-gray-400'}`}>{channel.label}</span>
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-6">
                          <h4 className={`text-xs font-black text-gray-400 uppercase tracking-widest ${isRTL ? 'text-right' : ''}`}>Types d'alertes</h4>
                          {[
                            { label: "Nouvelles candidatures", desc: "Recevoir une alerte dès qu'un candidat postule", active: true }
                          ].map((pref, idx) => (
                            <div key={idx} className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                              <div className={isRTL ? 'text-right' : ''}>
                                <div className="font-bold text-[#173E7D]">{pref.label}</div>
                                <div className="text-xs text-gray-400">{pref.desc}</div>
                              </div>
                              <div className={`w-12 h-6 ${pref.active ? 'bg-emerald-500' : 'bg-gray-200'} rounded-full relative cursor-pointer transition-colors`}>
                                <div className={`absolute ${pref.active ? (isRTL ? 'left-1' : 'right-1') : (isRTL ? 'right-1' : 'left-1')} top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all`} />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {settingsTab === 'privacy' && (
                    <div className="bg-white rounded-[2.5rem] border border-gray-100 p-10 shadow-sm space-y-8">
                      <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <div className="w-12 h-12 bg-emerald-50 text-emerald-500 rounded-2xl flex items-center justify-center">
                          <Shield size={24} />
                        </div>
                        <h3 className="text-xl font-bold text-[#173E7D]">{t('settings_new.privacy')}</h3>
                      </div>

                      <div className="space-y-6">
                        <div className={`flex items-center justify-between p-6 bg-gray-50 rounded-2xl ${isRTL ? 'flex-row-reverse' : ''}`}>
                          <div className={isRTL ? 'text-right' : ''}>
                            <div className="font-bold text-[#173E7D]">Visibilité de l'entreprise</div>
                            <div className="text-xs text-gray-400">Permettre aux candidats de voir votre profil entreprise</div>
                          </div>
                          <div className="w-12 h-6 bg-emerald-500 rounded-full relative cursor-pointer">
                            <div className={`absolute ${isRTL ? 'left-1' : 'right-1'} top-1 w-4 h-4 bg-white rounded-full shadow-sm`} />
                          </div>
                        </div>

                        <div className={`flex items-center justify-between p-6 bg-gray-50 rounded-2xl ${isRTL ? 'flex-row-reverse' : ''}`}>
                          <div className={isRTL ? 'text-right' : ''}>
                            <div className="font-bold text-[#173E7D]">Partage de données anonymes</div>
                            <div className="text-xs text-gray-400">Aidez-nous à améliorer nos services avec des stats anonymes</div>
                          </div>
                          <div className="w-12 h-6 bg-emerald-500 rounded-full relative cursor-pointer">
                            <div className={`absolute ${isRTL ? 'left-1' : 'right-1'} top-1 w-4 h-4 bg-white rounded-full shadow-sm`} />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {settingsTab === 'history' && (
                    <div className="bg-white rounded-[2.5rem] border border-gray-100 p-10 shadow-sm space-y-8">
                      <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <div className="w-12 h-12 bg-gray-50 text-gray-500 rounded-2xl flex items-center justify-center">
                          <History size={24} />
                        </div>
                        <h3 className="text-xl font-bold text-[#173E7D]">Historique d'activité</h3>
                      </div>
                      
                      <div className="space-y-4">
                        {[
                          { action: "Nouvelle offre publiée", date: "Aujourd'hui, 14:30", device: "Chrome on macOS" },
                          { action: "Candidat filtré par IA", date: "Hier, 10:15", device: "Desktop App" },
                          { action: "Mise à jour du profil entreprise", date: "15 Mars, 16:45", device: "Safari on iPhone" }
                        ].map((item, idx) => (
                          <div key={idx} className={`p-4 border-b border-gray-50 flex justify-between items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <div className={isRTL ? 'text-right' : ''}>
                              <div className="font-bold text-[#173E7D]">{item.action}</div>
                              <div className="text-xs text-gray-400">{item.device}</div>
                            </div>
                            <div className="text-xs font-medium text-gray-400">{item.date}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}


                  {settingsTab === 'notifications' && (
                    <div className="bg-white rounded-[2.5rem] border border-gray-100 p-10 shadow-sm space-y-8">
                      <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <div className="w-12 h-12 bg-orange-50 text-[#F68D58] rounded-2xl flex items-center justify-center">
                          <Bell size={24} />
                        </div>
                        <h3 className="text-xl font-bold text-[#173E7D]">{t('settings_new.notificationsPrefs')}</h3>
                      </div>

                      <div className="space-y-6">
                        {[
                          { label: "Nouvelles candidatures", desc: "Recevoir un email pour chaque nouveau candidat", active: true },
                          { label: "Alertes de sécurité", desc: "Notifications sur les connexions suspectes", active: true }
                        ].map((pref, idx) => (
                          <div key={idx} className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <div className={isRTL ? 'text-right' : ''}>
                              <div className="font-bold text-[#173E7D]">{pref.label}</div>
                              <div className="text-xs text-gray-400">{pref.desc}</div>
                            </div>
                            <div className={`w-12 h-6 ${pref.active ? 'bg-emerald-500' : 'bg-gray-200'} rounded-full relative cursor-pointer transition-colors`}>
                              <div className={`absolute ${pref.active ? (isRTL ? 'left-1' : 'right-1') : (isRTL ? 'right-1' : 'left-1')} top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all`} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {settingsTab === 'privacy' && (
                    <div className="bg-white rounded-[2.5rem] border border-gray-100 p-10 shadow-sm space-y-8">
                      <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <div className="w-12 h-12 bg-emerald-50 text-emerald-500 rounded-2xl flex items-center justify-center">
                          <Shield size={24} />
                        </div>
                        <h3 className="text-xl font-bold text-[#173E7D]">{t('settings_new.privacy')}</h3>
                      </div>

                      <div className="space-y-6">
                        <div className={`flex items-center justify-between p-6 bg-gray-50 rounded-2xl ${isRTL ? 'flex-row-reverse' : ''}`}>
                          <div className={isRTL ? 'text-right' : ''}>
                            <div className="font-bold text-[#173E7D]">Visibilité de l'entreprise</div>
                            <div className="text-xs text-gray-400">Permettre aux candidats de voir votre profil entreprise</div>
                          </div>
                          <div className="w-12 h-6 bg-emerald-500 rounded-full relative cursor-pointer">
                            <div className={`absolute ${isRTL ? 'left-1' : 'right-1'} top-1 w-4 h-4 bg-white rounded-full shadow-sm`} />
                          </div>
                        </div>

                        <div className={`flex items-center justify-between p-6 bg-gray-50 rounded-2xl ${isRTL ? 'flex-row-reverse' : ''}`}>
                          <div className={isRTL ? 'text-right' : ''}>
                            <div className="font-bold text-[#173E7D]">Partage de données analytiques</div>
                            <div className="text-xs text-gray-400">Aidez-nous à améliorer Dar L'emploi avec des données anonymes</div>
                          </div>
                          <div className="w-12 h-6 bg-emerald-500 rounded-full relative cursor-pointer">
                            <div className={`absolute ${isRTL ? 'left-1' : 'right-1'} top-1 w-4 h-4 bg-white rounded-full shadow-sm`} />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {settingsTab === 'history' && (
                    <div className="bg-white rounded-[2.5rem] border border-gray-100 p-10 shadow-sm space-y-8">
                      <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <div className="w-12 h-12 bg-gray-50 text-gray-500 rounded-2xl flex items-center justify-center">
                          <History size={24} />
                        </div>
                        <h3 className="text-xl font-bold text-[#173E7D]">{language === 'ar' ? 'سجل النشاط' : 'Historique d\'activité'}</h3>
                      </div>
                      
                      <div className="space-y-4">
                        {[
                          { action: "Connexion réussie", date: "Aujourd'hui, 14:30", device: "Chrome on Windows" },
                          { action: "Offre publiée", date: "Hier, 10:15", device: "Web Dashboard" },
                          { action: "Mise à jour du profil", date: "15 Mars, 16:45", device: "Safari on Mac" },
                          { action: "Changement de mot de passe", date: "10 Mars, 09:00", device: "Web Dashboard" }
                        ].map((item, idx) => (
                          <div key={idx} className={`p-4 border-b border-gray-50 flex justify-between items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <div className={isRTL ? 'text-right' : ''}>
                              <div className="font-bold text-[#173E7D]">{item.action}</div>
                              <div className="text-xs text-gray-400">{item.device}</div>
                            </div>
                            <div className="text-xs font-medium text-gray-400">{item.date}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        default:
          return <div className="p-12 text-center text-gray-400">Page non trouvée</div>;
      }
    }

    switch (activeTab) {
      case 'dashboard':
        return (
          <div className="space-y-8">
            <div className={`flex flex-col md:flex-row md:items-center justify-between gap-6 ${isRTL ? 'md:flex-row-reverse' : ''}`}>
              <div className={isRTL ? 'text-right' : ''}>
                <h1 className="text-4xl font-display font-bold text-[#173E7D] tracking-tight">
                  {t('welcome')}, {user?.displayName?.split(' ')[0] || (language === 'ar' ? 'باحث' : 'Chercheur')} ! 👋
                </h1>
                <p className="text-gray-500 mt-2 text-lg">{t('dashboardSubtitle')}</p>
              </div>
              <div className="flex items-center gap-4">
                <div className={`bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <div className="w-12 h-12 bg-orange-50 text-[#F68D58] rounded-xl flex items-center justify-center">
                    <TrendingUp size={24} />
                  </div>
                  <div className={isRTL ? 'text-right' : ''}>
                    <div className="text-2xl font-bold text-[#173E7D]">12</div>
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{t('newOffers')}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className={`bg-white p-8 rounded-3xl shadow-sm border border-gray-100 space-y-4 ${isRTL ? 'text-right' : ''}`}>
                <div className={`w-14 h-14 bg-blue-50 text-[#173E7D] rounded-2xl flex items-center justify-center ${isRTL ? 'mr-0 ml-auto' : ''}`}>
                  <ClipboardList size={28} />
                </div>
                <h3 className="text-xl font-bold text-[#173E7D]">{t('applicationsTitle')}</h3>
                <p className="text-gray-400 text-sm">{t('applicationsCount', { count: 5 })}</p>
                <button onClick={() => setActiveTab('applications')} className={`text-[#F68D58] font-bold text-sm flex items-center gap-2 hover:gap-3 transition-all ${isRTL ? 'flex-row-reverse' : ''}`}>
                  {t('viewAll')} <ChevronRight size={16} className={isRTL ? 'rotate-180' : ''} />
                </button>
              </div>
              <div className={`bg-white p-8 rounded-3xl shadow-sm border border-gray-100 space-y-4 ${isRTL ? 'text-right' : ''}`}>
                <div className={`w-14 h-14 bg-orange-50 text-[#F68D58] rounded-2xl flex items-center justify-center ${isRTL ? 'mr-0 ml-auto' : ''}`}>
                  <Bookmark size={28} />
                </div>
                <h3 className="text-xl font-bold text-[#173E7D]">{t('savedTitle')}</h3>
                <p className="text-gray-400 text-sm">{t('savedOffersCount', { count: 3 })}</p>
                <button onClick={() => setActiveTab('saved')} className={`text-[#F68D58] font-bold text-sm flex items-center gap-2 hover:gap-3 transition-all ${isRTL ? 'flex-row-reverse' : ''}`}>
                  {t('viewAll')} <ChevronRight size={16} className={isRTL ? 'rotate-180' : ''} />
                </button>
              </div>
              <div className={`bg-white p-8 rounded-3xl shadow-sm border border-gray-100 space-y-4 ${isRTL ? 'text-right' : ''}`}>
                <div className={`w-14 h-14 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center ${isRTL ? 'mr-0 ml-auto' : ''}`}>
                  <Bell size={28} />
                </div>
                <h3 className="text-xl font-bold text-[#173E7D]">{t('alertsTitle')}</h3>
                <p className="text-gray-400 text-sm">{t('alertsCount', { count: 2, query: 'Développeur React' })}</p>
                <button onClick={() => setActiveTab('notifications')} className={`text-[#F68D58] font-bold text-sm flex items-center gap-2 hover:gap-3 transition-all ${isRTL ? 'flex-row-reverse' : ''}`}>
                  {t('viewAll')} <ChevronRight size={16} className={isRTL ? 'rotate-180' : ''} />
                </button>
              </div>
            </div>
          </div>
        );
      case 'jobs':
        const filteredJobs = realJobs.filter(job => {
          const matchesSearch = job.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                               job.company.toLowerCase().includes(searchQuery.toLowerCase());
          const matchesWilaya = !selectedWilaya || job.location === selectedWilaya;
          const matchesType = !selectedType || job.type === selectedType;
          const matchesSector = !selectedSector || job.sector === selectedSector;
          
          let matchesSalary = true;
          if (selectedSalary) {
            const min = parseInt(selectedSalary);
            matchesSalary = job.salaryMin >= min;
          }

          return matchesSearch && matchesWilaya && matchesType && matchesSector && matchesSalary;
        });

        const JOB_TYPES = language === 'ar' 
          ? ['دوام كامل', 'عقد محدد المدة', 'تدريب', 'عمل حر', 'تمهين']
          : ['CDI', 'CDD', 'Stage', 'Freelance', 'Apprentissage'];
        const SECTORS = language === 'ar'
          ? [
            'المعلوماتية / التكنولوجيا',
            'التصميم / الإبداع',
            'الإدارة / التسيير',
            'التسويق / الاتصال',
            'المالية / المحاسبة',
            'الصحة / الطب',
            'التعليم / التكوين',
            'البيع / التجارة'
          ]
          : [
            'Informatique / Technologie',
            'Design / Création',
            'Management / Gestion',
            'Marketing / Communication',
            'Finance / Comptabilité',
            'Santé / Médical',
            'Éducation / Formation',
            'Vente / Commerce'
          ];
        const SALARY_RANGES = [
          { label: t('allSalaries'), value: '' },
          { label: '> 50k DZD', value: '50000' },
          { label: '> 100k DZD', value: '100000' },
          { label: '> 150k DZD', value: '150000' },
          { label: '> 200k DZD', value: '200000' },
        ];

        return (
          <div className="space-y-8">
            <div className={`flex justify-between items-end ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div>
                <h2 className="text-3xl font-display font-bold text-[#173E7D]">{t('jobs')}</h2>
                <p className="text-gray-500 mt-1">{t('jobsSubtitle')}</p>
              </div>
              <div className="text-sm font-bold text-[#F68D58] bg-orange-50 px-4 py-2 rounded-full">
                {t('offersFound', { count: filteredJobs.length })}
              </div>
            </div>

            {/* Main Search Bar */}
            <div className={`bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row items-center gap-4 ${isRTL ? 'md:flex-row-reverse' : ''}`}>
              <div className={`flex-1 flex items-center gap-4 w-full ${isRTL ? 'flex-row-reverse' : ''}`}>
                <Search className="text-gray-400 shrink-0" />
                <input 
                  type="text" 
                  placeholder={t('searchPlaceholder')} 
                  className={`w-full outline-none font-medium ${isRTL ? 'text-right' : ''}`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="hidden md:block h-8 w-px bg-gray-100" />
              <div className={`flex-1 flex items-center gap-4 w-full ${isRTL ? 'flex-row-reverse' : ''}`}>
                <MapPin className="text-gray-400 shrink-0" />
                <select 
                  className={`w-full outline-none font-medium bg-transparent appearance-none cursor-pointer ${isRTL ? 'text-right' : ''}`}
                  value={selectedWilaya}
                  onChange={(e) => setSelectedWilaya(e.target.value)}
                >
                  <option value="">{t('allWilayas')}</option>
                  {WILAYAS.map(w => <option key={w} value={w}>{w}</option>)}
                </select>
              </div>
              <button className="w-full md:w-auto bg-[#F68D58] text-white px-8 py-3 rounded-xl font-bold hover:bg-[#e57d47] transition-colors">
                {t('find')}
              </button>
            </div>

            {/* Filters Row */}
            <div className={`flex flex-wrap gap-4 items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className={`flex items-center gap-2 text-[#173E7D] font-bold ${isRTL ? 'ml-2' : 'mr-2'}`}>
                <Filter size={18} />
                <span className="text-sm uppercase tracking-wider">{t('filters')}:</span>
              </div>
              
              {/* Job Type Filter */}
              <select 
                className={`px-4 py-2 bg-white border border-gray-100 rounded-xl text-sm font-bold text-gray-600 outline-none focus:border-[#F68D58] transition-all cursor-pointer ${isRTL ? 'text-right' : ''}`}
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
              >
                <option value="">{t('contractType')}</option>
                {JOB_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>

              {/* Sector Filter */}
              <select 
                className={`px-4 py-2 bg-white border border-gray-100 rounded-xl text-sm font-bold text-gray-600 outline-none focus:border-[#F68D58] transition-all cursor-pointer ${isRTL ? 'text-right' : ''}`}
                value={selectedSector}
                onChange={(e) => setSelectedSector(e.target.value)}
              >
                <option value="">{t('sector')}</option>
                {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>

              {/* Salary Filter */}
              <select 
                className={`px-4 py-2 bg-white border border-gray-100 rounded-xl text-sm font-bold text-gray-600 outline-none focus:border-[#F68D58] transition-all cursor-pointer ${isRTL ? 'text-right' : ''}`}
                value={selectedSalary}
                onChange={(e) => setSelectedSalary(e.target.value)}
              >
                {SALARY_RANGES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>

              {/* Clear Filters */}
              {(searchQuery || selectedWilaya || selectedType || selectedSalary || selectedSector) && (
                <button 
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedWilaya('');
                    setSelectedType('');
                    setSelectedSalary('');
                    setSelectedSector('');
                  }}
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-bold text-red-500 hover:bg-red-50 rounded-xl transition-all ${isRTL ? 'flex-row-reverse' : ''}`}
                >
                  <X size={16} />
                  {t('clear')}
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredJobs.length > 0 ? (
                filteredJobs.map((job) => (
                  <JobCard 
                    key={job.id} 
                    job={job} 
                    isSaved={savedJobs.includes(job.id)} 
                    onToggleSave={toggleSaveJob} 
                  />
                ))
              ) : (
                <div className="bg-white p-20 rounded-[3rem] border border-dashed border-gray-200 flex flex-col items-center justify-center text-center space-y-4">
                  <div className="w-20 h-20 bg-gray-50 text-gray-300 rounded-full flex items-center justify-center">
                    <Search size={40} />
                  </div>
                  <h3 className="text-xl font-bold text-[#173E7D]">{t('noJobsFound')}</h3>
                  <p className="text-gray-400 max-w-xs">
                    {language === 'ar' 
                      ? 'حاول تعديل الفلاتر أو البحث للعثور على المزيد من الفرص.' 
                      : 'Essayez de modifier vos filtres ou votre recherche pour trouver plus d\'opportunités.'}
                  </p>
                  <button 
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedWilaya('');
                      setSelectedType('');
                      setSelectedSalary('');
                      setSelectedSector('');
                    }}
                    className="px-8 py-3 bg-[#173E7D] text-white rounded-full font-bold hover:bg-[#0A1118] transition-all"
                  >
                    {t('resetFilters')}
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      case 'applications':
        return (
          <div className="space-y-8">
            <h2 className={`text-3xl font-display font-bold text-[#173E7D] ${isRTL ? 'text-right' : ''}`}>{t('myApplications')}</h2>
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className={`w-full ${isRTL ? 'text-right' : 'text-left'}`}>
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="px-8 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest">{t('company')}</th>
                      <th className="px-8 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest">{t('position')}</th>
                      <th className="px-8 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest">{t('date')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {[
                      { company: 'Ooredoo', role: 'UX Designer', date: language === 'ar' ? '12 مارس 2024' : '12 Mars 2024', status: language === 'ar' ? 'قيد المراجعة' : 'En examen', color: 'text-blue-600 bg-blue-50' },
                      { company: 'Yassir', role: 'Product Manager', date: language === 'ar' ? '10 مارس 2024' : '10 Mars 2024', status: language === 'ar' ? 'مقابلة' : 'Entretien', color: 'text-orange-600 bg-orange-50' },
                      { company: 'Sonatrach', role: 'Ingénieur IT', date: language === 'ar' ? '05 مارس 2024' : '05 Mars 2024', status: language === 'ar' ? 'مرفوض' : 'Refusé', color: 'text-red-600 bg-red-50' },
                    ].map((app, i) => (
                      <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-8 py-6 font-bold text-[#173E7D]">{app.company}</td>
                        <td className="px-8 py-6 text-gray-600 font-medium">{app.role}</td>
                        <td className="px-8 py-6 text-gray-400 text-sm">{app.date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      case 'profile':
        return (
          <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 p-12 space-y-12">
            <div className={`flex flex-col md:flex-row justify-between items-start gap-8 ${isRTL ? 'md:flex-row-reverse' : ''}`}>
              <div className={`space-y-4 ${isRTL ? 'text-right' : ''}`}>
                <h2 className="text-4xl font-display font-bold text-[#173E7D] tracking-tight">{profileData.name}</h2>
                <p className="text-gray-400 font-medium">{profileData.email}</p>
                <div className={`flex gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <span className="px-4 py-1.5 bg-blue-50 text-[#173E7D] text-xs font-bold rounded-full">{profileData.jobTitle}</span>
                  <span className="px-4 py-1.5 bg-gray-50 text-gray-500 text-xs font-bold rounded-full">{profileData.location}</span>
                </div>
              </div>
              <button
                onClick={handleChangePhotoClick}
                disabled={uploadingAvatar}
                className="px-8 py-3.5 rounded-full border border-gray-200 text-gray-700 font-bold hover:bg-gray-50 transition-all disabled:opacity-60"
              >
                {uploadingAvatar
                  ? (language === 'ar' ? 'جارٍ الرفع...' : 'Envoi en cours...')
                  : (language === 'ar' ? 'تغيير الصورة' : 'Modifier la photo')}
              </button>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={handleAvatarFileChange}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
              <div className={`space-y-3 ${isRTL ? 'text-right' : ''}`}>
                <label className="text-sm font-bold text-gray-900">{t('fullName')}</label>
                <input 
                  type="text" 
                  value={profileData.name}
                  onChange={(e) => setProfileData({...profileData, name: e.target.value})}
                  className={`w-full px-6 py-4 rounded-2xl border border-gray-100 outline-none focus:border-[#173E7D] transition-all bg-white text-gray-700 ${isRTL ? 'text-right' : ''}`}
                />
              </div>
              <div className={`space-y-3 ${isRTL ? 'text-right' : ''}`}>
                <label className="text-sm font-bold text-gray-900">Email</label>
                <input 
                  type="email" 
                  value={profileData.email}
                  onChange={(e) => setProfileData({...profileData, email: e.target.value})}
                  className={`w-full px-6 py-4 rounded-2xl border border-gray-100 outline-none focus:border-[#173E7D] transition-all bg-white text-gray-700 ${isRTL ? 'text-right' : ''}`}
                />
              </div>
              <div className={`space-y-3 ${isRTL ? 'text-right' : ''}`}>
                <label className="text-sm font-bold text-gray-900">{t('phone')}</label>
                <input 
                  type="tel" 
                  value={profileData.phone}
                  onChange={(e) => setProfileData({...profileData, phone: e.target.value})}
                  className={`w-full px-6 py-4 rounded-2xl border border-gray-100 outline-none focus:border-[#173E7D] transition-all bg-white text-gray-700 ${isRTL ? 'text-right' : ''}`}
                />
              </div>
              <div className={`space-y-3 ${isRTL ? 'text-right' : ''}`}>
                <label className="text-sm font-bold text-gray-900">Wilaya</label>
                <select 
                  value={profileData.wilaya}
                  onChange={(e) => setProfileData({...profileData, wilaya: e.target.value})}
                  className={`w-full px-6 py-4 rounded-2xl border border-gray-100 outline-none focus:border-[#173E7D] transition-all bg-white text-gray-700 appearance-none ${isRTL ? 'text-right' : ''}`}
                >
                  {WILAYAS.map(w => <option key={w} value={w}>{w}</option>)}
                </select>
              </div>
              <div className={`md:col-span-2 space-y-3 ${isRTL ? 'text-right' : ''}`}>
                <label className="text-sm font-bold text-gray-900">{t('bio')}</label>
                <textarea 
                  rows={5}
                  value={profileData.bio}
                  onChange={(e) => setProfileData({...profileData, bio: e.target.value})}
                  placeholder={t('bioPlaceholder')}
                  className={`w-full px-6 py-4 rounded-2xl border border-gray-100 outline-none focus:border-[#173E7D] transition-all bg-white text-gray-700 resize-none ${isRTL ? 'text-right' : ''}`}
                />
              </div>
            </div>

            <div className={`flex flex-col sm:flex-row ${isRTL ? 'justify-start' : 'justify-end'} gap-4 items-center`}>
              {/* The uploaded CV, shown as a real file rather than a bare link:
                  format, size and a way to open it, so the candidate can see
                  that the right document actually landed. */}
              {profileData.resumeUrl && (
                <div className={`w-full flex items-center gap-4 p-5 bg-emerald-50 border border-emerald-100 rounded-[1.5rem] ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <div className="w-12 h-12 shrink-0 rounded-2xl bg-white border border-emerald-100 flex items-center justify-center text-emerald-600">
                    <FileText size={22} />
                  </div>

                  <div className={`flex-1 min-w-0 ${isRTL ? 'text-right' : ''}`}>
                    <p className="font-black text-[#173E7D] text-sm truncate">
                      {(cvAsset as any)?.fileName
                        || decodeURIComponent(profileData.resumeUrl.split('/').pop() || '')
                        || lt('Your CV', 'Votre CV', 'سيرتك الذاتية')}
                    </p>
                    <p className={`flex items-center gap-2 text-[11px] font-bold text-emerald-700/70 uppercase tracking-widest mt-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <CheckCircle2 size={13} />
                      {lt('Uploaded', 'Téléversé', 'تم الرفع')}
                      {cvAsset?.extension && <span>· {cvAsset.extension.toUpperCase()}</span>}
                      {cvAsset?.size ? <span>· {(cvAsset.size / 1024 / 1024).toFixed(2)} MB</span> : null}
                    </p>
                  </div>

                  <a
                    href={profileData.resumeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 px-5 py-2.5 bg-white text-emerald-700 border border-emerald-200 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-100 transition-all"
                  >
                    {lt('Open', 'Ouvrir', 'فتح')}
                  </a>
                </div>
              )}

              <div className="relative">
                <input
                  type="file"
                  id="cv-upload"
                  className="hidden"
                  accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={handleFileUpload}
                  disabled={isUploading}
                />
                <label
                  htmlFor="cv-upload"
                  className={`px-8 py-4 bg-gray-100 text-[#173E7D] rounded-full font-bold hover:bg-gray-200 transition-all cursor-pointer flex items-center gap-2 ${isUploading ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}`}
                >
                  {isUploading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-[#173E7D]/25 border-t-[#173E7D] rounded-full animate-spin" />
                      {lt('Uploading…', 'Téléversement…', 'جارٍ الرفع…')}
                    </>
                  ) : (
                    <>
                      {/* Upload, not Download — the icon pointed the wrong way. */}
                      <Upload size={20} />
                      {profileData.resumeUrl
                        ? lt('Replace CV', 'Remplacer le CV', 'استبدال السيرة')
                        : lt('Upload CV', 'Téléverser un CV', 'رفع السيرة الذاتية')}
                    </>
                  )}
                </label>
                <p className={`text-[11px] text-gray-400 font-medium mt-2 ${isRTL ? 'text-right' : ''}`}>
                  {lt('PDF, DOC or DOCX · max 10 MB', 'PDF, DOC ou DOCX · 10 Mo max', 'PDF أو DOC أو DOCX · 10 ميغابايت كحد أقصى')}
                </p>
              </div>
              <OralPresentationCard isDemo={isDemo}/>
              <button 
                onClick={handleSaveProfile}
                className="px-12 py-4 bg-[#0A1118] text-white rounded-full font-bold hover:bg-[#173E7D] transition-all shadow-xl"
              >
                {t('saveChanges')}
              </button>
            </div>
          </div>
        );
      case 'cv-maker':
        return (
          <div className="space-y-12">
            {/* Editor Side - Full Width */}
            <div className="w-full space-y-8">
              <div className="bg-white p-8 md:p-12 rounded-[3rem] border border-gray-100 shadow-sm space-y-10">
                <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <div>
                    <h3 className="text-3xl font-display font-black text-[#173E7D] tracking-tight">{t('cvEditor')}</h3>
                    <p className="text-gray-500 mt-1 font-medium">Remplissez vos informations pour générer votre CV professionnel.</p>
                  </div>
                  {/* <div className={`flex gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    {['moderne', 'classique', 'creatif'].map((m) => (
                      <button 
                        key={m}
                        onClick={() => setCvModel(m)}
                        className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${cvModel === m ? 'bg-[#173E7D] text-white shadow-lg shadow-blue-900/20' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}
                      >
                        {m}
                      </button>
                    ))}
                  </div> */}
                </div>

                <div className={`flex overflow-x-auto pb-4 gap-4 no-scrollbar ${isRTL ? 'flex-row-reverse' : ''}`}>
                  {[
                    { id: 'info', label: t('cv.personalInfo'), icon: User },
                    { id: 'exp', label: t('cv.experience'), icon: Briefcase },
                    { id: 'edu', label: t('cv.education'), icon: FileText },
                    // Skills and languages share one tab: the languages editor
                    // renders inside the skills section (see cvSection ===
                    // 'skills' below), so a separate 'lang' tab would just be a
                    // second door onto the same fields.
                    { id: 'skills', label: `${t('cv.skills')} & ${t('languages')}`, icon: BarChart3 }
                  ].map((s) => (
                    <button 
                      key={s.id}
                      onClick={() => setCvSection(s.id)}
                      className={`px-8 py-4 rounded-[2rem] flex items-center gap-4 font-black text-sm transition-all shrink-0 uppercase tracking-widest ${cvSection === s.id ? 'bg-[#F68D58] text-white shadow-xl shadow-orange-500/20' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'} ${isRTL ? 'flex-row-reverse' : ''}`}
                    >
                      <s.icon size={20} />
                      {s.label}
                    </button>
                  ))}
                </div>

                <div className="pt-6">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={cvSection}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="space-y-8"
                    >
                      {cvSection === 'info' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div className={`md:col-span-2 space-y-3 ${isRTL ? 'text-right' : ''}`}>
                            <label className="text-xs font-black text-[#173E7D] uppercase tracking-[0.2em]">{t('fullName')}</label>
                            <input 
                              type="text" 
                              value={cvData.name}
                              onChange={(e) => setCvData({...cvData, name: e.target.value})}
                              className={`w-full px-8 py-5 rounded-3xl border-2 border-[#173E7D] outline-none focus:ring-4 focus:ring-blue-100 transition-all bg-white text-lg font-bold ${isRTL ? 'text-right' : ''}`}
                            />
                          </div>
                          <div className={`space-y-3 ${isRTL ? 'text-right' : ''}`}>
                            <label className="text-xs font-black text-[#173E7D] uppercase tracking-[0.2em]">Email</label>
                            <input type="email" value={cvData.email} onChange={(e) => setCvData({...cvData, email: e.target.value})} className={`w-full px-8 py-5 rounded-3xl border-2 border-[#173E7D] outline-none focus:ring-4 focus:ring-blue-100 transition-all bg-white text-lg font-bold ${isRTL ? 'text-right' : ''}`} />
                          </div>
                          <div className={`space-y-3 ${isRTL ? 'text-right' : ''}`}>
                            <label className="text-xs font-black text-[#173E7D] uppercase tracking-[0.2em]">{t('phone')}</label>
                            <input type="tel" value={cvData.phone} onChange={(e) => setCvData({...cvData, phone: e.target.value})} className={`w-full px-8 py-5 rounded-3xl border-2 border-[#173E7D] outline-none focus:ring-4 focus:ring-blue-100 transition-all bg-white text-lg font-bold ${isRTL ? 'text-right' : ''}`} />
                          </div>
                          <div className={`md:col-span-2 space-y-3 ${isRTL ? 'text-right' : ''}`}>
                            <label className="text-xs font-black text-[#173E7D] uppercase tracking-[0.2em]">
                              {language === 'ar' ? 'المسمى المهني' : 'Titre professionnel'}
                            </label>
                            <input
                              type="text"
                              value={cvData.title}
                              onChange={(e) => setCvData({ ...cvData, title: e.target.value })}
                              placeholder={language === 'ar' ? 'مثال: مهندس برمجيات' : 'ex : Ingénieur Logiciel'}
                              className={`w-full px-8 py-5 rounded-3xl border-2 border-[#173E7D] outline-none focus:ring-4 focus:ring-blue-100 transition-all bg-white text-lg font-bold ${isRTL ? 'text-right' : ''}`}
                            />
                          </div>
                          <div className={`space-y-3 ${isRTL ? 'text-right' : ''}`}>
                            <label className="text-xs font-black text-[#173E7D] uppercase tracking-[0.2em]">
                              {language === 'ar' ? 'العنوان' : 'Localisation'}
                            </label>
                            <input
                              type="text"
                              value={cvData.address}
                              onChange={(e) => setCvData({ ...cvData, address: e.target.value })}
                              placeholder={language === 'ar' ? 'الجزائر، الجزائر' : 'Alger, Algérie'}
                              className={`w-full px-8 py-5 rounded-3xl border-2 border-[#173E7D] outline-none focus:ring-4 focus:ring-blue-100 transition-all bg-white text-lg font-bold ${isRTL ? 'text-right' : ''}`}
                            />
                          </div>
                          <div className={`space-y-3 ${isRTL ? 'text-right' : ''}`}>
                            <label className="text-xs font-black text-[#173E7D] uppercase tracking-[0.2em]">LinkedIn</label>
                            <input
                              type="text"
                              value={cvData.linkedin}
                              onChange={(e) => setCvData({ ...cvData, linkedin: e.target.value })}
                              placeholder="linkedin.com/in/…"
                              className={`w-full px-8 py-5 rounded-3xl border-2 border-[#173E7D] outline-none focus:ring-4 focus:ring-blue-100 transition-all bg-white text-lg font-bold ${isRTL ? 'text-right' : ''}`}
                            />
                          </div>
                          <div className={`md:col-span-2 space-y-3 ${isRTL ? 'text-right' : ''}`}>
                            <label className="text-xs font-black text-[#173E7D] uppercase tracking-[0.2em]">
                              {language === 'ar' ? 'المحفظة / GitHub' : 'Portfolio / GitHub'}
                            </label>
                            <input
                              type="text"
                              value={cvData.portfolio}
                              onChange={(e) => setCvData({ ...cvData, portfolio: e.target.value })}
                              placeholder="github.com/…"
                              className={`w-full px-8 py-5 rounded-3xl border-2 border-[#173E7D] outline-none focus:ring-4 focus:ring-blue-100 transition-all bg-white text-lg font-bold ${isRTL ? 'text-right' : ''}`}
                            />
                          </div>
                          <div className={`md:col-span-2 space-y-3 ${isRTL ? 'text-right' : ''}`}>
                            <label className="text-xs font-black text-[#173E7D] uppercase tracking-[0.2em]">{t('professionalSummary')}</label>
                            <textarea rows={5} value={cvData.summary} onChange={(e) => setCvData({...cvData, summary: e.target.value})} className={`w-full px-8 py-5 rounded-3xl border-2 border-[#173E7D] outline-none focus:ring-4 focus:ring-blue-100 transition-all bg-white text-lg font-bold resize-none ${isRTL ? 'text-right' : ''}`} />
                          </div>
                        </div>
                      )}

                      {cvSection === 'exp' && (
                        <div className="space-y-8">
                          {cvData.experiences.map((exp, i) => (
                            <div key={i} className="p-8 bg-gray-50/50 rounded-[2.5rem] border border-gray-200/50 space-y-6 relative group">
                              <button 
                                onClick={() => {
                                  const newExp = [...cvData.experiences];
                                  newExp.splice(i, 1);
                                  setCvData({...cvData, experiences: newExp});
                                }}
                                className={`absolute top-6 ${isRTL ? 'left-6' : 'right-6'} w-10 h-10 bg-white text-red-400 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:text-red-600 shadow-sm`}
                              >
                                <X size={20} />
                              </button>
                              <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                <div className="space-y-2">
                                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('company')}</label>
                                  <input 
                                    placeholder={t('companyPlaceholder')} 
                                    value={exp.company} 
                                    onChange={(e) => {
                                      const newExp = [...cvData.experiences];
                                      newExp[i].company = e.target.value;
                                      setCvData({...cvData, experiences: newExp});
                                    }}
                                    className={`w-full px-6 py-4 rounded-2xl border-2 border-[#173E7D] outline-none bg-white focus:ring-4 focus:ring-blue-100 font-bold ${isRTL ? 'text-right' : ''}`} 
                                  />
                                </div>
                                <div className="space-y-2">
                                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Poste</label>
                                  <input 
                                    placeholder={t('rolePlaceholder')} 
                                    value={exp.role} 
                                    onChange={(e) => {
                                      const newExp = [...cvData.experiences];
                                      newExp[i].role = e.target.value;
                                      setCvData({...cvData, experiences: newExp});
                                    }}
                                    className={`w-full px-6 py-4 rounded-2xl border-2 border-[#173E7D] outline-none bg-white focus:ring-4 focus:ring-blue-100 font-bold ${isRTL ? 'text-right' : ''}`} 
                                  />
                                </div>
                              </div>
                              <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Période</label>
                                <input 
                                  placeholder={t('period')} 
                                  value={exp.period} 
                                  onChange={(e) => {
                                    const newExp = [...cvData.experiences];
                                    newExp[i].period = e.target.value;
                                    setCvData({...cvData, experiences: newExp});
                                  }}
                                  className={`w-full px-6 py-4 rounded-2xl border-2 border-[#173E7D] outline-none bg-white focus:ring-4 focus:ring-blue-100 font-bold ${isRTL ? 'text-right' : ''}`} 
                                />
                              </div>
                              <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Missions</label>
                                <textarea 
                                  placeholder={language === 'ar' ? 'المهمات والمسؤوليات' : 'Missions et responsabilités'} 
                                  value={exp.missions}
                                  onChange={(e) => {
                                    const newExp = [...cvData.experiences];
                                    newExp[i].missions = e.target.value;
                                    setCvData({...cvData, experiences: newExp});
                                  }}
                                  className={`w-full px-6 py-4 rounded-2xl border-2 border-[#173E7D] outline-none bg-white resize-none focus:ring-4 focus:ring-blue-100 font-bold ${isRTL ? 'text-right' : ''}`} 
                                  rows={3} 
                                />
                              </div>
                              <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Description</label>
                                <textarea 
                                  placeholder={t('descriptionPlaceholder')} 
                                  value={exp.desc}
                                  onChange={(e) => {
                                    const newExp = [...cvData.experiences];
                                    newExp[i].desc = e.target.value;
                                    setCvData({...cvData, experiences: newExp});
                                  }}
                                  className={`w-full px-6 py-4 rounded-2xl border-2 border-[#173E7D] outline-none bg-white resize-none focus:ring-4 focus:ring-blue-100 font-bold ${isRTL ? 'text-right' : ''}`} 
                                  rows={2} 
                                />
                              </div>
                            </div>
                          ))}
                          <button 
                            onClick={() => setCvData({
                              ...cvData, 
                              experiences: [...cvData.experiences, { company: '', role: '', period: '', desc: '', missions: '' }]
                            })}
                            className="w-full py-6 border-2 border-dashed border-gray-200 rounded-[2rem] text-gray-400 font-black uppercase tracking-widest hover:border-[#F68D58] hover:text-[#F68D58] transition-all bg-gray-50/30"
                          >
                            {t('addExperience')}
                          </button>
                        </div>
                      )}

                      {cvSection === 'edu' && (
                        <div className="space-y-8">
                          {cvData.education.map((edu, i) => (
                            <div key={i} className="p-8 bg-gray-50/50 rounded-[2.5rem] border border-gray-200/50 space-y-6 relative group">
                              <button 
                                onClick={() => {
                                  const newEdu = [...cvData.education];
                                  newEdu.splice(i, 1);
                                  setCvData({...cvData, education: newEdu});
                                }}
                                className={`absolute top-6 ${isRTL ? 'left-6' : 'right-6'} w-10 h-10 bg-white text-red-400 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:text-red-600 shadow-sm`}
                              >
                                <X size={20} />
                              </button>
                              <div className={`grid grid-cols-1 md:grid-cols-3 gap-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                <div className="space-y-2">
                                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">École / Université</label>
                                  <input 
                                    placeholder={language === 'ar' ? 'المدرسة / الجامعة' : 'École / Université'} 
                                    value={edu.school} 
                                    onChange={(e) => {
                                      const newEdu = [...cvData.education];
                                      newEdu[i].school = e.target.value;
                                      setCvData({...cvData, education: newEdu});
                                    }}
                                    className={`w-full px-6 py-4 rounded-2xl border-2 border-[#173E7D] outline-none bg-white focus:ring-4 focus:ring-blue-100 font-bold ${isRTL ? 'text-right' : ''}`} 
                                  />
                                </div>
                                <div className="space-y-2">
                                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Diplôme</label>
                                  <input 
                                    placeholder={language === 'ar' ? 'الدبلوم' : 'Diplôme'} 
                                    value={edu.degree} 
                                    onChange={(e) => {
                                      const newEdu = [...cvData.education];
                                      newEdu[i].degree = e.target.value;
                                      setCvData({...cvData, education: newEdu});
                                    }}
                                    className={`w-full px-6 py-4 rounded-2xl border-2 border-[#173E7D] outline-none bg-white focus:ring-4 focus:ring-blue-100 font-bold ${isRTL ? 'text-right' : ''}`} 
                                  />
                                </div>
                                <div className="space-y-2">
                                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Année</label>
                                  <input 
                                    placeholder={language === 'ar' ? 'السنة' : 'Année'} 
                                    value={edu.year} 
                                    onChange={(e) => {
                                      const newEdu = [...cvData.education];
                                      newEdu[i].year = e.target.value;
                                      setCvData({...cvData, education: newEdu});
                                    }}
                                    className={`w-full px-6 py-4 rounded-2xl border-2 border-[#173E7D] outline-none bg-white focus:ring-4 focus:ring-blue-100 font-bold ${isRTL ? 'text-right' : ''}`} 
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                          <button 
                            onClick={() => setCvData({
                              ...cvData, 
                              education: [...cvData.education, { school: '', degree: '', year: '' }]
                            })}
                            className="w-full py-6 border-2 border-dashed border-gray-200 rounded-[2rem] text-gray-400 font-black uppercase tracking-widest hover:border-[#F68D58] hover:text-[#F68D58] transition-all bg-gray-50/30"
                          >
                            {language === 'ar' ? '+ إضافة تكوين' : '+ Ajouter une formation'}
                          </button>
                        </div>
                      )}

                      {cvSection === 'skills' && (
                        <div className="space-y-8">
                          <h4 className={`text-[11px] font-black text-gray-400 uppercase tracking-[0.28em] ${isRTL ? 'text-right' : ''}`}>
                            {language === 'ar' ? 'المهارات' : 'Compétences'}
                          </h4>
                          <div className={`flex flex-wrap gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                            {cvData.skills.map((skill, i) => (
                              <div key={i} className={`px-6 py-3 bg-emerald-50 text-emerald-600 rounded-2xl font-black text-sm flex items-center gap-3 border border-emerald-100 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                {skill} 
                                <X 
                                  size={16} 
                                  className="cursor-pointer hover:text-red-500 transition-colors" 
                                  onClick={() => {
                                    const newSkills = cvData.skills.filter((_, idx) => idx !== i);
                                    setCvData({...cvData, skills: newSkills});
                                  }}
                                />
                              </div>
                            ))}
                          </div>
                          <form 
                            className={`flex gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}
                            onSubmit={(e) => {
                              e.preventDefault();
                              const input = e.currentTarget.elements.namedItem('skill') as HTMLInputElement;
                              if (input.value.trim()) {
                                setCvData({...cvData, skills: [...cvData.skills, input.value.trim()]});
                                input.value = '';
                              }
                            }}
                          >
                            <input 
                              name="skill"
                              placeholder={language === 'ar' ? 'أضف مهارة (مثال: React)' : 'Ajouter une compétence (ex: React)'} 
                              className={`flex-1 px-8 py-5 rounded-3xl border-2 border-[#173E7D] outline-none bg-white focus:ring-4 focus:ring-blue-100 font-bold text-lg ${isRTL ? 'text-right' : ''}`} 
                            />
                            <button type="submit" className="px-10 bg-[#F68D58] text-white rounded-3xl font-black uppercase tracking-widest shadow-lg shadow-orange-500/20">
                              {language === 'ar' ? 'إضافة' : 'Ajouter'}
                            </button>
                          </form>

                          {/* Languages live in this same section so the candidate
                              fills in everything "skills-like" in one place. */}
                          <div className="pt-4 border-t border-gray-100 space-y-2">
                            <h4 className={`text-[11px] font-black text-gray-400 uppercase tracking-[0.28em] ${isRTL ? 'text-right' : ''}`}>
                              {language === 'ar' ? 'اللغات ومستوياتها' : 'Langues & niveaux'}
                            </h4>
                            <p className={`text-sm text-gray-400 font-medium ${isRTL ? 'text-right' : ''}`}>
                              {language === 'ar'
                                ? 'اختر لغاتك ومستواك في كل لغة.'
                                : 'Choisissez vos langues et votre niveau dans chacune.'}
                            </p>
                          </div>
                        </div>
                      )}

                      {(cvSection === 'skills' || cvSection === 'lang') && (
                        <div className="space-y-8">
                          {cvData.languages.map((lang, i) => (
                            <div key={i} className={`flex flex-col md:flex-row items-center gap-6 bg-gray-50/50 p-6 rounded-[2rem] border border-gray-200/50 relative group ${isRTL ? 'flex-row-reverse' : ''}`}>
                              <div className="flex-1 w-full space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Langue</label>
                                <input 
                                  value={lang.name} 
                                  onChange={(e) => {
                                    const newLang = [...cvData.languages];
                                    newLang[i].name = e.target.value;
                                    setCvData({...cvData, languages: newLang});
                                  }}
                                  className={`w-full px-6 py-4 rounded-2xl border-2 border-[#173E7D] outline-none bg-white focus:ring-4 focus:ring-blue-100 font-bold ${isRTL ? 'text-right' : ''}`} 
                                />
                              </div>
                              <div className="w-full md:w-64 space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Niveau</label>
                                <select 
                                  value={lang.level} 
                                  onChange={(e) => {
                                    const newLang = [...cvData.languages];
                                    newLang[i].level = e.target.value;
                                    setCvData({...cvData, languages: newLang});
                                  }}
                                  className={`w-full px-6 py-4 rounded-2xl border-2 border-[#173E7D] outline-none bg-white focus:ring-4 focus:ring-blue-100 font-bold ${isRTL ? 'text-right' : ''}`}
                                >
                                  {language === 'ar' ? (
                                    <>
                                      <option>أصلي</option>
                                      <option>بطلاقة</option>
                                      <option>متوسط</option>
                                      <option>مبتدئ</option>
                                    </>
                                  ) : (
                                    <>
                                      <option>Natif</option>
                                      <option>Courant</option>
                                      <option>Intermédiaire</option>
                                      <option>Débutant</option>
                                    </>
                                  )}
                                </select>
                              </div>
                              <button 
                                onClick={() => {
                                  const newLang = [...cvData.languages];
                                  newLang.splice(i, 1);
                                  setCvData({...cvData, languages: newLang});
                                }}
                                className="w-12 h-12 bg-white text-red-400 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:text-red-600 shadow-sm"
                              >
                                <X size={20} />
                              </button>
                            </div>
                          ))}
                          <button 
                            onClick={() => setCvData({
                              ...cvData, 
                              languages: [...cvData.languages, { name: '', level: language === 'ar' ? 'متوسط' : 'Intermédiaire' }]
                            })}
                            className="w-full py-6 border-2 border-dashed border-gray-200 rounded-[2rem] text-gray-400 font-black uppercase tracking-widest hover:border-[#F68D58] hover:text-[#F68D58] transition-all bg-gray-50/30"
                          >
                            {language === 'ar' ? '+ إضافة لغة' : '+ Ajouter une langue'}
                          </button>
                        </div>
                      )}
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>
            </div>
            {/* Preview Side - Below Editor */}
            <div className="w-full space-y-8">
              <div className={`flex justify-between items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div>
                  <h3 className="text-3xl font-display font-black text-[#173E7D] tracking-tight">
                    {language === 'ar' ? 'المعاينة النهائية' : 'Aperçu final'}
                  </h3>
                  <p className="text-gray-500 mt-1 font-medium">Voici à quoi ressemblera votre CV pour les recruteurs.</p>
                </div>
                <div className={`flex flex-wrap items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  {isLoadingCV && (
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      {lt('Loading your CV…', 'Chargement de votre CV…', 'جار تحميل سيرتك…')}
                    </span>
                  )}
                  {cvLastSavedAt && !isSavingCV && (
                    <span className={`flex items-center gap-2 text-[10px] font-black text-emerald-500 uppercase tracking-widest ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <CheckCircle2 size={14} />
                      {lt('Saved', 'Sauvegardé', 'تم الحفظ')}
                    </span>
                  )}
                  <button
                    onClick={handleSaveCV}
                    disabled={isSavingCV}
                    className={`bg-emerald-500 text-white px-10 py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-emerald-900/20 hover:bg-emerald-600 transition-all flex items-center gap-3 ${isSavingCV ? 'opacity-70 cursor-not-allowed' : ''}`}
                  >
                    {isSavingCV ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        {lt('Saving…', 'Sauvegarde…', 'جار الحفظ…')}
                      </>
                    ) : (
                      <>
                        <Save size={20} /> {language === 'ar' ? 'حفظ السيرة الذاتية' : 'Sauvegarder CV'}
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleDownloadPDF}
                    disabled={isGeneratingPDF}
                    className={`bg-[#173E7D] text-white px-10 py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-blue-900/20 hover:bg-[#0A1118] transition-all flex items-center gap-3 ${isGeneratingPDF ? 'opacity-70 cursor-not-allowed' : ''}`}
                  >
                    <Download size={20} />{' '}
                    {isGeneratingPDF 
                      ? (language === 'ar' ? 'جاري التحميل...' : 'Téléchargement...') 
                      : (language === 'ar' ? 'تحميل PDF' : 'Télécharger PDF')}
                  </button>
                </div>
              </div>

              {/* One shared CV design. The recruiter's candidate viewer renders
                  the same component from the same normalised shape, so demo
                  and real data differ only in values — never in markup. */}
              <CVDocument
                id="cv-preview-container"
                data={cvData}
                language={language}
                photoUrl={displayPhotoURL}
              />
            </div>
          </div>
        );
      case 'ai-quiz':
        return <AIQuiz />;  
      case 'saved':
        const savedJobsList = realJobs.filter(job => savedJobs.includes(job.id));
        return (
          <div className="space-y-8">
            <h2 className={`text-3xl font-display font-bold text-[#173E7D] ${isRTL ? 'text-right' : ''}`}>
              {language === 'ar' ? 'الوظائف المحفوظة' : 'Offres sauvegardées'}
            </h2>
            {savedJobsList.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {savedJobsList.map((job) => (
                  <JobCard 
                    key={job.id} 
                    job={job} 
                    isSaved={true} 
                    onToggleSave={toggleSaveJob} 
                  />
                ))}
              </div>
            ) : (
              <div className="bg-white p-12 rounded-[2rem] border border-gray-100 flex flex-col items-center justify-center text-center space-y-4">
                <div className="w-20 h-20 bg-orange-50 text-[#F68D58] rounded-full flex items-center justify-center">
                  <Bookmark size={40} />
                </div>
                <h3 className="text-xl font-bold text-[#173E7D]">
                  {language === 'ar' ? 'لا توجد وظائف محفوظة' : 'Aucune offre sauvegardée'}
                </h3>
                <p className="text-gray-400 max-w-xs">
                  {language === 'ar' ? 'تصفح الوظائف واحفظ تلك التي تهمك لتجدها هنا.' : "Parcourez les offres d'emploi et sauvegardez celles qui vous intéressent pour les retrouver ici."}
                </p>
                <button onClick={() => setActiveTab('jobs')} className="px-8 py-3 bg-[#F68D58] text-white rounded-full font-bold hover:bg-[#e57d47] transition-all">
                  {language === 'ar' ? 'تصفح الوظائف' : 'Parcourir les offres'}
                </button>
              </div>
            )}
          </div>
        );
      case 'notifications':
        return (
          <div className="space-y-8">
            <div className={`flex justify-between items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
              <h2 className={`text-3xl font-display font-bold text-[#173E7D] ${isRTL ? 'text-right' : ''}`}>
                {language === 'ar' ? 'الإشعارات' : 'Notifications'}
              </h2>
              {notifications.length > 0 && (
                <button 
                  onClick={async () => {
                    await markAllNotificationsRead();
                    setNotifications(notifications.map(n => ({ ...n, is_read: true })));
                  }}
                  className="text-sm font-bold text-[#F68D58] hover:underline"
                >
                  {language === 'ar' ? 'تحديد الكل كمقروء' : 'Tout marquer comme lu'}
                </button>
              )}
            </div>
            <div className="bg-white rounded-[2rem] border border-gray-100 overflow-hidden divide-y divide-gray-50">
              {notifications.length > 0 ? (
                notifications.map((n) => (
                  <div 
                    key={n.id} 
                    onClick={async () => {
                      if (!n.is_read) {
                        await markNotificationRead(n.id);
                        setNotifications(notifications.map(notif => notif.id === n.id ? { ...notif, is_read: true } : notif));
                      }
                    }}
                    className={`p-6 hover:bg-gray-50 transition-colors cursor-pointer flex gap-4 ${isRTL ? 'flex-row-reverse' : ''} ${!n.is_read ? 'bg-blue-50/30' : ''}`}
                  >
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${!n.is_read ? 'bg-blue-100 text-[#173E7D]' : 'bg-gray-50 text-gray-400'}`}>
                      <Bell size={24} />
                    </div>
                    <div className={`flex-1 ${isRTL ? 'text-right' : ''}`}>
                      <div className={`flex justify-between items-start ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <h4 className={`font-bold ${!n.is_read ? 'text-[#173E7D]' : 'text-gray-600'}`}>{n.title}</h4>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                          {new Date(n.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">{n.message}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-12 text-center text-gray-400 font-medium">
                  {language === 'ar' ? 'لا توجد إشعارات حالياً' : 'Aucune notification pour le moment'}
                </div>
              )}
            </div>
          </div>
        );
      case 'settings':
        return (
          <div className="space-y-8 pb-12">
            <div className={isRTL ? 'text-right' : ''}>
              <h2 className="text-4xl font-display font-bold text-[#173E7D] tracking-tight">{t('settings')}</h2>
              <p className="text-gray-500 mt-2">Gérez vos préférences de recherche et la visibilité de votre profil.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Column - Navigation/Categories */}
              <div className="lg:col-span-1 space-y-4">
                <div className="bg-white rounded-3xl border border-gray-100 p-4 shadow-sm sticky top-8">
                  <nav className="space-y-1">
                    {[
                      { id: 'general', icon: Globe, label: t('language') },
                      { id: 'security', icon: Lock, label: t('settings_new.accountSecurity') },
                      { id: 'notifications', icon: Bell, label: t('settings_new.notificationsPrefs') },
                      { id: 'privacy', icon: Shield, label: t('settings_new.privacy') },
                      { id: 'preferences', icon: Search, label: t('settings_new.jobPreferences') },
                      { id: 'history', icon: History, label: "Historique" },
                      { id: 'help', icon: HelpCircle, label: t('settings_new.helpSupport') }
                    ].map((item) => (
                      <button
                        key={item.id}
                        onClick={() => setSettingsTab(item.id)}
                        className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all font-bold text-sm ${
                          isRTL ? 'flex-row-reverse text-right' : 'text-left'
                        } ${
                          settingsTab === item.id 
                            ? 'bg-[#173E7D] text-white shadow-lg shadow-blue-200/50' 
                            : 'hover:bg-gray-50 text-gray-500 hover:text-[#173E7D]'
                        }`}
                      >
                        <item.icon size={20} />
                        {item.label}
                      </button>
                    ))}
                  </nav>
                </div>
              </div>

                {/* Right Column - Content */}
                <div className="lg:col-span-2 space-y-8">
                  {settingsTab === 'preferences' && (
                    <div className="bg-white rounded-[2.5rem] border border-gray-100 p-10 shadow-sm space-y-8">
                      <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <div className="w-12 h-12 bg-blue-50 text-[#173E7D] rounded-2xl flex items-center justify-center">
                          <Search size={24} />
                        </div>
                        <h3 className="text-xl font-bold text-[#173E7D]">{t('settings_new.jobPreferences')}</h3>
                      </div>

                      <div className="space-y-6">
                        <div className="space-y-4">
                          <label className={`block text-sm font-bold text-[#173E7D] ${isRTL ? 'text-right' : ''}`}>
                            {language === 'ar' ? 'المناصب المفضلة' : 'Postes préférés'}
                          </label>
                          <div className={`flex flex-wrap gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                            {preferredRoles.map((role, i) => (
                              <span key={i} className="px-4 py-2 bg-blue-50 text-[#173E7D] rounded-full text-sm font-bold flex items-center gap-2">
                                {role} <X size={14} className="cursor-pointer" onClick={() => setPreferredRoles(prev => prev.filter(r => r !== role))} />
                              </span>
                            ))}
                            <button 
                              onClick={() => {
                                const newRole = prompt(language === 'ar' ? 'أدخل المنصب الجديد:' : 'Entrez le nouveau poste :');
                                if (newRole) setPreferredRoles(prev => [...prev, newRole]);
                              }}
                              className="px-4 py-2 border-2 border-dashed border-gray-200 text-gray-400 rounded-full text-sm font-bold hover:border-[#173E7D] hover:text-[#173E7D] transition-all"
                            >
                              + {language === 'ar' ? 'إضافة' : 'Ajouter'}
                            </button>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <label className={`block text-sm font-bold text-[#173E7D] ${isRTL ? 'text-right' : ''}`}>
                            {language === 'ar' ? 'المواقع المفضلة' : 'Localisations préférées'}
                          </label>
                          <div className={`flex flex-wrap gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                            {preferredLocations.map((loc, i) => (
                              <span key={i} className="px-4 py-2 bg-orange-50 text-[#F68D58] rounded-full text-sm font-bold flex items-center gap-2">
                                {loc} <X size={14} className="cursor-pointer" onClick={() => setPreferredLocations(prev => prev.filter(l => l !== loc))} />
                              </span>
                            ))}
                            <button 
                              onClick={() => {
                                const newLoc = prompt(language === 'ar' ? 'أدخل الموقع الجديد:' : 'Entrez la nouvelle localisation :');
                                if (newLoc) setPreferredLocations(prev => [...prev, newLoc]);
                              }}
                              className="px-4 py-2 border-2 border-dashed border-gray-200 text-gray-400 rounded-full text-sm font-bold hover:border-[#F68D58] hover:text-[#F68D58] transition-all"
                            >
                              + {language === 'ar' ? 'إضافة' : 'Ajouter'}
                            </button>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <label className={`block text-sm font-bold text-[#173E7D] ${isRTL ? 'text-right' : ''}`}>
                            {language === 'ar' ? 'الراتب المتوقع (شهرياً)' : 'Salaire souhaité (mensuel)'}
                          </label>
                          <input 
                            type="range" 
                            min="30000" 
                            max="300000" 
                            step="5000"
                            value={salaryRange}
                            onChange={(e) => setSalaryRange(parseInt(e.target.value))}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#F68D58]"
                          />
                          <div className={`flex justify-between text-xs font-bold text-gray-400 ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <span>30,000 DA</span>
                            <span className="text-[#F68D58]">{salaryRange.toLocaleString()} DA</span>
                            <span>300,000 DA</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {settingsTab === 'help' && (
                    <div className="bg-white rounded-[2.5rem] border border-gray-100 p-10 shadow-sm space-y-8">
                      {helpAction ? (
                        <div className="space-y-6">
                          <button 
                            onClick={() => setHelpAction(null)}
                            className={`flex items-center gap-2 text-gray-400 hover:text-[#173E7D] transition-all font-bold ${isRTL ? 'flex-row-reverse' : ''}`}
                          >
                            <ChevronLeft size={20} className={isRTL ? 'rotate-180' : ''} />
                            {language === 'ar' ? 'العودة' : 'Retour'}
                          </button>
                          
                          {helpAction === 'helpCenter' && (
                            <div className="space-y-6">
                              <h3 className={`text-2xl font-bold text-[#173E7D] ${isRTL ? 'text-right' : ''}`}>{t('settings_new.helpCenter')}</h3>
                              <div className="grid grid-cols-1 gap-4">
                                {[
                                  { id: 'article-cv', title: language === 'ar' ? 'كيف تحسن سيرتك الذاتية؟' : "Comment optimiser son CV ?", desc: language === 'ar' ? 'اكتشف نصائحنا لجذب انتباه أصحاب العمل.' : "Découvrez nos astuces pour attirer l'œil des recruteurs." },
                                  { id: 'article-interview', title: language === 'ar' ? 'النجاح في مقابلة العمل' : "Réussir son entretien d'embauche", desc: language === 'ar' ? 'الأسئلة الكلاسيكية وكيفية الإجابة عليها.' : "Les questions classiques et comment y répondre." },
                                  { id: 'contact-advice', title: language === 'ar' ? 'هل تحتاج إلى نصيحة؟' : "Besoin d'un conseil ?", desc: language === 'ar' ? 'اتصل بنا للحصول على مساعدة شخصية.' : "Contactez-nous pour une aide personnalisée." }
                                ].map((article, i) => (
                                  <div 
                                    key={i} 
                                    onClick={() => setHelpAction(article.id)}
                                    className={`p-6 bg-gray-50 rounded-2xl border border-gray-100 hover:bg-white hover:shadow-md transition-all cursor-pointer ${isRTL ? 'text-right' : ''}`}
                                  >
                                    <div className="font-bold text-[#173E7D] mb-1">{article.title}</div>
                                    <div className="text-sm text-gray-500">{article.desc}</div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {helpAction === 'article-cv' && (
                            <div className="space-y-6">
                              <h3 className={`text-2xl font-bold text-[#173E7D] ${isRTL ? 'text-right' : ''}`}>
                                {language === 'ar' ? 'كيف تحسن سيرتك الذاتية؟' : "Comment optimiser son CV ?"}
                              </h3>
                              <div className={`prose max-w-none text-gray-600 space-y-6 ${isRTL ? 'text-right' : ''}`}>
                                <section className="space-y-3">
                                  <h4 className="font-bold text-[#173E7D] text-lg">
                                    {language === 'ar' ? 'استخدام صانع السيرة الذاتية بفعالية' : "1. Utilisation efficace de notre CV Maker"}
                                  </h4>
                                  <p>
                                    {language === 'ar' 
                                      ? 'صانع السيرة الذاتية لدينا مصمم لمساعدتك في إنشاء ملف احترافي في دقائق. تأكد من ملء جميع الأقسام، خاصة المهارات والخبرات. اختر قالباً يتناسب مع قطاع نشاطك.' 
                                      : "Notre CV Maker est un outil puissant conçu pour structurer vos informations de manière professionnelle. Pour un résultat optimal, remplissez chaque section avec soin. Choisissez un modèle qui correspond à votre secteur d'activité (moderne pour la tech, classique pour la finance, créatif pour le design)."}
                                  </p>
                                </section>
                                <section className="space-y-3">
                                  <h4 className="font-bold text-[#173E7D] text-lg">
                                    {language === 'ar' ? 'نصائح ذهبية لبناء سيرة ذاتية احترافية' : "2. Conseils d'experts pour un CV percutant"}
                                  </h4>
                                  <ul className="list-disc list-inside space-y-2">
                                    <li>
                                      <span className="font-bold text-[#173E7D]">{language === 'ar' ? 'التخصيص:' : "Personnalisation :"}</span> 
                                      {language === 'ar' ? ' قم بتعديل سيرتك الذاتية لكل عرض عمل بناءً على الكلمات المفتاحية الموجودة في الإعلان.' : " Adaptez votre CV à chaque offre en utilisant les mots-clés présents dans l'annonce."}
                                    </li>
                                    <li>
                                      <span className="font-bold text-[#173E7D]">{language === 'ar' ? 'الوضوح والإيجاز:' : "Clarté et Concision :"}</span> 
                                      {language === 'ar' ? ' اجعل سيرتك الذاتية سهلة القراءة. استخدم نقاطاً واضحة (bullet points) وتجنب الفقرات الطويلة.' : " Utilisez des listes à puces et évitez les longs paragraphes. Un recruteur passe en moyenne 6 secondes sur un CV."}
                                    </li>
                                    <li>
                                      <span className="font-bold text-[#173E7D]">{language === 'ar' ? 'الأرقام والإنجازات:' : "Chiffres et Réalisations :"}</span> 
                                      {language === 'ar' ? ' لا تكتفِ بذكر مهامك، بل ركز على النتائج التي حققتها (مثال: زيادة المبيعات بنسبة 20%).' : " Ne listez pas seulement vos tâches, montrez vos résultats (ex: 'Augmentation du CA de 15%' ou 'Gestion d'une équipe de 10 personnes')."}
                                    </li>
                                    <li>
                                      <span className="font-bold text-[#173E7D]">{language === 'ar' ? 'التدقيق اللغوي:' : "Orthographe irréprochable :"}</span> 
                                      {language === 'ar' ? ' الأخطاء الإملائية قد تضيع عليك الفرصة. راجع سيرتك الذاتية عدة مرات.' : " Une seule faute peut être éliminatoire. Relisez-vous ou faites-vous relire par un proche."}
                                    </li>
                                  </ul>
                                </section>
                              </div>
                            </div>
                          )}

                          {helpAction === 'article-interview' && (
                            <div className="space-y-6">
                              <h3 className={`text-2xl font-bold text-[#173E7D] ${isRTL ? 'text-right' : ''}`}>
                                {language === 'ar' ? 'النجاح في مقابلة العمل' : "Réussir son entretien d'embauche"}
                              </h3>
                              <div className={`prose max-w-none text-gray-600 space-y-6 ${isRTL ? 'text-right' : ''}`}>
                                <p className="italic">
                                  {language === 'ar' 
                                    ? 'المقابلة هي الخطوة الحاسمة. التحضير الجيد يقلل من التوتر ويزيد من فرصك في القبول.' 
                                    : "L'entretien est le moment de transformer l'essai. Une bonne préparation est la clé pour gérer son stress et convaincre le recruteur."}
                                </p>
                                <section className="space-y-3">
                                  <h4 className="font-bold text-[#173E7D] text-lg">
                                    {language === 'ar' ? 'المرحلة الأولى: قبل المقابلة' : "Étape 1 : La préparation (Avant)"}
                                  </h4>
                                  <ul className="list-disc list-inside space-y-2">
                                    <li>{language === 'ar' ? 'ابحث عن الشركة: افهم قيمها، مشاريعها، ومنافسيها.' : "Renseignez-vous sur l'entreprise : ses valeurs, ses actualités et ses concurrents."}</li>
                                    <li>{language === 'ar' ? 'جهز عرضك التقديمي: تدرب على الإجابة عن سؤال "حدثنا عن نفسك" في دقيقتين.' : "Préparez votre 'Pitch' : sachez répondre à la question 'Présentez-vous' en 2 minutes de façon structurée."}</li>
                                    <li>{language === 'ar' ? 'استخدم طريقة STAR: للإجابة على الأسئلة السلوكية (الموقف، المهمة، الإجراء، النتيجة).' : "Utilisez la méthode STAR (Situation, Tâche, Action, Résultat) pour illustrer vos compétences par des exemples concrets."}</li>
                                  </ul>
                                </section>
                                <section className="space-y-3">
                                  <h4 className="font-bold text-[#173E7D] text-lg">
                                    {language === 'ar' ? 'المرحلة الثانية: خلال المقابلة' : "Étape 2 : L'attitude (Pendant)"}
                                  </h4>
                                  <ul className="list-disc list-inside space-y-2">
                                    <li>{language === 'ar' ? 'لغة الجسد: حافظ على وضعية مستقيمة، تواصل بصري، وابتسامة واثقة.' : "Communication non-verbale : tenez-vous droit, maintenez un contact visuel et souriez."}</li>
                                    <li>{language === 'ar' ? 'الاستماع النشط: تأكد من فهم السؤال قبل الإجابة. لا تتردد في طلب توضيح.' : "Écoute active : assurez-vous d'avoir bien compris la question avant de répondre."}</li>
                                    <li>{language === 'ar' ? 'اطرح أسئلة: أظهر اهتمامك عبر طرح أسئلة حول الفريق أو تحديات المنصب.' : "Posez des questions : cela montre votre curiosité et votre motivation pour le poste."}</li>
                                  </ul>
                                </section>
                                <section className="space-y-3">
                                  <h4 className="font-bold text-[#173E7D] text-lg">
                                    {language === 'ar' ? 'المرحلة الثالثة: بعد المقابلة' : "Étape 3 : Le suivi (Après)"}
                                  </h4>
                                  <p>
                                    {language === 'ar' 
                                      ? 'أرسل بريداً إلكترونياً للشكر في غضون 24 ساعة، مؤكداً على حماسك للمنصب.' 
                                      : "Envoyez un mail de remerciement dans les 24h. C'est l'occasion de réitérer votre intérêt et de clarifier un point si nécessaire."}
                                  </p>
                                </section>
                              </div>
                            </div>
                          )}

                          {helpAction === 'contact-advice' && (
                            <div className="space-y-6">
                              <h3 className={`text-2xl font-bold text-[#173E7D] ${isRTL ? 'text-right' : ''}`}>
                                {language === 'ar' ? 'هل تحتاج إلى نصيحة؟' : "Besoin d'un conseil ?"}
                              </h3>
                              <div className="space-y-4">
                                <div className="space-y-2">
                                  <label className={`block text-sm font-bold text-[#173E7D] ${isRTL ? 'text-right' : ''}`}>
                                    {language === 'ar' ? 'البريد الإلكتروني' : "Adresse mail"}
                                  </label>
                                  <input 
                                    type="email" 
                                    value={contactEmail}
                                    onChange={(e) => setContactEmail(e.target.value)}
                                    className={`w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#173E7D] outline-none ${isRTL ? 'text-right' : ''}`}
                                    placeholder="exemple@mail.com"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <label className={`block text-sm font-bold text-[#173E7D] ${isRTL ? 'text-right' : ''}`}>
                                    {language === 'ar' ? 'الموضوع' : "Sujet"}
                                  </label>
                                  <input 
                                    type="text" 
                                    value={contactSubject}
                                    onChange={(e) => setContactSubject(e.target.value)}
                                    className={`w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#173E7D] outline-none ${isRTL ? 'text-right' : ''}`}
                                    placeholder={language === 'ar' ? 'كيف يمكننا مساعدتك؟' : "Comment pouvons-nous vous aider ?"}
                                  />
                                </div>
                                <button 
                                  onClick={() => {
                                    alert(language === 'ar' ? 'تم إرسال رسالتك!' : 'Votre message a été envoyé !');
                                    setContactEmail('');
                                    setContactSubject('');
                                    setHelpAction(null);
                                  }}
                                  className="w-full py-3 bg-[#173E7D] text-white rounded-xl font-bold hover:bg-blue-800 transition-all"
                                >
                                  {language === 'ar' ? 'إرسال' : 'Envoyer'}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <>
                          <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <div className="w-12 h-12 bg-blue-50 text-[#173E7D] rounded-2xl flex items-center justify-center">
                              <HelpCircle size={24} />
                            </div>
                            <h3 className="text-xl font-bold text-[#173E7D]">{t('settings_new.helpSupport')}</h3>
                          </div>

                          <div className="grid grid-cols-1 gap-4">
                            {[
                              { id: 'article-cv', title: language === 'ar' ? 'كيف تحسن سيرتك الذاتية؟' : "Comment optimiser son CV ?", desc: language === 'ar' ? 'اكتشف نصائحنا لجذب انتباه أصحاب العمل.' : "Découvrez nos astuces pour attirer l'œil des recruteurs.", icon: BookOpen },
                              { id: 'article-interview', title: language === 'ar' ? 'النجاح في مقابلة العمل' : "Réussir son entretien d'embauche", desc: language === 'ar' ? 'الأسئلة الكلاسيكية وكيفية الإجابة عليها.' : "Les questions classiques et comment y répondre.", icon: Sparkles },
                              { id: 'contact-advice', title: language === 'ar' ? 'هل تحتاج إلى نصيحة؟' : "Besoin d'un conseil ?", desc: language === 'ar' ? 'اتصل بنا للحصول على مساعدة شخصية.' : "Contactez-nous pour une aide personnalisée.", icon: MessageSquare }
                            ].map((item, i) => (
                              <button 
                                key={i} 
                                onClick={() => setHelpAction(item.id)}
                                className={`p-6 bg-gray-50 rounded-2xl hover:bg-gray-100 transition-all flex items-start gap-4 ${isRTL ? 'flex-row-reverse text-right' : 'text-left'}`}
                              >
                                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-[#173E7D] shadow-sm shrink-0">
                                  <item.icon size={20} />
                                </div>
                                <div>
                                  <div className="font-bold text-[#173E7D]">{item.title}</div>
                                  <div className="text-xs text-gray-400 mt-1">{item.desc}</div>
                                </div>
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {settingsTab === 'general' && (
                    <div className="bg-white rounded-[2.5rem] border border-gray-100 p-10 shadow-sm space-y-8">
                      <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <div className="w-12 h-12 bg-blue-50 text-[#173E7D] rounded-2xl flex items-center justify-center">
                          <Globe size={24} />
                        </div>
                        <h3 className="text-xl font-bold text-[#173E7D]">{t('language')}</h3>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <button 
                          onClick={() => setLanguage('fr')}
                          className={`flex items-center justify-between p-6 rounded-2xl border-2 transition-all ${
                            language === 'fr' 
                              ? 'border-[#F68D58] bg-orange-50/50 shadow-lg shadow-orange-200/20' 
                              : 'border-gray-100 hover:border-gray-200 bg-white'
                          } ${isRTL ? 'flex-row-reverse' : ''}`}
                        >
                          <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm text-2xl">🇫🇷</div>
                            <div className={isRTL ? 'text-right' : 'text-left'}>
                              <div className="font-bold text-[#173E7D] text-lg">{t('french')}</div>
                              <div className="text-xs text-gray-400">Français</div>
                            </div>
                          </div>
                          {language === 'fr' && (
                            <div className="w-6 h-6 bg-[#F68D58] rounded-full flex items-center justify-center text-white">
                              <CheckCircle2 size={14} />
                            </div>
                          )}
                        </button>

                        <button 
                          onClick={() => setLanguage('ar')}
                          className={`flex items-center justify-between p-6 rounded-2xl border-2 transition-all ${
                            language === 'ar' 
                              ? 'border-[#F68D58] bg-orange-50/50 shadow-lg shadow-orange-200/20' 
                              : 'border-gray-100 hover:border-gray-200 bg-white'
                          } ${isRTL ? 'flex-row-reverse' : ''}`}
                        >
                          <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm text-2xl">🇩🇿</div>
                            <div className={isRTL ? 'text-right' : 'text-left'}>
                              <div className="font-bold text-[#173E7D] text-lg">{t('arabic')}</div>
                              <div className="text-xs text-gray-400">العربية</div>
                            </div>
                          </div>
                          {language === 'ar' && (
                            <div className="w-6 h-6 bg-[#F68D58] rounded-full flex items-center justify-center text-white">
                              <CheckCircle2 size={14} />
                            </div>
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {settingsTab === 'security' && (
                    <div className="space-y-8">
                      <div className="bg-white rounded-[2.5rem] border border-gray-100 p-10 shadow-sm space-y-8">
                        <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                          <div className="w-12 h-12 bg-blue-50 text-[#173E7D] rounded-2xl flex items-center justify-center">
                            <Lock size={24} />
                          </div>
                          <h3 className="text-xl font-bold text-[#173E7D]">{t('settings_new.accountSecurity')}</h3>
                        </div>
                        
                        <div className="space-y-6">
                          {/* Changer le mot de passe */}
                          <div className="p-6 bg-gray-50 rounded-2xl space-y-4">
                            <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                              <div className={isRTL ? 'text-right' : ''}>
                                <div className="font-bold text-[#173E7D]">{t('settings_new.changePassword')}</div>
                                <div className="text-xs text-gray-400">
                                  {language === 'ar' ? 'آخر تغيير قبل 3 أشهر' : 'Dernière modification il y a 3 mois'}
                                </div>
                              </div>
                              <button 
                                onClick={() => setIsChangingPassword(!isChangingPassword)}
                                className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold text-[#173E7D] hover:bg-gray-100 transition-all"
                              >
                                {isChangingPassword ? (language === 'ar' ? 'إلغاء' : 'Annuler') : (language === 'ar' ? 'تغيير' : 'Modifier')}
                              </button>
                            </div>

                            {isChangingPassword && (
                              <div className="pt-4 border-t border-gray-200 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                    <label className={`block text-xs font-bold text-gray-500 ${isRTL ? 'text-right' : ''}`}>
                                      {language === 'ar' ? 'كلمة المرور الجديدة' : 'Nouveau mot de passe'}
                                    </label>
                                    <input 
                                      type="password"
                                      value={newPassword}
                                      onChange={(e) => setNewPassword(e.target.value)}
                                      className={`w-full p-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#173E7D] outline-none text-sm ${isRTL ? 'text-right' : ''}`}
                                      placeholder="••••••••"
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <label className={`block text-xs font-bold text-gray-500 ${isRTL ? 'text-right' : ''}`}>
                                      {language === 'ar' ? 'تأكيد كلمة المرور' : 'Confirmation du mot de passe'}
                                    </label>
                                    <input 
                                      type="password"
                                      value={confirmPassword}
                                      onChange={(e) => setConfirmPassword(e.target.value)}
                                      className={`w-full p-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#173E7D] outline-none text-sm ${isRTL ? 'text-right' : ''}`}
                                      placeholder="••••••••"
                                    />
                                  </div>
                                </div>
                                <div className={`flex ${isRTL ? 'justify-start' : 'justify-end'}`}>
                                  <button 
                                    onClick={() => {
                                      if (!newPassword || !confirmPassword) {
                                        alert(language === 'ar' ? 'يرجى ملء جميع الحقول.' : 'Veuillez remplir tous les champs.');
                                        return;
                                      }
                                      if (newPassword !== confirmPassword) {
                                        alert(language === 'ar' ? 'كلمات المرور غير متطابقة.' : 'Les mots de passe ne correspondent pas.');
                                        return;
                                      }
                                      alert(language === 'ar' ? 'تم تحديث كلمة المرور بنجاح!' : 'Mot de passe mis à jour avec succès !');
                                      setIsChangingPassword(false);
                                      setNewPassword('');
                                      setConfirmPassword('');
                                    }}
                                    className="px-6 py-2 bg-[#173E7D] text-white rounded-xl text-sm font-bold hover:bg-blue-800 transition-all"
                                  >
                                    {language === 'ar' ? 'حفظ' : 'Enregistrer'}
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Authentification à deux facteurs */}
                          <div className={`p-6 bg-gray-50 rounded-2xl flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <div className={isRTL ? 'text-right' : ''}>
                              <div className="font-bold text-[#173E7D]">{t('settings_new.twoFactor')}</div>
                              <div className="text-xs text-gray-400">
                                {language === 'ar' ? 'أضف طبقة أمان إضافية' : 'Ajoutez une couche de sécurité supplémentaire'}
                              </div>
                            </div>
                            <div className="w-12 h-6 bg-gray-200 rounded-full relative cursor-pointer">
                              <div className={`absolute ${isRTL ? 'right-1' : 'left-1'} top-1 w-4 h-4 bg-white rounded-full shadow-sm`} />
                            </div>
                          </div>

                          {/* Email de récupération */}
                          <div className={`p-6 bg-gray-50 rounded-2xl flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-gray-400 shadow-sm">
                                <Shield size={20} />
                              </div>
                              <div className={isRTL ? 'text-right' : 'text-left'}>
                                <div className="font-bold text-[#173E7D]">Email de récupération</div>
                                <div className="text-xs text-gray-400">walid***@gmail.com</div>
                              </div>
                            </div>
                            <button className="text-sm font-bold text-[#173E7D] hover:underline">Modifier</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {settingsTab === 'notifications' && (
                  <div className="bg-white rounded-[2.5rem] border border-gray-100 p-10 shadow-sm space-y-8">
                    <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <div className="w-12 h-12 bg-orange-50 text-[#F68D58] rounded-2xl flex items-center justify-center">
                        <Bell size={24} />
                      </div>
                      <h3 className="text-xl font-bold text-[#173E7D]">{t('settings_new.notificationsPrefs')}</h3>
                    </div>

                    <div className="space-y-8">
                      <div className="space-y-4">
                        <h4 className={`text-xs font-black text-gray-400 uppercase tracking-widest ${isRTL ? 'text-right' : ''}`}>Canaux de réception</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {[
                            { id: 'email', label: "Email", icon: Mail },
                            { id: 'push', label: "Push", icon: Bell },
                            { id: 'sms', label: "SMS", icon: Smartphone }
                          ].map((channel, i) => {
                            const isActive = notificationChannels[channel.id as keyof typeof notificationChannels];
                            return (
                              <button 
                                key={i} 
                                onClick={() => setNotificationChannels(prev => ({ ...prev, [channel.id]: !isActive }))}
                                className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all ${isActive ? 'border-[#173E7D] bg-blue-50/30' : 'border-gray-100 hover:border-gray-200'} ${isRTL ? 'flex-row-reverse' : ''}`}
                              >
                                <channel.icon size={18} className={isActive ? 'text-[#173E7D]' : 'text-gray-400'} />
                                <span className={`font-bold text-sm ${isActive ? 'text-[#173E7D]' : 'text-gray-400'}`}>{channel.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="space-y-6">
                        <h4 className={`text-xs font-black text-gray-400 uppercase tracking-widest ${isRTL ? 'text-right' : ''}`}>Types d'alertes</h4>
                        {[
                          { id: 'jobAlerts', label: "Alertes emploi", desc: "Nouveaux postes correspondant à votre profil" },
                          { id: 'applications', label: "Mises à jour de candidature", desc: "Changements de statut de vos candidatures" },
                          { id: 'newsletter', label: "Newsletter carrière", desc: "Conseils et actualités du marché" }
                        ].map((pref, idx) => {
                          const isActive = notificationTypes[pref.id as keyof typeof notificationTypes];
                          return (
                            <div key={idx} className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                              <div className={isRTL ? 'text-right' : ''}>
                                <div className="font-bold text-[#173E7D]">{pref.label}</div>
                                <div className="text-xs text-gray-400">{pref.desc}</div>
                              </div>
                              <div 
                                onClick={() => setNotificationTypes(prev => ({ ...prev, [pref.id]: !isActive }))}
                                className={`w-12 h-6 ${isActive ? 'bg-emerald-500' : 'bg-gray-200'} rounded-full relative cursor-pointer transition-colors`}
                              >
                                <div className={`absolute ${isActive ? (isRTL ? 'left-1' : 'right-1') : (isRTL ? 'right-1' : 'left-1')} top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all`} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {settingsTab === 'privacy' && (
                  <div className="bg-white rounded-[2.5rem] border border-gray-100 p-10 shadow-sm space-y-8">
                    <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <div className="w-12 h-12 bg-emerald-50 text-emerald-500 rounded-2xl flex items-center justify-center">
                        <Shield size={24} />
                      </div>
                      <h3 className="text-xl font-bold text-[#173E7D]">{t('settings_new.privacy')}</h3>
                    </div>

                    <div className="space-y-6">
                      <div className={`flex items-center justify-between p-6 bg-gray-50 rounded-2xl ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <div className={isRTL ? 'text-right' : ''}>
                          <div className="font-bold text-[#173E7D]">{t('settings_new.profileVisibility')}</div>
                          <div className="text-xs text-gray-400">Permettre aux recruteurs de trouver votre profil</div>
                        </div>
                        <div 
                          onClick={() => setProfileVisible(!profileVisible)}
                          className={`w-12 h-6 ${profileVisible ? 'bg-emerald-500' : 'bg-gray-200'} rounded-full relative cursor-pointer transition-all`}
                        >
                          <div className={`absolute ${profileVisible ? (isRTL ? 'left-1' : 'right-1') : (isRTL ? 'right-1' : 'left-1')} top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all`} />
                        </div>
                      </div>

                      <div className={`flex items-center justify-between p-6 bg-gray-50 rounded-2xl ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <div className={isRTL ? 'text-right' : ''}>
                          <div className="font-bold text-[#173E7D]">Masquer mon profil actuel</div>
                          <div className="text-xs text-gray-400">Votre entreprise actuelle ne pourra pas voir votre profil</div>
                        </div>
                        <div 
                          onClick={() => setHideCurrentEmployer(!hideCurrentEmployer)}
                          className={`w-12 h-6 ${hideCurrentEmployer ? 'bg-[#173E7D]' : 'bg-gray-200'} rounded-full relative cursor-pointer transition-all`}
                        >
                          <div className={`absolute ${hideCurrentEmployer ? (isRTL ? 'left-1' : 'right-1') : (isRTL ? 'right-1' : 'left-1')} top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all`} />
                        </div>
                      </div>
                    </div>
                  </div>
                )}


                {/* Danger Zone - Always visible at bottom of General or dedicated tab */}
              </div>
            </div>
          </div>
        );
      default:
        return (
          <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
            <div className="w-20 h-20 bg-gray-100 text-gray-300 rounded-full flex items-center justify-center">
              <FileText size={40} />
            </div>
            <h2 className="text-2xl font-bold text-[#173E7D]">
              {language === 'ar' ? 'الصفحة قيد الإنشاء' : 'Page en construction'}
            </h2>
            <p className="text-gray-400 max-w-xs">
              {language === 'ar' 
                ? `الصفحة "${activeTab}" ستكون متاحة قريباً مع جميع ميزاتها.`
                : `La page "${activeTab}" sera bientôt disponible avec toutes ses fonctionnalités.`}
            </p>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFB] flex" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* In-app toast (see showToast) */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] w-[calc(100%-3rem)] max-w-md"
            role="status"
            aria-live="polite"
          >
            <div
              className={`flex items-center gap-4 rounded-[1.5rem] px-6 py-5 shadow-2xl border backdrop-blur-sm ${
                toast.type === 'success'
                  ? 'bg-white border-emerald-100 shadow-emerald-900/10'
                  : 'bg-white border-red-100 shadow-red-900/10'
              } ${isRTL ? 'flex-row-reverse text-right' : ''}`}
            >
              <div
                className={`shrink-0 w-11 h-11 rounded-2xl flex items-center justify-center ${
                  toast.type === 'success' ? 'bg-emerald-50 text-emerald-500' : 'bg-red-50 text-red-500'
                }`}
              >
                {toast.type === 'success' ? <CheckCircle2 size={22} /> : <X size={22} />}
              </div>
              <p className="flex-1 font-bold text-[#173E7D] leading-snug">{toast.message}</p>
              <button
                onClick={() => setToast(null)}
                className="shrink-0 text-gray-300 hover:text-gray-500 transition-colors"
                aria-label={lt('Close', 'Fermer', 'إغلاق')}
              >
                <X size={18} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit job offer modal (opened from the Manage Jobs cards) */}
      <AnimatePresence>
        {editingJobId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] bg-black/40 backdrop-blur-sm flex items-start md:items-center justify-center p-4 md:p-8 overflow-y-auto"
            onClick={() => !isSavingJob && setEditingJobId(null)}
          >
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 280, damping: 26 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-[2rem] shadow-2xl border border-gray-100 w-full max-w-3xl my-auto overflow-hidden"
              dir={isRTL ? 'rtl' : 'ltr'}
            >
              <div className={`flex items-center justify-between gap-6 p-8 border-b border-gray-100 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div className={`flex items-center gap-5 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-[#173E7D]">
                    <Pencil size={26} />
                  </div>
                  <div className={isRTL ? 'text-right' : ''}>
                    <h2 className="text-2xl font-display font-black text-[#173E7D] tracking-tight">
                      {lt('Edit job offer', "Modifier l'offre", 'تعديل العرض')}
                    </h2>
                    <p className="text-gray-500 text-sm font-medium mt-0.5">
                      {lt(
                        'Your changes are visible to candidates immediately.',
                        'Vos modifications sont visibles immédiatement par les candidats.',
                        'تظهر تعديلاتك للمرشحين فورًا.'
                      )}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setEditingJobId(null)}
                  disabled={isSavingJob}
                  className="shrink-0 w-11 h-11 rounded-2xl bg-gray-50 text-gray-400 hover:text-[#173E7D] hover:bg-gray-100 transition-all flex items-center justify-center disabled:opacity-40"
                  aria-label={lt('Close', 'Fermer', 'إغلاق')}
                >
                  <X size={20} />
                </button>
              </div>

              {isLoadingEditJob ? (
                <div className="p-20 flex flex-col items-center justify-center gap-4 text-gray-400">
                  <div className="w-10 h-10 border-4 border-gray-100 border-t-[#F68D58] rounded-full animate-spin" />
                  <p className="font-bold text-sm uppercase tracking-widest">
                    {lt('Loading…', 'Chargement…', 'جار التحميل…')}
                  </p>
                </div>
              ) : (
                <form onSubmit={handleUpdateJob} className="p-8 space-y-8 max-h-[65vh] overflow-y-auto">
                  <div className={`space-y-3 ${isRTL ? 'text-right' : ''}`}>
                    <label className="text-sm font-bold text-gray-900">{t('position')} *</label>
                    <input
                      type="text"
                      required
                      value={editJobData.title}
                      onChange={(e) => setEditJobData({ ...editJobData, title: e.target.value })}
                      className={`w-full px-6 py-4 rounded-2xl border border-gray-100 outline-none focus:border-[#173E7D] transition-all bg-white text-gray-700 ${isRTL ? 'text-right' : ''}`}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className={`space-y-3 ${isRTL ? 'text-right' : ''}`}>
                      <label className="text-sm font-bold text-gray-900">Wilaya *</label>
                      <select
                        value={editJobData.wilaya}
                        onChange={(e) => setEditJobData({ ...editJobData, wilaya: e.target.value })}
                        className={`w-full px-6 py-4 rounded-2xl border border-gray-100 outline-none focus:border-[#173E7D] transition-all bg-white text-gray-700 ${isRTL ? 'text-right' : ''}`}
                      >
                        {WILAYAS.map((w) => <option key={w} value={w}>{w}</option>)}
                      </select>
                    </div>
                    <div className={`space-y-3 ${isRTL ? 'text-right' : ''}`}>
                      <label className="text-sm font-bold text-gray-900">{t('contractType')} *</label>
                      <select
                        value={editJobData.type}
                        onChange={(e) => setEditJobData({ ...editJobData, type: e.target.value })}
                        className={`w-full px-6 py-4 rounded-2xl border border-gray-100 outline-none focus:border-[#173E7D] transition-all bg-white text-gray-700 ${isRTL ? 'text-right' : ''}`}
                      >
                        <option>Temps plein</option>
                        <option>Temps partiel</option>
                        <option>Freelance</option>
                        <option>Stage</option>
                        <option>CDI</option>
                        <option>CDD</option>
                      </select>
                    </div>
                    <div className={`space-y-3 ${isRTL ? 'text-right' : ''}`}>
                      <label className="text-sm font-bold text-gray-900">Niveau d'expérience *</label>
                      <select
                        value={editJobData.experience}
                        onChange={(e) => setEditJobData({ ...editJobData, experience: e.target.value })}
                        className={`w-full px-6 py-4 rounded-2xl border border-gray-100 outline-none focus:border-[#173E7D] transition-all bg-white text-gray-700 ${isRTL ? 'text-right' : ''}`}
                      >
                        <option>Débutant (0-2 ans)</option>
                        <option>Confirmé (3-5 ans)</option>
                        <option>Senior (5-10 ans)</option>
                        <option>Expert (10+ ans)</option>
                      </select>
                    </div>
                    <div className={`space-y-3 ${isRTL ? 'text-right' : ''}`}>
                      <label className="text-sm font-bold text-gray-900">{lt('Status', 'Statut', 'الحالة')}</label>
                      <select
                        value={editJobData.status}
                        onChange={(e) => setEditJobData({ ...editJobData, status: e.target.value })}
                        className={`w-full px-6 py-4 rounded-2xl border border-gray-100 outline-none focus:border-[#173E7D] transition-all bg-white text-gray-700 ${isRTL ? 'text-right' : ''}`}
                      >
                        <option value="PUBLISHED">{lt('Active', 'Active', 'نشط')}</option>
                        <option value="CLOSED">{lt('Closed', 'Fermée', 'مغلقة')}</option>
                      </select>
                    </div>
                    <div className={`space-y-3 ${isRTL ? 'text-right' : ''}`}>
                      <label className="text-sm font-bold text-gray-900">{lt('Min salary (DZD)', 'Salaire min (DZD)', 'الحد الأدنى للراتب')}</label>
                      <input
                        type="number"
                        min="0"
                        value={editJobData.salaryMin}
                        onChange={(e) => setEditJobData({ ...editJobData, salaryMin: e.target.value })}
                        className={`w-full px-6 py-4 rounded-2xl border border-gray-100 outline-none focus:border-[#173E7D] transition-all bg-white text-gray-700 ${isRTL ? 'text-right' : ''}`}
                      />
                    </div>
                    <div className={`space-y-3 ${isRTL ? 'text-right' : ''}`}>
                      <label className="text-sm font-bold text-gray-900">{lt('Max salary (DZD)', 'Salaire max (DZD)', 'الحد الأقصى للراتب')}</label>
                      <input
                        type="number"
                        min="0"
                        value={editJobData.salaryMax}
                        onChange={(e) => setEditJobData({ ...editJobData, salaryMax: e.target.value })}
                        className={`w-full px-6 py-4 rounded-2xl border border-gray-100 outline-none focus:border-[#173E7D] transition-all bg-white text-gray-700 ${isRTL ? 'text-right' : ''}`}
                      />
                    </div>
                  </div>

                  <div className={`space-y-3 ${isRTL ? 'text-right' : ''}`}>
                    <label className="text-sm font-bold text-gray-900">{t('description')} *</label>
                    <textarea
                      required
                      rows={7}
                      value={editJobData.description}
                      onChange={(e) => setEditJobData({ ...editJobData, description: e.target.value })}
                      className={`w-full px-6 py-4 rounded-2xl border border-gray-100 outline-none focus:border-[#173E7D] transition-all bg-white text-gray-700 resize-y ${isRTL ? 'text-right' : ''}`}
                    />
                  </div>

                  <div className={`flex items-center gap-4 pt-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <button
                      type="submit"
                      disabled={isSavingJob}
                      className="flex-1 bg-[#173E7D] text-white py-5 rounded-[1.5rem] font-black text-[11px] uppercase tracking-[0.2em] hover:bg-blue-800 transition-all shadow-xl shadow-blue-900/10 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                    >
                      {isSavingJob ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          {lt('Saving…', 'Enregistrement…', 'جار الحفظ…')}
                        </>
                      ) : (
                        <>
                          <Save size={18} />
                          {lt('Save changes', 'Enregistrer', 'حفظ التعديلات')}
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingJobId(null)}
                      disabled={isSavingJob}
                      className="px-8 py-5 rounded-[1.5rem] bg-gray-50 text-gray-500 font-black text-[11px] uppercase tracking-[0.2em] hover:bg-gray-100 transition-all disabled:opacity-40"
                    >
                      {lt('Cancel', 'Annuler', 'إلغاء')}
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile sidebar backdrop.
          Both conditions here were inverted: it rendered while the drawer was
          CLOSED, so arriving on mobile blurred the page with nothing open, and
          tapping the blur OPENED the menu instead of dismissing it. */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.aside 
            initial={{ x: -260 }}
            animate={{ x: 0 }}
            exit={{ x: -260 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 left-0 w-[260px] bg-[#DEE6E2] border-r border-gray-200 z-50 flex flex-col lg:hidden shadow-2xl"
          >
            <div className="p-8 flex items-center justify-between">
              <Logo size="md" onClick={onGoHome} />
              <button onClick={() => setIsSidebarOpen(false)} className="p-2 hover:bg-white/50 rounded-lg transition-colors">
                <X size={20} className="text-[#173E7D]" />
              </button>
            </div>

            <nav className="flex-1 px-4 space-y-1 overflow-y-auto no-scrollbar">
              {user?.role === 'employer' ? (
                <>
                  <SidebarItem 
                    icon={BarChart3} 
                    label={t('dashboard')} 
                    active={activeTab === 'employer-dashboard'} 
                    onClick={() => { setActiveTab('employer-dashboard'); setIsSidebarOpen(false); }} 
                  />
                  <SidebarItem 
                    icon={Briefcase} 
                    label={t('manageJobs')} 
                    active={activeTab === 'manage-jobs'} 
                    onClick={() => { setActiveTab('manage-jobs'); setIsSidebarOpen(false); }} 
                  />
                  <SidebarItem 
                    icon={UsersIcon} 
                    label={t('candidates')} 
                    active={activeTab === 'candidates'} 
                    onClick={() => { setActiveTab('candidates'); setIsSidebarOpen(false); }} 
                  />
                  <SidebarItem 
                    icon={Cpu} 
                    label="Filtre IA" 
                    active={activeTab === 'ai-filter'} 
                    onClick={() => { setActiveTab('ai-filter'); setIsSidebarOpen(false); }} 
                  />
                  <SectionLabel>{t('tools')}</SectionLabel>
                  <SidebarItem 
                    icon={PlusCircle} 
                    label={t('postJob')} 
                    active={activeTab === 'post-job'} 
                    onClick={() => { setActiveTab('post-job'); setIsSidebarOpen(false); }} 
                  />
                  <SidebarItem 
                    icon={Gem} 
                    label={t('subscription')} 
                    active={activeTab === 'subscription'} 
                    onClick={() => { setActiveTab('subscription'); setIsSidebarOpen(false); }} 
                  />
                  <SidebarItem 
                    icon={Building2} 
                    label={t('companyProfile')} 
                    active={activeTab === 'profile'} 
                    onClick={() => { setActiveTab('profile'); setIsSidebarOpen(false); }} 
                  />
                </>
              ) : (
                <>
                  <SidebarItem 
                    icon={BarChart3} 
                    label={t('dashboard')} 
                    active={activeTab === 'dashboard'} 
                    onClick={() => { setActiveTab('dashboard'); setIsSidebarOpen(false); }} 
                  />
                  <SidebarItem 
                    icon={Briefcase} 
                    label={t('jobs')} 
                    active={activeTab === 'jobs'} 
                    onClick={() => { setActiveTab('jobs'); setIsSidebarOpen(false); }} 
                  />
                  <SidebarItem 
                    icon={ClipboardList} 
                    label={t('myApplications')} 
                    active={activeTab === 'applications'} 
                    onClick={() => { setActiveTab('applications'); setIsSidebarOpen(false); }} 
                  />
                  <SidebarItem 
                    icon={Bookmark} 
                    label={t('saved')} 
                    active={activeTab === 'saved'} 
                    onClick={() => { setActiveTab('saved'); setIsSidebarOpen(false); }} 
                  />

                  <SectionLabel>{t('tools')}</SectionLabel>
                  <SidebarItem 
                    icon={FileText} 
                    label={t('cvMaker')} 
                    active={activeTab === 'cv-maker'} 
                    onClick={() => { setActiveTab('cv-maker'); setIsSidebarOpen(false); }} 
                  />
                  <SidebarItem 
                    icon={Brain} 
                    label="Quiz IA" 
                    active={activeTab === 'ai-quiz'} 
                    onClick={() => { 
                      setActiveTab('ai-quiz'); 
                      setIsSidebarOpen(false); 
                    }} 
                  />
                  <SidebarItem 
                    icon={User} 
                    label={t('myProfile')} 
                    active={activeTab === 'profile'} 
                    onClick={() => { setActiveTab('profile'); setIsSidebarOpen(false); }} 
                  />
                </>
              )}

              <SectionLabel>{t('account')}</SectionLabel>
              <SidebarItem 
                icon={Bell} 
                label={t('notifications')} 
                active={activeTab === 'notifications'} 
                onClick={() => { setActiveTab('notifications'); setIsSidebarOpen(false); }} 
              />
              <SidebarItem 
                icon={Settings} 
                label={t('settings')} 
                active={activeTab === 'settings'} 
                onClick={() => { setActiveTab('settings'); setIsSidebarOpen(false); }} 
              />
            </nav>

            <div className="p-4 mt-auto">
              <button 
                onClick={handleLogout}
                className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-red-500 hover:bg-red-50 transition-all font-bold ${isRTL ? 'flex-row-reverse' : ''}`}
              >
                <LogOut size={22} />
                <span>{t('logout')}</span>
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ width: isSidebarOpen ? 260 : 0, opacity: isSidebarOpen ? 1 : 0 }}
        className={`bg-[#DEE6E2] border-r border-gray-200 overflow-hidden hidden lg:flex flex-col sticky top-0 h-screen ${isRTL ? 'border-l border-r-0' : 'border-r'}`}
      >
        <div className="p-8 flex items-center gap-3">
          <Logo size="md" onClick={onGoHome} />
        </div>

        <nav className="flex-1 px-4 space-y-1 overflow-y-auto no-scrollbar">
          {user?.role === 'employer' ? (
            <>
              <SidebarItem 
                icon={BarChart3} 
                label={t('dashboard')} 
                active={activeTab === 'employer-dashboard'} 
                onClick={() => setActiveTab('employer-dashboard')} 
              />
              <SidebarItem 
                icon={Briefcase} 
                label={t('manageJobs')} 
                active={activeTab === 'manage-jobs'} 
                onClick={() => setActiveTab('manage-jobs')} 
              />
              <SidebarItem 
                icon={UsersIcon} 
                label={t('candidates')} 
                active={activeTab === 'candidates'} 
                onClick={() => setActiveTab('candidates')} 
              />
              <SidebarItem 
                icon={Cpu} 
                label="Filtre IA" 
                active={activeTab === 'ai-filter'} 
                onClick={() => setActiveTab('ai-filter')} 
              />
              <SectionLabel>{t('tools')}</SectionLabel>
              <SidebarItem 
                icon={PlusCircle} 
                label={t('postJob')} 
                active={activeTab === 'post-job'} 
                onClick={() => setActiveTab('post-job')} 
              />
              <SidebarItem 
                icon={Gem} 
                label={t('subscription')} 
                active={activeTab === 'subscription'} 
                onClick={() => setActiveTab('subscription')} 
              />
              <SidebarItem 
                icon={Building2} 
                label={t('companyProfile')} 
                active={activeTab === 'profile'} 
                onClick={() => setActiveTab('profile')} 
              />
            </>
          ) : (
            <>
              <SidebarItem 
                icon={LayoutDashboard} 
                label={t('dashboard')} 
                active={activeTab === 'dashboard'} 
                onClick={() => setActiveTab('dashboard')} 
              />
              <SidebarItem 
                icon={Briefcase} 
                label={t('jobs')} 
                active={activeTab === 'jobs'} 
                onClick={() => setActiveTab('jobs')} 
              />
              <SidebarItem 
                icon={ClipboardList} 
                label={t('myApplications')} 
                active={activeTab === 'applications'} 
                onClick={() => setActiveTab('applications')} 
              />
              <SidebarItem 
                icon={Bookmark} 
                label={t('saved')} 
                active={activeTab === 'saved'} 
                onClick={() => setActiveTab('saved')} 
              />

              <SectionLabel>{t('tools')}</SectionLabel>
              <SidebarItem 
                icon={FileText} 
                label={t('cvMaker')} 
                active={activeTab === 'cv-maker'} 
                onClick={() => setActiveTab('cv-maker')} 
              />
              <SidebarItem 
                icon={Brain} 
                label="Quiz IA" 
                active={activeTab === 'ai-quiz'} 
                onClick={() => setActiveTab('ai-quiz')} 
              />
              <SidebarItem 
                icon={User} 
                label={t('myProfile')} 
                active={activeTab === 'profile'} 
                onClick={() => setActiveTab('profile')} 
              />
            </>
          )}

          <SectionLabel>{t('account')}</SectionLabel>
          <SidebarItem 
            icon={Bell} 
            label={t('notifications')} 
            active={activeTab === 'notifications'} 
            onClick={() => setActiveTab('notifications')} 
          />
          <SidebarItem 
            icon={Settings} 
            label={t('settings')} 
            active={activeTab === 'settings'} 
            onClick={() => setActiveTab('settings')} 
          />
        </nav>

        <div className="p-4 mt-auto">
          <button 
            onClick={handleLogout}
            className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-red-500 hover:bg-red-50 transition-all font-bold ${isRTL ? 'flex-row-reverse' : ''}`}
          >
            <LogOut size={22} />
            <span>{t('logout')}</span>
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-20 bg-white border-b border-gray-100 flex items-center justify-between px-8 sticky top-0 z-30">
        <div className={`flex items-center gap-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-gray-100 rounded-xl transition-colors lg:hidden"
            >
              <Menu size={24} className="text-[#173E7D]" />
            </button>
            <div className={`hidden md:flex items-center gap-2 text-sm font-bold text-gray-400 uppercase tracking-widest ${isRTL ? 'flex-row-reverse' : ''}`}>
              <span>{language === 'ar' ? 'مساحة' : 'Espace'}</span>
              <ChevronRight size={14} className={isRTL ? 'rotate-180' : ''} />
              <span className="text-[#173E7D]">{t(activeTab)}</span>
            </div>
          </div>

          <div className={`flex items-center gap-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <button className="relative p-2 text-gray-400 hover:text-[#173E7D] transition-colors">
              <Bell size={22} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-[#F68D58] rounded-full border-2 border-white"></span>
            </button>
            <div className="h-8 w-px bg-gray-100" />
            <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className={`hidden sm:block ${isRTL ? 'text-left' : 'text-right'}`}>
                <div className="text-sm font-bold text-[#173E7D] leading-none">{user?.displayName}</div>
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-1">
                  {user?.role === 'employer' 
                    ? (language === 'ar' ? 'صاحب عمل' : 'Employeur')
                    : (language === 'ar' ? 'باحث عن عمل' : 'Chercheur d\'emploi')}
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl overflow-hidden border-2 border-gray-100">
                <img src={displayPhotoURL || 'https://picsum.photos/seed/user/100/100'} alt="Profile" className="w-full h-full object-cover" />
              </div>
            </div>
          </div>
        </div>
        </header>

        {/* Content Area */}
        <div className="p-8 max-w-6xl mx-auto w-full">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
      {/* Candidate CV Modal */}
      <AnimatePresence>
        {selectedCandidateCV && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setSelectedCandidateCV(null);
                setShowContactOptions(false);
              }}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-4xl max-h-[90vh] rounded-[3rem] shadow-2xl relative z-10 overflow-hidden flex flex-col"
            >
              {/* Close control sits outside the document so the CV itself is
                  identical to what the candidate sees and what is exported. */}
              <button
                onClick={() => {
                  setSelectedCandidateCV(null);
                  setShowContactOptions(false);
                }}
                className="absolute top-8 right-8 z-20 text-white/70 hover:text-white transition-colors"
                aria-label="Fermer"
              >
                <X size={28} />
              </button>

              <div className="flex-1 overflow-y-auto no-scrollbar">
                {candidateCvLoading ? (
                  <div className="py-24 flex flex-col items-center gap-4 text-gray-400">
                    <div className="w-10 h-10 border-4 border-gray-100 border-t-[#F68D58] rounded-full animate-spin" />
                    <p className="font-bold text-xs uppercase tracking-widest">Chargement du CV…</p>
                  </div>
                ) : candidateCvError ? (
                  <div className="py-24 px-10 text-center">
                    <p className="text-xl font-black text-[#173E7D] mb-2">CV indisponible</p>
                    <p className="text-gray-400 font-medium">{candidateCvError}</p>
                  </div>
                ) : (
                  <>
                    {candidateCvDoc && !candidateCvHasBuilt && (
                      <div className="px-10 pt-8">
                        <p className="text-[11px] font-black text-amber-700 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-3 uppercase tracking-widest">
                          Ce candidat n'a pas encore complété son CV en ligne
                        </p>
                      </div>
                    )}
                    {/* Same component, same design as the candidate's own CV. */}
                    <CVDocument
                      id="employer-cv-view-container"
                      data={candidateCvDoc ?? emptyCvDocument}
                      language={language}
                      photoUrl={candidateCvPhoto ?? selectedCandidateCV.avatar}
                      showFooter={false}
                      className="shadow-none border-0 rounded-none max-w-none"
                    />
                  </>
                )}
              </div>

              {/* CV Footer / Actions */}
              <div className="p-10 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
                <div className="flex gap-4">
                  <button className="px-8 py-4 bg-[#173E7D] text-white rounded-2xl font-black uppercase tracking-widest hover:bg-[#0A1118] transition-all shadow-xl shadow-blue-900/20 flex items-center gap-3">
                    <FileText size={20} /> Télécharger PDF
                  </button>
                  <button className="px-8 py-4 bg-white text-[#173E7D] border border-gray-200 rounded-2xl font-black uppercase tracking-widest hover:bg-gray-50 transition-all">
                    Imprimer
                  </button>
                </div>
                <div className="relative">
                  <AnimatePresence>
                    {showContactOptions && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute bottom-full right-0 mb-4 bg-white rounded-2xl shadow-2xl border border-gray-100 p-2 min-w-[200px] z-50"
                      >
                        <a 
                          href={`tel:${selectedCandidateCV.phone || ''}`}
                          className="flex items-center gap-3 px-4 py-3 hover:bg-orange-50 rounded-xl transition-colors text-gray-700 font-bold text-sm"
                        >
                          <div className="w-8 h-8 bg-orange-100 text-[#F68D58] rounded-lg flex items-center justify-center">
                            <Phone size={16} />
                          </div>
                          Appeler au téléphone
                        </a>
                        <a 
                          href={`mailto:${selectedCandidateCV.email || ''}`}
                          className="flex items-center gap-3 px-4 py-3 hover:bg-blue-50 rounded-xl transition-colors text-gray-700 font-bold text-sm"
                        >
                          <div className="w-8 h-8 bg-blue-100 text-[#173E7D] rounded-lg flex items-center justify-center">
                            <Mail size={16} />
                          </div>
                          Contacter par mail
                        </a>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <button 
                    onClick={() => setShowContactOptions(!showContactOptions)}
                    className="px-10 py-4 bg-[#F68D58] text-white rounded-2xl font-black uppercase tracking-widest hover:bg-[#e57d47] transition-all shadow-xl shadow-orange-500/20"
                  >
                    Contacter le candidat
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Job Details Modal */}
      <AnimatePresence>
        {selectedJob && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 md:p-8">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedJob(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-4xl max-h-[90vh] rounded-[3rem] shadow-2xl relative z-10 overflow-hidden flex flex-col"
            >
              {/* Header */}
              <div className="bg-[#173E7D] p-10 text-white relative">
                <button 
                  onClick={() => setSelectedJob(null)}
                  className="absolute top-8 right-8 text-white/60 hover:text-white transition-colors"
                >
                  <X size={28} />
                </button>
                <div className="flex items-center gap-8">
                  <div className="w-24 h-24 bg-white/10 rounded-[2rem] flex items-center justify-center border border-white/20 shadow-2xl">
                    <Building2 size={48} />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-4xl font-display font-black tracking-tight">{selectedJob.title}</h3>
                    <p className="text-blue-200 text-xl font-medium tracking-wide uppercase">{selectedJob.company}</p>
                    <div className="flex gap-4 mt-4">
                      <span className="px-4 py-1.5 bg-white/10 rounded-full text-xs font-bold border border-white/10 flex items-center gap-2">
                        <MapPin size={14} /> {selectedJob.location}
                      </span>
                      <span className="px-4 py-1.5 bg-emerald-500/20 text-emerald-400 rounded-full text-xs font-bold border border-emerald-500/20">
                        {selectedJob.type}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-12 space-y-12 no-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                  <div className="md:col-span-2 space-y-12">
                    <section className="space-y-6">
                      <h4 className="text-xs font-black text-gray-400 uppercase tracking-[0.3em] flex items-center gap-3">
                        <FileText size={16} className="text-[#F68D58]" /> Description du Poste
                      </h4>
                      <p className="text-gray-600 leading-relaxed text-lg font-medium">
                        {selectedJob.description}
                      </p>
                    </section>

                    <section className="space-y-6">
                      <h4 className="text-xs font-black text-gray-400 uppercase tracking-[0.3em] flex items-center gap-3">
                        <CheckCircle2 size={16} className="text-[#F68D58]" /> Missions & Responsabilités
                      </h4>
                      <ul className="space-y-4">
                        {selectedJob.requirements.map((req, i) => (
                          <li key={i} className="flex items-start gap-4 text-gray-600 font-medium">
                            <div className="w-2 h-2 bg-[#F68D58] rounded-full mt-2 shrink-0" />
                            {req}
                          </li>
                        ))}
                      </ul>
                    </section>
                  </div>

                  <div className="space-y-12">
                    <section className="space-y-6">
                      <h4 className="text-xs font-black text-gray-400 uppercase tracking-[0.3em]">Avantages</h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedJob.benefits.map((ben, i) => (
                          <span key={i} className="px-4 py-2 bg-gray-50 text-[#173E7D] text-xs font-black rounded-xl border border-gray-100">
                            {ben}
                          </span>
                        ))}
                      </div>
                    </section>

                    <section className="p-8 bg-blue-50 rounded-[2.5rem] border border-blue-100 space-y-6">
                      <div className="space-y-1">
                        <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Salaire Proposé</p>
                        <p className="text-2xl font-black text-[#173E7D]">{selectedJob.salary}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Date de publication</p>
                        <p className="text-sm font-bold text-[#173E7D]">Il y a 2 jours</p>
                      </div>
                    </section>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-10 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
                <button 
                  onClick={() => setSelectedJob(null)}
                  className="px-8 py-4 bg-white text-gray-400 border border-gray-200 rounded-2xl font-black uppercase tracking-widest hover:bg-gray-50 transition-all"
                >
                  Fermer
                </button>
                <button 
                  onClick={() => setShowApplyConfirmation(true)}
                  className="px-12 py-4 bg-[#173E7D] text-white rounded-2xl font-black uppercase tracking-widest hover:bg-[#0A1118] transition-all shadow-xl shadow-blue-900/20"
                >
                  Postuler maintenant
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Invitation Simulation Modal */}
      <AnimatePresence>
        {showInviteSimulation && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl"
            >
              <div className="bg-[#173E7D] p-8 text-white">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                    <Mail size={20} />
                  </div>
                  <span className="font-black uppercase tracking-widest text-sm">Simulation Email</span>
                </div>
                <h2 className="text-2xl font-bold">Invitation à rejoindre TechDz Solutions</h2>
              </div>
              
              <div className="p-8 space-y-6">
                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <div className="w-12 h-12 bg-blue-100 text-[#173E7D] rounded-full flex items-center justify-center font-bold">
                    {showInviteSimulation.inviterName.charAt(0)}
                  </div>
                  <div className={isRTL ? 'text-right' : ''}>
                    <div className="text-sm text-gray-400">De: <span className="text-gray-700 font-bold">{showInviteSimulation.inviterName}</span></div>
                    <div className="text-sm text-gray-400">À: <span className="text-gray-700 font-bold">{showInviteSimulation.email}</span></div>
                  </div>
                </div>

                <div className={`text-gray-600 leading-relaxed ${isRTL ? 'text-right' : ''}`}>
                  Bonjour,<br /><br />
                  <strong>{showInviteSimulation.inviterName}</strong> vous a invité à rejoindre l'équipe de recrutement sur la plateforme <strong>Dar L'emploi</strong>.<br /><br />
                  En rejoignant l'équipe, vous pourrez collaborer sur les offres d'emploi, gérer les candidatures et utiliser nos outils d'IA.
                </div>

                <div className="pt-4">
                  <button 
                    onClick={() => handleAcceptInvite(showInviteSimulation)}
                    className="w-full py-4 bg-[#F68D58] text-white rounded-2xl font-black uppercase tracking-widest hover:bg-[#e57d47] transition-all shadow-lg shadow-orange-200/50"
                  >
                    Accepter l'invitation
                  </button>
                </div>

                <p className="text-center text-xs text-gray-400">
                  Ceci est une simulation de l'email que recevrait l'utilisateur invité.
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Apply Confirmation Modal */}
      <AnimatePresence>
        {showApplyConfirmation && selectedJob && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowApplyConfirmation(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl relative z-10 overflow-hidden border border-white/20 p-10 text-center"
            >
              <div className="w-20 h-20 bg-blue-50 text-[#173E7D] rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-inner">
                <Briefcase size={40} strokeWidth={1.5} />
              </div>
              <h3 className="text-2xl font-display font-black text-[#173E7D] mb-4 tracking-tighter">
                {language === 'ar' ? 'هل أنت متأكد من رغبتك في التقديم؟' : 'Êtes-vous sûr de vouloir postuler à cette offre ?'}
              </h3>
              <p className="text-sm text-gray-400 mb-10 font-medium leading-relaxed">
                {language === 'ar' ? 'سيتم إرسال ملفك الشخصي وسيرتك الذاتية إلى صاحب العمل.' : 'Votre profil et votre CV seront envoyés à l\'employeur.'}
              </p>
              
              <div className="flex flex-col gap-4">
                <button 
                  onClick={() => {
                    handleApplyToJob(selectedJob.id);
                    setShowApplyConfirmation(false);
                    setSelectedJob(null);
                  }}
                  className="w-full py-5 bg-[#173E7D] text-white rounded-2xl font-black uppercase tracking-widest hover:bg-[#0A1118] transition-all shadow-xl shadow-blue-900/20"
                >
                  {language === 'ar' ? 'نعم، قدم الآن' : 'Oui, postuler'}
                </button>
                <button 
                  onClick={() => setShowApplyConfirmation(false)}
                  className="w-full py-5 bg-white text-gray-400 border border-gray-200 rounded-2xl font-black uppercase tracking-widest hover:bg-gray-50 transition-all"
                >
                  {language === 'ar' ? 'إلغاء' : 'Annuler'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}