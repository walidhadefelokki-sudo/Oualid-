import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Briefcase, Clock, CheckCircle2, ChevronRight, ChevronLeft, MessageCircle,
  Camera, X, Search, ArrowUpDown, Mail, CalendarClock, Star, XCircle,
  MapPin, Languages as LanguagesIcon, GraduationCap, Wallet, Sparkles,
  TrendingUp, TrendingDown, ShieldCheck, Activity, Lock,
} from 'lucide-react';

const NAVY = '#173E7D';
const ORANGE = '#F68D58';

type Candidate = {
  id?: string | number;
  candidateId?: string;
  name: string;
  role?: string;
  avatar?: string;
  status?: string;
  match?: number;
  exp?: string;
  location?: string;
  quizScore?: number;
  hasPresentation?: boolean;
  skills?: string[];
  aiSummary?: string;
  availability?: string;
  salaryExpectation?: string;
  languages?: string[];
  education?: string;
  lastActivity?: string;
  strengths?: string[];
  weaknesses?: string[];
  recommendation?: string;
  confidence?: number;
};

type JobGroup = {
  jobTitle: string;
  publishedAt?: string;
  candidates: Candidate[];
};

interface CandidatesSectionProps {
  candidatesByJob: JobGroup[];
  isRTL?: boolean;
  t: (key: string) => string;
  setSelectedCandidateCV: (c: Candidate) => void;
  selectedPresentationCandidate: Candidate | null;
  setSelectedPresentationCandidate: (c: Candidate | null) => void;
  OralPresentationViewer: React.ComponentType<{ candidateId: any }>;
  handleWhatsAppContact: (phone: string, name: string) => void;
  handleInterview?: (c: Candidate) => void;
  handleHire?: (c: Candidate) => void;
  handleReject?: (c: Candidate) => void;
  handleEmail?: (c: Candidate) => void;
  handleShortlist?: (c: Candidate) => void;
  handleViewQuiz?: (c: Candidate) => void;
  canViewOralPresentation: boolean;
  canViewPreselection: boolean;
  onRequestUpgrade: () => void;
}

const STATUS_STYLES: Record<string, string> = {
  Nouveau: 'bg-emerald-50 text-emerald-600 border-emerald-100',
  'En cours': 'bg-blue-50 text-blue-600 border-blue-100',
  Refusé: 'bg-red-50 text-red-600 border-red-100',
};
const statusStyle = (s?: string) => STATUS_STYLES[s ?? ''] ?? 'bg-gray-50 text-gray-600 border-gray-100';

function MatchRing({ value = 0, size = 64 }: { value?: number; size?: number }) {
  const stroke = 6;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value));
  const color = pct >= 80 ? '#10B981' : pct >= 55 ? ORANGE : '#EF4444';
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#F1F5F9" strokeWidth={stroke} fill="none" />
        <motion.circle
          cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none"
          strokeLinecap="round" strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c - (pct / 100) * c }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-sm font-black" style={{ color: NAVY }}>{pct}%</span>
      </div>
    </div>
  );
}

function InfoChip({ icon, label, value }: { icon: React.ReactNode; label: string; value?: string }) {
  return (
    <div className="bg-gray-50/80 p-3 rounded-2xl border border-gray-100 flex items-start gap-2 min-w-0">
      <div className="text-gray-400 mt-0.5 shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest">{label}</p>
        <p className="text-xs font-bold truncate" style={{ color: NAVY }}>{value || 'Non précisé'}</p>
      </div>
    </div>
  );
}

