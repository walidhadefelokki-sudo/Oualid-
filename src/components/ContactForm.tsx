import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Mail, Send, AlertCircle, CheckCircle2 } from 'lucide-react';
import { translations, Language } from '../translations';

interface ContactFormProps {
  language: Language;
}

export default function ContactForm({ language }: ContactFormProps) {
  const [formData, setFormData] = useState({
    email: '',
    subject: '',
    message: '',
  });
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error('Failed to send message');

      setStatus('success');
      setFormData({ email: '', subject: '', message: '' });
    } catch (error) {
      console.error('Contact form error:', error);
      setStatus('error');
    }
  };

  const t = translations[language].contact;

  return (
    <section id="contact" className="py-40 px-6 bg-gray-50/50 relative overflow-hidden">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#173E7D]/5 text-[#173E7D] rounded-full text-xs font-black uppercase tracking-[0.3em] mb-8"
          >
            <Mail size={16} />
            <span>{t.title}</span>
          </motion.div>
          <h2 className="text-5xl md:text-6xl font-display font-bold text-[#173E7D] mb-6 tracking-tighter">
            {t.subtitle}
          </h2>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="bg-white p-12 md:p-16 rounded-[4rem] shadow-[0_40px_80px_-15px_rgba(0,0,0,0.05)] border border-gray-100"
        >
          <form onSubmit={handleSubmit} className="space-y-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="space-y-4">
                <label className="text-xs font-black text-gray-400 uppercase tracking-[0.3em] ml-2 block">
                  {t.email}
                </label>
                <input
                  required
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="email@exemple.dz"
                  className="w-full px-8 py-5 rounded-3xl border border-gray-100 outline-none focus:border-[#F68D58] transition-all bg-gray-50/50 text-lg font-medium"
                />
              </div>
              <div className="space-y-4">
                <label className="text-xs font-black text-gray-400 uppercase tracking-[0.3em] ml-2 block">
                  {t.subject}
                </label>
                <input
                  required
                  type="text"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  placeholder="..."
                  className="w-full px-8 py-5 rounded-3xl border border-gray-100 outline-none focus:border-[#F68D58] transition-all bg-gray-50/50 text-lg font-medium"
                />
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-xs font-black text-gray-400 uppercase tracking-[0.3em] ml-2 block">
                {t.message}
              </label>
              <textarea
                required
                rows={6}
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                className="w-full px-8 py-5 rounded-[2.5rem] border border-gray-100 outline-none focus:border-[#F68D58] transition-all bg-gray-50/50 text-lg font-medium resize-none"
              />
            </div>

            <button
              disabled={status === 'loading'}
              className={`w-full py-7 rounded-3xl font-black text-xl flex items-center justify-center gap-4 transition-all duration-500 shadow-2xl uppercase tracking-[0.2em] ${
                status === 'loading'
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-[#173E7D] text-white hover:bg-[#F68D58] shadow-blue-900/20'
              }`}
            >
              {status === 'loading' ? (
                <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  {t.send}
                  <Send size={24} />
                </>
              )}
            </button>

            {status === 'success' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3 text-emerald-600 justify-center font-bold"
              >
                <CheckCircle2 size={24} />
                <span>{t.success}</span>
              </motion.div>
            )}

            {status === 'error' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3 text-red-500 justify-center font-bold"
              >
                <AlertCircle size={24} />
                <span>{t.error}</span>
              </motion.div>
            )}
          </form>
        </motion.div>
      </div>
    </section>
  );
}
