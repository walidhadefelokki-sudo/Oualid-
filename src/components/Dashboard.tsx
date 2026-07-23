import React, { useState, useEffect } from 'react';
import CVBuilder from "./cv/CVBuilder";
import CVDirectory from "./recruiter/CVDirectory";
import QuizResults from "./recruiter/QuizResults";
import OralPresentationResults from "./recruiter/OralPresentationResults";
import PreselectedCandidates from "./recruiter/PreselectedCandidates";
import AIFilterResults from "./recruiter/AIFilterResults";
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
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Logo from './Logo';
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { useRef } from "react";
import { supabase } from '../supabase';
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
  id: number;
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
  onToggleSave: (id: number) => void;
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
  isDemo = false
}: { 
  user: any; 
  language: Language; 
  setLanguage: (lang: Language) => void; 
  onGoHome: () => void;
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

  const loadCandidates = () => {};
  const loadQuizResults = () => {};
  const loadPresentations = () => {};
  const loadPreselectedCandidates = () => {};
  const loadAICandidates = () => {};

  const handleOpenCV = () => {};
  const handleInterview = () => {};
  const handleHire = () => {};
  const handleReject = () => {};
  const handleOpenCandidate = () => {};
  const handleViewPresentation = () => {};

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
    loadCandidates();
    loadQuizResults();
    loadPresentations();
    loadPreselectedCandidates();
    loadAICandidates();
    if (!user || isDemo) return;

    // Fetch initial notifications
    const fetchNotifications = async () => {
      try {
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', user.uid)
          .order('created_at', { ascending: false });
        
        if (!error && data) setNotifications(data);
      } catch (err) {
        console.error("Error fetching notifications:", err);
      }
    };

    fetchNotifications();

    // Subscribe to real-time notifications
    const channel = supabase
      .channel(`public:notifications:user_id=eq.${user.uid}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'notifications',
        filter: `user_id=eq.${user.uid}`
      }, payload => {
        setNotifications(prev => [payload.new as Notification, ...prev]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, isDemo]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (isDemo) {
      alert(lt('CV uploaded successfully (Demo)!', 'CV téléchargé avec succès (Démo) !', 'تم رفع السيرة الذاتية بنجاح (تجربة)!'));
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.uid}-${Math.random()}.${fileExt}`;
      const filePath = `cvs/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('cvs')
        .upload(filePath, file);

      if (uploadError) {
        if (uploadError.message === 'Failed to fetch') {
          throw new Error('Impossible de se connecter au serveur de stockage. Veuillez vérifier votre connexion ou la configuration de stockage.');
        }
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('cvs')
        .getPublicUrl(filePath);

      // Update user profile or CV record with the new URL
      const { error: updateError } = await supabase
        .from('users')
        .update({ resume_url: publicUrl })
        .eq('uid', user.uid);

      if (updateError) throw updateError;

      setProfileData(prev => ({ ...prev, resumeUrl: publicUrl }));
      alert(lt('CV uploaded successfully!', 'CV téléchargé avec succès !', 'تم رفع السيرة الذاتية بنجاح!'));
    } catch (error: any) {
      console.error('Error uploading file:', error);
      alert(lt(`Error: ${error.message}`, `Erreur: ${error.message}`, `خطأ: ${error.message}`));
    } finally {
      setIsUploading(false);
    }
  };

  const [activeTab, setActiveTab] = useState(user?.role === 'employer' ? 'employer-dashboard' : 'dashboard');
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
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
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

  // Firebase Saved Jobs Logic
  useEffect(() => {
    if (!user || isDemo) return;

    // Skip real Firestore logic if user is not authenticated in Firebase
    if (!auth.currentUser) return;

    const q = query(
      collection(db, 'saved_jobs'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const jobIds = snapshot.docs.map(doc => doc.data().jobId);
      setSavedJobs(jobIds);
    }, (error) => {
      if (error.code === 'permission-denied') {
        console.warn("Firestore permissions denied for saved_jobs - expected in demo mode without auth");
      } else {
        console.error("Error fetching saved jobs:", error);
      }
    });

    return () => unsubscribe();
  }, [user, isDemo]);

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

  const mockaiCandidates = [
    {
      id: 1,
      name: 'Ahmed Benali',
      role: 'Développeur Full Stack',
      exp: '5 ans',
      location: 'Alger',
      match: 92,
      category: 'Excellent match',
      summary: lt(
        'Excellent candidate with solid Full Stack experience. Profile very well suited to the job requirements.',
        'Excellent candidat avec une solide expérience Full Stack. Profil très adapté aux exigences du poste.',
        'ممتاز مع خبرة قوية في Full Stack. الملف الشخصي مناسب جداً لمتطلبات الوظيفة.'
      ),
      email: 'ahmed.benali@email.dz',
      phone: '+213 550 12 34 56',
      scores: { exp: 95, skills: 90, edu: 88 },
      strengths: ['5 ans d\'expérience Full Stack', 'Compétences React, Node.js, PostgreSQL', 'Basé à Alger — aucune relocalisation nécessaire'],
      weaknesses: ['Pas d\'expérience cloud mentionnée']
    },
    {
      id: 2,
      name: 'Fatima Zohra Kaci',
      role: 'Ingénieur Logiciel',
      exp: '3 ans',
      location: 'Oran',
      match: 87,
      category: 'Bon match',
      summary: 'Très bon profil technique avec une expérience pertinente en ingénierie logicielle.',
      email: 'f.kaci@email.dz',
      phone: '+213 660 98 76 54',
      scores: { exp: 85, skills: 92, edu: 84 },
      strengths: ['Excellentes compétences techniques', 'Formation solide', 'Expérience en entreprise'],
      weaknesses: ['Expérience légèrement inférieure au souhaité']
    },
    {
      id: 3,
      name: 'Mohammed Saidi',
      role: 'Développeur Backend',
      exp: '7 ans',
      location: 'Constantine',
      match: 78,
      category: 'Bon match',
      summary: 'Profil senior avec une grande expertise backend, bien que moins polyvalent sur le frontend.',
      email: 'm.saidi@email.dz',
      phone: '+213 770 11 22 33',
      scores: { exp: 98, skills: 75, edu: 70 },
      strengths: ['Expertise backend confirmée', '7 ans d\'expérience', 'Stabilité professionnelle'],
      weaknesses: ['Manque de compétences frontend modernes']
    },
    {
      id: 4,
      name: 'Youcef Hamdi',
      role: 'Développeur Mobile',
      exp: '4 ans',
      location: 'Sétif',
      match: 68,
      category: 'Match partiel',
      summary: 'Candidat intéressant mais dont le profil est plus orienté mobile que full stack web.',
      email: 'y.hamdi@email.dz',
      phone: '+213 555 44 33 22',
      scores: { exp: 70, skills: 65, edu: 72 },
      strengths: ['Expérience mobile solide', 'Bonne autonomie'],
      weaknesses: ['Compétences web à renforcer', 'Peu d\'expérience en équipe agile']
    },
    {
      id: 5,
      name: 'Amina Bouzid',
      role: 'Data Scientist',
      exp: '2 ans',
      location: 'Alger',
      match: 52,
      category: 'Match partiel',
      summary: 'Profil très junior avec une spécialisation data qui s\'éloigne du besoin de développement full stack.',
      email: 'amina.b@email.dz',
      phone: '+213 551 22 33 44',
      scores: { exp: 45, skills: 55, edu: 60 },
      strengths: ['Potentiel d\'apprentissage élevé', 'Rigueur analytique'],
      weaknesses: ['Manque d\'expérience en développement web', 'Profil trop spécialisé data']
    }
  ];

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
              src={user.photoURL || 'https://i.pravatar.cc/150?u=oualid'}
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

        {/* Footer: Salary & Action */}
        <div className="relative z-10 flex items-center justify-between pt-8 mt-8 border-t border-gray-50">
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
              {lt('Estimated Salary', 'Salaire Estimé', 'الراتب المتوقع')}
            </p>
            <p className="text-2xl font-black text-[#173E7D] group-hover:text-[#F68D58] transition-colors">{job.salary}</p>
          </div>
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

  // CV Maker State
  const [cvModel, setCvModel] = useState('moderne');
  const [cvSection, setCvSection] = useState('info');
  const [cvData, setCvData] = useState({
    name: user?.displayName || 'Votre nom',
    email: user?.email || '',
    phone: '',
    address: '',
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

  const [candidatesByJob, setCandidatesByJob] = useState([
    {
      jobTitle: 'Senior React Developer',
      publishedAt: '17/08/2026',
      candidates: [
        { name: 'Ahmed Benali', role: 'Fullstack Developer', exp: '5 ans', match: 95, avatar: 'https://i.pravatar.cc/150?u=ahmed', email: 'ahmed.benali@email.dz', phone: '+213 550 12 34 56', status: 'Nouveau' },
        { name: 'Karim Zidi', role: 'DevOps Engineer', exp: '7 ans', match: 92, avatar: 'https://i.pravatar.cc/150?u=karim', email: 'k.zidi@email.dz', phone: '+213 772 55 66 77', status: 'En cours' },
        { name: 'Sami Mansour', role: 'Frontend Engineer', exp: '4 ans', match: 89, avatar: 'https://i.pravatar.cc/150?u=sami', email: 's.mansour@email.dz', phone: '+213 554 11 22 33', status: 'Nouveau' },
      ]
    },
    {
      jobTitle: 'UX Designer',
      publishedAt: '15/08/2026',
      candidates: [
        { name: 'Sarah Mansouri', role: 'UI/UX Designer', exp: '3 ans', match: 88, avatar: 'https://i.pravatar.cc/150?u=sarah', email: 's.mansouri@email.dz', phone: '+213 661 22 33 44', status: 'Nouveau' },
        { name: 'Lina Kaci', role: 'Product Manager', exp: '4 ans', match: 85, avatar: 'https://i.pravatar.cc/150?u=lina', email: 'l.kaci@email.dz', phone: '+213 553 88 99 00', status: 'En cours' },
        { name: 'Omar Sy', role: 'Visual Designer', exp: '5 ans', match: 82, avatar: 'https://i.pravatar.cc/150?u=omar', email: 'o.sy@email.dz', phone: '+213 552 33 44 55', status: 'Nouveau' },
      ]
    },
    {
      jobTitle: 'Marketing Manager',
      publishedAt: '10/08/2026',
      candidates: [
        { name: 'Yacine Brahimi', role: 'Growth Hacker', exp: '6 ans', match: 91, avatar: 'https://i.pravatar.cc/150?u=yacine', email: 'y.brahimi@email.dz', phone: '+213 662 44 55 66', status: 'Nouveau' },
        { name: 'Amel Bent', role: 'Content Strategist', exp: '2 ans', match: 76, avatar: 'https://i.pravatar.cc/150?u=amel', email: 'a.bent@email.dz', phone: '+213 551 77 88 99', status: 'Refusé' },
        { name: 'Sofiane H.', role: 'SEO Specialist', exp: '3 ans', match: 84, avatar: 'https://i.pravatar.cc/150?u=sofiane', email: 's.h@email.dz', phone: '+213 771 22 33 44', status: 'En cours' },
      ]
    },
    {
      jobTitle: 'Data Scientist',
      publishedAt: '05/08/2026',
      candidates: [
        { name: 'Zinedine Z.', role: 'ML Engineer', exp: '4 ans', match: 94, avatar: 'https://i.pravatar.cc/150?u=zizou', email: 'z.z@email.dz', phone: '+213 550 10 10 10', status: 'Nouveau' },
        { name: 'Kylian M.', role: 'Data Analyst', exp: '2 ans', match: 81, avatar: 'https://i.pravatar.cc/150?u=kylian', email: 'k.m@email.dz', phone: '+213 660 07 07 07', status: 'Nouveau' },
      ]
    }
  ]);

  const [selectedCandidateCV, setSelectedCandidateCV] = useState<any>(null);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [savedJobs, setSavedJobs] = useState<number[]>([]);
  const [postedJobs, setPostedJobs] = useState([
    { title: 'Senior React Developer', apps: 45, status: 'Active', date: '12/03/2024' },
    { title: 'UX Designer', apps: 28, status: 'Active', date: '10/03/2024' },
    { title: 'Marketing Manager', apps: 12, status: 'Closed', date: '01/03/2024' },
  ]);

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

  const handlePostJob = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newJobData.title || !newJobData.description) {
      alert(language === 'ar' ? 'يرجى ملء جميع الحقول المطلوبة.' : 'Veuillez remplir tous les champs obligatoires.');
      return;
    }

    const newJob = {
      title: newJobData.title,
      apps: 0,
      status: 'Active',
      date: new Date().toLocaleDateString('fr-FR')
    };

    setPostedJobs([newJob, ...postedJobs]);
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
    
    alert(language === 'ar' ? 'تم نشر العرض بنجاح!' : 'Offre publiée avec succès !');
    setActiveTab('manage-jobs');
  };
  const cvPreviewRef = useRef<HTMLDivElement>(null);
  const handleApplyToJob = async (jobTitle: string) => {
    if (!user) {
      alert(language === 'ar' ? 'يرجى تسجيل الدخول للتقديم.' : 'Veuillez vous connecter pour postuler.');
      return;
    }

    try {
      // Find the job object from MOCK_JOBS
      const job = MOCK_JOBS.find(j => j.title === jobTitle || j.title === jobTitle);
      
      const applicationData = {
        jobId: job?.id || 0,
        candidateId: user.uid,
        candidateName: user.displayName || user.email,
        candidateEmail: user.email,
        candidatePhone: user.phone || '', // Need to ensure phone is in user profile
        resumeUrl: user.resumeUrl || '', // Assuming it's in the profile
        status: 'pending',
        appliedAt: serverTimestamp()
      };

      await addDoc(collection(db, 'applications'), applicationData);
      alert(language === 'ar' ? `تم إرسال طلبك لوظيفة ${jobTitle} بنجاح!` : `Votre candidature pour le poste de ${jobTitle} a été envoyée avec succès !`);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'applications');
    }
  };

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWilaya, setSelectedWilaya] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedSalary, setSelectedSalary] = useState('');
  const [selectedSector, setSelectedSector] = useState('');

  const toggleSaveJob = async (id: number) => {
    if (!user) return;

    const savedJobId = `${user.uid}_${id}`;
    const docRef = doc(db, 'saved_jobs', savedJobId);

    if (savedJobs.includes(id)) {
      try {
        await deleteDoc(docRef);
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, 'saved_jobs');
      }
    } else {
      try {
        await setDoc(docRef, {
          userId: user.uid,
          jobId: id,
          createdAt: serverTimestamp()
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, 'saved_jobs');
      }
    }
  };

  const MOCK_JOBS: Job[] = [
    {
      id: 1,
      title: language === 'ar' ? 'مطور فول ستاك سينيور' : 'Développeur Fullstack Senior',
      company: 'TechDz Solutions',
      location: language === 'ar' ? 'الجزائر' : 'Alger',
      type: 'CDI',
      remote: language === 'ar' ? 'عن بعد' : 'Télétravail',
      salary: '150k - 200k DZD',
      salaryMin: 150000,
      description: language === 'ar'
        ? 'نحن نبحث عن مطور شغوف للانضمام إلى فريقنا الديناميكي والعمل على مشاريع دولية مبتكرة باستخدام أحدث التقنيات.'
        : 'Nous recherchons un développeur passionné pour rejoindre notre équipe dynamique et travailler sur des projets d\'envergure internationale avec les dernières technologies.',
      requirements: ['React/Node.js', 'TypeScript', 'AWS', 'Docker'],
      benefits: language === 'ar'
        ? ['تأمين صحي ممتاز', 'مكافأة سنوية', 'ساعات عمل مرنة']
        : ['Assurance santé premium', 'Bonus annuel', 'Horaires flexibles'],
      logo: 'https://images.unsplash.com/photo-1549923746-c502d488b3ea?auto=format&fit=crop&q=80&w=200',
      sector: language === 'ar' ? 'المعلوماتية / التكنولوجيا' : 'Informatique / Technologie'
    },
    {
      id: 2,
      title: 'UX/UI Designer',
      company: 'Creative Studio',
      location: language === 'ar' ? 'وهران' : 'Oran',
      type: 'CDD',
      remote: language === 'ar' ? 'هجين' : 'Hybride',
      salary: '120k - 160k DZD',
      salaryMin: 120000,
      description: language === 'ar'
        ? 'انضم إلى استوديو الإبداع لدينا لتصميم واجهات مستخدم استثنائية وتجارب مستخدم فريدة لعملائنا في قطاع التكنولوجيا المالية.'
        : 'Rejoignez notre studio créatif pour concevoir des interfaces utilisateur exceptionnelles et des expériences uniques pour nos clients fintech.',
      requirements: ['Figma', 'Design System', 'Prototyping', 'User Research'],
      benefits: language === 'ar'
        ? ['تكوين مستمر', 'معدات Apple', 'خرجات الفريق']
        : ['Formation continue', 'Équipement Apple fourni', 'Sorties d\'équipe'],
      logo: 'https://images.unsplash.com/photo-1572044162444-ad60f128bde3?auto=format&fit=crop&q=80&w=200',
      sector: language === 'ar' ? 'التصميم / الإبداع' : 'Design / Création'
    },
    {
      id: 3,
      title: language === 'ar' ? 'رئيس مشروع IT' : 'Chef de Projet IT',
      company: 'Global Services',
      location: language === 'ar' ? 'قسنطينة' : 'Constantine',
      type: 'CDI',
      remote: language === 'ar' ? 'في الموقع' : 'Sur site',
      salary: '180k - 250k DZD',
      salaryMin: 180000,
      description: language === 'ar'
        ? 'إدارة مشاريع التحول الرقمي المعقدة للمؤسسات المالية الكبرى في الجزائر وقيادة فرق تقنية متعددة التخصصات.'
        : 'Gérez des projets complexes de transformation digitale pour des institutions financières majeures en Algérie et dirigez des équipes pluridisciplinaires.',
      requirements: ['PMP/Agile', 'Project Management', 'Leadership', 'Jira'],
      benefits: language === 'ar'
        ? ['سيارة عمل', 'خطة تقاعد', 'قسائم طعام']
        : ['Voiture de fonction', 'Plan de retraite', 'Tickets restaurant'],
      logo: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=200',
      sector: language === 'ar' ? 'الإدارة / التسيير' : 'Management / Gestion'
    },
    {
      id: 4,
      title: language === 'ar' ? 'متربص في التسويق الرقمي' : 'Stagiaire Marketing Digital',
      company: 'Media Pulse',
      location: language === 'ar' ? 'الجزائر' : 'Alger',
      type: 'Stage',
      remote: language === 'ar' ? 'هجين' : 'Hybride',
      salary: '30k - 50k DZD',
      salaryMin: 30000,
      description: language === 'ar'
        ? 'تعلم أساسيات التسويق الرقمي وإدارة الشبكات الاجتماعية داخل وكالة سريعة النمو ومبدعة.'
        : 'Apprenez les ficelles du marketing digital et du community management au sein d\'une agence créative en pleine croissance.',
      requirements: ['Marketing', 'Copywriting', 'Social Media', 'Canva'],
      benefits: language === 'ar'
        ? ['إمكانية التوظيف', 'توجيه', 'أجواء شركة ناشئة']
        : ['Possibilité de recrutement', 'Mentorat', 'Ambiance startup'],
      logo: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&q=80&w=200',
      sector: language === 'ar' ? 'التسويق / الاتصال' : 'Marketing / Communication'
    },
    {
      id: 5,
      title: language === 'ar' ? 'محاسب مؤكد' : 'Comptable Confirmé',
      company: 'Fiduciaire DZ',
      location: language === 'ar' ? 'سطيف' : 'Sétif',
      type: 'CDI',
      remote: language === 'ar' ? 'في الموقع' : 'Sur site',
      salary: '90k - 130k DZD',
      salaryMin: 90000,
      description: language === 'ar'
        ? 'إدارة محفظة عملاء متنوعة لمكتب محاسبة مشهور وضمان الامتثال للمعايير المحاسبية والضريبية.'
        : 'Gérez un portefeuille clients diversifié pour un cabinet comptable de renom et assurez la conformité fiscale.',
      requirements: ['Accounting', 'Taxation', 'ERP Software', 'Audit'],
      benefits: language === 'ar'
        ? ['استقرار', 'علاوات الأداء', 'تأمين']
        : ['Stabilité', 'Primes de performance', 'Assurance'],
      logo: 'https://images.unsplash.com/photo-1454165833767-027ffea9e77b?auto=format&fit=crop&q=80&w=200',
      sector: language === 'ar' ? 'المالية / المحاسبة' : 'Finance / Comptabilité'
    }
  ];

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      onGoHome();
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('users')
        .upsert({
          uid: user.uid,
          ...profileData,
          updated_at: new Date().toISOString()
        });
      
      if (error) throw error;
      alert(language === 'ar' ? 'تم تحديث الملف الشخصي بنجاح!' : 'Profil mis à jour avec succès !');
    } catch (error) {
      console.error("Error saving profile:", error);
      alert(language === 'ar' ? 'خطأ أثناء تحديث الملف الشخصي.' : 'Erreur lors de la mise à jour du profil.');
    }
  };

  const handleSaveCV = async () => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('cvs')
        .upsert({
          user_id: user.uid,
          ...cvData,
          updated_at: new Date().toISOString()
        });
      
      if (error) throw error;
      alert(language === 'ar' ? 'تم حفظ السيرة الذاتية بنجاح!' : 'CV sauvegardé avec succès !');
    } catch (error) {
      console.error("Error saving CV:", error);
      alert(language === 'ar' ? 'خطأ أثناء حفظ السيرة الذاتية.' : 'Erreur lors de la sauvegarde du CV.');
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
      await handlePrintCVElement(elementId);
    }
  }
  const handleDownloadPDF = async () => {
    setIsGeneratingPDF(true);
    try {
      await generatePDFDirectly('cv-preview-container', cvData.name || 'CV');
    } catch (error) {
      console.error('Error generating PDF:', error);
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
                {postedJobs.map((job, i) => (
                  <motion.div 
                    key={i} 
                    whileHover={{ y: -10, scale: 1.02 }}
                    className="bg-white p-10 rounded-[3.5rem] border border-gray-100 shadow-sm hover:shadow-[0_20px_50px_rgba(23,62,125,0.08)] transition-all duration-500 group relative overflow-hidden flex flex-col"
                  >
                    <div className="absolute top-0 right-0 w-24 h-24 bg-gray-50 rounded-bl-[3rem] -z-0 group-hover:bg-[#173E7D]/5 transition-colors" />
                    
                    <div className="flex justify-between items-start mb-8 relative z-10">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center bg-blue-50 text-[#173E7D] group-hover:bg-[#173E7D] group-hover:text-white transition-all duration-500 shadow-sm shadow-blue-100`}>
                        <Briefcase size={22} />
                      </div>
                      <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border shadow-sm ${
                        job.status === 'Active' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-gray-100 text-gray-400 border-gray-200'
                      }`}>
                        {job.status === 'Active' ? lt('Active', 'Active', 'نشط') : lt('Closed', 'Fermée', 'مغلقة')}
                      </span>
                    </div>

                    <div className="relative z-10 mb-8 flex-1">
                      <h3 className="text-2xl font-black text-[#173E7D] group-hover:text-[#F68D58] transition-colors tracking-tight line-clamp-2 min-h-[4rem]">{job.title}</h3>
                      <div className="flex items-center gap-3 text-[10px] font-black text-gray-400 uppercase tracking-widest mt-2">
                        <Clock size={14} className="text-[#F68D58]" />
                        {lt('Published on ', 'Publiée le ', 'نشرت في ')} {job.date}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-10 relative z-10">
                      <div className="bg-gray-50/80 backdrop-blur-sm p-5 rounded-3xl border border-gray-100 group-hover:bg-white transition-colors">
                        <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest mb-1.5">{lt('Applications', 'Candidatures', 'التقديمات')}</p>
                        <p className="text-2xl font-black text-[#173E7D]">{job.apps}</p>
                      </div>
                      <div className="bg-gray-50/80 backdrop-blur-sm p-5 rounded-3xl border border-gray-100 group-hover:bg-white transition-colors">
                        <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest mb-1.5">IA Match</p>
                        <p className="text-2xl font-black text-[#F68D58]">84%</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 relative z-10">
                      <button 
                        onClick={() => {
                          setSelectedJob(job);
                          setActiveTab('candidates');
                        }}
                        className="flex-1 bg-[#173E7D] text-white py-5 rounded-[1.5rem] font-black text-[10px] uppercase tracking-[0.2em] hover:bg-blue-800 hover:scale-[1.02] active:scale-95 transition-all duration-500 shadow-xl shadow-blue-900/10"
                      >
                        {lt('Manage', 'Gérer', 'عمليات')}
                      </button>
                      <button 
                        className="w-14 h-14 bg-white border border-gray-100 rounded-2xl flex items-center justify-center text-gray-400 hover:text-red-500 hover:border-red-100 hover:bg-red-50 transition-all"
                        onClick={() => setPostedJobs(postedJobs.filter((_, idx) => idx !== i))}
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
      // NEW — tier-gated visibility inside the Candidatures view
      canViewOralPresentation={access.oralPresentation}
      canViewPreselection={access.preselection}
      onRequestUpgrade={() => setActiveTab('subscription')}
      // handleEmail, handleShortlist, handleViewQuiz omitted — not defined yet
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
        case 'ai-filter': {
  // Free tier never sees the AI Filter feature at all
  if (!access.aiFilterAnalyse) {
    return (
      <TierLockedScreen
        title="Filtrage IA des candidatures"
        description="Laissez Gemini analyser et classer automatiquement vos candidats par pertinence. Disponible dès le plan Premium."
        requiredTier="Premium"
        icon={Cpu}
        onUpgrade={() => setActiveTab('subscription')}
      />
    );
  }

  return (
    <div className="space-y-10">
      <div className="bg-[#fcfdf2] rounded-[2rem] p-8 border border-blue-50 flex items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 bg-[#173E7D] text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Zap size={32} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-[#173E7D]">Recrutement Augmenté par l'IA</h2>
            <p className="text-gray-500 font-medium font-sans">Automatisez la pré-qualification de vos candidats et découvrez leur potentiel.</p>
          </div>
        </div>
        <div className="hidden md:block">
          <PremiumBadge />
        </div>
      </div>

      {/* Sub-Tabs for AI Filter category */}
      <div className="flex border-b border-gray-100 gap-8">
        <button
          onClick={() => setAiFilterSubTab('analyse')}
          className={`pb-4 text-sm font-black uppercase tracking-widest relative transition-all ${
            aiFilterSubTab === 'analyse' ? 'text-[#173E7D]' : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          📊 Analyse des CVs (Gemini)
          {aiFilterSubTab === 'analyse' && <motion.div layoutId="aiSubTabUnderline" className="absolute bottom-0 left-0 right-0 h-1 bg-[#173E7D] rounded-full" />}
        </button>
        <button
          onClick={() => (access.aiFilterPlayground ? setAiFilterSubTab('playground') : setActiveTab('subscription'))}
          className={`pb-4 text-sm font-black uppercase tracking-widest relative flex items-center gap-2 transition-all ${
            aiFilterSubTab === 'playground' ? 'text-[#F68D58]' : 'text-gray-400 hover:text-[#F68D58]'
          } ${!access.aiFilterPlayground ? 'opacity-60' : ''}`}
        >
          {access.aiFilterPlayground ? (
            <Sparkles size={16} className="text-current animate-pulse" />
          ) : (
            <Lock size={14} className="text-current" />
          )}
          🧪 Labo de Pré-sélection & Outils IA
          {!access.aiFilterPlayground && (
            <span className="ml-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-[#D4AF37] to-[#F0D989] text-[#0B1E3D] text-[8px] font-black uppercase tracking-widest">
              Corporate
            </span>
          )}
          {aiFilterSubTab === 'playground' && <motion.div layoutId="aiSubTabUnderline" className="absolute bottom-0 left-0 right-0 h-1 bg-[#F68D58] rounded-full" />}
        </button>
      </div>

      {aiFilterSubTab === 'analyse' ? (
        /* Main Gemini Comparative Analysis Flow */
        aiFilterStep === 'select' ? (
          <div className="space-y-12">
            {/* Selection Card - Step by Step Flow */}
            <div className="bg-white rounded-[3.5rem] p-12 border border-gray-100 shadow-xl shadow-blue-900/5 space-y-16 relative overflow-hidden">
              {/* Decorative Background */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-purple-50 rounded-full -mr-32 -mt-32 opacity-50 blur-3xl"></div>
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-50 rounded-full -ml-32 -mb-32 opacity-50 blur-3xl"></div>

              <div className="relative z-10 space-y-16">
                {/* Step 1: Select Job */}
                <div className="space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-[#173E7D] text-white rounded-xl flex items-center justify-center font-black shadow-lg shadow-blue-900/20">1</div>
                    <h3 className="text-lg font-black text-[#173E7D] uppercase tracking-widest">Sélectionner l'offre à analyser</h3>
                  </div>
                  <div className="relative group max-w-2xl">
                    <select 
                      value={selectedJobForAI}
                      onChange={(e) => setSelectedJobForAI(e.target.value)}
                      className="w-full px-8 py-6 rounded-[2rem] border-2 border-gray-50 outline-none focus:border-[#173E7D] focus:ring-8 focus:ring-blue-50 transition-all bg-gray-50/50 text-gray-700 font-bold appearance-none cursor-pointer text-lg"
                    >
                      <option>Développeur Full Stack — 23 candidatures</option>
                      <option>Designer UI/UX — 12 candidatures</option>
                      <option>Chef de Projet — 45 candidatures</option>
                    </select>
                    <ChevronDown className="absolute right-8 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none group-hover:text-[#173E7D] transition-colors" size={24} />
                  </div>
                </div>

                {/* Step 2: AI Priorities */}
                <div className="space-y-8 pt-10 border-t border-gray-50">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-[#F68D58] text-white rounded-xl flex items-center justify-center font-black shadow-lg shadow-orange-900/20">2</div>
                    <h3 className="text-lg font-black text-[#173E7D] uppercase tracking-widest">Définir les priorités de l'IA</h3>
                  </div>
                  <div className="space-y-6">
                    <p className="text-sm text-gray-400 font-medium max-w-xl font-sans">Sélectionnez les éléments que Gemini doit valoriser lors de l'analyse comparative des CV pour cette offre spécifique.</p>
                    
                    <div className="flex flex-wrap gap-4">
                      {availablePriorities.map((priority) => {
                        const isSelected = aiPriorities.includes(priority);
                        return (
                          <button
                            key={priority}
                            onClick={() => {
                              if (isSelected) {
                                setAiPriorities(aiPriorities.filter(p => p !== priority));
                              } else {
                                setAiPriorities([...aiPriorities, priority]);
                              }
                            }}
                            className={`px-8 py-4 rounded-2xl text-sm font-black transition-all border-2 ${
                              isSelected 
                                ? 'bg-[#173E7D] text-white border-[#173E7D] shadow-xl shadow-blue-900/20 scale-105' 
                                : 'bg-white text-gray-400 border-gray-100 hover:border-gray-200 hover:text-gray-600'
                            }`}
                          >
                            {priority}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Step 3: Action Button */}
                <div className="pt-10 border-t border-gray-50 flex justify-center">
                  <button 
                    onClick={() => {
                      setIsAnalyzing(true);
                      setTimeout(() => {
                        setIsAnalyzing(false);
                        setAiFilterStep('results');
                      }, 2000);
                    }}
                    disabled={isAnalyzing}
                    className="group relative bg-[#0F172A] text-white px-16 py-6 rounded-[2rem] font-black uppercase tracking-[0.2em] hover:bg-black hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-gray-900/30 flex items-center justify-center gap-6 disabled:opacity-50 min-w-[400px] overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    {isAnalyzing ? (
                      <>
                        <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                        <span className="relative z-10">Analyse Intelligente...</span>
                      </>
                    ) : (
                      <>
                        <span className="text-2xl relative z-10">🚀</span>
                        <span className="relative z-10">Lancer l'analyse prédictive</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Initial List Header */}
            <div className="flex items-center gap-4 px-4 pt-16">
              <div className="h-px flex-1 bg-gray-100"></div>
              <span className="text-[10px] font-black text-gray-300 uppercase tracking-[0.4em]">Candidatures en attente</span>
              <div className="h-px flex-1 bg-gray-100"></div>
            </div>

            {/* Initial List */}
            <div className="space-y-6">
              {mockaiCandidates.map((candidate) => (
                <div key={candidate.id} className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm flex items-center justify-between group hover:border-gray-200 transition-all">
                  <div className="flex items-center gap-6">
                    <div className="w-14 h-14 bg-gray-50 rounded-2xl overflow-hidden">
                      <img src={`https://i.pravatar.cc/150?u=${candidate.id}`} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <h4 className="text-lg font-black text-[#173E7D]">{candidate.name}</h4>
                      <p className="text-sm text-gray-400 font-bold font-sans">{candidate.role} • {candidate.exp} • {candidate.location}</p>
                    </div>
                  </div>
                  <ChevronDown className="text-gray-300 group-hover:text-gray-400 transition-colors" size={20} />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[
                { label: 'Excellent match', count: 2, color: 'emerald', active: true },
                { label: 'Bon match', count: 2, color: 'blue', active: false },
                { label: 'Match partiel', count: 1, color: 'orange', active: false },
                { label: 'Match faible', count: 0, color: 'red', active: false },
              ].map((stat, i) => (
                <div key={i} className={`bg-white p-6 rounded-[2rem] border-2 transition-all text-center space-y-1 ${stat.active ? 'border-[#173E7D] shadow-lg' : 'border-gray-100'}`}>
                  <div className="text-3xl font-black text-[#173E7D]">{stat.count}</div>
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Results List */}
            <div className="space-y-6">
              {mockaiCandidates.map((candidate) => (
                <div key={candidate.id} className="bg-white rounded-[3rem] border border-gray-100 shadow-sm overflow-hidden transition-all">
                  <div 
                    className="p-8 flex items-center justify-between cursor-pointer hover:bg-gray-50/50 transition-colors"
                    onClick={() => setExpandedCandidateId(expandedCandidateId === candidate.id ? null : candidate.id)}
                  >
                    <div className="flex items-center gap-6">
                      <div className="w-14 h-14 bg-gray-50 rounded-2xl overflow-hidden">
                        <img src={`https://i.pravatar.cc/150?u=${candidate.id}`} alt="" className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <h4 className="text-lg font-black text-[#173E7D]">{candidate.name}</h4>
                        <p className="text-sm text-gray-400 font-bold font-sans">{candidate.role} • {candidate.exp} • {candidate.location}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-8">
                      <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                        candidate.category === 'Excellent match' ? 'bg-emerald-50 text-emerald-600' :
                        candidate.category === 'Bon match' ? 'bg-blue-50 text-blue-600' :
                        'bg-orange-50 text-orange-600'
                      }`}>
                        {candidate.category}
                      </div>
                      <div className="flex items-center gap-4">
                        {candidate.match < 60 ? (
                          <div className="relative w-12 h-12 flex items-center justify-center">
                            <svg className="w-full h-full -rotate-90">
                              <circle cx="24" cy="24" r="20" fill="none" stroke="#FEE2E2" strokeWidth="4" />
                              <circle cx="24" cy="24" r="20" fill="none" stroke="#F97316" strokeWidth="4" strokeDasharray={125.6} strokeDashoffset={125.6 * (1 - candidate.match / 100)} strokeLinecap="round" />
                            </svg>
                            <span className="absolute text-xs font-black text-orange-600">{candidate.match}%</span>
                          </div>
                        ) : (
                          <span className="text-xl font-black text-[#173E7D]">{candidate.match}%</span>
                        )}
                        {expandedCandidateId === candidate.id ? <ChevronUp className="text-gray-400" size={20} /> : <ChevronDown className="text-gray-400" size={20} />}
                      </div>
                    </div>
                  </div>

                  <AnimatePresence>
                    {expandedCandidateId === candidate.id && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-gray-50"
                      >
                        <div className="p-10 space-y-10">
                          <p className="text-gray-600 font-medium leading-relaxed font-sans">{candidate.summary}</p>
                          
                          {/* Score Bars */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                            {[
                              { label: 'Expérience', score: candidate.scores?.exp || 0 },
                              { label: 'Compétences', score: candidate.scores?.skills || 0 },
                              { label: 'Formation', score: candidate.scores?.edu || 0 },
                            ].map((s, i) => (
                              <div key={i} className="space-y-3">
                                <div className="flex justify-between items-center">
                                  <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{s.label}</span>
                                  <span className="text-sm font-black text-[#173E7D]">{s.score}%</span>
                                </div>
                                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                                  <div className="h-full bg-gray-300 rounded-full" style={{ width: `${s.score}%` }} />
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Strengths & Points of Attention */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                            <div className="space-y-4">
                              <h5 className="flex items-center gap-2 text-sm font-black text-emerald-600 uppercase tracking-widest">
                                <CheckSquare size={16} />
                                Points forts
                              </h5>
                              <ul className="space-y-3 font-sans">
                                {candidate.strengths?.map((s, i) => (
                                  <li key={i} className="flex items-start gap-3 text-sm text-gray-600 font-medium">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                                    {s}
                                  </li>
                                ))}
                              </ul>
                            </div>
                            <div className="space-y-4">
                              <h5 className="flex items-center gap-2 text-sm font-black text-orange-600 uppercase tracking-widest">
                                <AlertTriangle size={16} />
                                Points d'attention
                              </h5>
                              <ul className="space-y-3 font-sans">
                                {candidate.weaknesses?.map((w, i) => (
                                  <li key={i} className="flex items-start gap-3 text-sm text-gray-600 font-medium">
                                    <div className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-1.5 shrink-0" />
                                    {w}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex flex-wrap items-center gap-4 pt-6 border-t border-gray-50 font-sans">
                            <button 
                              onClick={() => {
                                setSelectedCandidateCV(candidate);
                                setCandidateModalTab('ai-screening');
                              }}
                              className="bg-[#F68D58] text-white px-8 py-3.5 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center gap-2 hover:bg-[#e57d47] transition-all shadow-lg shadow-orange-500/10"
                            >
                              <Sparkles size={16} />
                              Consulter les Audios & Soft Skills IA
                            </button>
                            <button className="bg-[#173E7D] text-white px-8 py-3.5 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center gap-2 hover:bg-[#0c244c] transition-all">
                              <Mail size={16} />
                              Contacter
                            </button>
                            <button className="bg-white border border-gray-200 text-[#173E7D] px-8 py-3.5 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center gap-2 hover:bg-gray-50 transition-all">
                              <ClipboardList size={16} />
                              Présélectionner
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>

            <div className="flex justify-center pt-8">
              <button 
                onClick={() => setAiFilterStep('select')}
                className="text-sm font-black text-gray-400 uppercase tracking-widest hover:text-[#173E7D] transition-colors"
              >
                Retour à la sélection
              </button>
            </div>
          </div>
        )
      ) : access.aiFilterPlayground ? (
        /* Interactive Laboratory Playground for Recruiter to Live-Test AI features — Corporate only */
        <div className="space-y-10 animate-fadeIn">
          {/* Selector of which simulator */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { id: 'interview', label: '1. Assistant Vocal IA', desc: 'Sélecteur de questions, synthèses locales algériennes', color: 'blue', icon: Phone },
              { id: 'quiz', label: '2. Quiz Soft Skills', desc: 'Sénarios quotidiens de l\'entreprise en Algérie', color: 'amber', icon: Award },
              { id: 'antighost', label: '3. Filtre Anti-Ghost', desc: 'Pre-screening audio 30s motivant', color: 'orange', icon: Mic },
            ].map((item) => {
              const isActive = playgroundTab === item.id;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setPlaygroundTab(item.id as any)}
                  className={`p-6 rounded-[2rem] border-2 transition-all text-left flex items-start gap-4 ${
                    isActive 
                      ? 'bg-white border-[#173E7D] shadow-xl shadow-blue-900/5 hover:-translate-y-0.5' 
                      : 'bg-white/40 border-gray-100 opacity-80 hover:opacity-100 hover:border-gray-200'
                  }`}
                >
                  <div className={`p-4 rounded-xl ${
                    item.color === 'blue' ? 'bg-blue-50 text-blue-600' : 
                    item.color === 'amber' ? 'bg-amber-50 text-amber-700' : 'bg-orange-50 text-[#F68D58]'
                  }`}>
                    <Icon size={22} />
                  </div>
                  <div>
                    <h4 className="font-black text-gray-800 text-sm">{item.label}</h4>
                    <p className="text-xs text-gray-400 font-medium font-sans mt-1 leading-relaxed">{item.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Simulator container card */}
          <div className="bg-white rounded-[3.5rem] p-12 border border-gray-100 shadow-xl shadow-blue-100/10 space-y-8 relative overflow-hidden">
            {playgroundTab === 'interview' && (
              <div className="space-y-6">
                <div className="flex justify-between items-start border-b border-gray-50 pb-6">
                  <div>
                    <h3 className="text-xl font-black text-[#173E7D]">🎙️ Simulateur de l'Entretien Vocal Pré-qualificatif IA</h3>
                    <p className="text-sm text-gray-400 font-sans mt-1 leading-relaxed">Découvrez et testez en temps réel l'appel de pré-sélection passé en Darija algérienne décontractée et Français.</p>
                  </div>
                  <span className="px-3 py-1 bg-blue-50 text-[#173E7D] border border-blue-100 text-[9px] font-black uppercase rounded-full tracking-wider">Linguistique Locale Algérie</span>
                </div>

                {vocalSimState === 'idle' ? (
                  <div className="py-12 flex flex-col items-center justify-center space-y-6 text-center">
                    <div className="w-20 h-20 bg-blue-50 text-[#173E7D] border border-blue-100 rounded-full flex items-center justify-center animate-bounce">
                      <Phone size={36} />
                    </div>
                    <div className="max-w-md space-y-2">
                      <h4 className="font-black text-gray-800 text-lg">Tester le parcours candidat</h4>
                      <p className="text-xs text-gray-400 font-sans leading-relaxed">Cliquez sur démarrer pour lancer l'agent vocal interactif qui posera ses questions de disponibilité, transport et de salaire.</p>
                    </div>
                    <button
                      onClick={() => {
                        setVocalSimState('bot_speaking');
                        setVocalSimStep(1);
                        setVocalSimDialogue([
                          { sender: 'ai', text: "Bonjour ! Ravi de vous avoir au téléphone. J'appelle concernant votre candidature sur Algeria Jobs. Est-ce que vous seriez disponible immédiatement pour démarrer ce poste ?" }
                        ]);
                        setTimeout(() => {
                          setVocalSimState('user_listening');
                        }, 3000);
                      }}
                      className="px-8 py-4 bg-[#173E7D] text-white rounded-2xl font-black uppercase tracking-widest hover:bg-[#F68D58] transition-all hover:scale-105 shadow-lg shadow-blue-500/20"
                    >
                      🚀 Lancer la simulation d'appel
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                    {/* Dialogue flow (3 slots) */}
                    <div className="lg:col-span-3 space-y-6">
                      <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 space-y-4 max-h-[350px] overflow-y-auto pr-2 no-scrollbar">
                        {vocalSimDialogue.map((chat, i) => (
                          <div 
                            key={i} 
                            className={`p-4 rounded-2xl space-y-1 ${
                              chat.sender === 'ai' 
                                ? 'bg-[#173E7D]/5 border-l-4 border-[#173E7D] mr-8' 
                                : 'bg-white shadow-sm border border-slate-100 ml-8'
                            }`}
                          >
                            <div className="flex justify-between text-[9px] font-black uppercase tracking-wider">
                              <span className={chat.sender === 'ai' ? 'text-[#173E7D]' : 'text-[#F68D58]'}>
                                {chat.sender === 'ai' ? '🤖 Agent Vocal IA' : '🙋 Vous (Candidat Algérien)'}
                              </span>
                            </div>
                            <p className="text-xs text-gray-700 font-sans leading-relaxed">{chat.text}</p>
                          </div>
                        ))}

                        {vocalSimState === 'bot_speaking' && (
                          <div className="flex items-center gap-3 p-4 bg-blue-50/40 rounded-2xl font-black text-xs text-[#173E7D] w-fit">
                            <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
                            L'IA parle en Darija chaleureux...
                          </div>
                        )}

                        {vocalSimState === 'transcribing' && (
                          <div className="flex items-center gap-3 p-4 bg-[#F68D58]/10 rounded-2xl font-black text-xs text-[#F68D58] w-fit">
                            <div className="w-4 h-4 border-2 border-[#F68D58] border-t-transparent rounded-full animate-spin" />
                            Transcription & traduction instantanée par l'IA...
                          </div>
                        )}
                      </div>

                      {/* Interactive response actions when user is listening */}
                      {vocalSimState === 'user_listening' && (
                        <div className="space-y-4">
                          <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Choisissez votre réponse fictive :</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {vocalSimStep === 1 && (
                              <>
                                <button
                                  onClick={() => {
                                    setVocalSimState('transcribing');
                                    setTimeout(() => {
                                      setVocalSimDialogue(prev => [
                                        ...prev, 
                                        { sender: 'candidate', text: "Bonjour ! Oui, exact, je suis libre de suite, khedma hadi t'laq biya bezaf j'ai quitté mon ancien poste le mois passé." },
                                        { sender: 'ai', text: "Super ! Et pour la localisation de nos bureaux à Chéraga, par rapport à vos trajets, comment ça se présente ? Êtes-vous véhiculé ?" }
                                      ]);
                                      setVocalSimStep(2);
                                      setVocalSimState('user_listening');
                                    }, 2000);
                                  }}
                                  className="p-4 rounded-xl border-2 border-gray-100 bg-white hover:border-[#173E7D] text-left text-xs text-gray-600 font-bold transition-all font-sans leading-relaxed"
                                >
                                  Option A (Darija/Fr) : "Oui, libre immédiatement, j'ai quitté mon ancien poste..."
                                </button>
                                <button
                                  onClick={() => {
                                    setVocalSimState('transcribing');
                                    setTimeout(() => {
                                      setVocalSimDialogue(prev => [
                                        ...prev, 
                                        { sender: 'candidate', text: "Je suis disponible sous un court délai de 15 jours de préavis." },
                                        { sender: 'ai', text: "C'est tout à fait correct pour nous. Et concernant Chéraga pour le transport quotidien, êtes-vous véhiculé ?" }
                                      ]);
                                      setVocalSimStep(2);
                                      setVocalSimState('user_listening');
                                    }, 2000);
                                  }}
                                  className="p-4 rounded-xl border-2 border-gray-100 bg-white hover:border-[#173E7D] text-left text-xs text-gray-600 font-bold transition-all font-sans leading-relaxed"
                                >
                                  Option B (Français) : "Disponible sous 15 jours de préavis..."
                                </button>
                              </>
                            )}

                            {vocalSimStep === 2 && (
                              <>
                                <button
                                  onClick={() => {
                                    setVocalSimState('transcribing');
                                    setTimeout(() => {
                                      setVocalSimDialogue(prev => [
                                        ...prev, 
                                        { sender: 'candidate', text: "Oui j'ai ma propre voiture, dima netnequel biha, j'habite à Draria donc pas de soucis de transport." },
                                        { sender: 'ai', text: "C'est l'idéal ! Enfin, quelles sont vos prétentions salariales nettes par mois ?" }
                                      ]);
                                      setVocalSimStep(3);
                                      setVocalSimState('user_listening');
                                    }, 2000);
                                  }}
                                  className="p-4 rounded-xl border-2 border-gray-100 bg-white hover:border-[#173E7D] text-left text-xs text-gray-600 font-bold transition-all font-sans leading-relaxed"
                                >
                                  Option A (Darija) : "Oui j'ai ma propre voiture, j'habite à Draria..."
                                </button>
                                <button
                                  onClick={() => {
                                    setVocalSimState('transcribing');
                                    setTimeout(() => {
                                      setVocalSimDialogue(prev => [
                                        ...prev, 
                                        { sender: 'candidate', text: "Je prends le bus et le métro sans problème pour me déplacer." },
                                        { sender: 'ai', text: "Entendu. Et enfin, quelles sont vos prétentions salariales nettes par mois ?" }
                                      ]);
                                      setVocalSimStep(3);
                                      setVocalSimState('user_listening');
                                    }, 2000);
                                  }}
                                  className="p-4 rounded-xl border-2 border-gray-100 bg-white hover:border-[#173E7D] text-left text-xs text-gray-600 font-bold transition-all font-sans leading-relaxed"
                                >
                                  Option B : "Je prends les transports en commun..."
                                </button>
                              </>
                            )}

                            {vocalSimStep === 3 && (
                              <>
                                <button
                                  onClick={() => {
                                    setVocalSimState('transcribing');
                                    setTimeout(() => {
                                      setVocalSimDialogue(prev => [
                                        ...prev, 
                                        { sender: 'candidate', text: "Je souhaite avoir un salaire net de l'ordre de 145 000 DA net par mois." },
                                        { sender: 'ai', text: "C'est noté. Merci infiniment pour vos réponses, toutes ces informations ont été enregistrées pour l'équipe de recrutement !" }
                                      ]);
                                      setVocalSimStep(4);
                                      setVocalSimState('done');
                                    }, 2000);
                                  }}
                                  className="p-4 rounded-xl border-2 border-gray-100 bg-white hover:border-[#173E7D] text-left text-xs text-gray-600 font-bold transition-all font-sans leading-relaxed"
                                >
                                  Déclarer : "Autour de 145 000 DA Net..."
                                </button>
                                <button
                                  onClick={() => {
                                    setVocalSimState('transcribing');
                                    setTimeout(() => {
                                      setVocalSimDialogue(prev => [
                                        ...prev, 
                                        { sender: 'candidate', text: "Je reste ouvert à la discussion selon la grille interne et les avantages du poste." },
                                        { sender: 'ai', text: "C'est bien noté. Merci beaucoup, ces détails ont été retranscrits pour les décideurs de l'entreprise !" }
                                      ]);
                                      setVocalSimStep(4);
                                      setVocalSimState('done');
                                    }, 2000);
                                  }}
                                  className="p-4 rounded-xl border-2 border-gray-100 bg-white hover:border-[#173E7D] text-left text-xs text-gray-600 font-bold transition-all font-sans leading-relaxed"
                                >
                                  Déclarer : "Négociable selon la grille interne..."
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Result summary side panel (2 slots) */}
                    <div className="lg:col-span-2 space-y-6">
                      <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 space-y-6">
                        <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest">Résultats d'Appel générés</h4>
                        
                        <div className="space-y-4">
                          <div className="p-4 bg-white rounded-xl border border-slate-150 space-y-1">
                            <p className="text-[10px] font-bold text-gray-400">DISPONIBILITÉ SAISIE</p>
                            <p className="text-sm font-black text-[#173E7D]">
                              {vocalSimStep >= 2 ? (vocalSimDialogue[1]?.text.includes('15 jours') ? 'Sous 15 jours' : 'Immédiate') : 'En attente...'}
                            </p>
                          </div>

                          <div className="p-4 bg-white rounded-xl border border-slate-150 space-y-1">
                            <p className="text-[10px] font-bold text-gray-400">LOGISTIQUE & TRAJET</p>
                            <p className="text-sm font-black text-[#173E7D]">
                              {vocalSimStep >= 3 ? (vocalSimDialogue[3]?.text.includes('voiture') ? 'Véhiculé (Draria)' : 'Transports en commun') : 'En attente...'}
                            </p>
                          </div>

                          <div className="p-4 bg-white rounded-xl border border-slate-150 space-y-1">
                            <p className="text-[10px] font-bold text-gray-400">PRÉTENTIONS DÉCLARÉES</p>
                            <p className="text-sm font-black text-[#173E7D]">
                              {vocalSimStep >= 4 ? (vocalSimDialogue[5]?.text.includes('145 000') ? '145 000 DA net/mois' : 'Négociable') : 'En attente...'}
                            </p>
                          </div>
                        </div>

                        {vocalSimState === 'done' && (
                          <div className="p-4 bg-emerald-50 text-emerald-800 border-2 border-dashed border-emerald-100 rounded-2xl text-xs space-y-2">
                            <p className="font-black">✓ Fiche pré-qualification complétée !</p>
                            <p className="font-medium leading-relaxed font-sans">Ces données seraient injectées instantanément sous forme d'une pastille d'analyse et d'une transcription textuelle sur votre espace de tri.</p>
                            <button 
                              onClick={() => {
                                setVocalSimState('idle');
                                setVocalSimStep(0);
                                setVocalSimDialogue([]);
                              }}
                              className="text-xs font-black underline hover:text-[#173E7D]"
                            >
                              Recommencer le test
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {playgroundTab === 'quiz' && (
              <div className="space-y-6">
                <div className="flex justify-between items-start border-b border-gray-50 pb-6">
                  <div>
                    <h3 className="text-xl font-black text-[#173E7D]">🧠 Simulateur du Test de Soft-Skills : Quiz Situationnel</h3>
                    <p className="text-sm text-gray-400 font-sans mt-1 leading-relaxed">Le premier test de mise en situation axé sur le bon sens d'entreprise local en Algérie !</p>
                  </div>
                  <span className="px-3 py-1 bg-amber-50 text-amber-700 border border-amber-100 text-[9px] font-black uppercase rounded-full tracking-wider">Fun & Efficace</span>
                </div>

                {quizScoreCard.step === 0 && (
                  <div className="space-y-6 max-w-2xl mx-auto py-6">
                    <div className="space-y-2">
                      <span className="text-[10px] font-black text-amber-600 bg-amber-50 px-3 py-1 border border-amber-100 rounded-full uppercase tracking-wider">Scénario 1 / 2</span>
                      <h4 className="text-lg font-black text-[#173E7D]">Option de paiement exigée hors espèce</h4>
                      <p className="text-sm font-bold text-gray-500 font-sans leading-relaxed">"Un client d'une wilaya de l'intérieur insiste pour payer sa facture par chèque d'entreprise à la livraison, mais le protocole stipule uniquement CCP/BaridiMob ou Espèce pour éviter les défauts bancaires. Quelle est votre décision ?"</p>
                    </div>

                    <div className="space-y-3 pt-4">
                      {[
                        { text: "Rebrousser chemin de manière rigide : et informer le client que la livraison est annulée.", val: 1 },
                        { text: "Prendre le chèque sous mon entière responsabilité personnelle sans informer le gérant.", val: 2 },
                        { text: "Garder poliment la marchandise en dépôt sécurisé pendant 24h, lui envoyer la localisation du DAB le plus proche ou lui éditer le QR code BaridiMob par smartphone.", val: 3 },
                      ].map((opt, i) => (
                        <button
                          key={i}
                          onClick={() => setQuizScoreCard({ step: 1, answers: [opt.val], result: null })}
                          className="w-full p-5 text-left border-2 border-gray-100 rounded-2xl bg-white hover:border-amber-500 hover:bg-amber-50/10 transition-all font-sans text-xs font-bold text-gray-600 leading-relaxed"
                        >
                          {i + 1}. {opt.text}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {quizScoreCard.step === 1 && (
                  <div className="space-y-6 max-w-2xl mx-auto py-6">
                    <div className="space-y-2">
                      <span className="text-[10px] font-black text-[#F68D58] bg-orange-50 px-3 py-1 border border-orange-100 rounded-full uppercase tracking-wider">Scénario 2 / 2</span>
                      <h4 className="text-lg font-black text-[#173E7D]">Incident logistique à fort impact</h4>
                      <p className="text-sm font-bold text-gray-500 font-sans leading-relaxed">"Un coursier à moto est bloqué à un barrage routier de gendarmerie pour contrôle à l'entrée d'Alger-Centre, retardant une livraison stratégique de 2 heures. Le client est très insatisfait et appelle en colère. Que faites-vous ?"</p>
                    </div>

                    <div className="space-y-3 pt-4">
                      {[
                        { text: "Éviter de répondre à ses appels répétés et reporter la responsabilité totale sur le livreur de colis.", val: 1 },
                        { text: "L'appeler proactivement avec politesse, lui expliquer honnêtement la consigne de contrôle des services publics, lui proposer d'emblée une ristourne de 15% immédiate et guider le livreur de façon optimale.", val: 3 },
                        { text: "Lui dire sèchement que les conditions climatiques et régulières de circulation ne sont pas de notre resort, de prendre son mal en patience.", val: 2 },
                      ].map((opt, i) => (
                        <button
                          key={i}
                          onClick={() => {
                            const allAnsw = [...quizScoreCard.answers, opt.val];
                            const points = allAnsw.reduce((a,b) => a+b, 0);
                            let result = "Le Solutionneur Créatif 🧠";
                            if (points <= 3) result = "L\'Exécutant Rigide 📋";
                            else if (points === 4) result = "Le Gestionnaire Prudent 🤝";
                            setQuizScoreCard({ step: 2, answers: allAnsw, result });
                          }}
                          className="w-full p-5 text-left border-2 border-gray-100 rounded-2xl bg-white hover:border-orange-500 hover:bg-orange-50/10 transition-all font-sans text-xs font-bold text-gray-600 leading-relaxed"
                        >
                          {i + 1}. {opt.text}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {quizScoreCard.step === 2 && (
                  <div className="py-12 flex flex-col items-center justify-center space-y-6 text-center max-w-md mx-auto">
                    <div className="w-20 h-20 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center">
                      <Award size={48} className="animate-pulse" />
                    </div>
                    <div className="space-y-2">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">PROFIL DE SAVOIR-ÊTRE OBTENU</p>
                      <h4 className="text-2xl font-black text-[#173E7D]">{quizScoreCard.result}</h4>
                      <p className="text-xs text-gray-500 font-sans leading-relaxed font-semibold">
                        {quizScoreCard.result?.includes('Solutionneur') 
                          ? "Génie des situations locales. Vous savez gérer l'humain et inventer des passerelles de transition au bon moment pour garder l'harmonie commerciale."
                          : quizScoreCard.result?.includes('Prudent')
                            ? "Profil équilibré appréciant la négociation encadrée, rassurant pour faire respecter les consignes tout en évitant les heurts."
                            : "Profil linéaire préférant l'exécution mécanique des instructions au détriment de l'initiative face à l'imprévu."}
                      </p>
                    </div>
                    <button
                      onClick={() => setQuizScoreCard({ step: 0, answers: [], result: null })}
                      className="px-6 py-3 bg-gray-100 border text-gray-500 font-bold hover:bg-[#173E7D] hover:text-white hover:border-[#173E7D] rounded-xl text-xs transition-colors"
                    >
                      Faire un autre test de quiz
                    </button>
                  </div>
                )}
              </div>
            )}

            {playgroundTab === 'antighost' && (
              <div className="space-y-6">
                <div className="flex justify-between items-start border-b border-gray-50 pb-6">
                  <div>
                    <h3 className="text-xl font-black text-[#173E7D]">👻 Filtre Anti-Candidats Fantômes (Pre-screening vocal)</h3>
                    <p className="text-sm text-gray-400 font-sans mt-1 leading-relaxed">Filtrez les cliqueurs compulsifs automatiquement en exigeant un message vocal motivant de 30 secondes avant de postuler.</p>
                  </div>
                  <span className="px-3 py-1 bg-red-50 text-red-600 border border-red-100 text-[9px] font-black uppercase rounded-full tracking-wider">Lutte contre les Désistements</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 py-6">
                  {/* Recording interface panel */}
                  <div className="space-y-6 border border-gray-100 p-8 rounded-3xl bg-slate-50">
                    <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest">1. Choisir la langue d'expression confortable</h4>
                    <div className="flex gap-3">
                      {[
                        { id: 'french', label: 'Français' },
                        { id: 'ar', label: 'Arabe Standard' },
                        { id: 'darija', label: 'Arabe Algérien' },
                      ].map((ln) => (
                        <button
                          key={ln.id}
                          onClick={() => setGhostSimLang(ln.id as any)}
                          className={`px-4 py-2 text-xs font-black rounded-xl border transition-all ${
                            ghostSimLang === ln.id 
                              ? 'bg-orange-500 text-white border-orange-500 shadow-md shadow-orange-500/10' 
                              : 'bg-white text-gray-500 border-gray-100 hover:border-gray-200'
                          }`}
                        >
                          {ln.label}
                        </button>
                      ))}
                    </div>

                    <p className="text-xs font-bold text-gray-600 leading-relaxed font-sans mt-4">
                      Question pour le candidat : <br/>
                      <span className="text-[#173E7D] text-sm font-black">"Quel aspect de l'offre correspond le mieux à vos valeurs professionnelles ?"</span>
                    </p>

                    {/* State machine controls */}
                    <div className="flex flex-col items-center justify-center p-6 bg-white rounded-2xl border border-slate-100 space-y-4 pt-10">
                      {ghostSimStatus === 'idle' && (
                        <button
                          onClick={() => {
                            setGhostSimStatus('recording');
                            setGhostSimRecordDuration(0);
                            let count = 0;
                            const t = setInterval(() => {
                              count += 1;
                              setGhostSimRecordDuration(count);
                              if (count >= 5) {
                                clearInterval(t);
                                setGhostSimStatus('recorded');
                              }
                            }, 1000);
                          }}
                          className="w-16 h-16 rounded-full bg-red-500 text-white flex items-center justify-center hover:scale-105 active:scale-95 hover:bg-red-600 shadow-lg shadow-red-500/20 transition-all flex-col text-[9px] font-bold"
                        >
                          <Mic size={24} className="mb-0.5" />
                        </button>
                      )}

                      {ghostSimStatus === 'recording' && (
                        <div className="space-y-4 text-center">
                          <div className="w-16 h-16 rounded-full bg-red-600 text-white flex items-center justify-center animate-ping mx-auto">
                            <Mic size={24} />
                          </div>
                          <p className="text-[#F68D58] font-black animate-pulse text-xs">Simulacre d'enregistrement en cours... {ghostSimRecordDuration}s / 5s</p>
                        </div>
                      )}

                      {ghostSimStatus === 'recorded' && (
                        <div className="space-y-4 text-center">
                          <p className="text-emerald-600 font-black text-xs flex items-center gap-1.5 justify-center">
                            <CheckSquare size={14} /> Fichier audio simulé enregistré avec succès !
                          </p>
                          <div className="flex gap-4">
                            <button
                              onClick={() => {
                                setGhostSimStatus('playing');
                                setGhostSimPlayProgress(0);
                                const t = setInterval(() => {
                                  setGhostSimPlayProgress(prev => {
                                    const next = prev + 20;
                                    if (next >= 100) {
                                      clearInterval(t);
                                      setGhostSimStatus('recorded');
                                      return 100;
                                    }
                                    return next;
                                  });
                                }, 1000);
                              }}
                              className="px-6 py-2.5 bg-[#173E7D] text-white rounded-xl text-xs font-bold hover:bg-opacity-90 transition-all flex items-center gap-2"
                            >
                              <Play size={12} /> Écouter ma note vocale
                            </button>
                            <button
                              onClick={() => setGhostSimStatus('idle')}
                              className="px-6 py-2.5 bg-slate-100 text-gray-500 hover:text-[#173E7D] rounded-xl text-xs font-bold transition-all"
                            >
                              Ré-enregistrer
                            </button>
                          </div>
                        </div>
                      )}
                    

                      {ghostSimStatus === 'playing' && (
                        <div className="space-y-3 text-center w-full">
                          <div className="w-12 h-12 bg-orange-50 text-orange-500 rounded-full flex items-center justify-center mx-auto animate-spin">
                            <Volume2 size={20} />
                          </div>
                          <p className="text-[#173E7D] font-black text-xs">Lecture en cours : {Math.floor((ghostSimPlayProgress / 100) * 5)}s / 5s</p>
                          <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden max-w-xs mx-auto">
                            <div className="h-full bg-orange-500" style={{ width: `${ghostSimPlayProgress}%` }} />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Explanation of advantages */}
                  <div className="p-8 rounded-3xl border border-dashed border-gray-100 bg-white space-y-6">
                    <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest">Pourquoi cette fonctionnalité fait la différence ?</h4>
                    
                    <ul className="space-y-4 text-xs text-gray-600 font-sans leading-relaxed">
                      <li className="flex gap-3">
                        <span className="p-1 px-2.5 bg-rose-50 text-rose-600 rounded-lg h-fit font-black">1</span>
                        <div>
                          <strong className="text-gray-800 font-bold block">Taux d'Engagement Maximum</strong>
                          L'obligation d'un pitch audio de 30s élimine d'emblée ~75% de "cliqueurs automatiques" n'ayant pas lu l'offre d'emploi.
                        </div>
                      </li>
                      <li className="flex gap-3">
                        <span className="p-1 px-2.5 bg-amber-50 text-amber-600 rounded-lg h-fit font-black">2</span>
                        <div>
                          <strong className="text-gray-800 font-bold block">Qualité d'Expression de suite visible</strong>
                          Un simple clic d'écoute de 10s vous permet d'évaluer la clarté linguistique et l'attitude d'un candidat sans faire d'appel téléphonique.
                        </div>
                      </li>
                      <li className="flex gap-3">
                        <span className="p-1 px-2.5 bg-emerald-50 text-emerald-600 rounded-lg h-fit font-black">3</span>
                        <div>
                          <strong className="text-gray-800 font-bold block">Sentiment de Confiance Candidat</strong>
                          Le choix de l'Arabe d'Algérie rassure le candidat timide et élimine les blocages de sélection par rapport aux examens de langues intimidants.
                        </div>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        // Someone reached the playground sub-tab state without Corporate access (e.g. stale state) — show the lock screen instead of the tools
        <TierLockedScreen
          title="Labo de Pré-sélection IA"
          description="Testez le quiz de soft skills, l'assistant vocal pré-qualificatif et le filtre anti-candidats fantômes. Réservé au plan Corporate."
          requiredTier="Corporate"
          icon={Sparkles}
          onUpgrade={() => setActiveTab('subscription')}
        />
      )}
    </div>
  );
}
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
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <button 
                          onClick={() => setLanguage('en')}
                          className={`flex items-center justify-between p-6 rounded-2xl border-2 transition-all ${
                            language === 'en' 
                              ? 'border-[#F68D58] bg-orange-50/50 shadow-lg shadow-orange-200/20' 
                              : 'border-gray-100 hover:border-gray-200 bg-white'
                          } ${isRTL ? 'flex-row-reverse' : ''}`}
                        >
                          <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm text-2xl">🇺🇸</div>
                            <div className={isRTL ? 'text-right' : 'text-left'}>
                              <div className="font-bold text-[#173E7D] text-lg">{t('english')}</div>
                              <div className="text-xs text-gray-400">English</div>
                            </div>
                          </div>
                          {language === 'en' && (
                            <div className="w-6 h-6 bg-[#F68D58] rounded-full flex items-center justify-center text-white">
                              <CheckCircle2 size={14} />
                            </div>
                          )}
                        </button>

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
        const filteredJobs = MOCK_JOBS.filter(job => {
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
              <button className="px-8 py-3.5 rounded-full border border-gray-200 text-gray-700 font-bold hover:bg-gray-50 transition-all">
                {language === 'ar' ? 'تغيير الصورة' : 'Modifier la photo'}
              </button>
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
              {profileData.resumeUrl && (
                <a 
                  href={profileData.resumeUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 px-6 py-4 bg-emerald-50 text-emerald-600 rounded-2xl font-bold border border-emerald-100 hover:bg-emerald-100 transition-all group"
                >
                  <FileText size={20} className="group-hover:scale-110 transition-transform" />
                  <span className="text-sm">{lt('View current CV', 'Voir le CV actuel', 'عرض السيرة الذاتية')}</span>
                </a>
              )}
              <div className="relative">
                <input 
                  type="file" 
                  id="cv-upload" 
                  className="hidden" 
                  accept=".pdf,.doc,.docx"
                  onChange={handleFileUpload}
                  disabled={isUploading}
                />
                <label 
                  htmlFor="cv-upload"
                  className={`px-8 py-4 bg-gray-100 text-[#173E7D] rounded-full font-bold hover:bg-gray-200 transition-all cursor-pointer flex items-center gap-2 ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <Download size={20} />
                  {isUploading ? (language === 'ar' ? 'جاري الرفع...' : 'Téléchargement...') : (language === 'ar' ? 'رفع CV' : 'Uploader CV')}
                </label>
              </div>
              <OralPresentationCard/>
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
                    { id: 'skills', label: t('cv.skills'), icon: BarChart3 },
                    { id: 'lang', label: t('languages'), icon: Search }
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
                        </div>
                      )}

                      {cvSection === 'lang' && (
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
                <div className={`flex gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  {/* <button 
                    onClick={handleSaveCV}
                    className="bg-emerald-500 text-white px-10 py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-emerald-900/20 hover:bg-emerald-600 transition-all flex items-center gap-3"
                  >
                    <Save size={20} /> {language === 'ar' ? 'حفظ السيرة الذاتية' : 'Sauvegarder CV'}
                  </button> */}
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

              {/* CV Design matching Candidate Modal */}
              <div
                id="cv-preview-container"
                ref={cvPreviewRef}
                className="bg-white rounded-[3rem] shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-w-5xl mx-auto"
              >
                {/* CV Header */}
                <div className="bg-[#173E7D] p-12 text-white relative">
                  <div className={`flex items-center gap-10 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <div className="w-40 h-40 rounded-[3rem] overflow-hidden border-4 border-white/20 shadow-2xl bg-white/10 flex items-center justify-center">
                      {user?.photoURL ? (
                        <img src={user.photoURL} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <User size={64} className="text-white/20" />
                      )}
                    </div>
                    <div className={`space-y-3 ${isRTL ? 'text-right' : ''}`}>
                      <h1 className="text-5xl font-display font-black tracking-tight">{cvData.name || 'Votre Nom'}</h1>
                      <p className="text-blue-200 text-2xl font-medium tracking-wide uppercase">{cvData.experiences[0]?.role || 'Votre Poste Actuel'}</p>
                      <div className={`flex gap-4 mt-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <span className="px-5 py-2 bg-white/10 rounded-full text-xs font-bold border border-white/10">Profil Candidat</span>
                        <span className="px-5 py-2 bg-emerald-500/20 text-emerald-400 rounded-full text-xs font-bold border border-emerald-500/20">Vérifié</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* CV Content */}
                <div className={`p-16 space-y-16 ${isRTL ? 'text-right' : ''}`}>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
                    {/* Left Column */}
                    <div className="lg:col-span-2 space-y-16">
                      {cvData.summary && (
                        <section className="space-y-8">
                          <h4 className={`text-xs font-black text-gray-400 uppercase tracking-[0.3em] flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <User size={20} className="text-[#F68D58]" /> {language === 'ar' ? 'الملف الشخصي' : 'Résumé Professionnel'}
                          </h4>
                          <p className="text-gray-600 leading-relaxed text-xl font-medium">
                            {cvData.summary}
                          </p>
                        </section>
                      )}

                      <section className="space-y-10">
                        <h4 className={`text-xs font-black text-gray-400 uppercase tracking-[0.3em] flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                          <Briefcase size={20} className="text-[#F68D58]" /> {language === 'ar' ? 'الخبرة' : 'Expériences Professionnelles'}
                        </h4>
                        <div className="space-y-12">
                          {cvData.experiences.map((exp, i) => (
                            <div key={i} className={`relative pl-10 border-l-2 border-gray-100 ${isRTL ? 'pl-0 pr-10 border-l-0 border-r-2' : ''}`}>
                              <div className={`absolute top-0 w-5 h-5 bg-[#F68D58] rounded-full border-4 border-white shadow-sm ${isRTL ? '-right-[11px]' : '-left-[11px]'}`} />
                              <div className={`flex justify-between items-start mb-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                <h5 className="text-2xl font-black text-[#173E7D]">{exp.role || 'Poste'}</h5>
                                <span className="text-xs font-bold text-gray-400 bg-gray-50 px-4 py-2 rounded-xl">{exp.period || 'Période'}</span>
                              </div>
                              <p className="text-[#F68D58] text-lg font-bold mb-4">{exp.company || 'Entreprise'}</p>
                              {exp.missions && <p className="text-gray-600 text-sm font-medium mb-3">{exp.missions}</p>}
                              <p className="text-gray-500 text-sm leading-relaxed">{exp.desc}</p>
                            </div>
                          ))}
                        </div>
                      </section>

                      <section className="space-y-10">
                        <h4 className={`text-xs font-black text-gray-400 uppercase tracking-[0.3em] flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                          <FileText size={20} className="text-[#F68D58]" /> {language === 'ar' ? 'التكوين' : 'Formation & Éducation'}
                        </h4>
                        <div className="space-y-8">
                          {cvData.education.map((edu, i) => (
                            <div key={i} className={`relative pl-10 border-l-2 border-gray-100 ${isRTL ? 'pl-0 pr-10 border-l-0 border-r-2' : ''}`}>
                              <div className={`absolute top-0 w-5 h-5 bg-blue-400 rounded-full border-4 border-white shadow-sm ${isRTL ? '-right-[11px]' : '-left-[11px]'}`} />
                              <div className={`flex justify-between items-start mb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                <h5 className="text-xl font-black text-[#173E7D]">{edu.degree || 'Diplôme'}</h5>
                                <span className="text-xs font-bold text-gray-400 bg-gray-50 px-4 py-2 rounded-xl">{edu.year || 'Année'}</span>
                              </div>
                              <p className="text-gray-500 font-bold">{edu.school || 'École'}</p>
                            </div>
                          ))}
                        </div>
                      </section>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-16">
                      <section className="space-y-8">
                        <h4 className="text-xs font-black text-gray-400 uppercase tracking-[0.3em]">Compétences</h4>
                        <div className={`flex flex-wrap gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                          {cvData.skills.map((skill, i) => (
                            <span key={i} className="px-5 py-3 bg-gray-50 text-[#173E7D] text-xs font-black rounded-2xl border border-gray-100">
                              {skill}
                            </span>
                          ))}
                        </div>
                      </section>

                      <section className="space-y-8">
                        <h4 className="text-xs font-black text-gray-400 uppercase tracking-[0.3em]">Langues</h4>
                        <div className="space-y-6">
                          {cvData.languages.map((lang, i) => (
                            <div key={i} className="space-y-3">
                              <div className={`flex justify-between text-sm font-black ${isRTL ? 'flex-row-reverse' : ''}`}>
                                <span className="text-[#173E7D]">{lang.name}</span>
                                <span className="text-gray-400 uppercase tracking-widest text-[10px]">{lang.level}</span>
                              </div>
                              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-[#F68D58] rounded-full" 
                                  style={{ width: lang.level === 'Natif' || lang.level === 'أصلي' ? '100%' : lang.level === 'Courant' || lang.level === 'بطلاقة' ? '90%' : '70%' }} 
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </section>

                      <section className="p-8 bg-orange-50 rounded-[3rem] border border-orange-100 space-y-6">
                        <h4 className="text-sm font-black text-[#F68D58] uppercase tracking-widest">Contact</h4>
                        <div className="space-y-4 text-sm font-bold text-gray-600">
                          <p className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}><MapPin size={18} className="text-[#F68D58]" /> {language === 'ar' ? 'الجزائر، الجزائر' : 'Alger, Algérie'}</p>
                          <p className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}><Mail size={18} className="text-[#F68D58]" /> {cvData.email || 'votre@email.com'}</p>
                          <p className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}><Phone size={18} className="text-[#F68D58]" /> {cvData.phone || '+213 000 00 00 00'}</p>
                        </div>
                      </section>
                    </div>
                  </div>
                </div>

                {/* CV Footer */}
                <div className="p-12 bg-gray-50 border-t border-gray-100 flex justify-center">
                  <p className="text-gray-400 text-xs font-bold uppercase tracking-[0.3em]">Généré par Dz-Jobs</p>
                </div>
              </div>
            </div>
          </div>
        );
      case 'ai-quiz':
        return <AIQuiz />;  
      case 'saved':
        const savedJobsList = MOCK_JOBS.filter(job => savedJobs.includes(job.id));
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
                    await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.uid);
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
                        await supabase.from('notifications').update({ is_read: true }).eq('id', n.id);
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
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <button 
                          onClick={() => setLanguage('en')}
                          className={`flex items-center justify-between p-6 rounded-2xl border-2 transition-all ${
                            language === 'en' 
                              ? 'border-[#F68D58] bg-orange-50/50 shadow-lg shadow-orange-200/20' 
                              : 'border-gray-100 hover:border-gray-200 bg-white'
                          } ${isRTL ? 'flex-row-reverse' : ''}`}
                        >
                          <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm text-2xl">🇺🇸</div>
                            <div className={isRTL ? 'text-right' : 'text-left'}>
                              <div className="font-bold text-[#173E7D] text-lg">{t('english')}</div>
                              <div className="text-xs text-gray-400">English</div>
                            </div>
                          </div>
                          {language === 'en' && (
                            <div className="w-6 h-6 bg-[#F68D58] rounded-full flex items-center justify-center text-white">
                              <CheckCircle2 size={14} />
                            </div>
                          )}
                        </button>

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
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {!isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(true)}
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
                    label="AI Filter" 
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
                    label="AI Quiz" 
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
                label="AI Filter" 
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
                label="AI Quiz" 
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
                <img src={user?.photoURL || 'https://picsum.photos/seed/user/100/100'} alt="Profile" className="w-full h-full object-cover" />
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
              {/* CV Header */}
              <div className="bg-[#173E7D] p-10 text-white relative">
                <button 
                  onClick={() => {
                    setSelectedCandidateCV(null);
                    setShowContactOptions(false);
                  }}
                  className="absolute top-8 right-8 text-white/60 hover:text-white transition-colors"
                >
                  <X size={28} />
                </button>
                <div className="flex items-center gap-8">
                  <img src={selectedCandidateCV.avatar} alt={selectedCandidateCV.name} className="w-32 h-32 rounded-[2.5rem] object-cover border-4 border-white/20 shadow-2xl" />
                  <div className="space-y-2">
                    <h3 className="text-4xl font-display font-black tracking-tight">{selectedCandidateCV.name}</h3>
                    <p className="text-blue-200 text-xl font-medium tracking-wide uppercase">{selectedCandidateCV.role}</p>
                    <div className="flex gap-4 mt-4">
                      <span className="px-4 py-1.5 bg-white/10 rounded-full text-xs font-bold border border-white/10">{selectedCandidateCV.exp} Expérience</span>
                      <span className="px-4 py-1.5 bg-emerald-500/20 text-emerald-400 rounded-full text-xs font-bold border border-emerald-500/20">Profil Vérifié</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* CV Content */}
              <div className="flex-1 overflow-y-auto p-12 space-y-12 no-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                  {/* Left Column */}
                  <div className="md:col-span-2 space-y-12">
                    <section className="space-y-6">
                      <h4 className="text-xs font-black text-gray-400 uppercase tracking-[0.3em] flex items-center gap-3">
                        <User size={16} className="text-[#F68D58]" /> Résumé Professionnel
                      </h4>
                      <p className="text-gray-600 leading-relaxed text-lg font-medium">
                        Passionné par le développement de solutions innovantes et performantes. Expert en technologies modernes avec une forte capacité d'adaptation et un esprit d'équipe prononcé.
                      </p>
                    </section>

                    <section className="space-y-8">
                      <h4 className="text-xs font-black text-gray-400 uppercase tracking-[0.3em] flex items-center gap-3">
                        <Briefcase size={16} className="text-[#F68D58]" /> Expériences Professionnelles
                      </h4>
                      <div className="space-y-8">
                        {[
                          { company: 'Tech Solutions DZ', role: 'Senior Developer', period: '2021 - Présent', desc: 'Direction technique de projets web complexes.' },
                          { company: 'Digital Agency', role: 'Fullstack Dev', period: '2019 - 2021', desc: 'Développement d\'applications mobiles et web.' }
                        ].map((exp, i) => (
                          <div key={i} className="relative pl-8 border-l-2 border-gray-100">
                            <div className="absolute -left-[9px] top-0 w-4 h-4 bg-[#F68D58] rounded-full border-4 border-white shadow-sm" />
                            <div className="flex justify-between items-start mb-2">
                              <h5 className="text-xl font-black text-[#173E7D]">{exp.role}</h5>
                              <span className="text-xs font-bold text-gray-400 bg-gray-50 px-3 py-1 rounded-lg">{exp.period}</span>
                            </div>
                            <p className="text-[#F68D58] font-bold mb-3">{exp.company}</p>
                            <p className="text-gray-500 text-sm leading-relaxed">{exp.desc}</p>
                          </div>
                        ))}
                      </div>
                    </section>
                  </div>

                  {/* Right Column */}
                  <div className="space-y-12">
                    <section className="space-y-6">
                      <h4 className="text-xs font-black text-gray-400 uppercase tracking-[0.3em]">Compétences</h4>
                      <div className="flex flex-wrap gap-2">
                        {['React', 'Node.js', 'TypeScript', 'Docker', 'AWS', 'UI/UX'].map((skill, i) => (
                          <span key={i} className="px-4 py-2 bg-gray-50 text-[#173E7D] text-xs font-black rounded-xl border border-gray-100">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </section>

                    <section className="space-y-6">
                      <h4 className="text-xs font-black text-gray-400 uppercase tracking-[0.3em]">Langues</h4>
                      <div className="space-y-4">
                        {[
                          { name: 'Arabe', level: 'Natif', progress: 100 },
                          { name: 'Français', level: 'Courant', progress: 95 },
                          { name: 'Anglais', level: 'Avancé', progress: 85 }
                        ].map((lang, i) => (
                          <div key={i} className="space-y-2">
                            <div className="flex justify-between text-xs font-bold">
                              <span className="text-[#173E7D]">{lang.name}</span>
                              <span className="text-gray-400">{lang.level}</span>
                            </div>
                            <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full bg-[#F68D58] rounded-full" style={{ width: `${lang.progress}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>

                    <section className="p-6 bg-orange-50 rounded-[2rem] border border-orange-100">
                      <h4 className="text-sm font-black text-[#F68D58] mb-4 uppercase tracking-widest">Contact</h4>
                      <div className="space-y-3 text-xs font-bold text-gray-600">
                        <p className="flex items-center gap-2"><MapPin size={14} /> {selectedCandidateCV.location || 'Alger, Algérie'}</p>
                        <p className="flex items-center gap-2"><Mail size={14} /> {selectedCandidateCV.email || 'contact@email.dz'}</p>
                        <p className="flex items-center gap-2"><Phone size={14} /> {selectedCandidateCV.phone || '+213 550 00 00 00'}</p>
                      </div>
                    </section>
                  </div>
                </div>
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
                    handleApplyToJob(selectedJob.title);
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