function JobCard({ group, onOpen, index }: { group: JobGroup; onOpen: () => void; index: number }) {
  const total = group.candidates.length;
  const newCount = group.candidates.filter((c) => c.status === 'Nouveau').length;
  const avgMatch = total ? Math.round(group.candidates.reduce((s, c) => s + (c.match ?? 0), 0) / total) : 0;
  const advanced = group.candidates.filter((c) => c.status && c.status !== 'Nouveau' && c.status !== 'Refusé').length;
  const progress = total ? Math.round((advanced / total) * 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.6, ease: 'easeOut' }}
      whileHover={{ y: -8 }}
      className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-[0_24px_60px_rgba(23,62,125,0.1)] transition-shadow duration-500 p-8 flex flex-col gap-6"
    >
      <div className="flex items-center justify-between">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner" style={{ background: '#FFF1E9', color: ORANGE }}>
          <Briefcase size={22} />
        </div>
        {newCount > 0 && (
          <span className="flex items-center gap-1.5 bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-100">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" /> {newCount} nouveaux
          </span>
        )}
      </div>

      <div>
        <h3 className="text-xl font-black tracking-tight leading-tight" style={{ color: NAVY }}>{group.jobTitle}</h3>
        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-2 flex items-center gap-1.5">
          <Clock size={12} style={{ color: ORANGE }} /> Publiée le {group.publishedAt || '—'}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gray-50/80 rounded-2xl p-4 border border-gray-100">
          <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest">Candidats</p>
          <p className="text-2xl font-black" style={{ color: NAVY }}>{total}</p>
        </div>
        <div className="bg-gray-50/80 rounded-2xl p-4 border border-gray-100">
          <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest">Match moyen IA</p>
          <p className="text-2xl font-black" style={{ color: NAVY }}>{avgMatch}%</p>
        </div>
      </div>

      <div>
        <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1.5">
          <span>Pipeline</span><span>{progress}%</span>
        </div>
        <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ background: `linear-gradient(90deg, ${NAVY}, ${ORANGE})` }}
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />
        </div>
      </div>

      <button
        onClick={onOpen}
        className="mt-2 w-full text-white py-4 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] hover:scale-[1.02] active:scale-95 transition-all duration-500 shadow-xl shadow-blue-900/10 flex items-center justify-center gap-2"
        style={{ background: NAVY }}
      >
        Voir les candidats <ChevronRight size={14} />
      </button>
    </motion.div>
  );
}

