import React from 'react';
import { motion } from 'motion/react';
import { Mail, Send } from 'lucide-react';

export default function ContactFormDesign() {
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
            <span>Contact Us</span>
          </motion.div>
          <h2 className="text-5xl md:text-6xl font-display font-bold text-[#173E7D] mb-6 tracking-tighter">
            Have questions? We are here to help.
          </h2>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="bg-white p-12 md:p-16 rounded-[4rem] shadow-[0_40px_80px_-15px_rgba(0,0,0,0.05)] border border-gray-100"
        >
          <div className="space-y-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="space-y-4">
                <label className="text-xs font-black text-gray-400 uppercase tracking-[0.3em] ml-2 block">
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="email@exemple.dz"
                  className="w-full px-8 py-5 rounded-3xl border border-gray-100 outline-none focus:border-[#F68D58] transition-all bg-gray-50/50 text-lg font-medium"
                />
              </div>
              <div className="space-y-4">
                <label className="text-xs font-black text-gray-400 uppercase tracking-[0.3em] ml-2 block">
                  Subject
                </label>
                <input
                  type="text"
                  placeholder="..."
                  className="w-full px-8 py-5 rounded-3xl border border-gray-100 outline-none focus:border-[#F68D58] transition-all bg-gray-50/50 text-lg font-medium"
                />
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-xs font-black text-gray-400 uppercase tracking-[0.3em] ml-2 block">
                Message
              </label>
              <textarea
                rows={6}
                className="w-full px-8 py-5 rounded-[2.5rem] border border-gray-100 outline-none focus:border-[#F68D58] transition-all bg-gray-50/50 text-lg font-medium resize-none"
              />
            </div>

            <button
              className="w-full py-7 rounded-3xl font-black text-xl flex items-center justify-center gap-4 transition-all duration-500 shadow-2xl uppercase tracking-[0.2em] bg-[#173E7D] text-white hover:bg-[#F68D58] shadow-blue-900/20"
            >
              Send Message
              <Send size={24} />
            </button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
