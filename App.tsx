
import React, { useState } from 'react';
import Onboarding from './components/Onboarding';
import PeopleManager from './components/PeopleManager';
import Dashboard from './components/Dashboard';
import ExpenseForm from './components/ExpenseForm';
import LanguageModal from './components/LanguageModal';
import { LanguageProvider, useTranslation } from './i18n/LanguageContext';
import { ThemeProvider } from './components/ThemeContext';
import { TripProvider, useTrip } from './contexts/TripContext';

const AppContent: React.FC = () => {
  const { t } = useTranslation();
  const { trip, view, isLoading, isSaving, isLocalMode, supabase, actions } = useTrip();
  const [isLanguageModalOpen, setIsLanguageModalOpen] = useState(false);

  if (isLoading && !isSaving) {
    return (
      <div className="min-h-screen bg-app-main flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
        <p className="text-app-secondary font-medium animate-pulse">{t.common.loading}</p>
      </div>
    );
  }

  if (!supabase && !isLocalMode) {
    return (
      <div className="min-h-screen bg-app-main flex items-center justify-center p-6 text-center">
        <div className="max-w-md w-full space-y-8 animate-fade-in duration-700">
          <div className="w-20 h-20 bg-indigo-500/10 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-indigo-500/20 shadow-app">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
          </div>
          <h1 className="text-3xl font-black text-app-primary tracking-tight">Setup TripShare</h1>
          <p className="text-app-secondary leading-relaxed">Choose how you want to save your journeys.</p>
          <div className="space-y-4">
            <button onClick={() => actions.toggleMode('local')} className="w-full py-5 bg-indigo-600 text-white font-black rounded-2xl shadow-xl hover:bg-indigo-700 transition-all">Use Local Mode (No Account)</button>
            <div className="bg-app-card border border-app rounded-2xl p-5 text-left text-xs text-app-secondary shadow-app">
              <p className="font-bold text-app-primary mb-2 uppercase tracking-widest">Connect to Cloud (Supabase)</p>
              To enable real-time syncing, set your <code className="text-indigo-500 font-bold">VITE_SUPABASE_URL</code> in your environment variables and refresh.
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-app-main text-app-primary relative overflow-x-hidden">
      <LanguageModal isOpen={isLanguageModalOpen} onClose={() => setIsLanguageModalOpen(false)} />
      {isSaving && (
        <div className="fixed inset-0 z-[10000] bg-black/40 backdrop-blur-sm flex items-center justify-center">
           <div className="flex flex-col items-center gap-4">
              <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
              <span className="text-xs font-black uppercase tracking-[0.2em] text-indigo-500 animate-pulse">Updating...</span>
           </div>
        </div>
      )}
      <main className="max-w-xl mx-auto px-4 py-8 md:py-12 min-h-screen">
        {view === 'ONBOARDING' && <Onboarding onOpenLanguage={() => setIsLanguageModalOpen(true)} />}
        {trip && view === 'PEOPLE_SETUP' && (
          <div className="animate-slide-up">
            <PeopleManager isInitial={trip.people.length === 0} />
          </div>
        )}
        {trip && view === 'DASHBOARD' && (
          <div className="animate-zoom-in">
            <Dashboard onOpenLanguage={() => setIsLanguageModalOpen(true)} />
          </div>
        )}
        {trip && (view === 'ADD_EXPENSE' || view === 'EDIT_EXPENSE') && (
          <div className="animate-slide-up">
            <ExpenseForm />
          </div>
        )}
      </main>
      {isLocalMode && (
        <div className="fixed bottom-4 left-4 right-4 max-w-xl mx-auto pointer-events-none z-[50]">
          <div className="bg-amber-500/10 border border-amber-500/20 p-2 rounded-xl text-[9px] font-black uppercase tracking-widest text-amber-500/60 text-center backdrop-blur-sm pointer-events-auto shadow-app">
            Local Mode Active • Data stays on this device
          </div>
        </div>
      )}
    </div>
  );
};

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <TripProvider>
          <AppContent />
        </TripProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
};

export default App;