function CandidateCard({
  candidate, isRTL, setSelectedCandidateCV, setSelectedPresentationCandidate,
  handleWhatsAppContact, handleInterview, handleHire, handleReject, handleEmail,
  handleShortlist, handleViewQuiz, index,
  canViewOralPresentation, canViewPreselection, onRequestUpgrade,
}: {
  candidate: Candidate; isRTL?: boolean; index: number;
  setSelectedCandidateCV: (c: Candidate) => void;
  setSelectedPresentationCandidate: (c: Candidate | null) => void;
  handleWhatsAppContact: (phone: string, name: string) => void;
  handleInterview?: (c: Candidate) => void;
  handleHire?: (c: Candidate) => void;
  handleReject?: (c: Candidate) => void;
  handleEmail?: (c: Candidate) => void;
  handleShortlist?: (c: Candidate) => void;
  handleViewQuiz?: (c: Candidate) => void;
  canViewOralPresentation: boolean;
  canViewPreselection: boolean;
  onRequestUpgrade: () => void;
}) {
  const skills = candidate.skills ?? [];
  const languages = candidate.languages ?? [];
  const strengths = candidate.strengths ?? [];
  const weaknesses = candidate.weaknesses ?? [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index, 8) * 0.05, duration: 0.5 }}
      className={`bg-white rounded-[2.75rem] border border-gray-100 shadow-sm hover:shadow-[0_20px_50px_rgba(23,62,125,0.08)] transition-shadow duration-500 p-8 ${isRTL ? 'text-right' : ''}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center gap-5 pb-6 border-b border-gray-50">
        <div className="relative shrink-0">
          <div className="w-20 h-20 rounded-[1.75rem] overflow-hidden border-4 border-gray-50 shadow-lg">
            <img src={candidate.avatar} alt={candidate.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          </div>
          <div className="absolute -bottom-1.5 -right-1.5 w-7 h-7 bg-emerald-500 text-white rounded-full flex items-center justify-center border-2 border-white">
            <CheckCircle2 size={14} />
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-xl font-black tracking-tight" style={{ color: NAVY }}>{candidate.name}</h4>
            <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${statusStyle(candidate.status)}`}>
              {candidate.status || 'Statut inconnu'}
            </span>
          </div>
          <p className="text-gray-400 font-bold uppercase tracking-[0.15em] text-[10px] mt-1">{candidate.role}</p>
        </div>

        <MatchRing value={candidate.match ?? 0} />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 py-6">
        <InfoChip icon={<Activity size={13} />} label="Expérience" value={candidate.exp} />
        <InfoChip icon={<MapPin size={13} />} label="Localisation" value={candidate.location} />
        <InfoChip icon={<CalendarClock size={13} />} label="Disponibilité" value={candidate.availability} />
        <InfoChip icon={<Wallet size={13} />} label="Prétention salariale" value={candidate.salaryExpectation} />
        <InfoChip icon={<GraduationCap size={13} />} label="Formation" value={candidate.education} />
        <InfoChip icon={<LanguagesIcon size={13} />} label="Langues" value={languages.length ? languages.join(', ') : undefined} />
      </div>

      {skills.length > 0 && (
        <div className="flex flex-wrap gap-2 pb-6">
          {skills.map((s, i) => (
            <span key={i} className="px-3 py-1.5 rounded-full text-[10px] font-bold border" style={{ color: NAVY, borderColor: '#E2E8F0', background: '#F8FAFC' }}>
              {s}
            </span>
          ))}
        </div>
      )}

      <div className="rounded-[2rem] p-6 mb-6 border" style={{ background: 'linear-gradient(135deg, #F5F8FF 0%, #FFF7F2 100%)', borderColor: '#EEF2FF' }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles size={16} style={{ color: ORANGE }} />
            <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: NAVY }}>Analyse IA</span>
          </div>
          {typeof candidate.confidence === 'number' && (
            <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-gray-400">
              <ShieldCheck size={12} /> Confiance {candidate.confidence}%
            </span>
          )}
        </div>

        {candidate.aiSummary && (
          <p className="text-xs text-gray-600 leading-relaxed mb-4">{candidate.aiSummary}</p>
        )}

        <div className="grid sm:grid-cols-2 gap-4 mb-4">
          {strengths.length > 0 && (
            <div>
              <p className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-emerald-600 mb-2">
                <TrendingUp size={12} /> Points forts
              </p>
              <ul className="space-y-1">
                {strengths.map((s, i) => <li key={i} className="text-[11px] text-gray-600">• {s}</li>)}
              </ul>
            </div>
          )}
          {weaknesses.length > 0 && (
            <div>
              <p className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-red-500 mb-2">
                <TrendingDown size={12} /> Points de vigilance
              </p>
              <ul className="space-y-1">
                {weaknesses.map((s, i) => <li key={i} className="text-[11px] text-gray-600">• {s}</li>)}
              </ul>
            </div>
          )}
        </div>

        {candidate.recommendation && (
          <p className="text-[11px] font-bold rounded-xl px-4 py-3 bg-white/70" style={{ color: NAVY }}>
            Recommandation IA : {candidate.recommendation}
          </p>
        )}

        <div className="flex items-center gap-6 mt-4 pt-4 border-t border-white/60">
          {typeof candidate.quizScore === 'number' && (
            <div className="flex-1">
              <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">
                <span>Score Quiz</span><span>{candidate.quizScore}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-white overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${candidate.quizScore}%`, background: NAVY }} />
              </div>
            </div>
          )}
          <div className="flex items-center gap-1.5 text-[10px] font-bold" style={{ color: candidate.hasPresentation ? NAVY : '#CBD5E1' }}>
            <Camera size={14} /> {candidate.hasPresentation ? 'Présentation orale disponible' : 'Pas de présentation'}
          </div>
        </div>

        {candidate.lastActivity && (
          <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-3">
            Dernière activité : {candidate.lastActivity}
          </p>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedCandidateCV(candidate)}
          className="flex-1 min-w-[130px] text-white py-3.5 rounded-xl font-black text-[10px] uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-blue-900/10"
          style={{ background: NAVY }}
        >
          Voir le CV
        </button>

        {canViewOralPresentation ? (
          <button
            onClick={() => setSelectedPresentationCandidate(candidate)}
            className="col-span-1 bg-gradient-to-br from-purple-500 to-pink-500 text-white py-5 rounded-[1.5rem] font-black hover:scale-[1.02] active:scale-95 transition-all duration-500 shadow-xl shadow-purple-500/10 flex items-center justify-center"
            title="View Oral Presentation"
          >
            <Camera size={20} />
          </button>
        ) : (
          <button
            onClick={onRequestUpgrade}
            className="col-span-1 bg-gray-100 text-gray-400 py-5 rounded-[1.5rem] font-black flex items-center justify-center relative"
            title="Corporate requis"
          >
            <Camera size={20} />
            <Lock size={11} className="absolute -top-1 -right-1 bg-white rounded-full p-0.5 text-gray-400 shadow-sm" />
          </button>
        )}

        {canViewPreselection ? (
            <button
              onClick={() => handleViewQuiz?.(candidate)}
              className="flex-1 min-w-[130px] py-3.5 rounded-xl font-black text-[10px] uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all border"
              style={{ color: NAVY, borderColor: '#E2E8F0' }}
            >
          Résultats quiz
        </button>
          ) : (
            <button
              onClick={onRequestUpgrade}
              className="flex items-center gap-1.5 text-[10px] font-black text-gray-400 uppercase tracking-widest"
            >
              <Lock size={11} />
              Corporate requis
            </button>
          )}
        <button
          onClick={() => handleWhatsAppContact('+213555555555', candidate.name)}
          title="WhatsApp"
          className="w-12 h-12 rounded-xl bg-[#25D366] text-white flex items-center justify-center hover:scale-[1.05] active:scale-95 transition-all shadow-lg shadow-green-500/10"
        >
          <MessageCircle size={18} />
        </button>
        <button
          onClick={() => handleEmail?.(candidate)}
          title="Email"
          className="w-12 h-12 rounded-xl flex items-center justify-center hover:scale-[1.05] active:scale-95 transition-all border"
          style={{ color: NAVY, borderColor: '#E2E8F0' }}
        >
          <Mail size={18} />
        </button>
        <button
          onClick={() => handleInterview?.(candidate)}
          title="Planifier un entretien"
          className="w-12 h-12 rounded-xl flex items-center justify-center hover:scale-[1.05] active:scale-95 transition-all border"
          style={{ color: ORANGE, borderColor: '#FDE6D6' }}
        >
          <CalendarClock size={18} />
        </button>
        <button
          onClick={() => handleShortlist?.(candidate)}
          title="Présélectionner"
          className="w-12 h-12 rounded-xl flex items-center justify-center hover:scale-[1.05] active:scale-95 transition-all border border-amber-100 text-amber-500"
        >
          <Star size={18} />
        </button>
        <button
          onClick={() => handleHire?.(candidate)}
          title="Embaucher"
          className="w-12 h-12 rounded-xl flex items-center justify-center hover:scale-[1.05] active:scale-95 transition-all bg-emerald-500 text-white shadow-lg shadow-emerald-500/10"
        >
          <CheckCircle2 size={18} />
        </button>
        <button
          onClick={() => handleReject?.(candidate)}
          title="Refuser"
          className="w-12 h-12 rounded-xl flex items-center justify-center hover:scale-[1.05] active:scale-95 transition-all bg-red-50 text-red-500 border border-red-100"
        >
          <XCircle size={18} />
        </button>
      </div>
    </motion.div>
  );
}

export default function CandidatesSection({
  candidatesByJob, isRTL, t, setSelectedCandidateCV, selectedPresentationCandidate,
  setSelectedPresentationCandidate, OralPresentationViewer, handleWhatsAppContact,
  handleInterview, handleHire, handleReject, handleEmail, handleShortlist, handleViewQuiz,
  canViewOralPresentation, canViewPreselection, onRequestUpgrade,
}: CandidatesSectionProps) {
  const [selectedJob, setSelectedJob] = useState<JobGroup | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'match' | 'name' | 'exp'>('match');

  const totalNewToday = useMemo(
    () => candidatesByJob.reduce((sum, g) => sum + g.candidates.filter((c) => c.status === 'Nouveau').length, 0),
    [candidatesByJob]
  );

  const filteredCandidates = useMemo(() => {
    if (!selectedJob) return [];
    let list = [...selectedJob.candidates];
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((c) => c.name.toLowerCase().includes(q) || (c.role ?? '').toLowerCase().includes(q));
    }
    if (statusFilter !== 'all') list = list.filter((c) => c.status === statusFilter);
    list.sort((a, b) => {
      if (sortBy === 'match') return (b.match ?? 0) - (a.match ?? 0);
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      return (b.exp ?? '').localeCompare(a.exp ?? '');
    });
    return list;
  }, [selectedJob, search, statusFilter, sortBy]);

  return (
    <>
      <div className="space-y-10">
        <AnimatePresence mode="wait">
          {!selectedJob ? (
            <motion.div key="jobs" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-10">
              <div className={`flex flex-col md:flex-row md:items-end justify-between gap-6 ${isRTL ? 'text-right' : ''}`}>
                <div>
                  <h2 className="text-5xl font-display font-black tracking-tighter" style={{ color: NAVY }}>{t('candidates')}</h2>
                  <p className="text-gray-500 mt-2 text-lg font-medium">Gérez vos talents par offre d'emploi avec une analyse prédictive par IA.</p>
                </div>
                <div className="bg-white px-6 py-3 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-3">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                  <span className="text-xs font-black uppercase tracking-widest" style={{ color: NAVY }}>{totalNewToday} nouveaux aujourd'hui</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                {candidatesByJob.map((group, i) => (
                  <JobCard key={group.jobTitle + i} group={group} index={i} onOpen={() => setSelectedJob(group)} />
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div key="candidates" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-8">
              <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-6 sm:p-8 space-y-6">
                <div className="flex flex-wrap items-center gap-4 justify-between">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => setSelectedJob(null)}
                      className="w-11 h-11 rounded-2xl border border-gray-100 flex items-center justify-center hover:bg-gray-50 transition-colors"
                    >
                      <ChevronLeft size={18} className={isRTL ? 'rotate-180' : ''} style={{ color: NAVY }} />
                    </button>
                    <div>
                      <h3 className="text-2xl font-black tracking-tight" style={{ color: NAVY }}>{selectedJob.jobTitle}</h3>
                      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                        {selectedJob.candidates.length} candidat{selectedJob.candidates.length > 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1 relative">
                    <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Rechercher un candidat..."
                      className="w-full pl-11 pr-4 py-3 rounded-2xl border border-gray-100 bg-gray-50/60 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-4 py-3 rounded-2xl border border-gray-100 bg-gray-50/60 text-xs font-bold uppercase tracking-wide focus:outline-none"
                    style={{ color: NAVY }}
                  >
                    <option value="all">Tous les statuts</option>
                    <option value="Nouveau">Nouveau</option>
                    <option value="En cours">En cours</option>
                    <option value="Refusé">Refusé</option>
                  </select>
                  <button
                    onClick={() => setSortBy(sortBy === 'match' ? 'name' : sortBy === 'name' ? 'exp' : 'match')}
                    className="flex items-center gap-2 px-4 py-3 rounded-2xl border border-gray-100 bg-gray-50/60 text-xs font-bold uppercase tracking-wide whitespace-nowrap"
                    style={{ color: NAVY }}
                  >
                    <ArrowUpDown size={14} />
                    {sortBy === 'match' ? 'Match IA' : sortBy === 'name' ? 'Nom' : 'Expérience'}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {filteredCandidates.map((candidate, i) => (
                  <CandidateCard
                    key={candidate.id ?? candidate.name + i}
                    candidate={candidate}
                    index={i}
                    isRTL={isRTL}
                    setSelectedCandidateCV={setSelectedCandidateCV}
                    setSelectedPresentationCandidate={setSelectedPresentationCandidate}
                    handleWhatsAppContact={handleWhatsAppContact}
                    handleInterview={handleInterview}
                    handleHire={handleHire}
                    handleReject={handleReject}
                    handleEmail={handleEmail}
                    handleShortlist={handleShortlist}
                    handleViewQuiz={handleViewQuiz}
                    canViewOralPresentation={canViewOralPresentation}
                    canViewPreselection={canViewPreselection}
                    onRequestUpgrade={onRequestUpgrade}
                  />
                ))}
                {filteredCandidates.length === 0 && (
                  <div className="col-span-full text-center py-16 text-gray-400 font-medium">
                    Aucun candidat ne correspond à ces critères.
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {selectedPresentationCandidate && (
          <motion.div
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[2rem] w-full max-w-4xl p-8 relative"
            >
              <button onClick={() => setSelectedPresentationCandidate(null)} className="absolute right-6 top-6">
                <X size={24} />
              </button>
              <h2 className="text-3xl font-black mb-8" style={{ color: NAVY }}>Oral Presentation</h2>
              <OralPresentationViewer candidateId={selectedPresentationCandidate.candidateId ?? selectedPresentationCandidate.id} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
