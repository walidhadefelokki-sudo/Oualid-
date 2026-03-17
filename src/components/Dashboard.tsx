import React, { useState } from 'react';
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
  Filter,
  PlusCircle,
  Users as UsersIcon,
  Building2,
  LayoutDashboard,
  Cpu,
  Gem,
  CheckCircle2,
  Clock,
  Camera,
  ChevronDown,
  ChevronUp,
  Zap,
  AlertTriangle,
  Mail,
  Phone,
  CheckSquare,
  Ban,
  MoreHorizontal,
  Save,
  Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth, signOut, db } from '../firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { WILAYAS } from '../constants';
import { translations, Language } from '../translations';

interface SidebarItemProps {
  icon: React.ElementType;
  label: string;
  active?: boolean;
  onClick: () => void;
}

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

export default function Dashboard({ 
  user, 
  language, 
  setLanguage,
  onGoHome
}: { 
  user: any; 
  language: Language; 
  setLanguage: (lang: Language) => void; 
  onGoHome: () => void;
}) {
  const [activeTab, setActiveTab] = useState(user?.role === 'employer' ? 'employer-dashboard' : 'dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [aiFilterStep, setAiFilterStep] = useState<'select' | 'results'>('select');
  const [selectedJobForAI, setSelectedJobForAI] = useState('Développeur Full Stack — 23 candidatures');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [expandedCandidateId, setExpandedCandidateId] = useState<number | null>(null);
  const [showContactOptions, setShowContactOptions] = useState(false);

  const aiCandidates = [
    {
      id: 1,
      name: 'Ahmed Benali',
      role: 'Développeur Full Stack',
      exp: '5 ans',
      location: 'Alger',
      match: 92,
      category: 'Excellent match',
      summary: 'Excellent candidat avec une solide expérience Full Stack. Profil très adapté aux exigences du poste.',
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

  const t = (key: string, variables?: Record<string, any>) => {
    const keys = key.split('.');
    let result: any = translations[language];
    for (const k of keys) {
      if (result[k]) result = result[k];
      else return key;
    }
    if (variables && typeof result === 'string') {
      Object.entries(variables).forEach(([k, v]) => {
        result = result.replace(`{${k}}`, v);
      });
    }
    return result;
  };

  const isRTL = language === 'ar';

  const renderSidebar = () => {
    if (user?.role === 'employer') {
      return (
        <div className="flex flex-col h-full">
          <div className="p-8">
            <button onClick={onGoHome} className="flex items-center gap-3 mb-2 group hover:opacity-80 transition-all">
              <div className="w-10 h-10 bg-[#F68D58] rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/20 group-hover:scale-110 transition-transform">
                <Briefcase size={24} className="text-white" />
              </div>
              <span className="text-xl font-bold text-[#173E7D] tracking-tight uppercase">DAR L'EMPLOI</span>
            </button>
            <div className="inline-flex items-center px-3 py-1 bg-blue-50 text-[#173E7D] rounded-lg text-[10px] font-black tracking-wider uppercase">
              Recruteur
            </div>
          </div>

          <div className="flex-1 px-4 space-y-2 overflow-y-auto no-scrollbar">
            <SectionLabel>Principal</SectionLabel>
            <SidebarItem icon={LayoutDashboard} label="Tableau de bord" active={activeTab === 'employer-dashboard'} onClick={() => setActiveTab('employer-dashboard')} />
            <SidebarItem icon={PlusCircle} label="Publier une offre" active={activeTab === 'post-job'} onClick={() => setActiveTab('post-job')} />
            <SidebarItem icon={Briefcase} label="Mes offres" active={activeTab === 'manage-jobs'} onClick={() => setActiveTab('manage-jobs')} />
            <SidebarItem icon={UsersIcon} label="Candidatures" active={activeTab === 'candidates'} onClick={() => setActiveTab('candidates')} />

            <SectionLabel>IA & Outils</SectionLabel>
            <SidebarItem icon={Cpu} label="Filtrage IA" active={activeTab === 'ai-filter'} onClick={() => setActiveTab('ai-filter')} />
            <SidebarItem icon={Building2} label="Mon entreprise" active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} />

            <SectionLabel>Compte</SectionLabel>
            <SidebarItem icon={Gem} label="Abonnement" active={activeTab === 'subscription'} onClick={() => setActiveTab('subscription')} />
            <SidebarItem icon={Bell} label="Notifications" active={activeTab === 'notifications'} onClick={() => setActiveTab('notifications')} />
            <SidebarItem icon={Settings} label="Paramètres" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
          </div>

          <div className="p-6 border-t border-gray-100">
            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl">
              <img src={user.photoURL || 'https://i.pravatar.cc/150?u=oualid'} alt={user.displayName} className="w-10 h-10 rounded-xl object-cover" referrerPolicy="no-referrer" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-[#173E7D] truncate">{user.displayName}</p>
                <p className="text-[10px] text-gray-400 truncate">{user.email}</p>
              </div>
              <button onClick={handleLogout} className="text-gray-400 hover:text-red-500 transition-colors">
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
          <button onClick={onGoHome} className="flex items-center gap-3 group hover:opacity-80 transition-all">
            <div className="w-10 h-10 bg-[#F68D58] rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/20 group-hover:scale-110 transition-transform">
              <Briefcase size={24} className="text-white" />
            </div>
            <span className="text-xl font-bold text-[#173E7D] tracking-tight uppercase">DAR L'EMPLOI</span>
          </button>
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
          <SidebarItem icon={Bell} label={t('notifications')} active={activeTab === 'notifications'} onClick={() => setActiveTab('notifications')} />
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
    <div 
      onClick={() => setSelectedJob(job)}
      className="bg-white rounded-[2.5rem] border border-gray-100 p-8 hover:shadow-2xl hover:shadow-blue-900/5 transition-all group cursor-pointer relative"
    >
      {/* Type Badge */}
      <div className={`absolute top-8 ${isRTL ? 'left-8' : 'right-8'}`}>
        <span className="px-4 py-1.5 bg-gray-50 text-gray-400 text-[10px] font-black rounded-full uppercase tracking-widest border border-gray-100">
          {job.type}
        </span>
      </div>

      <div className="space-y-6">
        {/* Icon */}
        <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-[#173E7D]">
          <Building2 size={32} />
        </div>

        {/* Title & Company */}
        <div className="space-y-1">
          <h4 className="text-xl font-bold text-[#173E7D] group-hover:text-[#F68D58] transition-colors leading-tight">
            {job.title}
          </h4>
          <p className="text-gray-400 font-bold text-sm uppercase tracking-wider">
            {job.company}
          </p>
        </div>

        {/* Meta Info */}
        <div className="flex items-center gap-6 pt-2">
          <div className="flex items-center gap-2 text-gray-400 text-xs font-bold uppercase tracking-widest">
            <MapPin size={14} className="text-[#F68D58]" />
            {job.location}
          </div>
          <div className="flex items-center gap-2 text-gray-400 text-xs font-bold uppercase tracking-widest">
            <Clock size={14} className="text-[#F68D58]" />
            2J
          </div>
        </div>

        {/* Footer: Salary & Action */}
        <div className="flex items-center justify-between pt-6 border-t border-gray-50">
          <div className="text-lg font-black text-[#173E7D]">
            {job.salary}
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onToggleSave(job.id);
              }}
              className={`p-3 rounded-xl transition-all ${
                isSaved 
                  ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' 
                  : 'bg-gray-50 text-gray-300 hover:text-[#F68D58] hover:bg-orange-50'
              }`}
            >
              <Bookmark size={18} fill={isSaved ? "currentColor" : "none"} />
            </button>
            <button 
              className="w-12 h-12 bg-gray-50 text-[#173E7D] rounded-full flex items-center justify-center hover:bg-[#173E7D] hover:text-white transition-all shadow-sm group-hover:shadow-md"
            >
              <ChevronRight size={24} className={isRTL ? 'rotate-180' : ''} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // Profile State
  const [profileData, setProfileData] = useState({
    name: user?.displayName || 'Ahmed Benali',
    email: user?.email || 'ahmed.benali@email.com',
    phone: '+213 555 123 456',
    wilaya: 'Alger',
    bio: '',
    jobTitle: 'Développeur Full Stack',
    location: 'Alger'
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
        company: language === 'ar' ? 'شركة مثال تيك' : 'Exemple Tech', 
        role: language === 'ar' ? 'مطور' : 'Développeur', 
        period: language === 'ar' ? '2022 - الحالي' : '2022 - Présent', 
        desc: language === 'ar' ? 'تطوير حلول ويب مبتكرة.' : 'Développement de solutions web innovantes.',
        missions: ''
      }
    ],
    education: [
      { 
        school: language === 'ar' ? 'جامعة الجزائر' : 'Université d\'Alger', 
        degree: language === 'ar' ? 'ماستر في المعلوماتية' : 'Master en Informatique', 
        year: '2021' 
      }
    ],
    skills: ['React', 'TypeScript', 'Tailwind CSS', 'Node.js'],
    languages: [
      { name: language === 'ar' ? 'العربية' : 'Arabe', level: language === 'ar' ? 'أصلي' : 'Natif' },
      { name: language === 'ar' ? 'الفرنسية' : 'Français', level: language === 'ar' ? 'بطلاقة' : 'Courant' },
      { name: language === 'ar' ? 'الإنجليزية' : 'Anglais', level: language === 'ar' ? 'متوسط' : 'Intermédiaire' }
    ]
  });

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
    type: 'CDI',
    salary: '',
    description: ''
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
      salary: '',
      description: ''
    });
    
    alert(language === 'ar' ? 'تم نشر العرض بنجاح!' : 'Offre publiée avec succès !');
    setActiveTab('manage-jobs');
  };

  const handleApplyToJob = (jobTitle: string) => {
    alert(language === 'ar' ? `تم إرسال طلبك لوظيفة ${jobTitle} بنجاح!` : `Votre candidature pour le poste de ${jobTitle} a été envoyée avec succès !`);
  };

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWilaya, setSelectedWilaya] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedSalary, setSelectedSalary] = useState('');
  const [selectedSector, setSelectedSector] = useState('');

  const toggleSaveJob = (id: number) => {
    setSavedJobs(prev => 
      prev.includes(id) ? prev.filter(jobId => jobId !== id) : [...prev, id]
    );
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
      description: language === 'ar' ? 'نحن نبحث عن مطور شغوف للانضمام إلى فريقنا الديناميكي والعمل على مشاريع دولية.' : 'Nous recherchons un développeur passionné pour rejoindre notre équipe dynamique et travailler sur des projets d\'envergure internationale.',
      requirements: language === 'ar' ? ['+5 سنوات خبرة React/Node.js', 'إتقان TypeScript', 'خبرة مع AWS'] : ['5+ ans d\'expérience React/Node.js', 'Maîtrise de TypeScript', 'Expérience avec AWS'],
      benefits: language === 'ar' ? ['تأمين صحي ممتاز', 'مكافأة سنوية', 'ساعات عمل مرنة'] : ['Assurance santé premium', 'Bonus annuel', 'Horaires flexibles'],
      logo: 'https://picsum.photos/seed/tech1/100/100',
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
      description: language === 'ar' ? 'انضم إلى استوديو الإبداع لدينا لتصميم واجهات مستخدم استثنائية لعملائنا في قطاع التكنولوجيا المالية.' : 'Rejoignez notre studio créatif pour concevoir des interfaces utilisateur exceptionnelles pour nos clients dans le secteur de la fintech.',
      requirements: language === 'ar' ? ['إتقان Figma', 'معرض أعمال قوي', 'فهم Design System'] : ['Maîtrise de Figma', 'Portfolio solide', 'Compréhension du Design System'],
      benefits: language === 'ar' ? ['تكوين مستمر', 'معدات Apple', 'خرجات الفريق'] : ['Formation continue', 'Équipement Apple fourni', 'Sorties d\'équipe'],
      logo: 'https://picsum.photos/seed/design1/100/100',
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
      description: language === 'ar' ? 'إدارة مشاريع التحول الرقمي المعقدة للمؤسسات المالية الكبرى في الجزائر.' : 'Gérez des projets complexes de transformation digitale pour des institutions financières majeures en Algérie.',
      requirements: language === 'ar' ? ['شهادة PMP/Agile', 'تواصل ممتاز', '+3 سنوات في إدارة المشاريع'] : ['Certification PMP/Agile', 'Excellente communication', '3+ ans en gestion de projet'],
      benefits: language === 'ar' ? ['سيارة عمل', 'خطة تقاعد', 'قسائم طعام'] : ['Voiture de fonction', 'Plan de retraite', 'Tickets restaurant'],
      logo: 'https://picsum.photos/seed/it1/100/100',
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
      description: language === 'ar' ? 'تعلم أساسيات التسويق الرقمي داخل وكالة سريعة النمو.' : 'Apprenez les ficelles du marketing digital au sein d\'une agence en pleine croissance.',
      requirements: language === 'ar' ? ['طالب في التسويق', 'كتابة جيدة', 'فضول'] : ['Étudiant en marketing', 'Bonne rédaction', 'Curiosité'],
      benefits: language === 'ar' ? ['إمكانية التوظيف', 'توجيه', 'أجواء شركة ناشئة'] : ['Possibilité de recrutement', 'Mentorat', 'Ambiance startup'],
      logo: 'https://picsum.photos/seed/marketing1/100/100',
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
      description: language === 'ar' ? 'إدارة محفظة عملاء مكتب محاسبة مشهور.' : 'Gérez le portefeuille clients d\'un cabinet comptable de renom.',
      requirements: language === 'ar' ? ['دبلوم في المحاسبة', 'إتقان برامج المحاسبة', 'دقة'] : ['Diplôme en comptabilité', 'Maîtrise des logiciels comptables', 'Rigueur'],
      benefits: language === 'ar' ? ['استقرار', 'علاوات الأداء', 'تأمين'] : ['Stabilité', 'Primes de performance', 'Assurance'],
      logo: 'https://picsum.photos/seed/finance1/100/100',
      sector: language === 'ar' ? 'المالية / المحاسبة' : 'Finance / Comptabilité'
    }
  ];

  const handleLogout = async () => {
    try {
      await signOut(auth);
      onGoHome();
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    try {
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, {
        ...profileData,
        updatedAt: serverTimestamp()
      }, { merge: true });
      alert(language === 'ar' ? 'تم تحديث الملف الشخصي بنجاح!' : 'Profil mis à jour avec succès !');
    } catch (error) {
      console.error("Error saving profile:", error);
      alert(language === 'ar' ? 'خطأ أثناء تحديث الملف الشخصي.' : 'Erreur lors de la mise à jour du profil.');
    }
  };

  const handleSaveCV = async () => {
    if (!user) return;
    try {
      const cvRef = doc(db, 'cvs', user.uid);
      await setDoc(cvRef, {
        ...cvData,
        updatedAt: serverTimestamp(),
        userId: user.uid
      });
      alert(language === 'ar' ? 'تم حفظ السيرة الذاتية بنجاح!' : 'CV sauvegardé avec succès !');
    } catch (error) {
      console.error("Error saving CV:", error);
      alert(language === 'ar' ? 'خطأ أثناء حفظ السيرة الذاتية.' : 'Erreur lors de la sauvegarde du CV.');
    }
  };

  const renderContent = () => {
    if (user?.role === 'employer') {
      switch (activeTab) {
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
                  <div key={i} className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-md transition-all group">
                    <div className="flex justify-between items-start mb-6">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${
                        stat.color === 'emerald' ? 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white' :
                        stat.color === 'blue' ? 'bg-blue-50 text-[#173E7D] group-hover:bg-[#173E7D] group-hover:text-white' :
                        stat.color === 'purple' ? 'bg-purple-50 text-purple-600 group-hover:bg-purple-600 group-hover:text-white' :
                        'bg-orange-50 text-[#F68D58] group-hover:bg-[#F68D58] group-hover:text-white'
                      }`}>
                        <stat.icon size={28} />
                      </div>
                      <span className={`text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full ${
                        stat.color === 'emerald' ? 'bg-emerald-50 text-emerald-600' :
                        stat.color === 'blue' ? 'bg-blue-50 text-blue-600' :
                        stat.color === 'purple' ? 'bg-purple-50 text-purple-600' :
                        'bg-orange-50 text-orange-600'
                      }`}>
                        {stat.change}
                      </span>
                    </div>
                    <div>
                      <p className="text-5xl font-black text-[#173E7D] tracking-tighter">{stat.value}</p>
                      <p className="text-sm text-gray-400 font-bold uppercase tracking-widest mt-2">{stat.label}</p>
                    </div>
                  </div>
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
              <div className="bg-white rounded-[3rem] border border-gray-100 overflow-hidden shadow-sm">
                <table className="w-full text-left">
                  <thead className="bg-gray-50/50 border-b border-gray-100">
                    <tr className={isRTL ? 'flex-row-reverse' : ''}>
                      <th className={`px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest ${isRTL ? 'text-right' : ''}`}>{t('position')}</th>
                      <th className={`px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest ${isRTL ? 'text-right' : ''}`}>{t('applicationsTitle')}</th>
                      <th className={`px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest ${isRTL ? 'text-right' : ''}`}>{t('status')}</th>
                      <th className={`px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest ${isRTL ? 'text-right' : ''}`}>{t('date')}</th>
                      <th className={`px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest ${isRTL ? 'text-right' : ''}`}>Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {postedJobs.map((job, i) => (
                      <tr key={i} className={`hover:bg-gray-50/50 transition-colors group ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <td className={`px-10 py-8 font-black text-[#173E7D] group-hover:text-[#F68D58] transition-colors ${isRTL ? 'text-right' : ''}`}>{job.title}</td>
                        <td className={`px-10 py-8 text-gray-500 font-bold ${isRTL ? 'text-right' : ''}`}>{job.apps}</td>
                        <td className={`px-10 py-8 ${isRTL ? 'text-right' : ''}`}>
                          <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${job.status === 'Active' ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-400'}`}>
                            {job.status}
                          </span>
                        </td>
                        <td className={`px-10 py-8 text-gray-400 text-sm font-medium ${isRTL ? 'text-right' : ''}`}>{job.date}</td>
                        <td className={`px-10 py-8 ${isRTL ? 'text-right' : ''}`}>
                          <div className="flex items-center gap-4">
                            <button className="text-[#173E7D] font-black text-xs uppercase tracking-widest hover:text-[#F68D58] transition-colors">Modifier</button>
                            <button 
                              onClick={() => setPostedJobs(postedJobs.filter((_, idx) => idx !== i))}
                              className="text-red-500 font-black text-xs uppercase tracking-widest hover:text-red-600 transition-colors"
                            >
                              Supprimer
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        case 'candidates':
          return (
            <div className="space-y-8">
              <div className={isRTL ? 'text-right' : ''}>
                <h2 className="text-4xl font-display font-black text-[#173E7D] tracking-tight">{t('candidates')}</h2>
                <p className="text-gray-500 mt-1 font-medium">Découvrez les meilleurs profils pour vos postes.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {[
                  { name: 'Ahmed Benali', role: 'Fullstack Developer', exp: '5 ans', match: 95, avatar: 'https://i.pravatar.cc/150?u=ahmed', email: 'ahmed.benali@email.dz', phone: '+213 550 12 34 56' },
                  { name: 'Sarah Mansouri', role: 'UI/UX Designer', exp: '3 ans', match: 88, avatar: 'https://i.pravatar.cc/150?u=sarah', email: 's.mansouri@email.dz', phone: '+213 661 22 33 44' },
                  { name: 'Karim Zidi', role: 'DevOps Engineer', exp: '7 ans', match: 92, avatar: 'https://i.pravatar.cc/150?u=karim', email: 'k.zidi@email.dz', phone: '+213 772 55 66 77' },
                  { name: 'Lina Kaci', role: 'Product Manager', exp: '4 ans', match: 85, avatar: 'https://i.pravatar.cc/150?u=lina', email: 'l.kaci@email.dz', phone: '+213 553 88 99 00' },
                ].map((candidate, i) => (
                  <div key={i} className={`bg-white p-8 rounded-[3rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all group flex items-center gap-8 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <div className="relative">
                      <img src={candidate.avatar} alt={candidate.name} className="w-24 h-24 rounded-3xl object-cover border-4 border-white shadow-md" referrerPolicy="no-referrer" />
                      <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-[#F68D58] text-white rounded-full flex items-center justify-center font-black text-xs border-2 border-white">
                        {candidate.match}%
                      </div>
                    </div>
                    <div className={`flex-1 ${isRTL ? 'text-right' : ''}`}>
                      <h4 className="text-2xl font-black text-[#173E7D] group-hover:text-[#F68D58] transition-colors">{candidate.name}</h4>
                      <p className="text-gray-400 font-bold uppercase tracking-widest text-xs mt-1">{candidate.role}</p>
                      <div className={`flex items-center gap-3 mt-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <span className="text-[10px] bg-blue-50 text-[#173E7D] px-4 py-1.5 rounded-full font-black uppercase tracking-widest">{candidate.exp} exp.</span>
                        <span className="text-[10px] bg-emerald-50 text-emerald-600 px-4 py-1.5 rounded-full font-black uppercase tracking-widest">Vérifié</span>
                      </div>
                    </div>
                    <button 
                      onClick={() => setSelectedCandidateCV(candidate)}
                      className="w-12 h-12 bg-[#173E7D] text-white rounded-2xl flex items-center justify-center hover:bg-[#F68D58] transition-all shadow-lg shadow-blue-900/20"
                    >
                      <ChevronRight size={24} className={isRTL ? 'rotate-180' : ''} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          );
        case 'ai-filter':
          return (
            <div className="space-y-10">
              {/* Header */}
              <div className="bg-[#F0FDF4] rounded-[2rem] p-8 border border-emerald-100 flex items-center gap-6">
                <div className="w-16 h-16 bg-[#7C3AED] text-white rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/20">
                  <div className="text-2xl">🤖</div>
                </div>
                <div>
                  <h2 className="text-2xl font-black text-[#173E7D]">Filtrage IA — Gemini 2.0 Flash</h2>
                  <p className="text-gray-500 font-medium">Analysez automatiquement les candidatures et identifiez les meilleurs profils grâce à l'intelligence artificielle.</p>
                </div>
              </div>

              {aiFilterStep === 'select' ? (
                <div className="space-y-8">
                  {/* Selection Card */}
                  <div className="bg-white rounded-[2.5rem] p-10 border border-gray-100 shadow-sm flex flex-col md:flex-row items-end gap-8">
                    <div className="flex-1 space-y-3 w-full">
                      <label className="text-sm font-black text-[#173E7D] uppercase tracking-widest">Sélectionner l'offre à analyser</label>
                      <div className="relative">
                        <select 
                          value={selectedJobForAI}
                          onChange={(e) => setSelectedJobForAI(e.target.value)}
                          className="w-full px-6 py-4 rounded-2xl border border-gray-100 outline-none focus:border-[#173E7D] transition-all bg-gray-50/50 text-gray-700 font-bold appearance-none"
                        >
                          <option>Développeur Full Stack — 23 candidatures</option>
                          <option>Designer UI/UX — 12 candidatures</option>
                          <option>Chef de Projet — 45 candidatures</option>
                        </select>
                        <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={20} />
                      </div>
                    </div>
                    <button 
                      onClick={() => {
                        setIsAnalyzing(true);
                        setTimeout(() => {
                          setIsAnalyzing(false);
                          setAiFilterStep('results');
                        }, 2000);
                      }}
                      disabled={isAnalyzing}
                      className="bg-[#0F172A] text-white px-10 py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-gray-900/10 flex items-center gap-3 disabled:opacity-50"
                    >
                      {isAnalyzing ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Analyse en cours...
                        </>
                      ) : (
                        <>
                          <span>🤖</span>
                          Lancer le filtrage IA
                        </>
                      )}
                    </button>
                  </div>

                  {/* Initial List */}
                  <div className="space-y-4">
                    {aiCandidates.map((candidate) => (
                      <div key={candidate.id} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between group hover:border-gray-200 transition-all">
                        <div className="flex items-center gap-6">
                          <div className="w-14 h-14 bg-gray-50 rounded-2xl overflow-hidden">
                            <img src={`https://i.pravatar.cc/150?u=${candidate.id}`} alt="" className="w-full h-full object-cover" />
                          </div>
                          <div>
                            <h4 className="text-lg font-black text-[#173E7D]">{candidate.name}</h4>
                            <p className="text-sm text-gray-400 font-bold">{candidate.role} • {candidate.exp} • {candidate.location}</p>
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
                  <div className="space-y-4">
                    {aiCandidates.map((candidate) => (
                      <div key={candidate.id} className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden transition-all">
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
                              <p className="text-sm text-gray-400 font-bold">{candidate.role} • {candidate.exp} • {candidate.location}</p>
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
                                <p className="text-gray-600 font-medium leading-relaxed">{candidate.summary}</p>
                                
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
                                    <ul className="space-y-3">
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
                                    <ul className="space-y-3">
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
                                <div className="flex flex-wrap items-center gap-4 pt-6 border-t border-gray-50">
                                  <button className="bg-[#0F172A] text-white px-8 py-3.5 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center gap-2 hover:bg-black transition-all">
                                    <Mail size={16} />
                                    Contacter
                                  </button>
                                  <button className="bg-white border border-gray-200 text-[#173E7D] px-8 py-3.5 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center gap-2 hover:bg-gray-50 transition-all">
                                    <ClipboardList size={16} />
                                    Présélectionner
                                  </button>
                                  <button className="text-red-500 px-8 py-3.5 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center gap-2 hover:text-red-600 transition-all">
                                    <Ban size={16} />
                                    Refuser
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
              )}
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
                  { name: 'Gratuit', price: '0', features: ['3 offres actives', 'Filtres basiques', 'Support email'], color: 'gray' },
                  { name: 'Pro', price: '4,900', features: ['Offres illimitées', 'AI Filter Premium', 'Support 24/7', 'Mise en avant'], color: 'orange', popular: true },
                  { name: 'Entreprise', price: '12,900', features: ['Multi-comptes', 'API Access', 'Account Manager', 'Marque employeur'], color: 'blue' },
                ].map((plan, i) => (
                  <div key={i} className={`bg-white p-10 rounded-[3rem] border-2 transition-all relative ${plan.popular ? 'border-[#F68D58] shadow-xl shadow-orange-500/10 scale-105 z-10' : 'border-gray-100 hover:border-gray-200'}`}>
                    {plan.popular && (
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#F68D58] text-white px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                        Plus populaire
                      </div>
                    )}
                    <h3 className="text-xl font-black text-[#173E7D] mb-2">{plan.name}</h3>
                    <div className="flex items-baseline gap-1 mb-8">
                      <span className="text-4xl font-black text-[#173E7D]">{plan.price}</span>
                      <span className="text-gray-400 font-bold text-sm">DA/mois</span>
                    </div>
                    <ul className="space-y-4 mb-10">
                      {plan.features.map((f, j) => (
                        <li key={j} className="flex items-center gap-3 text-sm text-gray-500 font-medium">
                          <CheckCircle2 size={16} className="text-emerald-500" />
                          {f}
                        </li>
                      ))}
                    </ul>
                    <button className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all ${
                      plan.popular ? 'bg-[#F68D58] text-white shadow-lg shadow-orange-500/20 hover:bg-[#e57d47]' : 'bg-gray-50 text-[#173E7D] hover:bg-gray-100'
                    }`}>
                      Choisir ce plan
                    </button>
                  </div>
                ))}
              </div>
            </div>
          );
        case 'post-job':
          return (
            <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 p-12 space-y-12">
              <div className={isRTL ? 'text-right' : ''}>
                <h2 className="text-3xl font-display font-bold text-[#173E7D]">{t('postJob')}</h2>
                <p className="text-gray-500 mt-2">Remplissez les détails pour attirer les meilleurs talents.</p>
              </div>
              <form onSubmit={handlePostJob} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className={`space-y-3 ${isRTL ? 'text-right' : ''}`}>
                    <label className="text-sm font-bold text-gray-900">{t('position')}</label>
                    <input 
                      type="text" 
                      required
                      placeholder="ex: Senior React Developer" 
                      value={newJobData.title}
                      onChange={(e) => setNewJobData({...newJobData, title: e.target.value})}
                      className={`w-full px-6 py-4 rounded-2xl border border-gray-100 outline-none focus:border-[#173E7D] transition-all bg-white text-gray-700 ${isRTL ? 'text-right' : ''}`} 
                    />
                  </div>
                  <div className={`space-y-3 ${isRTL ? 'text-right' : ''}`}>
                    <label className="text-sm font-bold text-gray-900">{t('sector')}</label>
                    <select 
                      value={newJobData.sector}
                      onChange={(e) => setNewJobData({...newJobData, sector: e.target.value})}
                      className={`w-full px-6 py-4 rounded-2xl border border-gray-100 outline-none focus:border-[#173E7D] transition-all bg-white text-gray-700 ${isRTL ? 'text-right' : ''}`}
                    >
                      <option>Technologie</option>
                      <option>Santé</option>
                      <option>Finance</option>
                      <option>Éducation</option>
                    </select>
                  </div>
                  <div className={`space-y-3 ${isRTL ? 'text-right' : ''}`}>
                    <label className="text-sm font-bold text-gray-900">{t('contractType')}</label>
                    <select 
                      value={newJobData.type}
                      onChange={(e) => setNewJobData({...newJobData, type: e.target.value})}
                      className={`w-full px-6 py-4 rounded-2xl border border-gray-100 outline-none focus:border-[#173E7D] transition-all bg-white text-gray-700 ${isRTL ? 'text-right' : ''}`}
                    >
                      <option>CDI</option>
                      <option>CDD</option>
                      <option>Freelance</option>
                      <option>Stage</option>
                    </select>
                  </div>
                  <div className={`space-y-3 ${isRTL ? 'text-right' : ''}`}>
                    <label className="text-sm font-bold text-gray-900">Salaire (DA/mois)</label>
                    <input 
                      type="text" 
                      placeholder="ex: 120,000 - 180,000" 
                      value={newJobData.salary}
                      onChange={(e) => setNewJobData({...newJobData, salary: e.target.value})}
                      className={`w-full px-6 py-4 rounded-2xl border border-gray-100 outline-none focus:border-[#173E7D] transition-all bg-white text-gray-700 ${isRTL ? 'text-right' : ''}`} 
                    />
                  </div>
                </div>
                <div className={`space-y-3 ${isRTL ? 'text-right' : ''}`}>
                  <label className="text-sm font-bold text-gray-900">{t('description')}</label>
                  <textarea 
                    rows={6} 
                    required
                    placeholder="Décrivez le poste, les responsabilités..." 
                    value={newJobData.description}
                    onChange={(e) => setNewJobData({...newJobData, description: e.target.value})}
                    className={`w-full px-6 py-4 rounded-2xl border border-gray-100 outline-none focus:border-[#173E7D] transition-all bg-white text-gray-700 resize-none ${isRTL ? 'text-right' : ''}`} 
                  />
                </div>
                <div className="flex justify-end">
                  <button type="submit" className="bg-[#F68D58] text-white px-12 py-4 rounded-2xl font-bold hover:bg-[#e57d47] transition-all shadow-lg shadow-orange-500/20">
                    Publier l'offre
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
                    <img src={user?.photoURL || 'https://picsum.photos/seed/company/200/200'} alt="Logo" className="w-full h-full object-cover" />
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
            <div className="space-y-8">
              <h2 className={`text-3xl font-display font-bold text-[#173E7D] ${isRTL ? 'text-right' : ''}`}>{t('settings')}</h2>
              <div className="bg-white rounded-[2rem] border border-gray-100 p-8 space-y-8">
                <div className="space-y-6">
                  <h3 className={`text-lg font-bold text-[#173E7D] border-b border-gray-100 pb-4 ${isRTL ? 'text-right' : ''}`}>{t('language')}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button 
                      onClick={() => setLanguage('fr')}
                      className={`flex items-center justify-between p-6 rounded-2xl border-2 transition-all ${
                        language === 'fr' 
                          ? 'border-[#F68D58] bg-orange-50/50' 
                          : 'border-gray-100 hover:border-gray-200'
                      } ${isRTL ? 'flex-row-reverse' : ''}`}
                    >
                      <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm text-lg">🇫🇷</div>
                        <div className={isRTL ? 'text-right' : 'text-left'}>
                          <div className="font-bold text-[#173E7D]">{t('french')}</div>
                          <div className="text-xs text-gray-400">Français</div>
                        </div>
                      </div>
                      {language === 'fr' && <div className="w-3 h-3 bg-[#F68D58] rounded-full" />}
                    </button>

                    <button 
                      onClick={() => setLanguage('ar')}
                      className={`flex items-center justify-between p-6 rounded-2xl border-2 transition-all ${
                        language === 'ar' 
                          ? 'border-[#F68D58] bg-orange-50/50' 
                          : 'border-gray-100 hover:border-gray-200'
                      } ${isRTL ? 'flex-row-reverse' : ''}`}
                    >
                      <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm text-lg">🇩🇿</div>
                        <div className={isRTL ? 'text-right' : 'text-left'}>
                          <div className="font-bold text-[#173E7D]">{t('arabic')}</div>
                          <div className="text-xs text-gray-400">العربية</div>
                        </div>
                      </div>
                      {language === 'ar' && <div className="w-3 h-3 bg-[#F68D58] rounded-full" />}
                    </button>
                  </div>
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
                      <th className="px-8 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest">{t('status')}</th>
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
                        <td className="px-8 py-6">
                          <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider ${app.color}`}>
                            {app.status}
                          </span>
                        </td>
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

            <div className={`flex ${isRTL ? 'justify-start' : 'justify-end'}`}>
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
                  <div className={`flex gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    {['moderne', 'classique', 'creatif'].map((m) => (
                      <button 
                        key={m}
                        onClick={() => setCvModel(m)}
                        className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${cvModel === m ? 'bg-[#173E7D] text-white shadow-lg shadow-blue-900/20' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
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
                              className={`w-full px-8 py-5 rounded-3xl border border-gray-100 outline-none focus:border-[#F68D58] transition-all bg-gray-50/50 text-lg font-bold ${isRTL ? 'text-right' : ''}`}
                            />
                          </div>
                          <div className={`space-y-3 ${isRTL ? 'text-right' : ''}`}>
                            <label className="text-xs font-black text-[#173E7D] uppercase tracking-[0.2em]">Email</label>
                            <input type="email" value={cvData.email} onChange={(e) => setCvData({...cvData, email: e.target.value})} className={`w-full px-8 py-5 rounded-3xl border border-gray-100 outline-none focus:border-[#F68D58] transition-all bg-gray-50/50 text-lg font-bold ${isRTL ? 'text-right' : ''}`} />
                          </div>
                          <div className={`space-y-3 ${isRTL ? 'text-right' : ''}`}>
                            <label className="text-xs font-black text-[#173E7D] uppercase tracking-[0.2em]">{t('phone')}</label>
                            <input type="tel" value={cvData.phone} onChange={(e) => setCvData({...cvData, phone: e.target.value})} className={`w-full px-8 py-5 rounded-3xl border border-gray-100 outline-none focus:border-[#F68D58] transition-all bg-gray-50/50 text-lg font-bold ${isRTL ? 'text-right' : ''}`} />
                          </div>
                          <div className={`md:col-span-2 space-y-3 ${isRTL ? 'text-right' : ''}`}>
                            <label className="text-xs font-black text-[#173E7D] uppercase tracking-[0.2em]">{t('professionalSummary')}</label>
                            <textarea rows={5} value={cvData.summary} onChange={(e) => setCvData({...cvData, summary: e.target.value})} className={`w-full px-8 py-5 rounded-3xl border border-gray-100 outline-none focus:border-[#F68D58] transition-all bg-gray-50/50 text-lg font-bold resize-none ${isRTL ? 'text-right' : ''}`} />
                          </div>
                        </div>
                      )}

                      {cvSection === 'exp' && (
                        <div className="space-y-8">
                          {cvData.experiences.map((exp, i) => (
                            <div key={i} className="p-8 bg-gray-50/50 rounded-[2.5rem] border border-gray-100 space-y-6 relative group">
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
                                    className={`w-full px-6 py-4 rounded-2xl border border-gray-100 outline-none bg-white focus:border-[#F68D58] font-bold ${isRTL ? 'text-right' : ''}`} 
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
                                    className={`w-full px-6 py-4 rounded-2xl border border-gray-100 outline-none bg-white focus:border-[#F68D58] font-bold ${isRTL ? 'text-right' : ''}`} 
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
                                  className={`w-full px-6 py-4 rounded-2xl border border-gray-100 outline-none bg-white focus:border-[#F68D58] font-bold ${isRTL ? 'text-right' : ''}`} 
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
                                  className={`w-full px-6 py-4 rounded-2xl border border-gray-100 outline-none bg-white resize-none focus:border-[#F68D58] font-bold ${isRTL ? 'text-right' : ''}`} 
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
                                  className={`w-full px-6 py-4 rounded-2xl border border-gray-100 outline-none bg-white resize-none focus:border-[#F68D58] font-bold ${isRTL ? 'text-right' : ''}`} 
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
                            <div key={i} className="p-8 bg-gray-50/50 rounded-[2.5rem] border border-gray-100 space-y-6 relative group">
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
                                    className={`w-full px-6 py-4 rounded-2xl border border-gray-100 outline-none bg-white focus:border-[#F68D58] font-bold ${isRTL ? 'text-right' : ''}`} 
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
                                    className={`w-full px-6 py-4 rounded-2xl border border-gray-100 outline-none bg-white focus:border-[#F68D58] font-bold ${isRTL ? 'text-right' : ''}`} 
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
                                    className={`w-full px-6 py-4 rounded-2xl border border-gray-100 outline-none bg-white focus:border-[#F68D58] font-bold ${isRTL ? 'text-right' : ''}`} 
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
                              className={`flex-1 px-8 py-5 rounded-3xl border border-gray-100 outline-none bg-gray-50/50 focus:border-[#F68D58] font-bold text-lg ${isRTL ? 'text-right' : ''}`} 
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
                            <div key={i} className={`flex flex-col md:flex-row items-center gap-6 bg-gray-50/50 p-6 rounded-[2rem] border border-gray-100 relative group ${isRTL ? 'flex-row-reverse' : ''}`}>
                              <div className="flex-1 w-full space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Langue</label>
                                <input 
                                  value={lang.name} 
                                  onChange={(e) => {
                                    const newLang = [...cvData.languages];
                                    newLang[i].name = e.target.value;
                                    setCvData({...cvData, languages: newLang});
                                  }}
                                  className={`w-full px-6 py-4 rounded-2xl border border-gray-100 outline-none bg-white focus:border-[#F68D58] font-bold ${isRTL ? 'text-right' : ''}`} 
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
                                  className={`w-full px-6 py-4 rounded-2xl border border-gray-100 outline-none bg-white focus:border-[#F68D58] font-bold ${isRTL ? 'text-right' : ''}`}
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
                  <button 
                    onClick={handleSaveCV}
                    className="bg-emerald-500 text-white px-10 py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-emerald-900/20 hover:bg-emerald-600 transition-all flex items-center gap-3"
                  >
                    <Save size={20} /> {language === 'ar' ? 'حفظ السيرة الذاتية' : 'Sauvegarder CV'}
                  </button>
                  <button 
                    onClick={() => alert(language === 'ar' ? 'جاري إنشاء ملف PDF...' : 'Génération du PDF en cours...')}
                    className="bg-[#173E7D] text-white px-10 py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-blue-900/20 hover:bg-[#0A1118] transition-all flex items-center gap-3"
                  >
                    <Download size={20} /> {language === 'ar' ? 'تحميل PDF' : 'Télécharger PDF'}
                  </button>
                </div>
              </div>

              {/* CV Design matching Candidate Modal */}
              <div className="bg-white rounded-[3rem] shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-w-5xl mx-auto">
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
            <h2 className={`text-3xl font-display font-bold text-[#173E7D] ${isRTL ? 'text-right' : ''}`}>
              {language === 'ar' ? 'الإشعارات' : 'Notifications'}
            </h2>
            <div className="bg-white rounded-[2rem] border border-gray-100 overflow-hidden divide-y divide-gray-50">
              {[
                { 
                  title: language === 'ar' ? 'عرض عمل جديد مطابق' : 'Nouvelle offre correspondante', 
                  desc: language === 'ar' ? 'تم نشر عرض عمل جديد لـ "Développeur React" في الجزائر.' : 'Une nouvelle offre pour "Développeur React" à Alger vient d\'être publiée.', 
                  time: language === 'ar' ? 'منذ ساعتين' : 'Il y a 2 heures' 
                },
                { 
                  title: language === 'ar' ? 'تم الاطلاع على طلبك' : 'Candidature consultée', 
                  desc: language === 'ar' ? 'تم الاطلاع على طلبك لوظيفة UX Designer في Ooredoo.' : 'Votre candidature pour le poste de UX Designer chez Ooredoo a été consultée.', 
                  time: language === 'ar' ? 'أمس' : 'Hier' 
                },
              ].map((n, i) => (
                <div key={i} className={`p-6 hover:bg-gray-50 transition-colors cursor-pointer flex gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <div className="w-12 h-12 bg-blue-50 text-[#173E7D] rounded-xl flex items-center justify-center shrink-0">
                    < Bell size={24} />
                  </div>
                  <div className={`flex-1 ${isRTL ? 'text-right' : ''}`}>
                    <div className={`flex justify-between items-start ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <h4 className="font-bold text-[#173E7D]">{n.title}</h4>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{n.time}</span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">{n.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      case 'settings':
        return (
          <div className="space-y-8">
            <h2 className={`text-3xl font-display font-bold text-[#173E7D] ${isRTL ? 'text-right' : ''}`}>{t('settings')}</h2>
            <div className="bg-white rounded-[2rem] border border-gray-100 p-8 space-y-8">
              <div className="space-y-6">
                <h3 className={`text-lg font-bold text-[#173E7D] border-b border-gray-100 pb-4 ${isRTL ? 'text-right' : ''}`}>{t('language')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button 
                    onClick={() => setLanguage('fr')}
                    className={`flex items-center justify-between p-6 rounded-2xl border-2 transition-all ${
                      language === 'fr' 
                        ? 'border-[#F68D58] bg-orange-50/50' 
                        : 'border-gray-100 hover:border-gray-200'
                    } ${isRTL ? 'flex-row-reverse' : ''}`}
                  >
                    <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm text-lg">🇫🇷</div>
                      <div className={isRTL ? 'text-right' : 'text-left'}>
                        <div className="font-bold text-[#173E7D]">{t('french')}</div>
                        <div className="text-xs text-gray-400">Français</div>
                      </div>
                    </div>
                    {language === 'fr' && <div className="w-3 h-3 bg-[#F68D58] rounded-full" />}
                  </button>

                  <button 
                    onClick={() => setLanguage('ar')}
                    className={`flex items-center justify-between p-6 rounded-2xl border-2 transition-all ${
                      language === 'ar' 
                        ? 'border-[#F68D58] bg-orange-50/50' 
                        : 'border-gray-100 hover:border-gray-200'
                    } ${isRTL ? 'flex-row-reverse' : ''}`}
                  >
                    <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm text-lg">🇩🇿</div>
                      <div className={isRTL ? 'text-right' : 'text-left'}>
                        <div className="font-bold text-[#173E7D]">{t('arabic')}</div>
                        <div className="text-xs text-gray-400">العربية</div>
                      </div>
                    </div>
                    {language === 'ar' && <div className="w-3 h-3 bg-[#F68D58] rounded-full" />}
                  </button>
                </div>
              </div>

              <div className="space-y-6">
                <h3 className={`text-lg font-bold text-[#173E7D] border-b border-gray-100 pb-4 ${isRTL ? 'text-right' : ''}`}>
                  {language === 'ar' ? 'تفضيلات الحساب' : 'Préférences du compte'}
                </h3>
                <div className={`flex items-center justify-between p-4 bg-gray-50 rounded-2xl ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <div className={isRTL ? 'text-right' : ''}>
                    <div className="font-bold text-[#173E7D]">
                      {language === 'ar' ? 'إشعارات البريد الإلكتروني' : 'Notifications par email'}
                    </div>
                    <div className="text-xs text-gray-400">
                      {language === 'ar' ? 'تلقي تنبيهات الوظائف عبر البريد الإلكتروني' : 'Recevoir des alertes emploi par email'}
                    </div>
                  </div>
                  <div className="w-12 h-6 bg-emerald-500 rounded-full relative cursor-pointer">
                    <div className={`absolute ${isRTL ? 'left-1' : 'right-1'} top-1 w-4 h-4 bg-white rounded-full shadow-sm`} />
                  </div>
                </div>
                <div className={`flex items-center justify-between p-4 bg-gray-50 rounded-2xl ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <div className={isRTL ? 'text-right' : ''}>
                    <div className="font-bold text-[#173E7D]">
                      {language === 'ar' ? 'الملف الشخصي العام' : 'Profil public'}
                    </div>
                    <div className="text-xs text-gray-400">
                      {language === 'ar' ? 'السماح للموظفين بالعثور على ملفك الشخصي' : 'Permettre aux recruteurs de trouver votre profil'}
                    </div>
                  </div>
                  <div className="w-12 h-6 bg-gray-200 rounded-full relative cursor-pointer">
                    <div className={`absolute ${isRTL ? 'right-1' : 'left-1'} top-1 w-4 h-4 bg-white rounded-full shadow-sm`} />
                  </div>
                </div>
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
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#F68D58] rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/20">
                  <Briefcase size={22} className="text-white" />
                </div>
                <span className="text-xl font-display font-black tracking-tighter text-[#173E7D]">DAR L'EMPLOI</span>
              </div>
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
                    label="Subscription" 
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
          <div className="w-10 h-10 bg-[#F68D58] rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/20">
            <Briefcase size={22} className="text-white" />
          </div>
          <span className="text-xl font-display font-black tracking-tighter text-[#173E7D]">DAR L'EMPLOI</span>
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
                label="Subscription" 
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
                  onClick={() => {
                    handleApplyToJob(selectedJob.title);
                    setSelectedJob(null);
                  }}
                  className="px-12 py-4 bg-[#173E7D] text-white rounded-2xl font-black uppercase tracking-widest hover:bg-[#0A1118] transition-all shadow-xl shadow-blue-900/20"
                >
                  Postuler maintenant
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
