import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Logo from './components/Logo';
import Logo2 from './components/Logo2';
import ContactFormDesign from './components/ContactFormDesign';
// import ContactForm from './components/ContactForm';
import { 
  Search, 
  Briefcase, 
  Users, 
  TrendingUp, 
  ChevronRight, 
  MapPin, 
  Clock, 
  Building2,
  Menu,
  X,
  LogOut,
  Zap,
  Heart,
  FileText,
  XCircle,
  CheckCircle2,
  Bot,
  CreditCard,
  BarChart3,
  Bell,
  User as UserIcon,
  Cpu,
  HeartPulse,
  Landmark,
  HardHat,
  GraduationCap,
  Palmtree,
  Factory,
  ShoppingBag,
  Facebook,
  Twitter,
  Linkedin,
  Instagram,
  Mail,
  Phone,
  ShieldCheck
} from 'lucide-react';
import { supabase } from './supabase';
import { db, auth } from './firebase';
import { signInAnonymously, onAuthStateChanged as onFirebaseAuthStateChanged } from 'firebase/auth';
import { doc, getDocFromServer } from 'firebase/firestore';
import Dashboard from './components/Dashboard';
import AuthModal from './components/AuthModal';
import { translations, Language } from './translations';
import { WILAYAS, JOB_KEYWORDS } from './constants';

const COLORS = [
  'bg-[#173E7D]', // Primary Blue
  'bg-[#F68D58]', // Secondary Orange
  'bg-[#DEE6E2]', // Accent Light Gray
];

const TEXT_COLORS = [
  'text-white',
  'text-white',
  'text-[#173E7D]',
];

