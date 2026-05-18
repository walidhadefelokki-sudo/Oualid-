import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, User, Building2, Mail, Lock, Eye, EyeOff, ArrowRight, ArrowLeft } from 'lucide-react';
import { supabase } from '../supabase';
import Logo from './Logo';

import { translations, Language } from '../translations';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  initialRole?: 'user' | 'employer';
  initialStep?: 'selection' | 'form';
}

export default function AuthModal({ isOpen, onClose, language, initialRole, initialStep }: AuthModalProps) {
  const [step, setStep] = useState<'selection' | 'form'>(initialStep || 'selection');
  const [role, setRole] = useState<'user' | 'employer'>(initialRole || 'user');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync state if props change (when modal is opened)
  React.useEffect(() => {
    if (isOpen) {
      if (initialRole) setRole(initialRole);
      if (initialStep) setStep(initialStep);
    }
  }, [isOpen, initialRole, initialStep]);

  const [formData, setFormData] = useState({
    name: '',
    companyName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const isRTL = language === 'ar';

  const t = {
    en: {
      title: "Join Dar L'emploi",
      subtitle: "Choose your profile to start",
      candidate: "Find a job",
      candidateDesc: "Find the best opportunities and manage your applications.",
      employer: "Find talent",
      employerDesc: "Post offers and find the best talent in Algeria.",
      fullName: "Full Name",
      companyName: "Company Name",
      email: "Email Address",
      password: "Password",
      confirmPassword: "Confirm Password",
      signup: "Sign up",
      google: "Continue with Google",
      back: "Back",
      passwordsDontMatch: "Passwords do not match.",
      invalidEmail: "Please enter a valid email address.",
      error: "An error occurred during registration."
    },
    fr: {
      title: "Rejoignez Dar L'emploi",
      subtitle: "Choisissez votre profil pour commencer",
      candidate: "Trouvez un emploi",
      candidateDesc: "Trouvez les meilleures opportunités et gérez vos candidatures.",
      employer: "Trouvez des talents",
      employerDesc: "Publiez des offres et trouvez les meilleurs talents en Algérie.",
      fullName: "Nom complet",
      companyName: "Nom de l'entreprise",
      email: "Adresse mail",
      password: "Mot de passe",
      confirmPassword: "Confirmation du mot de passe",
      signup: "S'inscrire",
      google: "Continuer avec Google",
      back: "Retour",
      passwordsDontMatch: "Les mots de passe ne correspondent pas.",
      invalidEmail: "Veuillez entrer une adresse email valide.",
      error: "Une erreur est survenue lors de l'inscription."
    },
    ar: {
      title: "انضم إلى دار التشغيل",
      subtitle: "اختر ملفك الشخصي للبدء",
      candidate: "ابحث عن وظيفة",
      candidateDesc: "ابحث عن أفضل الفرص وقم بإدارة طلباتك.",
      employer: "ابحث عن مواهب",
      employerDesc: "انشر العروض وابحث عن أفضل المواهب في الجزائر.",
      fullName: "الاسم الكامل",
      companyName: "اسم الشركة",
      email: "البريد الإلكتروني",
      password: "كلمة المرور",
      confirmPassword: "تأكيد كلمة المرور",
      signup: "إنشاء حساب",
      google: "المتابعة باستخدام جوجل",
      back: "رجوع",
      passwordsDontMatch: "كلمات المرور غير متطابقة.",
      invalidEmail: "يرجى إدخال عنوان بريد إلكتروني صحيح.",
      error: "حدث خطأ أثناء التسجيل."
    }
  }[language];

  const handleGoogleLogin = async () => {
    try {
      // Save intended role to localStorage to persist across redirect
      localStorage.setItem('intended_role', role);
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        }
      });
      if (error) throw error;
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Email validation regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError(t.invalidEmail);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError(t.passwordsDontMatch);
      return;
    }

    setLoading(true);

    try {
      const { data, error: signupError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: role === 'user' ? formData.name : null,
            company_name: role === 'employer' ? formData.companyName : null,
            role: role
          }
        }
      });

      if (signupError) {
        // Handle specific rate limit error (429)
        if (signupError.status === 429 || signupError.message?.toLowerCase().includes('rate limit')) {
          const rateLimitMsg = {
            en: "Rate limit exceeded. Please try again in 1 hour or check your Inbox/Spam for an existing confirmation email.",
            fr: "Limite de tentatives atteinte. Réessayez dans 1 heure ou vérifiez vos Emails/Spams pour un mail de confirmation.",
            ar: "تم تجاوز حد المحاولات. يرجى المحاولة بعد ساعة أو التحقق من بريدك الإلكتروني (بما في ذلك الرسائل المزعجة)."
          }[language];
          setError(rateLimitMsg);
          return;
        }
        throw signupError;
      }

      if (data.user) {
        // Profile creation is handled by the useEffect in App.tsx or a trigger
        const successMsg = {
          en: "Registration successful! Please check your email.",
          fr: "Inscription réussie ! Veuillez vérifier votre email.",
          ar: "تم التسجيل بنجاح! يرجى التحقق من بريدك الإلكتروني."
        }[language];
        alert(successMsg);
        onClose();
      }
    } catch (err: any) {
      setError(err.message || t.error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
          />
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl relative z-10 overflow-hidden flex flex-col md:flex-row"
          >
            <button 
              onClick={onClose}
              className="absolute top-6 right-6 z-20 text-gray-400 hover:text-gray-600 transition-all hover:rotate-90 duration-500"
            >
              <X size={24} />
            </button>

            <div className="absolute top-6 left-8 z-20">
              <Logo size="sm" onClick={onClose} />
            </div>

            {step === 'selection' ? (
              <div className={`flex flex-col md:flex-row w-full h-[400px] ${isRTL ? 'md:flex-row-reverse' : ''}`}>
                {/* Employer Side */}
                <div 
                  onClick={() => { setRole('employer'); setStep('form'); }}
                  className="flex-1 relative group cursor-pointer overflow-hidden border-b md:border-b-0 md:border-r border-white/10"
                >
                  <img 
                    src="https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&q=80&w=800" 
                    alt="Recruiter" 
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-[#173E7D]/80 group-hover:bg-[#173E7D]/70 transition-colors duration-500" />
                  <div className="relative z-10 h-full p-10 flex flex-col items-center justify-center text-center">
                    <div className="w-14 h-14 bg-white/10 backdrop-blur-xl text-white rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform border border-white/20">
                      <Building2 size={28} strokeWidth={1.5} />
                    </div>
                    <h3 className="text-xl font-display font-black text-white mb-2 tracking-tight uppercase">{t.employer}</h3>
                    <p className="text-white/60 text-xs font-medium leading-relaxed max-w-[220px]">{t.employerDesc}</p>
                    <div className="mt-6 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white group-hover:bg-[#F68D58] group-hover:scale-110 transition-all border border-white/20">
                      {isRTL ? <ArrowLeft size={20} /> : <ArrowRight size={20} />}
                    </div>
                  </div>
                </div>

                {/* Candidate Side */}
                <div 
                  onClick={() => { setRole('user'); setStep('form'); }}
                  className="flex-1 relative group cursor-pointer overflow-hidden"
                >
                  <img 
                    src="https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&q=80&w=800" 
                    alt="Job Search" 
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-[#173E7D]/80 group-hover:bg-[#173E7D]/70 transition-colors duration-500" />
                  <div className="relative z-10 h-full p-10 flex flex-col items-center justify-center text-center">
                    <div className="w-14 h-14 bg-white/10 backdrop-blur-xl text-white rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform border border-white/20">
                      <User size={28} strokeWidth={1.5} />
                    </div>
                    <h3 className="text-xl font-display font-black text-white mb-2 tracking-tight uppercase">{t.candidate}</h3>
                    <p className="text-white/60 text-xs font-medium leading-relaxed max-w-[220px]">{t.candidateDesc}</p>
                    <div className="mt-6 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white group-hover:bg-[#F68D58] group-hover:scale-110 transition-all border border-white/20">
                      {isRTL ? <ArrowLeft size={20} /> : <ArrowRight size={20} />}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="w-full flex flex-col md:flex-row">
                {/* Form Side */}
                <div className="flex-1 p-6 md:p-8">
                  <button 
                    onClick={() => setStep('selection')}
                    className={`flex items-center gap-2 text-gray-400 hover:text-[#173E7D] font-bold mb-6 transition-all ${isRTL ? 'flex-row-reverse' : ''}`}
                  >
                    {isRTL ? <ArrowRight size={16} /> : <ArrowLeft size={16} />}
                    {t.back}
                  </button>

                  <div className={`mb-6 ${isRTL ? 'text-right' : ''}`}>
                    <h3 className="text-2xl font-display font-black text-[#173E7D] mb-1 tracking-tight uppercase">
                      {role === 'user' ? t.candidate : t.employer}
                    </h3>
                    <p className="text-gray-400 text-sm font-medium">
                      {role === 'user' ? t.candidateDesc : t.employerDesc}
                    </p>
                  </div>

                  <form onSubmit={handleSignup} className="space-y-4">
                    {error && (
                      <div className="p-3 bg-red-50 text-red-500 rounded-xl text-xs font-bold border border-red-100">
                        {error}
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <label className={`block text-[10px] font-black text-gray-400 uppercase tracking-widest ${isRTL ? 'text-right' : ''}`}>
                        {role === 'user' ? t.fullName : t.companyName}
                      </label>
                      <div className="relative">
                        <div className={`absolute inset-y-0 ${isRTL ? 'right-4' : 'left-4'} flex items-center text-gray-400`}>
                          {role === 'user' ? <User size={18} /> : <Building2 size={18} />}
                        </div>
                        <input 
                          type="text"
                          required
                          value={role === 'user' ? formData.name : formData.companyName}
                          onChange={(e) => setFormData({ ...formData, [role === 'user' ? 'name' : 'companyName']: e.target.value })}
                          className={`w-full ${isRTL ? 'pr-12 pl-5' : 'pl-12 pr-5'} py-2.5 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:border-[#173E7D] focus:bg-white transition-all font-medium text-sm ${isRTL ? 'text-right' : ''}`}
                          placeholder={role === 'user' ? "Ahmed Benali" : "TechDz Solutions"}
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className={`block text-[10px] font-black text-gray-400 uppercase tracking-widest ${isRTL ? 'text-right' : ''}`}>
                        {t.email}
                      </label>
                      <div className="relative">
                        <div className={`absolute inset-y-0 ${isRTL ? 'right-4' : 'left-4'} flex items-center text-gray-400`}>
                          <Mail size={18} />
                        </div>
                        <input 
                          type="email"
                          required
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className={`w-full ${isRTL ? 'pr-12 pl-5' : 'pl-12 pr-5'} py-2.5 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:border-[#173E7D] focus:bg-white transition-all font-medium text-sm ${isRTL ? 'text-right' : ''}`}
                          placeholder="votre@email.com"
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <label className={`block text-[10px] font-black text-gray-400 uppercase tracking-widest ${isRTL ? 'text-right' : ''}`}>
                          {t.password}
                        </label>
                        <div className="relative">
                          <div className={`absolute inset-y-0 ${isRTL ? 'right-4' : 'left-4'} flex items-center text-gray-400`}>
                            <Lock size={18} />
                          </div>
                          <input 
                            type={showPassword ? "text" : "password"}
                            required
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            className={`w-full ${isRTL ? 'pr-12 pl-10' : 'pl-12 pr-10'} py-2.5 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:border-[#173E7D] focus:bg-white transition-all font-medium text-sm ${isRTL ? 'text-right' : ''}`}
                          />
                          <button 
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className={`absolute inset-y-0 ${isRTL ? 'left-3' : 'right-3'} flex items-center text-gray-400 hover:text-gray-600`}
                          >
                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className={`block text-[10px] font-black text-gray-400 uppercase tracking-widest ${isRTL ? 'text-right' : ''}`}>
                          {t.confirmPassword}
                        </label>
                        <div className="relative">
                          <div className={`absolute inset-y-0 ${isRTL ? 'right-4' : 'left-4'} flex items-center text-gray-400`}>
                            <Lock size={18} />
                          </div>
                          <input 
                            type={showPassword ? "text" : "password"}
                            required
                            value={formData.confirmPassword}
                            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                            className={`w-full ${isRTL ? 'pr-12 pl-5' : 'pl-12 pr-5'} py-2.5 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:border-[#173E7D] focus:bg-white transition-all font-medium text-sm ${isRTL ? 'text-right' : ''}`}
                          />
                        </div>
                      </div>
                    </div>

                    <button 
                      type="submit"
                      disabled={loading}
                      className="w-full py-3 bg-[#173E7D] text-white rounded-xl font-black text-base hover:bg-[#0A1118] transition-all shadow-xl shadow-blue-900/10 disabled:opacity-70 disabled:cursor-not-allowed mt-2"
                    >
                      {loading ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
                      ) : t.signup}
                    </button>

                    <div className="relative py-2">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-100"></div>
                      </div>
                      <div className="relative flex justify-center text-[10px] uppercase tracking-widest font-black text-gray-300">
                        <span className="bg-white px-3">Ou</span>
                      </div>
                    </div>

                    <button 
                      type="button"
                      onClick={handleGoogleLogin}
                      className="w-full flex items-center justify-center gap-3 bg-white border border-gray-100 text-[#173E7D] py-2.5 rounded-xl font-bold text-sm hover:bg-gray-50 transition-all shadow-sm group"
                    >
                      <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5 group-hover:scale-110 transition-transform" />
                      {t.google}
                    </button>
                  </form>
                </div>

                {/* Visual Side */}
                <div className={`hidden lg:flex flex-1 bg-[#173E7D] relative overflow-hidden items-center justify-center p-8 ${isRTL ? 'order-first' : ''}`}>
                  <div className="absolute top-0 left-0 w-full h-full opacity-10">
                    <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-white rounded-full blur-[100px]"></div>
                    <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#F68D58] rounded-full blur-[100px]"></div>
                  </div>
                  
                  <div className="relative z-10 text-center">
                    <div className="w-20 h-20 bg-white/10 backdrop-blur-xl rounded-[2rem] flex items-center justify-center mx-auto mb-6 border border-white/20">
                      {role === 'user' ? (
                        <User size={40} className="text-white" strokeWidth={1} />
                      ) : (
                        <Building2 size={40} className="text-white" strokeWidth={1} />
                      )}
                    </div>
                    <h4 className="text-2xl font-display font-black text-white mb-4 leading-tight tracking-tight uppercase">
                      {role === 'user' ? (
                        language === 'en' ? "Boost your career" : language === 'fr' ? "Propulsez votre carrière" : "ادفع مسيرتك المهنية"
                      ) : (
                        language === 'en' ? "Find your future talent" : language === 'fr' ? "Trouvez vos futurs talents" : "جد مواهبك المستقبلية"
                      )}
                    </h4>
                    <p className="text-white/60 text-base font-medium leading-relaxed max-w-sm mx-auto">
                      {role === 'user' ? (
                        language === 'en' ? "Access thousands of exclusive offers in Algeria." : language === 'fr' ? "Accédez à des milliers d'offres exclusives en Algérie." : "الوصول إلى آلاف العروض الحصرية في الجزائر."
                      ) : (
                        language === 'en' ? "Use our AI to filter the best candidates." : language === 'fr' ? "Utilisez notre IA pour filtrer les meilleurs candidats." : "استخدم ذكاءنا الاصطناعي لتصفية أفضل المترشحين."
                      )}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
