
import React, { useEffect, useRef } from 'react';
import { useTranslation, Language } from '../i18n/LanguageContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const LanguageModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { language, setLanguage, t } = useTranslation();
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
      };
      window.addEventListener('keydown', handleKeyDown);
      modalRef.current?.focus();
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const languages = [
    { code: 'en', name: t.common.english, flag: '🇬🇧' },
    { code: 'sv', name: t.common.swedish, flag: '🇸🇪' },
    { code: 'nl', name: t.common.dutch, flag: '🇳🇱' },
    { code: 'es', name: t.common.spanish, flag: '🇪🇸' },
    { code: 'fr', name: t.common.french, flag: '🇫🇷' },
    { code: 'de', name: t.common.german, flag: '🇩🇪' },
    { code: 'it', name: t.common.italian, flag: '🇮🇹' },
  ] as const;

  return (
    <div 
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-950/95 backdrop-blur-2xl animate-in fade-in duration-300"
      role="dialog"
      aria-modal="true"
      aria-labelledby="lang-modal-title"
      onClick={onClose}
    >
      <div 
        ref={modalRef}
        tabIndex={-1}
        className="bg-slate-900 border border-slate-800 rounded-[2.5rem] shadow-[0_0_80px_-10px_rgba(0,0,0,0.8)] w-full max-w-[340px] overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh] outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-7 border-b border-slate-800/50 flex items-center justify-between shrink-0">
          <h3 id="lang-modal-title" className="text-2xl font-black text-white tracking-tight">{t.common.language}</h3>
          <button 
            onClick={onClose} 
            className="p-2 text-slate-600 hover:text-white transition-colors rounded-xl bg-slate-800/50 focus-visible:ring-2 focus-visible:ring-indigo-500 outline-none"
            aria-label={t.common.cancel}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
        <div className="p-4 space-y-2 overflow-y-auto no-scrollbar" role="listbox">
          {languages.map((lang) => (
            <button
              key={lang.code}
              role="option"
              aria-selected={language === lang.code}
              onClick={() => {
                setLanguage(lang.code as Language);
                onClose();
              }}
              className={`w-full flex items-center gap-4 p-4 rounded-[1.5rem] transition-all focus-visible:ring-2 focus-visible:ring-indigo-500 outline-none ${
                language === lang.code
                  ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-900/60 ring-2 ring-indigo-400/30'
                  : 'text-slate-500 hover:bg-slate-800 hover:text-slate-200 border border-transparent'
              }`}
            >
              <span className="text-2xl filter drop-shadow-md shrink-0" aria-hidden="true">{lang.flag}</span>
              <span className="font-bold flex-1 text-left text-sm tracking-tight">{lang.name}</span>
              {language === lang.code && (
                <div className="bg-white/20 p-1 rounded-full shrink-0">
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </button>
          ))}
        </div>
        <div className="p-4 shrink-0 bg-slate-900/50 border-t border-slate-800/30">
           <p className="text-[10px] text-center font-black uppercase tracking-[0.2em] text-slate-600">Select your language</p>
        </div>
      </div>
    </div>
  );
};

export default LanguageModal;