export default function App() {
  const [colorIndex, setColorIndex] = useState(0);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'landing' | 'dashboard'>('landing');
  const [loginRole, setLoginRole] = useState<'user' | 'employer'>('user');
  const [language, setLanguage] = useState<Language>('fr');
  const [isDemo, setIsDemo] = useState(false);
  const [modalInitialRole, setModalInitialRole] = useState<'user' | 'employer'>('user');
  const [modalInitialStep, setModalInitialStep] = useState<'selection' | 'form'>('selection');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLocation, setSearchLocation] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);

  const handleDemoCandidate = async () => {
    // Prevent multiple clicks
    if (loading) return;
    
    // Sign into Firebase Auth anonymously for demo if not already
    if (!auth.currentUser) {
      try {
        await signInAnonymously(auth);
      } catch (err: any) {
        console.error("Error signing into Firebase anonymously for demo:", err);
        if (err.code === 'auth/admin-restricted-operation') {
          console.warn("Anonymous auth is disabled in the Firebase console. Demo will continue in offline mode for Firebase features.");
        }
      }
    }

    setUser({
      uid: auth.currentUser?.uid || 'demo-candidate',
      displayName: 'Amine Benali',
      email: 'amine.benali@example.dz',
      photoURL: 'https://i.pravatar.cc/150?u=amine',
      role: 'user'
    });
    setIsDemo(true);
    setView('dashboard');
    setIsLoginOpen(false);
    setIsAuthModalOpen(false);
    setIsMenuOpen(false);
  };

  const handleDemoEmployer = async () => {
    // Prevent multiple clicks
    if (loading) return;

    // Sign into Firebase Auth anonymously for demo if not already
    if (!auth.currentUser) {
      try {
        await signInAnonymously(auth);
      } catch (err: any) {
        console.error("Error signing into Firebase anonymously for demo:", err);
        if (err.code === 'auth/admin-restricted-operation') {
          console.warn("Anonymous auth is disabled in the Firebase console. Demo will continue in offline mode for Firebase features.");
        }
      }
    }

    setUser({
      uid: auth.currentUser?.uid || 'demo-employer',
      displayName: 'Oualid Elhadef Elokki',
      email: 'oualidelhadefelokki@outlook.com',
      photoURL: 'https://i.pravatar.cc/150?u=oualid',
      role: 'employer'
    });
    setIsDemo(true);
    setView('dashboard');
    setIsLoginOpen(false);
    setIsAuthModalOpen(false);
    setIsMenuOpen(false);
  };

  const fetchUserProfile = async (uid: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('uid', uid)
        .single();
      
      if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
        console.error("Error fetching user profile:", error);
        return null;
      }
      return data;
    } catch (error) {
      console.error("Error fetching user profile:", error);
    }
    return null;
  };

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    resume: null as File | null
  });

  const handleOpenRegister = (role: 'user' | 'employer') => {
    setModalInitialRole(role);
    setModalInitialStep('form');
    setIsAuthModalOpen(true);
  };

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    // Placeholder for Firebase submission
    alert('Candidature envoyée ! (Intégration Firebase en attente)');
    setSelectedJob(null);
    setFormData({ name: '', email: '', phone: '', resume: null });
  };

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = () => {
    setIsSearching(true);
    setTimeout(() => {
      setIsSearching(false);
      if (user || isDemo) {
        setView('dashboard');
      } else {
        setIsLoginOpen(true);
      }
    }, 1500);
  };

  const handleGoogleLogin = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      });
      
      if (error) throw error;
      
      // Note: Profile creation is usually handled via Supabase Triggers/Functions 
      // or on the first session load in the useEffect below.
    } catch (error) {
      console.error("Error during Google Login:", error);
      alert("Erreur lors de la connexion avec Google.");
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword,
      });
      if (error) throw error;
      setIsLoginOpen(false);
      setLoginEmail('');
      setLoginPassword('');
    } catch (error: any) {
      console.error("Error during Email Login:", error);
      setLoginError(language === 'fr' ? 'Email ou mot de passe incorrect.' : 'البريد الإلكتروني أو كلمة المرور غير صحيحة.');
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      setView('landing');
    } catch (error) {
      console.error("Error during logout:", error);
    }
  };

  useEffect(() => {
    // Test Firestore connection
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration. ");
        }
      }
    };
    testConnection();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      const currentUser = session?.user;
      
      if (currentUser) {
        // Sign into Firebase Auth anonymously if not already signed in
        // This is a bridge to allow Firestore access while using Supabase Auth
        if (!auth.currentUser) {
          try {
            await signInAnonymously(auth);
          } catch (err) {
            console.error("Error signing into Firebase anonymously:", err);
          }
        }

        let profile = await fetchUserProfile(currentUser.id);
        
        const metadata = currentUser.user_metadata;
        const savedRole = localStorage.getItem('intended_role');
        const roleFromMetadata = metadata.role || savedRole || loginRole;
        
        // Clean up localStorage
        if (savedRole) localStorage.removeItem('intended_role');
        
        if (!profile) {
          // Create profile if it doesn't exist
          const { data: newProfile, error: createError } = await supabase
            .from('users')
            .upsert({
              uid: currentUser.id,
              email: currentUser.email,
              display_name: metadata.full_name || currentUser.email,
              photo_url: metadata.avatar_url,
              company_name: metadata.company_name,
              role: roleFromMetadata,
              created_at: new Date().toISOString()
            })
            .select()
            .single();
          
          if (!createError) profile = newProfile;
        } else if (roleFromMetadata === 'employer' && profile.role !== 'employer') {
          // Update role if needed
          await supabase
            .from('users')
            .update({ role: 'employer' })
            .eq('uid', currentUser.id);
          profile.role = 'employer';
        }
        
        setUser({ 
          uid: currentUser.id,
          email: currentUser.email,
          displayName: profile?.display_name || currentUser.user_metadata.full_name,
          photoURL: profile?.photo_url || currentUser.user_metadata.avatar_url,
          role: profile?.role || loginRole
        });
      } else {
        setUser((prev) => isDemo ? prev : null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [loginRole]);

  useEffect(() => {
    // Cycle through colors for the intro effect
    const interval = setInterval(() => {
      setColorIndex((prev) => {
        if (prev === COLORS.length - 1) {
          clearInterval(interval);
          return prev;
        }
        return prev + 1;
      });
    }, 2000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#173E7D] flex items-center justify-center">
        <motion.div 
          animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="flex flex-col items-center gap-8"
        >
          <div className="bg-white p-8 rounded-[3rem] shadow-2xl">
            <Logo size="lg" />
          </div>
          <div className="flex gap-2">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                animate={{ y: [0, -10, 0] }}
                transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.2 }}
                className="w-3 h-3 bg-[#F68D58] rounded-full"
              />
            ))}
          </div>
        </motion.div>
      </div>
    );
  }

  if ((user || isDemo) && view === 'dashboard') {
    return <Dashboard user={user} language={language} setLanguage={setLanguage} onGoHome={() => setView('landing')} />;
  }

  return (
    <div className={`min-h-screen transition-colors duration-1000 ${COLORS[colorIndex]}`} dir={language === 'ar' ? 'rtl' : 'ltr'}>
      {/* Navigation */}
      <nav className={`fixed top-0 w-full z-50 px-8 py-4 flex justify-between items-center transition-all duration-500 bg-white border-b border-gray-100`}>
        <div className="flex items-center">
          <Logo size="md" onClick={() => setView('landing')} />
        </div>

        <div className={`hidden md:flex items-center gap-10 font-bold text-[13px] text-gray-600 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
          <button onClick={() => scrollToSection('features')} className="hover:text-[#173E7D] transition-colors">{translations[language].nav.features}</button>
          <button onClick={() => scrollToSection('sectors')} className="hover:text-[#173E7D] transition-colors">{translations[language].nav.sectors}</button>
          <button onClick={() => scrollToSection('how-it-works')} className="hover:text-[#173E7D] transition-colors">{translations[language].nav.howItWorks}</button>
          <button onClick={() => scrollToSection('about-us')} className="hover:text-[#173E7D] transition-colors">{translations[language].nav.aboutUs}</button>
          <button onClick={() => scrollToSection('pricing')} className="hover:text-[#173E7D] transition-colors">{translations[language].nav.pricing}</button>
        </div>

        <div className={`hidden md:flex items-center gap-6 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
          {/* Language Toggle */}
          <div className="flex items-center gap-1 bg-gray-50 p-1 rounded-full border border-gray-100">
            <button 
              onClick={() => setLanguage('fr')}
              className={`px-3 py-1 rounded-full text-[10px] font-black transition-all ${language === 'fr' ? 'bg-[#173E7D] text-white shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
            >
              FR
            </button>
            <button 
              onClick={() => setLanguage('ar')}
              className={`px-3 py-1 rounded-full text-[10px] font-black transition-all ${language === 'ar' ? 'bg-[#173E7D] text-white shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
            >
              AR
            </button>
          </div>

          {user ? (
            <div className={`flex items-center gap-4 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
              <button 
                onClick={() => setView('dashboard')}
                className="text-[13px] font-bold text-gray-600 hover:text-[#173E7D]"
              >
                {translations[language].nav.dashboard}
              </button>
              <div className={`flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-100 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                {user.photoURL ? (
                  <img src={user.photoURL} alt={user.displayName || ''} className="w-6 h-6 rounded-full" />
                ) : (
                  <UserIcon size={14} className="text-[#173E7D]" />
                )}
                <span className="font-bold text-[11px] text-[#173E7D]">{user.displayName?.split(' ')[0]}</span>
              </div>
              <button 
                onClick={handleLogout}
                className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                title={translations[language].logout}
              >
                <LogOut size={18} />
              </button>
            </div>
          ) : (
            <>
              <button 
                onClick={() => setIsLoginOpen(true)}
                className="text-[13px] font-bold text-gray-600 hover:text-[#173E7D]"
              >
                {translations[language].nav.login}
              </button>
              <button 
                onClick={() => setIsAuthModalOpen(true)}
                className="px-8 py-3 rounded-full bg-[#0A1118] text-white font-bold text-[13px] hover:bg-[#173E7D] transition-all shadow-lg shadow-black/10"
              >
                {translations[language].nav.signup}
              </button>
            </>
          )}
        </div>

        <button className="md:hidden text-[#173E7D]" onClick={() => setIsMenuOpen(!isMenuOpen)}>
          {isMenuOpen ? <X /> : <Menu />}
        </button>
      </nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            className="fixed inset-0 bg-[#DEE6E2] z-[60] flex flex-col items-center justify-center gap-8 text-3xl font-display font-bold text-[#173E7D]"
          >
            <button onClick={() => setIsMenuOpen(false)} className="absolute top-8 right-8 text-[#173E7D]">
              <X size={40} />
            </button>
            <button onClick={() => { scrollToSection('features'); setIsMenuOpen(false); }}>{translations[language].nav.features}</button>
            <button onClick={() => { scrollToSection('sectors'); setIsMenuOpen(false); }}>{translations[language].nav.sectors}</button>
            <button onClick={() => { scrollToSection('how-it-works'); setIsMenuOpen(false); }}>{translations[language].nav.howItWorks}</button>
            <button onClick={() => { scrollToSection('about-us'); setIsMenuOpen(false); }}>{translations[language].nav.aboutUs}</button>
            <button onClick={() => { scrollToSection('pricing'); setIsMenuOpen(false); }}>{translations[language].nav.pricing}</button>
            {user ? (
              <button onClick={() => { handleLogout(); setIsMenuOpen(false); }} className="px-12 py-4 rounded-full bg-red-500 text-white shadow-xl flex items-center gap-3">
                <LogOut size={24} /> {translations[language].logout}
              </button>
            ) : (
              <button onClick={() => { setIsMenuOpen(false); setIsLoginOpen(true); }} className="px-12 py-4 rounded-full bg-[#173E7D] text-white shadow-xl">{translations[language].nav.login}</button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero Section */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-6 pt-32 pb-20 overflow-hidden bg-white">
        <div className="max-w-[1440px] w-full mx-auto bg-[#173E7D] rounded-[4rem] overflow-hidden min-h-[600px] shadow-[0_50px_100px_-20px_rgba(23,62,125,0.3)] relative flex flex-col lg:flex-row items-center justify-between p-12 md:p-16 gap-12">
          {/* Background Image with Overlay */}
          <div className="absolute inset-0 z-0">
            <img 
              src="https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&q=100&w=1920" 
              alt="Background" 
              className="w-full h-full object-cover opacity-10"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#173E7D] via-[#173E7D]/95 to-transparent" />
          </div>

          {/* Left Content */}
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="relative z-10 flex-1 text-left"
          >
            {translations[language].hero.badge && (
              <div className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 text-white rounded-full text-xs font-black uppercase tracking-[0.3em] mb-8 w-fit backdrop-blur-xl border border-white/20">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#F68D58] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#F68D58]"></span>
                </span>
                <span>{translations[language].hero.badge}</span>
              </div>
            )}
            
            <h1 className="text-5xl md:text-7xl font-display font-black text-white leading-[1.1] tracking-tighter mb-8 uppercase">
              {language === 'fr' ? (
                <>
                  Recrutez, postulez <br />
                  et <span className="text-[#F68D58]">réussissez en <br /> Algérie.</span>
                </>
              ) : (
                translations[language].hero.title
              )}
            </h1>
            
            <p className="text-xl text-blue-100/70 mb-12 max-w-2xl font-light leading-relaxed">
              {translations[language].hero.subtitle}
            </p>

            {/* Search Bar Integrated in Hero */}
            <div className={`bg-white/10 backdrop-blur-3xl p-3 rounded-[4rem] shadow-2xl border border-white/20 flex flex-col md:flex-row gap-3 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
              <div className={`flex-[1.5] flex items-center px-6 gap-4 text-white border-b md:border-b-0 md:border-r border-white/10 py-4 ${language === 'ar' ? 'flex-row-reverse border-r-0 border-l' : ''}`}>
                <Search size={24} className="text-[#F68D58]" />
                <div className="w-full relative">
                  <input 
                    type="text" 
                    list="job-keywords"
                    placeholder={translations[language].search.jobPlaceholder} 
                    className={`w-full outline-none text-white bg-transparent font-bold text-lg placeholder:text-white/40 ${language === 'ar' ? 'text-right' : ''}`} 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <datalist id="job-keywords">
                    {JOB_KEYWORDS.map((keyword) => (
                      <option key={keyword} value={keyword} />
                    ))}
                  </datalist>
                </div>
              </div>
              <div className={`flex-1 flex items-center px-6 gap-4 text-white py-4 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                <MapPin size={24} className="text-[#F68D58]" />
                <select 
                  className={`w-full outline-none text-white bg-transparent font-bold text-lg appearance-none cursor-pointer ${language === 'ar' ? 'text-right' : ''}`}
                  value={searchLocation}
                  onChange={(e) => setSearchLocation(e.target.value)}
                >
                  <option value="" className="bg-[#173E7D] text-white/40">{translations[language].search.locationPlaceholder}</option>
                  {WILAYAS.map((wilaya) => (
                    <option key={wilaya} value={wilaya} className="bg-[#173E7D] text-white">
                      {wilaya}
                    </option>
                  ))}
                </select>
              </div>
              <button 
                onClick={handleSearch}
                disabled={isSearching}
                className="bg-[#F68D58] text-white px-10 py-5 rounded-[3rem] font-black hover:bg-white hover:text-[#173E7D] transition-all duration-500 flex items-center justify-center gap-3 shadow-2xl text-lg disabled:opacity-70"
              >
                {isSearching ? (
                  <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    {translations[language].search.button}
                    <Search size={20} />
                  </>
                )}
              </button>
            </div>
          </motion.div>

          {/* Right Cards */}
          <motion.div 
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative z-10 w-full lg:w-[450px] flex flex-col gap-6"
          >
            {/* Candidate Card */}
            <div 
              onClick={() => handleOpenRegister('user')}
              className="relative group cursor-pointer h-[240px] rounded-[3rem] overflow-hidden shadow-2xl border border-white/10"
            >
              <img 
                src="https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&q=80&w=800" 
                alt="Job Search" 
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-[#173E7D]/80 group-hover:bg-[#173E7D]/70 transition-colors duration-500" />
              <div className="relative z-10 h-full p-10 flex flex-col justify-center">
                <div className="w-12 h-12 bg-white/10 backdrop-blur-xl text-white rounded-2xl flex items-center justify-center mb-4 border border-white/20">
                  <UserIcon size={24} />
                </div>
                <h3 className="text-2xl font-display font-black text-white mb-2 uppercase tracking-tight">
                  {language === 'fr' ? "Trouvez un emploi" : "ابحث عن وظيفة"}
                </h3>
                <p className="text-white/60 text-sm font-medium leading-relaxed max-w-[280px]">
                  {language === 'fr' ? "Trouvez les meilleures opportunités en Algérie." : "ابحث عن أفضل الفرص في الجزائر."}
                </p>
                <div className="absolute bottom-10 right-10 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white group-hover:bg-[#F68D58] group-hover:scale-110 transition-all border border-white/20">
                  <ChevronRight size={20} />
                </div>
              </div>
            </div>

            {/* Recruiter Card */}
            <div 
              onClick={() => handleOpenRegister('employer')}
              className="relative group cursor-pointer h-[240px] rounded-[3rem] overflow-hidden shadow-2xl border border-white/10"
            >
              <img 
                src="https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&q=80&w=800" 
                alt="Recruiter" 
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-[#173E7D]/80 group-hover:bg-[#173E7D]/70 transition-colors duration-500" />
              <div className="relative z-10 h-full p-10 flex flex-col justify-center">
                <div className="w-12 h-12 bg-white/10 backdrop-blur-xl text-white rounded-2xl flex items-center justify-center mb-4 border border-white/20">
                  <Building2 size={24} />
                </div>
                <h3 className="text-2xl font-display font-black text-white mb-2 uppercase tracking-tight">
                  {language === 'fr' ? "Trouvez des talents" : "ابحث عن مواهب"}
                </h3>
                <p className="text-white/60 text-sm font-medium leading-relaxed max-w-[280px]">
                  {language === 'fr' ? "Publiez vos offres et trouvez les meilleurs talents." : "انشر عروضك وابحث عن أفضل المواهب."}
                </p>
                <div className="absolute bottom-10 right-10 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white group-hover:bg-[#F68D58] group-hover:scale-110 transition-all border border-white/20">
                  <ChevronRight size={20} />
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Hero to Vision Gradient Transition */}
      <div className={`h-32 w-full bg-gradient-to-b ${COLORS[colorIndex]} to-white transition-colors duration-1000`} />

      {/* Vision Section */}
      <section className="bg-white py-40 px-6 overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-gray-50/50 to-white -z-10" />
        <div className="max-w-7xl mx-auto">
          {/* Centered Header */}
          <div className="text-center mb-32">
            <motion.h2 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-7xl md:text-[10rem] font-display font-black text-[#173E7D] mb-8 leading-none tracking-tighter uppercase"
            >
              {translations[language].vision.badge}
            </motion.h2>
            <motion.p 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="text-3xl md:text-5xl font-display font-bold text-[#F68D58] tracking-tight uppercase"
            >
              {translations[language].vision.title}
            </motion.p>
          </div>

          <div className="text-center max-w-4xl mx-auto mb-32">
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-3xl md:text-4xl text-gray-500 leading-relaxed font-light mb-24"
            >
              {translations[language].vision.subtitle}
            </motion.p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-32">
              {[
                { title: language === 'fr' ? "Top Entreprises" : "أفضل الشركات", desc: language === 'fr' ? "Accès exclusif aux leaders du marché." : "وصول حصري لقادة السوق.", icon: <Building2 size={28} /> },
                { title: language === 'fr' ? "Accompagnement" : "المرافقة", desc: language === 'fr' ? "Conseils personnalisés pour votre carrière." : "نصائح مخصصة لمسيرتك المهنية.", icon: <Users size={28} /> },
                { title: language === 'fr' ? "Direct & Rapide" : "مباشر وسريع", desc: language === 'fr' ? "Contact direct avec les décideurs." : "تواصل مباشر مع صناع القرار.", icon: <Zap size={28} /> },
                { title: language === 'fr' ? "Gratuité Totale" : "مجانية تامة", desc: language === 'fr' ? "Aucun frais pour les candidats." : "لا توجد رسوم للمترشحين.", icon: <Heart size={28} /> }
              ].map((item, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="flex flex-col items-center text-center group"
                >
                  <div className="w-20 h-20 bg-white text-[#173E7D] rounded-[2rem] flex items-center justify-center mb-8 shadow-xl border border-gray-50 group-hover:bg-[#173E7D] group-hover:text-white transition-all duration-500 group-hover:scale-110">
                    {item.icon}
                  </div>
                  <h4 className="font-black text-[#173E7D] text-2xl mb-4 tracking-tight">{item.title}</h4>
                  <p className="text-lg text-gray-400 leading-relaxed font-medium">{item.desc}</p>
                </motion.div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="relative h-[500px] rounded-[4rem] overflow-hidden shadow-2xl border-8 border-white"
              >
                <img 
                  src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&q=80&w=1000" 
                  alt="Talents Algériens" 
                  className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-1000"
                  referrerPolicy="no-referrer"
                />
              </motion.div>
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="relative h-[500px] rounded-[4rem] overflow-hidden shadow-2xl border-8 border-white"
              >
                <img 
                  src="https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&q=80&w=1000" 
                  alt="Collaboration Professionnelle" 
                  className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-1000"
                  referrerPolicy="no-referrer"
                />
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* Vision to Stats Gradient Transition */}
      <div className="h-32 w-full bg-gradient-to-b from-white to-gray-50/50" />

      {/* Stats Section */}
      <section id="stats" className="bg-gray-50/50 py-32 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-16">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center group bg-white p-12 rounded-[3rem] shadow-xl border border-gray-100/50"
          >
            <div className="w-24 h-24 bg-blue-50 text-[#173E7D] rounded-[2.5rem] flex items-center justify-center mx-auto mb-10 group-hover:bg-[#173E7D] group-hover:text-white transition-all duration-700 shadow-inner">
              <Briefcase size={40} />
            </div>
            <h3 className="text-7xl font-black text-[#173E7D] mb-4 tracking-tighter">12,400+</h3>
            <p className="text-gray-400 uppercase tracking-[0.4em] text-[11px] font-black">{language === 'fr' ? 'Postes Actifs' : 'وظائف نشطة'}</p>
          </motion.div>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-center group bg-white p-12 rounded-[3rem] shadow-xl border border-gray-100/50"
          >
            <div className="w-24 h-24 bg-orange-50 text-[#F68D58] rounded-[2.5rem] flex items-center justify-center mx-auto mb-10 group-hover:bg-[#F68D58] group-hover:text-white transition-all duration-700 shadow-inner">
              <Users size={40} />
            </div>
            <h3 className="text-7xl font-black text-[#173E7D] mb-4 tracking-tighter">85,000+</h3>
            <p className="text-gray-400 uppercase tracking-[0.4em] text-[11px] font-black">{language === 'fr' ? 'Candidats' : 'مترشحين'}</p>
          </motion.div>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 }}
            className="text-center group bg-white p-12 rounded-[3rem] shadow-xl border border-gray-100/50"
          >
            <div className="w-24 h-24 bg-emerald-50 text-emerald-600 rounded-[2.5rem] flex items-center justify-center mx-auto mb-10 group-hover:bg-emerald-600 group-hover:text-white transition-all duration-700 shadow-inner">
              <TrendingUp size={40} />
            </div>
            <h3 className="text-7xl font-black text-[#173E7D] mb-4 tracking-tighter">98%</h3>
            <p className="text-gray-400 uppercase tracking-[0.4em] text-[11px] font-black">{language === 'fr' ? 'Taux de Réussite' : 'معدل النجاح'}</p>
          </motion.div>
        </div>
      </section>

      {/* Sectors Section */}
      <section id="sectors" className="py-32 px-6 bg-gray-50/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <span className="text-[#F68D58] font-black text-xs tracking-[0.4em] uppercase mb-6 block">
              {translations[language].sectors.title}
            </span>
            <h2 className="text-5xl md:text-6xl font-display font-bold text-[#173E7D] tracking-tighter mb-6">
              {translations[language].sectors.subtitle}
            </h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { id: 'it', icon: <Cpu size={32} />, color: 'bg-blue-50 text-blue-600', image: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&q=80&w=800' },
              { id: 'health', icon: <HeartPulse size={32} />, color: 'bg-red-50 text-red-600', image: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&q=80&w=800' },
              { id: 'finance', icon: <Landmark size={32} />, color: 'bg-emerald-50 text-emerald-600', image: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&q=80&w=800' },
              { id: 'construction', icon: <HardHat size={32} />, color: 'bg-orange-50 text-orange-600', image: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&q=80&w=800' },
              { id: 'education', icon: <GraduationCap size={32} />, color: 'bg-indigo-50 text-indigo-600', image: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&q=80&w=800' },
              { id: 'tourism', icon: <Palmtree size={32} />, color: 'bg-yellow-50 text-yellow-600', image: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&q=80&w=800' },
              { id: 'industry', icon: <Factory size={32} />, color: 'bg-gray-100 text-gray-600', image: 'https://images.unsplash.com/photo-1513828583688-c52646db42da?auto=format&fit=crop&q=80&w=800' },
              { id: 'commerce', icon: <ShoppingBag size={32} />, color: 'bg-pink-50 text-pink-600', image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&q=80&w=800' }
            ].map((sector, i) => (
              <motion.div
                key={sector.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ y: -10, scale: 1.02 }}
                className="bg-white overflow-hidden rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-500 group cursor-pointer flex flex-col"
              >
                <div className="h-40 w-full relative overflow-hidden">
                  <img 
                    src={sector.image} 
                    alt="" 
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-white/20 to-transparent" />
                </div>
                <div className="p-8">
                  <div className={`w-16 h-16 ${sector.color} rounded-2xl flex items-center justify-center mb-6 -mt-16 relative z-10 shadow-lg group-hover:scale-110 transition-transform duration-500`}>
                    {sector.icon}
                  </div>
                  <h3 className="text-xl font-bold text-[#173E7D] mb-2">
                    {translations[language].sectors[sector.id as keyof typeof translations['fr']['sectors']]}
                  </h3>
                  <div className="flex items-center gap-2 text-[#F68D58] font-bold text-sm opacity-0 group-hover:opacity-100 transition-opacity">
                    <span>{language === 'fr' ? 'Explorer' : 'استكشاف'}</span>
                    <ChevronRight size={16} className={language === 'ar' ? 'rotate-180' : ''} />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Sectors to Features Gradient Transition */}
      <div className="h-32 w-full bg-gradient-to-b from-gray-50/50 to-white" />

      {/* Key Features Section */}
      <section id="features" className="py-40 px-6 bg-white relative overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-24">
            <span className="text-[#F68D58] font-black text-xs tracking-[0.4em] uppercase mb-6 block">{language === 'fr' ? 'Pourquoi nous ?' : 'لماذا نحن؟'}</span>
            <h2 className="text-6xl md:text-7xl font-display font-bold text-[#173E7D] tracking-tighter">{language === 'fr' ? 'Fonctionnalités Clés' : 'المميزات الرئيسية'}</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            {[
              { 
                title: language === 'fr' ? "Recherche intelligente" : "بحث ذكي", 
                desc: language === 'fr' ? "Filtrez par wilaya, secteur, type de contrat et niveau d'expérience." : "فلترة حسب الولاية، القطاع، نوع العقد ومستوى الخبرة.",
                icon: <Search size={32} />,
                color: "bg-blue-50 text-blue-600"
              },
              { 
                title: language === 'fr' ? "CV Maker intégré" : "منشئ سيرة ذاتية", 
                desc: language === 'fr' ? "Créez un CV professionnel en minutes avec nos modèles modernes." : "أنشئ سيرة ذاتية احترافية في دقائق مع قوالبنا الحديثة.",
                icon: <FileText size={32} />,
                color: "bg-emerald-50 text-emerald-600"
              },
              { 
                title: language === 'fr' ? "Filtrage IA Gemini" : "فلترة بذكاء اصطناعي", 
                desc: language === 'fr' ? "Analyse et classement des candidatures par pertinence via IA." : "تحليل وتصنيف الطلبات حسب الأهمية عبر الذكاء الاصطناعي.",
                icon: <Bot size={32} />,
                color: "bg-purple-50 text-purple-600"
              },
              { 
                title: language === 'fr' ? "Paiement algérien" : "دفع جزائري", 
                desc: language === 'fr' ? "CCP, Baridimob et EDAHABIA via Chargily Pay." : "الدفع عبر بريدي موب والذهبية عبر شارجيلي باي.",
                icon: <CreditCard size={32} />,
                color: "bg-orange-50 text-orange-600"
              },
              { 
                title: language === 'fr' ? "Tableau de bord" : "لوحة تحكم", 
                desc: language === 'fr' ? "Suivez vos candidatures ou gérez vos offres en temps réel." : "تابع طلباتك أو أدر عروضك في الوقت الفعلي.",
                icon: <BarChart3 size={32} />,
                color: "bg-indigo-50 text-indigo-600"
              },
              { 
                title: language === 'fr' ? "Notifications" : "تنبيهات", 
                desc: language === 'fr' ? "Alertes instantanées pour les nouvelles offres." : "تنبيهات فورية للعروض الجديدة.",
                icon: <Bell size={32} />,
                color: "bg-pink-50 text-pink-600"
              }
            ].map((feature, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ y: -10 }}
                className="bg-white p-12 rounded-[3.5rem] border border-gray-100 hover:shadow-[0_40px_80px_-15px_rgba(0,0,0,0.08)] transition-all duration-500 group"
              >
                <div className={`w-20 h-20 ${feature.color} rounded-3xl flex items-center justify-center mb-10 group-hover:scale-110 transition-transform duration-500 shadow-sm`}>
                  {feature.icon}
                </div>
                <h3 className="text-3xl font-bold text-[#173E7D] mb-6">{feature.title}</h3>
                <p className="text-gray-500 leading-relaxed text-lg">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features to How It Works Gradient Transition */}
      <div className="h-32 w-full bg-gradient-to-b from-white to-gray-50/30" />

      {/* Steps Section */}
      <section id="how-it-works" className="py-40 px-6 bg-gray-50/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-24">
            <span className="text-[#F68D58] font-black text-xs tracking-[0.4em] uppercase mb-6 block">Processus</span>
            <h2 className="text-6xl font-display font-bold text-[#173E7D] tracking-tighter">Comment ça marche ?</h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            {[
              { 
                step: "01", 
                title: language === 'fr' ? "Créez votre profil" : "أنشئ ملفك الشخصي", 
                desc: language === 'fr' ? "Inscrivez-vous et complétez votre profil avec vos expériences et compétences." : "سجل وأكمل ملفك الشخصي بخبراتك ومهاراتك.",
                image: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&q=80&w=800",
                color: "bg-blue-600"
              },
              { 
                step: "02", 
                title: language === 'fr' ? "Trouvez des offres" : "جد عروض العمل", 
                desc: language === 'fr' ? "Explorez des milliers d'offres d'emploi adaptées à votre profil et vos aspirations." : "استكشف آلاف عروض العمل المناسبة لملفك وطموحاتك.",
                image: "https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?auto=format&fit=crop&q=80&w=800",
                color: "bg-[#F68D58]"
              },
              { 
                step: "03", 
                title: language === 'fr' ? "Postulez & Réussissez" : "قدم وانجح", 
                desc: language === 'fr' ? "Envoyez vos candidatures en un clic et suivez votre progression en temps réel." : "أرسل ترشيحاتك بنقرة واحدة وتابع تقدمك في الوقت الفعلي.",
                image: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&q=80&w=800",
                color: "bg-emerald-600"
              }
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.2 }}
                className="group"
              >
                <div className="relative h-80 mb-10 rounded-[3rem] overflow-hidden shadow-2xl">
                  <img 
                    src={item.image} 
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  <div className={`absolute top-6 left-6 w-16 h-16 ${item.color} text-white rounded-2xl flex items-center justify-center text-2xl font-black shadow-xl`}>
                    {item.step}
                  </div>
                </div>
                <h3 className="text-3xl font-bold text-[#173E7D] mb-4">{item.title}</h3>
                <p className="text-gray-500 text-lg leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works to About Us Gradient Transition */}
      <div className="h-32 w-full bg-gradient-to-b from-gray-50/30 to-white" />

      <section id="about-us" className="py-20 px-6 bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col gap-12 items-center text-center">
            <motion.div 
              initial={{ opacity: 0, y: -30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="max-w-4xl"
            >
              {language === 'fr' ? (
                <h2 className="text-6xl md:text-8xl font-display font-black text-[#173E7D] leading-none tracking-tighter mb-4 uppercase italic">
                  Qui sommes-<span className="text-[#F68D58]">nous</span>
                </h2>
              ) : (
                <h2 className="text-6xl md:text-8xl font-display font-black text-[#173E7D] leading-none tracking-tighter mb-4 uppercase italic">
                  من <span className="text-[#F68D58]">نحن</span>
                </h2>
              )}
              
              <div className="w-24 h-2 bg-[#F68D58] mx-auto mb-10" />
              
              <p className="text-2xl text-gray-400 font-medium leading-relaxed max-w-2xl mx-auto">
                {translations[language].about.subtitle}
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-16 max-w-6xl">
              {[
                {
                  title: translations[language].about.visionTitle,
                  text: translations[language].about.visionText,
                  icon: <Zap className="text-[#F68D58]" size={32} />
                },
                {
                  title: translations[language].about.innovationTitle,
                  text: translations[language].about.innovationText,
                  icon: <Cpu className="text-[#F68D58]" size={32} />
                },
                {
                  title: translations[language].about.expertiseTitle,
                  text: translations[language].about.expertiseText,
                  icon: <ShieldCheck className="text-[#F68D58]" size={32} />
                }
              ].map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.2 }}
                  className="group flex flex-col items-center"
                >
                  <div className="mb-8 group-hover:scale-125 transition-transform duration-500">
                    {item.icon}
                  </div>
                  <h3 className="text-2xl font-black text-[#173E7D] mb-4 uppercase tracking-tight">
                    {item.title}
                  </h3>
                  <div className="w-12 h-1 bg-[#F68D58] mb-6 group-hover:w-24 transition-all duration-500 mx-auto" />
                  <p className="text-gray-500 text-lg leading-relaxed font-medium">
                    {item.text}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* About Us to Featured Jobs Gradient Transition */}
      <div className="h-32 w-full bg-gradient-to-b from-white to-gray-50/30" />

      {/* Featured Jobs */}
      <section className="bg-gray-50/30 py-40 px-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-blue-50/20 -z-10 blur-3xl rounded-full" />
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-24 gap-8">
            <div className={language === 'ar' ? 'text-right' : ''}>
              <span className="text-[#F68D58] font-black text-sm tracking-[0.5em] uppercase mb-6 block">{language === 'fr' ? 'Opportunités' : 'فرص العمل'}</span>
              <h2 className="text-6xl md:text-7xl font-display font-bold text-[#173E7D] mb-6 tracking-tighter">{language === 'fr' ? 'Postes à la une' : 'وظائف مميزة'}</h2>
              <p className="text-2xl text-gray-500 font-light max-w-2xl">{language === 'fr' ? 'Découvrez les meilleures opportunités sélectionnées pour vous.' : 'اكتشف أفضل الفرص المختارة لك.'}</p>
            </div>
            <button 
              onClick={() => setIsLoginOpen(true)}
              className="bg-white text-[#173E7D] px-12 py-6 rounded-full font-black flex items-center gap-4 hover:bg-[#173E7D] hover:text-white transition-all duration-500 group shadow-2xl border border-gray-100 text-xl"
            >
              {language === 'fr' ? 'Voir tout' : 'عرض الكل'} 
              <ChevronRight size={28} className={`group-hover:translate-x-2 transition-transform ${language === 'ar' ? 'rotate-180 group-hover:-translate-x-2' : ''}`} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
              {[
                { 
                  title: "Senior UI/UX Designer", 
                  company: "TechNova Algeria", 
                  location: "Alger", 
                  type: "CDI", 
                  remote: "Hybride",
                  salary: "150k - 220k DZD", 
                  logo: "https://images.unsplash.com/photo-1572044162444-ad60f128bde3?auto=format&fit=crop&q=80&w=200", 
                  color: "bg-blue-50 text-blue-600", 
                  featured: true,
                  description: language === 'fr' ? "Concevez des interfaces utilisateur exceptionnelles pour nos clients internationaux." : "صمم واجهات مستخدم استثنائية لعملائنا الدوليين.",
                  requirements: ["Figma", "Design System", "Prototyping"]
                },
                { 
                  title: "Full Stack Developer", 
                  company: "Atlas Solutions", 
                  location: "Oran", 
                  type: "CDI", 
                  remote: "Télétravail",
                  salary: "180k - 250k DZD", 
                  logo: "https://images.unsplash.com/photo-1549923746-c502d488b3ea?auto=format&fit=crop&q=80&w=200", 
                  color: "bg-emerald-50 text-emerald-600", 
                  featured: false,
                  description: language === 'fr' ? "Développez des applications web robustes avec React et Node.js." : "طور تطبيقات ويب قوية باستخدام React و Node.js.",
                  requirements: ["React", "Node.js", "PostgreSQL"]
                },
                { 
                  title: "Marketing Manager", 
                  company: "Sahara Creative", 
                  location: "Constantine", 
                  type: "CDI", 
                  remote: "Hybride",
                  salary: "120k - 180k DZD", 
                  logo: "https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&q=80&w=200", 
                  color: "bg-orange-50 text-orange-600", 
                  featured: true,
                  description: language === 'fr' ? "Pilotez la stratégie marketing digitale de nos clients." : "قد استراتيجية التسويق الرقمي لعملائنا.",
                  requirements: ["SEO", "Ads", "Strategy"]
                },
                { 
                  title: "Data Scientist", 
                  company: "FinTech Hub", 
                  location: "Alger", 
                  type: "CDI", 
                  remote: "Sur site",
                  salary: "200k - 300k DZD", 
                  logo: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=200", 
                  color: "bg-indigo-50 text-indigo-600", 
                  featured: false,
                  description: language === 'fr' ? "Analysez des données complexes pour extraire des insights métiers." : "حلل البيانات المعقدة لاستخراج رؤى تجارية.",
                  requirements: ["Python", "ML", "SQL"]
                },
                { 
                  title: "Product Owner", 
                  company: "Digital Nomad Co", 
                  location: "Annaba", 
                  type: "CDI", 
                  remote: "Télétravail",
                  salary: "160k - 240k DZD", 
                  logo: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&q=80&w=200", 
                  color: "bg-purple-50 text-purple-600", 
                  featured: false,
                  description: language === 'fr' ? "Gérez le backlog produit et collaborez avec les équipes techniques." : "أدر قائمة مهام المنتج وتعاون مع الفرق التقنية.",
                  requirements: ["Agile", "Scrum", "Product"]
                },
                { 
                  title: "HR Specialist", 
                  company: "Global Reach", 
                  location: "Sétif", 
                  type: "CDI", 
                  remote: "Sur site",
                  salary: "100k - 140k DZD", 
                  logo: "https://images.unsplash.com/photo-1454165833767-027ffea9e77b?auto=format&fit=crop&q=80&w=200", 
                  color: "bg-pink-50 text-pink-600", 
                  featured: false,
                  description: language === 'fr' ? "Gérez le recrutement et le développement des talents." : "أدر التوظيف وتطوير المواهب.",
                  requirements: ["Recruitment", "HRM", "Admin"]
                },
              ].map((job, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  whileHover={{ y: -15, scale: 1.02 }}
                  onClick={() => setSelectedJob(job as any)}
                  className="bg-white p-10 rounded-[3.5rem] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.05)] border-2 border-[#173E7D] transition-all duration-500 group cursor-pointer relative overflow-hidden flex flex-col h-full"
                >
                  {job.featured && (
                    <div className="absolute top-6 right-6 bg-[#F68D58] text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest z-20 shadow-lg">
                      {language === 'fr' ? 'À la une' : 'مميز'}
                    </div>
                  )}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gray-50 rounded-bl-[4rem] -z-0 group-hover:bg-[#173E7D]/5 transition-colors" />
                  
                  <div className="relative z-10 flex-1 flex flex-col">
                    <div className="flex justify-between items-start mb-10">
                      <div className={`w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-gray-50 overflow-hidden group-hover:scale-110 transition-transform duration-500`}>
                        <img 
                          src={job.logo} 
                          alt={job.company} 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className="px-5 py-2 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-widest">{job.type}</span>
                        <span className="px-5 py-2 bg-blue-50 text-[#173E7D] rounded-full text-[10px] font-black uppercase tracking-widest">{job.remote}</span>
                      </div>
                    </div>

                    <h3 className="text-2xl font-black text-[#173E7D] mb-3 group-hover:text-[#F68D58] transition-colors leading-tight">{job.title}</h3>
                    <div className="flex items-center gap-2 text-gray-400 font-bold uppercase tracking-wider text-[10px] mb-6">
                      <Building2 size={14} className="text-[#F68D58]" />
                      {job.company}
                    </div>

                    <p className="text-gray-500 text-sm leading-relaxed line-clamp-2 font-medium mb-6">
                      {job.description}
                    </p>

                    <div className="flex flex-wrap gap-2 mb-8">
                      {job.requirements.map((req, idx) => (
                        <span key={idx} className="px-3 py-1 bg-gray-50 text-gray-400 text-[10px] font-bold rounded-lg border border-gray-100">
                          {req}
                        </span>
                      ))}
                    </div>
                    
                    <div className="flex items-center gap-6 text-[10px] text-gray-400 mb-10 font-bold uppercase tracking-widest mt-auto">
                      <div className="flex items-center gap-2"><MapPin size={16} className="text-[#F68D58]" /> {job.location}</div>
                      <div className="flex items-center gap-2"><Clock size={16} className="text-[#F68D58]" /> 2j</div>
                    </div>

                    <div className="flex items-center justify-between pt-8 border-t border-gray-50">
                      <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
                          {language === 'ar' ? 'الراتب المتوقع' : 'Salaire Estimé'}
                        </p>
                        <p className="text-2xl font-black text-[#173E7D]">{job.salary}</p>
                      </div>
                      <button 
                        className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center text-[#173E7D] group-hover:bg-[#F68D58] group-hover:text-white transition-all duration-500 shadow-sm"
                      >
                        <ChevronRight size={28} className={language === 'ar' ? 'rotate-180' : ''} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
          </div>
        </div>
      </section>

      {/* Featured Jobs to Hiring Partners Gradient Transition */}
      <div className="h-32 w-full bg-gradient-to-b from-gray-50/30 to-white" />

      {/* Hiring Partners Section */}
      <section className="bg-white py-40 overflow-hidden relative">
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="text-center mb-24">
            <span className="text-[#F68D58] font-black text-sm tracking-[0.5em] uppercase mb-6 block">{language === 'fr' ? 'Confiance' : 'ثقة'}</span>
            <h2 className="text-5xl md:text-6xl font-display font-bold text-[#173E7D] mb-6 tracking-tight">{language === 'fr' ? "Ils recrutent sur Dar L'emploi" : "يوظفون على دار التشغيل"}</h2>
            <p className="text-2xl text-gray-400 font-light max-w-2xl mx-auto">{language === 'fr' ? 'Les plus grandes entreprises algériennes nous font confiance.' : 'أكبر الشركات الجزائرية تثق بنا.'}</p>
          </div>
          
          <div className="relative flex overflow-hidden">
            <motion.div 
              animate={{ x: [0, -1000] }}
              transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
              className="flex gap-16 items-center whitespace-nowrap"
            >
              {[
                { name: "Sonatrach", color: "text-orange-600" },
                { name: "Ooredoo", color: "text-red-600" },
                { name: "Djezzy", color: "text-red-700" },
                { name: "Condor", color: "text-blue-700" },
                { name: "Cevital", color: "text-green-700" },
                { name: "Air Algérie", color: "text-red-800" },
                { name: "Sonatrach", color: "text-orange-600" },
                { name: "Ooredoo", color: "text-red-600" },
                { name: "Djezzy", color: "text-red-700" },
                { name: "Condor", color: "text-blue-700" },
                { name: "Cevital", color: "text-green-700" },
                { name: "Air Algérie", color: "text-red-800" }
              ].map((partner, i) => (
                <div 
                  key={i}
                  className="bg-gray-50 px-12 py-8 rounded-3xl border border-gray-100 flex items-center gap-6 grayscale hover:grayscale-0 transition-all duration-700 cursor-pointer shadow-sm hover:shadow-2xl hover:bg-white"
                >
                  <div className={`w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-inner ${partner.color}`}>
                    <Building2 size={32} />
                  </div>
                  <span className="font-display font-black text-2xl tracking-tighter text-gray-400 uppercase group-hover:text-[#173E7D]">{partner.name}</span>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-40 px-6 bg-gray-50/50 overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-24">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 px-6 py-2 bg-orange-100/50 text-[#F68D58] rounded-full text-[10px] font-black uppercase tracking-[0.4em] mb-8 border border-orange-200/50"
            >
              <Zap size={12} fill="currentColor" />
              <span>NOS OFFRES</span>
            </motion.div>
            <h2 className="text-6xl md:text-8xl font-display font-black text-[#173E7D] mb-8 tracking-tighter leading-[0.9]">
              Évoluez sans<br />limites
            </h2>
            <p className="text-2xl text-gray-500 max-w-2xl mx-auto font-light leading-relaxed">
              La meilleure technologie de recrutement au service de votre croissance.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Plan Gratuit */}
            <motion.div 
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="group relative bg-white p-12 rounded-[4rem] flex flex-col border border-gray-100 shadow-[0_40px_80px_-15px_rgba(0,0,0,0.03)] hover:shadow-[0_40px_100px_-20px_rgba(0,0,0,0.08)] transition-all duration-700 hover:-translate-y-4"
            >
              <div className="w-20 h-20 rounded-3xl bg-gray-50 text-gray-400 flex items-center justify-center mb-10 shadow-inner group-hover:scale-110 group-hover:rotate-3 transition-all duration-700">
                <Zap size={32} />
              </div>
              <div className="mb-8">
                <h3 className="text-3xl font-black text-[#173E7D] mb-2">Gratuit</h3>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Pour tester nos services</p>
              </div>
              <div className="mb-12">
                <div className="flex items-baseline gap-2">
                  <span className="text-6xl font-black text-[#173E7D] tracking-tighter">0</span>
                  <span className="text-gray-400 font-bold text-xl uppercase tracking-widest">DA</span>
                </div>
              </div>
              <div className="space-y-4 mb-16 flex-1">
                <p className="text-[9px] font-black text-[#173E7D]/30 uppercase tracking-[0.3em] mb-6">Ce qui est inclus</p>
                <li className="flex items-start gap-4 list-none group/item">
                  <div className="w-6 h-6 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center shrink-0 mt-0.5 border border-emerald-100 shadow-sm transition-transform group-hover/item:scale-110"><CheckCircle2 size={12} strokeWidth={3} /></div>
                  <span className="text-sm font-bold text-gray-600">1 offre d'emploi gratuite</span>
                </li>
                <li className="flex items-start gap-4 list-none opacity-50">
                  <div className="w-6 h-6 bg-red-50 text-red-400/60 rounded-full flex items-center justify-center shrink-0 mt-0.5 border border-red-100/50"><XCircle size={12} strokeWidth={3} /></div>
                  <span className="text-sm font-bold text-gray-300 line-through decoration-red-200">Filtrage par IA Gemini</span>
                </li>
                <li className="flex items-start gap-4 list-none opacity-50">
                  <div className="w-6 h-6 bg-red-50 text-red-400/60 rounded-full flex items-center justify-center shrink-0 mt-0.5 border border-red-100/50"><XCircle size={12} strokeWidth={3} /></div>
                  <span className="text-sm font-bold text-gray-300 line-through decoration-red-200">Gestionnaire d'équipe</span>
                </li>
              </div>
              <button className="w-full py-7 rounded-[2rem] font-black text-[11px] uppercase tracking-[0.2em] bg-white text-[#173E7D] border-2 border-[#173E7D] hover:bg-[#173E7D] hover:text-white transition-all duration-500">
                Commencer
              </button>
            </motion.div>

            {/* Plan Annonces */}
            <motion.div 
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="group relative bg-white p-12 rounded-[4rem] flex flex-col border-2 border-[#F68D58] shadow-[0_40px_100px_-20px_rgba(246,141,88,0.2)] scale-105 z-10 transition-all duration-700 hover:-translate-y-4"
            >
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-[#F68D58] text-white px-8 py-3 rounded-full text-[10px] font-black uppercase tracking-[0.3em] shadow-xl whitespace-nowrap z-20">
                MEILLEUR CHOIX
              </div>
              <div className="w-20 h-20 rounded-3xl bg-orange-50 text-[#F68D58] flex items-center justify-center mb-10 shadow-[inset_0_4px_12px_rgba(246,141,88,0.1)] group-hover:scale-110 group-hover:rotate-3 transition-all duration-700">
                <Briefcase size={32} />
              </div>
              <div className="mb-8">
                <h3 className="text-3xl font-black text-[#173E7D] mb-2">Annonces</h3>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Packs 2, 5 ou 10 disponibles</p>
              </div>
              <div className="mb-12 min-h-[100px]">
                <div className="flex items-baseline gap-2">
                  <span className="text-6xl font-black text-[#173E7D] tracking-tighter">5 900</span>
                  <span className="text-gray-400 font-bold text-xl uppercase tracking-widest">DA</span>
                </div>
                <div className="mt-3 inline-flex px-4 py-1.5 bg-orange-100/50 text-[#F68D58] rounded-full text-[9px] font-black uppercase tracking-[0.2em] border border-orange-200/30">
                  PAR OFFRE
                </div>
              </div>
              <div className="space-y-4 mb-16 flex-1">
                <p className="text-[9px] font-black text-[#173E7D]/30 uppercase tracking-[0.3em] mb-6">Ce qui est inclus</p>
                <li className="flex items-start gap-4 list-none group/item">
                  <div className="w-6 h-6 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center shrink-0 mt-0.5 border border-emerald-100 shadow-sm transition-transform group-hover/item:scale-110"><CheckCircle2 size={12} strokeWidth={3} /></div>
                  <span className="text-sm font-bold text-gray-600">Publication d'offres payantes</span>
                </li>
                <li className="flex items-start gap-4 list-none group/item">
                  <div className="w-6 h-6 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center shrink-0 mt-0.5 border border-emerald-100 shadow-sm transition-transform group-hover/item:scale-110"><CheckCircle2 size={12} strokeWidth={3} /></div>
                  <span className="text-sm font-bold text-gray-600">Multi-comptes (Gestionnaire)</span>
                </li>
                <li className="flex items-start gap-4 list-none opacity-50">
                  <div className="w-6 h-6 bg-red-50 text-red-400/60 rounded-full flex items-center justify-center shrink-0 mt-0.5 border border-red-100/50"><XCircle size={12} strokeWidth={3} /></div>
                  <span className="text-sm font-bold text-gray-300 line-through decoration-red-200">Filtrage par IA Gemini</span>
                </li>
                <li className="flex items-start gap-4 list-none opacity-50">
                  <div className="w-6 h-6 bg-red-50 text-red-400/60 rounded-full flex items-center justify-center shrink-0 mt-0.5 border border-red-100/50"><XCircle size={12} strokeWidth={3} /></div>
                  <span className="text-sm font-bold text-gray-300 line-through decoration-red-200">Répertoire CV</span>
                </li>
                <li className="flex items-start gap-4 list-none opacity-50">
                  <div className="w-6 h-6 bg-red-50 text-red-400/60 rounded-full flex items-center justify-center shrink-0 mt-0.5 border border-red-100/50"><XCircle size={12} strokeWidth={3} /></div>
                  <span className="text-sm font-bold text-gray-300 line-through decoration-red-200">Présélection de candidats</span>
                </li>
                <li className="flex items-start gap-4 list-none opacity-50">
                  <div className="w-6 h-6 bg-red-50 text-red-400/60 rounded-full flex items-center justify-center shrink-0 mt-0.5 border border-red-100/50"><XCircle size={12} strokeWidth={3} /></div>
                  <span className="text-sm font-bold text-gray-300 line-through decoration-red-200">Support Prioritaire</span>
                </li>
              </div>
              <button className="w-full py-7 rounded-[2rem] font-black text-[11px] uppercase tracking-[0.2em] bg-[#F68D58] text-white shadow-[0_20px_40px_-5px_rgba(246,141,88,0.3)] hover:bg-[#e57d47]">
                Choisir ce plan
              </button>
            </motion.div>

            {/* Plan Corporate */}
            <motion.div 
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="group relative bg-white p-12 rounded-[4rem] flex flex-col border-2 border-[#173E7D]/20 shadow-[0_40px_100px_-20px_rgba(23,62,125,0.1)] transition-all duration-700 hover:-translate-y-4"
            >
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-[#173E7D] text-white px-8 py-3 rounded-full text-[10px] font-black uppercase tracking-[0.3em] shadow-xl whitespace-nowrap z-20">
                ÉLITE
              </div>
              <div className="w-20 h-20 rounded-3xl bg-blue-50 text-[#173E7D] flex items-center justify-center mb-10 shadow-[inset_0_4px_12px_rgba(23,62,125,0.1)] group-hover:scale-110 group-hover:rotate-3 transition-all duration-700">
                <Building2 size={32} />
              </div>
              <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-3xl font-black text-[#173E7D]">Corporate</h3>
                  <Zap size={16} className="text-[#F68D58] animate-pulse" fill="#F68D58" />
                </div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Solution annuelle illimitée</p>
              </div>
              <div className="mb-12 min-h-[100px] flex items-center">
                <span className="text-4xl font-black text-[#173E7D] tracking-tighter uppercase">Sur mesure</span>
              </div>
              <div className="space-y-4 mb-16 flex-1">
                <p className="text-[9px] font-black text-[#173E7D]/30 uppercase tracking-[0.3em] mb-6">Suite complète</p>
                <li className="flex items-start gap-4 list-none group/item">
                  <div className="w-6 h-6 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center shrink-0 mt-0.5 border border-emerald-100 shadow-sm transition-transform group-hover/item:scale-110"><CheckCircle2 size={12} strokeWidth={3} /></div>
                  <span className="text-sm font-bold text-gray-600">Publication illimitée</span>
                </li>
                <li className="flex items-start gap-4 list-none group/item">
                  <div className="w-6 h-6 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center shrink-0 mt-0.5 border border-emerald-100 shadow-sm transition-transform group-hover/item:scale-110"><CheckCircle2 size={12} strokeWidth={3} /></div>
                  <span className="text-sm font-bold text-gray-600">Filtrage par IA Gemini</span>
                </li>
                <li className="flex items-start gap-4 list-none group/item">
                  <div className="w-6 h-6 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center shrink-0 mt-0.5 border border-emerald-100 shadow-sm transition-transform group-hover/item:scale-110"><CheckCircle2 size={12} strokeWidth={3} /></div>
                  <span className="text-sm font-bold text-gray-600">Présélection decandidats</span>
                </li>
                <li className="flex items-start gap-4 list-none group/item">
                  <div className="w-6 h-6 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center shrink-0 mt-0.5 border border-emerald-100 shadow-sm transition-transform group-hover/item:scale-110"><CheckCircle2 size={12} strokeWidth={3} /></div>
                  <span className="text-sm font-bold text-gray-600">Répertoire CV & Support</span>
                </li>
                <li className="flex items-start gap-4 list-none group/item">
                  <div className="w-6 h-6 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center shrink-0 mt-0.5 border border-emerald-100 shadow-sm transition-transform group-hover/item:scale-110"><CheckCircle2 size={12} strokeWidth={3} /></div>
                  <span className="text-sm font-bold text-gray-600">Gestionnaire d'équipe</span>
                </li>
              </div>
              <button className="w-full py-7 rounded-[2rem] font-black text-[11px] uppercase tracking-[0.2em] bg-[#173E7D] text-white shadow-[0_20px_40px_-5px_rgba(23,62,125,0.3)] hover:bg-[#1f4a8f]">
                Contactez-nous
              </button>
            </motion.div>
          </div>
        </div>
      </section>
      

      {/* Contact Form */}
      <ContactFormDesign />;

      {/* Pricing to Footer Gradient Transition */}
      <div className="h-32 w-full bg-gradient-to-b from-white to-[#0A1118]" />

      {/* Footer */}
      <footer className="bg-[#0A1118] text-white pt-40 pb-20 px-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-20 mb-32">
            <div className={language === 'ar' ? 'text-right' : ''}>
              <Logo2 size="lg" onClick={() => setView('landing')} className="mb-10 !justify-start" />
              <p className="text-gray-400 text-lg leading-relaxed mb-10 font-medium">
                {language === 'fr' ? "La plateforme de recrutement nouvelle génération en Algérie. Connectez-vous aux meilleures opportunités." : "منصة التوظيف من الجيل الجديد في الجزائر. تواصل مع أفضل الفرص."}
              </p>
              <div className={`flex gap-6 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                <a href="https://web.facebook.com/profile.php?id=61566305343265&locale=fr_FR" target="_blank" rel="noopener noreferrer" className="...">
                  <Facebook size={20} />
                </a>
                <a href="#" target="_blank" rel="noopener noreferrer" className="...">
                  <Twitter size={20} />
                </a>
                <a href="#" target="_blank" rel="noopener noreferrer" className="...">
                  <Linkedin size={20} />
                </a>
                <a href="https://www.instagram.com/dar.lemploi/" target="_blank" rel="noopener noreferrer" className="...">
                  <Instagram size={20} />
                </a>
              </div>
            </div>

            <div className={language === 'ar' ? 'text-right' : ''}>
              <h4 className="text-xl font-black mb-10 uppercase tracking-widest text-[#F68D58]">{language === 'fr' ? 'Candidats' : 'المترشحين'}</h4>
              <ul className="space-y-6 text-gray-400 font-bold text-lg">
                <li><a href="#" className="hover:text-white transition-colors">{language === 'fr' ? "Parcourir les offres" : "تصفح العروض"}</a></li>
                <li><a href="#" className="hover:text-white transition-colors">{language === 'fr' ? "Créer un CV" : "إنشاء سيرة ذاتية"}</a></li>
                <li><a href="#" className="hover:text-white transition-colors">{language === 'fr' ? "Alertes emploi" : "تنبيهات الوظائف"}</a></li>
                <li><a href="#" className="hover:text-white transition-colors">{language === 'fr' ? "Conseils carrière" : "نصائح مهنية"}</a></li>
              </ul>
            </div>

            <div className={language === 'ar' ? 'text-right' : ''}>
              <h4 className="text-xl font-black mb-10 uppercase tracking-widest text-[#F68D58]">{language === 'fr' ? 'Employeurs' : 'أصحاب العمل'}</h4>
              <ul className="space-y-6 text-gray-400 font-bold text-lg">
                <li><a href="#" className="hover:text-white transition-colors">{language === 'fr' ? "Publier une offre" : "نشر عرض عمل"}</a></li>
                <li><a href="#" className="hover:text-white transition-colors">{language === 'fr' ? "Tarification" : "الأسعار"}</a></li>
                <li><a href="#" className="hover:text-white transition-colors">{language === 'fr' ? "Solutions RH" : "حلول الموارد البشرية"}</a></li>
                <li><a href="#" className="hover:text-white transition-colors">{language === 'fr' ? "Espace Recruteur" : "فضاء التوظيف"}</a></li>
              </ul>
            </div>

            <div className={language === 'ar' ? 'text-right' : ''}>
              <h4 className="text-xl font-black mb-10 uppercase tracking-widest text-[#F68D58]">{language === 'fr' ? 'Contact' : 'اتصل بنا'}</h4>
              <ul className="space-y-6 text-gray-400 font-bold text-lg">
                <li className={`flex items-center gap-4 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                  <Mail size={20} className="text-[#F68D58]" />
                  <span>contact@darlemploi.dz</span>
                </li>
                <li className={`flex items-center gap-4 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                  <Phone size={20} className="text-[#F68D58]" />
                  <span>+213 (0) 23 45 67 89</span>
                </li>
                <li className={`flex items-center gap-4 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                  <MapPin size={20} className="text-[#F68D58]" />
                  <span>Alger, Algérie</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-20 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-10 text-gray-500 font-bold text-sm">
            <p>© 2026 Dar L'emploi. {language === 'fr' ? 'Tous droits réservés.' : 'جميع الحقوق محفوظة.'}</p>
            <div className="flex gap-10">
              <a href="#" className="hover:text-white transition-colors">{language === 'fr' ? 'Confidentialité' : 'الخصوصية'}</a>
              <a href="#" className="hover:text-white transition-colors">{language === 'fr' ? 'Conditions' : 'الشروط'}</a>
              <a href="#" className="hover:text-white transition-colors">{language === 'fr' ? 'Cookies' : 'ملفات تعريف الارتباط'}</a>
            </div>
          </div>
        </div>
      </footer>

      {/* Application Modal */}
      <AnimatePresence>
        {selectedJob && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
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
              className="bg-white w-full max-w-2xl rounded-[4rem] shadow-2xl relative z-10 overflow-hidden border border-white/20"
            >
              <div className="bg-[#173E7D] p-12 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
                <button 
                  onClick={() => setSelectedJob(null)}
                  className="absolute top-10 right-10 text-white/60 hover:text-white transition-all hover:rotate-90 duration-500"
                >
                  <X size={32} />
                </button>
                <span className="text-[#F68D58] font-black text-xs tracking-[0.5em] uppercase mb-6 block">{language === 'fr' ? 'Candidature' : 'طلب توظيف'}</span>
                <h3 className="text-4xl md:text-5xl font-display font-bold mb-4 tracking-tighter leading-tight">{language === 'fr' ? `Postuler pour ${selectedJob.title}` : `التقدم لوظيفة ${selectedJob.title}`}</h3>
                <p className="text-blue-200 text-xl font-light">{selectedJob.company} &bull; {selectedJob.location}</p>
              </div>

              <form onSubmit={handleApply} className="p-12 space-y-10">
                <div className="space-y-4">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-[0.3em] ml-2 block">{language === 'fr' ? 'Nom complet' : 'الاسم الكامل'}</label>
                  <input 
                    required
                    type="text" 
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder={language === 'fr' ? "Ahmed Benali" : "أحمد بن علي"} 
                    className="w-full px-8 py-5 rounded-3xl border border-gray-100 outline-none focus:border-[#F68D58] transition-all bg-gray-50/50 text-lg font-medium"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-4">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-[0.3em] ml-2 block">{language === 'fr' ? 'Adresse e-mail' : 'البريد الإلكتروني'}</label>
                    <input 
                      required
                      type="email" 
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      placeholder="ahmed@exemple.dz" 
                      className="w-full px-8 py-5 rounded-3xl border border-gray-100 outline-none focus:border-[#F68D58] transition-all bg-gray-50/50 text-lg font-medium"
                    />
                  </div>
                  <div className="space-y-4">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-[0.3em] ml-2 block">{language === 'fr' ? 'Numéro de téléphone' : 'رقم الهاتف'}</label>
                    <input 
                      required
                      type="tel" 
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      placeholder="+213 5XX XX XX XX" 
                      className="w-full px-8 py-5 rounded-3xl border border-gray-100 outline-none focus:border-[#F68D58] transition-all bg-gray-50/50 text-lg font-medium"
                    />
                  </div>
                </div>
                <div className="space-y-4">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-[0.3em] ml-2 block">{language === 'fr' ? 'CV (PDF)' : 'السيرة الذاتية (PDF)'}</label>
                  <div className="border-2 border-dashed border-gray-100 rounded-[2.5rem] p-16 text-center hover:border-[#F68D58] hover:bg-orange-50/30 transition-all cursor-pointer relative group">
                    <input 
                      type="file" 
                      accept=".pdf"
                      onChange={(e) => setFormData({...formData, resume: e.target.files?.[0] || null})}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    <div className="flex flex-col items-center gap-6 text-gray-400 group-hover:text-[#F68D58] transition-colors">
                      <div className="w-20 h-20 bg-gray-50 rounded-3xl flex items-center justify-center group-hover:bg-white shadow-inner transition-all">
                        <Briefcase size={40} strokeWidth={1.5} />
                      </div>
                      <span className="font-black text-sm tracking-widest uppercase">{formData.resume ? formData.resume.name : (language === 'fr' ? 'Cliquez ou glissez pour télécharger votre CV' : 'انقر أو اسحب لتحميل سيرتك الذاتية')}</span>
                    </div>
                  </div>
                </div>
                <button 
                  type="submit"
                  className="w-full bg-[#173E7D] text-white py-7 rounded-3xl font-black text-xl hover:bg-[#F68D58] transition-all duration-500 shadow-2xl shadow-blue-900/20 uppercase tracking-[0.2em]"
                >
                  {language === 'fr' ? 'Envoyer la candidature' : 'إرسال الطلب'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Login Modal */}
      <AnimatePresence>
        {isLoginOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsLoginOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl relative z-10 overflow-hidden border border-white/20"
            >
              <div className="p-8 text-center">
                <button 
                  onClick={() => setIsLoginOpen(false)}
                  className="absolute top-6 right-6 text-gray-300 hover:text-gray-500 transition-all hover:rotate-90 duration-500"
                >
                  <X size={20} />
                </button>
                <div className="mb-6 flex justify-center">
                  <Logo size="md" onClick={() => setView('landing')} />
                </div>
                <h3 className="text-2xl font-display font-black text-[#173E7D] mb-2 tracking-tighter">
                  {language === 'fr' ? 'Bon retour' : 'مرحباً بعودتك'}
                </h3>
                <p className="text-sm text-gray-400 mb-6 font-light leading-relaxed">
                  {language === 'fr' ? 'Connectez-vous pour gérer vos candidatures.' : 'سجل دخولك لإدارة طلباتك.'}
                </p>
                
                <form onSubmit={handleEmailLogin} className="space-y-4 mb-5">
                  {loginError && (
                    <div className="p-2.5 bg-red-50 text-red-600 rounded-xl text-[10px] font-bold animate-shake">
                      {loginError}
                    </div>
                  )}
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-[0.3em] ml-2 block text-left">
                      {language === 'fr' ? 'Adresse Email' : 'البريد الإلكتروني'}
                    </label>
                    <input 
                      type="email" 
                      required
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      className="w-full px-5 py-2.5 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#173E7D] focus:bg-white transition-all text-sm font-medium"
                      placeholder={language === 'fr' ? 'votre@email.com' : 'votre@email.com'}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-[0.3em] ml-2 block text-left">
                      {language === 'fr' ? 'Mot de passe' : 'كلمة المرور'}
                    </label>
                    <input 
                      type="password" 
                      required
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="w-full px-5 py-2.5 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#173E7D] focus:bg-white transition-all text-sm font-medium"
                      placeholder="••••••••"
                    />
                  </div>
                  <button 
                    type="submit"
                    className="w-full bg-[#173E7D] text-white py-3 rounded-xl font-black text-base hover:bg-[#F68D58] transition-all duration-500 shadow-lg shadow-blue-900/10 uppercase tracking-[0.2em]"
                  >
                    {language === 'fr' ? 'Se connecter' : 'تسجيل الدخول'}
                  </button>
                </form>

                <div className="relative py-2 mb-5">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-100"></div>
                  </div>
                  <div className="relative flex justify-center text-[9px] uppercase tracking-widest font-black text-gray-300">
                    <span className="bg-white px-2">{language === 'fr' ? 'DÉMO' : 'تجريبي'}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-6">
                  <button 
                    onClick={handleDemoCandidate}
                    className="flex flex-col items-center justify-center gap-2 bg-white border border-gray-100 text-[#173E7D] p-4 rounded-2xl font-black hover:bg-gray-50 transition-all shadow-sm group"
                  >
                    <UserIcon size={20} className="group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] uppercase tracking-tighter">{language === 'fr' ? "Candidat" : "مترشح"}</span>
                  </button>
                  <button 
                    onClick={handleDemoEmployer}
                    className="flex flex-col items-center justify-center gap-2 bg-white border border-gray-100 text-[#173E7D] p-4 rounded-2xl font-black hover:bg-gray-50 transition-all shadow-sm group"
                  >
                    <Building2 size={20} className="group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] uppercase tracking-tighter">{language === 'fr' ? "Recruteur" : "صاحب عمل"}</span>
                  </button>
                </div>

                <div className="flex flex-col gap-2">
                  <button 
                    onClick={handleDemoCandidate}
                    className="text-gray-400 hover:text-[#173E7D] font-black text-[10px] uppercase tracking-widest transition-colors"
                  >
                    {language === 'fr' ? "S'inscrire" : "سجل الآن"}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AuthModal 
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        language={language}
        initialRole={modalInitialRole}
        initialStep={modalInitialStep}
      />
    </div>
  );
}
