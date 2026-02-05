
import React, { useState, useMemo } from 'react';
import { useTranslation } from '../i18n/LanguageContext';
import { ALL_CURRENCIES } from '../utils/calculations';
import { useTrip } from '../contexts/TripContext';

interface Props {
  onOpenLanguage: () => void;
}

const Onboarding: React.FC<Props> = ({ onOpenLanguage }) => {
  const { history, actions } = useTrip();
  const { t, language } = useTranslation();
  const [name, setName] = useState('');
  const [baseCurrency, setBaseCurrency] = useState('SEK');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isCurrencySearchOpen, setIsCurrencySearchOpen] = useState(false);
  const [currencySearchQuery, setCurrencySearchQuery] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) actions.createTrip(name.trim(), baseCurrency);
  };

  const navigateToTrip = (id: string) => { window.location.hash = `#/trip/${id}`; };

  const currentFlag = language === 'en' ? '🇬🇧' : '🇸🇪';

  const filteredHistory = useMemo(() => {
    return history.filter(h => h.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [history, searchQuery]);

  const filteredCurrencies = ALL_CURRENCIES.filter(c => 
    c.code.toLowerCase().includes(currencySearchQuery.toLowerCase()) || 
    c.name.toLowerCase().includes(currencySearchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex justify-between items-center">
        <div className="space-y-0.5">
          <h1 className="text-4xl font-black tracking-tighter text-white">
            {t.common.appTitle}<span className="text-indigo-500">.</span>
          </h1>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">{t.common.tagline}</p>
        </div>
        <button 
          onClick={onOpenLanguage}
          className="w-10 h-10 flex items-center justify-center bg-slate-900 border border-slate-800 rounded-xl hover:border-slate-700 transition-all text-xl"
        >
          {currentFlag}
        </button>
      </div>

      {!showCreateForm ? (
        <button 
          onClick={() => setShowCreateForm(true)}
          className="w-full py-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-[2rem] font-black text-lg shadow-xl shadow-indigo-900/20 transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
          </svg>
          {t.onboarding.newJourney}
        </button>
      ) : (
        <div className="bg-slate-900/50 p-6 rounded-[2.5rem] border border-slate-800 animate-in zoom-in-95 duration-200 space-y-6">
          <div className="flex justify-between items-center px-1">
            <h2 className="text-sm font-black uppercase tracking-widest text-indigo-400">{t.onboarding.newJourney}</h2>
            <button onClick={() => setShowCreateForm(false)} className="text-slate-600 hover:text-slate-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="text"
              placeholder={t.onboarding.placeholder}
              className="w-full px-5 py-4 rounded-2xl border border-slate-800 bg-slate-950 text-white placeholder-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
            
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">{t.onboarding.baseCurrency}</label>
              <button 
                type="button"
                onClick={() => setIsCurrencySearchOpen(true)}
                className="w-full px-5 py-4 rounded-2xl border border-slate-800 bg-slate-950 text-white flex items-center justify-between font-bold shadow-inner"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{ALL_CURRENCIES.find(c => c.code === baseCurrency)?.flag}</span>
                  <span>{baseCurrency} - {ALL_CURRENCIES.find(c => c.code === baseCurrency)?.name}</span>
                </div>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-600" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>

            <button
              type="submit"
              disabled={!name.trim()}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-800 disabled:text-slate-600 text-white font-black py-4 rounded-2xl transition-all"
            >
              {t.onboarding.createBtn}
            </button>
          </form>
        </div>
      )}

      <div className="space-y-6">
        <div className="flex flex-col space-y-4">
          <div className="flex items-center justify-between px-1">
             <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">{t.onboarding.recentTrips}</h2>
          </div>
          
          <div className="relative">
            <input 
              type="text" 
              placeholder={t.expenseForm.searchCurrency.replace('currency', 'trip')}
              className="w-full px-5 py-3 rounded-2xl border border-slate-800 bg-slate-900/30 text-white placeholder-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none transition-all pl-12 text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 absolute left-5 top-1/2 -translate-y-1/2 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        <div className="space-y-4 max-h-[60vh] overflow-y-auto no-scrollbar pb-12">
          {filteredHistory.length > 0 ? (
            <div className="space-y-2">
              {filteredHistory.map(item => (
                <button
                  key={item.id}
                  onClick={() => navigateToTrip(item.id)}
                  className="w-full flex items-center justify-between p-5 bg-indigo-600/5 border border-indigo-500/20 rounded-[2rem] hover:bg-indigo-600/10 hover:border-indigo-500/40 transition-all group"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-600/10 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">📍</div>
                    <div className="text-left min-w-0">
                       <span className="block font-black text-slate-100 truncate">{item.name}</span>
                       <span className="block text-[9px] font-black uppercase tracking-widest text-indigo-500/60 mt-0.5">Visited Previously</span>
                    </div>
                  </div>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-500/40 group-hover:text-indigo-400 transition-colors shrink-0" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
              ))}
            </div>
          ) : (
            <div className="py-20 text-center space-y-4 bg-slate-950/50 border-2 border-dashed border-slate-900 rounded-[3rem]">
               <span className="text-4xl opacity-20 block">🔭</span>
               <div className="space-y-1 px-8">
                 <p className="text-slate-600 font-black text-sm uppercase tracking-widest">No journeys found</p>
                 <p className="text-slate-700 text-xs leading-relaxed">Create a brand new journey above or paste a link from a friend.</p>
               </div>
            </div>
          )}
        </div>
      </div>

      {isCurrencySearchOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-200">
           <div className="bg-slate-900 border border-slate-800 rounded-[2rem] w-full max-w-sm flex flex-col max-h-[80vh] animate-in zoom-in-95 shadow-2xl">
              <div className="p-6 border-b border-slate-800 space-y-4">
                 <div className="flex items-center justify-between">
                    <h3 className="text-xl font-black text-white">{t.onboarding.baseCurrency}</h3>
                    <button onClick={() => setIsCurrencySearchOpen(false)} className="p-2 text-slate-500 hover:text-white transition-colors rounded-xl bg-slate-800/50">
                       <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                    </button>
                 </div>
                 <input 
                    type="text" 
                    placeholder={t.expenseForm.searchCurrency}
                    className="w-full px-4 py-3 rounded-xl border border-slate-800 bg-slate-800 text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    value={currencySearchQuery}
                    onChange={(e) => setCurrencySearchQuery(e.target.value)}
                    autoFocus
                 />
              </div>
              <div className="flex-1 overflow-y-auto p-2 no-scrollbar">
                 {filteredCurrencies.map(c => (
                   <button 
                      key={c.code} 
                      onClick={() => { setBaseCurrency(c.code); setIsCurrencySearchOpen(false); setCurrencySearchQuery(''); }}
                      className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all ${baseCurrency === c.code ? 'bg-indigo-600 text-white' : 'hover:bg-slate-800 text-slate-400'}`}
                   >
                      <span className="text-2xl">{c.flag}</span>
                      <div className="flex flex-col items-start">
                         <span className="font-bold">{c.code}</span>
                         <span className="text-xs opacity-60">{c.name}</span>
                      </div>
                   </button>
                 ))}
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Onboarding;
