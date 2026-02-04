
import React, { useState, useEffect, useRef } from 'react';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Trip, AppView, Person, Expense, TripHistoryItem } from './types';
import Onboarding from './components/Onboarding';
import PeopleManager from './components/PeopleManager';
import Dashboard from './components/Dashboard';
import ExpenseForm from './components/ExpenseForm';
import LanguageModal from './components/LanguageModal';
import { LanguageProvider, useTranslation } from './i18n/LanguageContext';

const getEnv = (key: string): string => {
  try {
    if (typeof process !== 'undefined' && process.env && process.env[key]) return process.env[key] as string;
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) return import.meta.env[key] as string;
  } catch (e) {}
  return '';
};

const SUPABASE_URL = getEnv('VITE_SUPABASE_URL');
const SUPABASE_ANON_KEY = getEnv('VITE_SUPABASE_ANON_KEY');

const supabase: SupabaseClient | null = (SUPABASE_URL && SUPABASE_ANON_KEY) 
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) 
  : null;

const AppContent: React.FC = () => {
  const { t } = useTranslation();
  const [view, setView] = useState<AppView>('ONBOARDING');
  const [trip, setTrip] = useState<Trip | null>(null);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSavingPeople, setIsSavingPeople] = useState(false);
  const [isLoadingTrips, setIsLoadingTrips] = useState(false);
  const [history, setHistory] = useState<TripHistoryItem[]>([]);
  const [allTrips, setAllTrips] = useState<TripHistoryItem[]>([]);
  const [isLanguageModalOpen, setIsLanguageModalOpen] = useState(false);
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [pendingExpenseData, setPendingExpenseData] = useState<Omit<Expense, 'id' | 'date'> | null>(null);
  const [isLocalMode, setIsLocalMode] = useState(!supabase);
  
  const isInternalUpdate = useRef(false);

  const triggerHaptic = (type: 'light' | 'medium' | 'heavy' = 'light') => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      const durations = { light: 10, medium: 30, heavy: 60 };
      navigator.vibrate(durations[type]);
    }
  };

  useEffect(() => {
    const savedHistory = localStorage.getItem('tripshare_history');
    if (savedHistory) setHistory(JSON.parse(savedHistory));
    
    // Check if we previously chose local mode
    const storedMode = localStorage.getItem('tripshare_mode');
    if (storedMode === 'local') setIsLocalMode(true);
  }, []);

  useEffect(() => {
    if (view === 'ONBOARDING') fetchAllTrips();
  }, [view, isLocalMode]);

  useEffect(() => {
    const handleHashChange = async () => {
      const hash = window.location.hash;
      if (hash.startsWith('#/trip/')) {
        const tripId = hash.replace('#/trip/', '');
        if (!trip || trip.id !== tripId) await fetchTrip(tripId);
      } else if (!hash) {
        setTrip(null);
        setView('ONBOARDING');
      }
    };
    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [trip?.id, isLocalMode]);

  useEffect(() => {
    if (!trip?.id || !supabase || isLocalMode) return;
    const channel = supabase.channel(`trip-updates-${trip.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'people', filter: `trip_id=eq.${trip.id}` }, () => {
        if (!isInternalUpdate.current) fetchTrip(trip.id);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses', filter: `trip_id=eq.${trip.id}` }, () => {
        if (!isInternalUpdate.current) fetchTrip(trip.id);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [trip?.id, isLocalMode]);

  const updateHistory = (id: string, name: string) => {
    setHistory(prev => {
      const filtered = prev.filter(item => item.id !== id);
      const updated = [{ id, name, lastVisited: Date.now() }, ...filtered].slice(0, 10);
      localStorage.setItem('tripshare_history', JSON.stringify(updated));
      return updated;
    });
  };

  const fetchAllTrips = async () => {
    if (isLocalMode) {
      const localTrips = JSON.parse(localStorage.getItem('tripshare_local_index') || '[]');
      setAllTrips(localTrips);
      return;
    }
    if (!supabase) return;
    setIsLoadingTrips(true);
    try {
      const { data } = await supabase.from('trips').select('id, name').limit(100);
      setAllTrips((data || []).map(item => ({ id: item.id, name: item.name, lastVisited: 0 })));
    } finally {
      setIsLoadingTrips(false);
    }
  };

  const fetchTrip = async (id: string) => {
    setIsLoading(true);
    try {
      if (isLocalMode) {
        const localData = localStorage.getItem(`tripshare_trip_${id}`);
        if (!localData) throw new Error("Trip not found");
        const parsed = JSON.parse(localData);
        setTrip(parsed);
        updateHistory(parsed.id, parsed.name);
        if (parsed.people.length < 2) setView('PEOPLE_SETUP');
        else if (view === 'ONBOARDING' || view === 'PEOPLE_SETUP') setView('DASHBOARD');
        return;
      }

      if (!supabase) return;
      const { data: tripData, error: tripError } = await supabase.from('trips').select('*').eq('id', id).single();
      if (tripError || !tripData) throw tripError;
      const { data: peopleData } = await supabase.from('people').select('*').eq('trip_id', id);
      const { data: expensesData } = await supabase.from('expenses').select('*').eq('trip_id', id).order('date', { ascending: false });

      setTrip({
        id: tripData.id,
        name: tripData.name,
        baseCurrency: tripData.base_currency || 'SEK',
        people: (peopleData || []).map(p => ({ id: p.id, name: p.name, mergedWithId: p.merged_with_id || undefined })),
        expenses: (expensesData || []).map(e => ({
          id: e.id, description: e.description, category: e.category || 'Other',
          amount: parseFloat(e.amount), currency: e.currency || 'SEK',
          exchangeRate: parseFloat(e.exchange_rate) || 1.0,
          paidById: e.paid_by_id, splitAmongIds: e.split_among_ids, date: e.date
        }))
      });
      updateHistory(tripData.id, tripData.name);
      if (!peopleData || peopleData.length < 2) setView('PEOPLE_SETUP');
      else if (view === 'ONBOARDING' || view === 'PEOPLE_SETUP') setView('DASHBOARD');
    } catch (e) {
      window.location.hash = '';
      setView('ONBOARDING');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTrip = async (name: string, baseCurrency: string) => {
    triggerHaptic('medium');
    setIsLoading(true);
    try {
      if (isLocalMode) {
        const newTrip: Trip = { id: crypto.randomUUID(), name, baseCurrency, people: [], expenses: [] };
        localStorage.setItem(`tripshare_trip_${newTrip.id}`, JSON.stringify(newTrip));
        const index = JSON.parse(localStorage.getItem('tripshare_local_index') || '[]');
        localStorage.setItem('tripshare_local_index', JSON.stringify([{ id: newTrip.id, name: newTrip.name }, ...index]));
        updateHistory(newTrip.id, name);
        window.location.hash = `#/trip/${newTrip.id}`;
        return;
      }

      if (!supabase) return;
      const { data, error } = await supabase.from('trips').insert({ name, base_currency: baseCurrency }).select().single();
      if (error) throw error;
      updateHistory(data.id, name);
      window.location.hash = `#/trip/${data.id}`;
    } catch (e) {
      setIsLoading(false);
    }
  };

  const handleUpdatePeople = async (updatedPeople: Person[]) => {
    if (!trip) return;
    triggerHaptic('medium');
    setIsSavingPeople(true);
    
    try {
      if (isLocalMode) {
        const updatedTrip = { ...trip, people: updatedPeople };
        localStorage.setItem(`tripshare_trip_${trip.id}`, JSON.stringify(updatedTrip));
        setTrip(updatedTrip);
        setView('DASHBOARD');
        return;
      }

      if (!supabase) return;
      isInternalUpdate.current = true;
      const updatedIds = updatedPeople.map(p => p.id);
      const toRemove = trip.people.filter(p => !updatedIds.includes(p.id)).map(p => p.id);

      if (toRemove.length > 0) {
        await supabase.from('people').update({ merged_with_id: null }).in('merged_with_id', toRemove);
        await supabase.from('people').delete().in('id', toRemove);
      }

      const upserts = updatedPeople.map(p => ({
        id: p.id, name: p.name, trip_id: trip.id, merged_with_id: p.mergedWithId || null
      }));
      await supabase.from('people').upsert(upserts, { onConflict: 'id' });
      await fetchTrip(trip.id);
      setView('DASHBOARD');
    } catch (e) {
      alert("Failed to update people.");
    } finally {
      setIsSavingPeople(false);
      setTimeout(() => { isInternalUpdate.current = false; }, 200);
    }
  };

  const handleSaveExpense = async (expenseData: Omit<Expense, 'id' | 'date'>, force: boolean = false) => {
    if (!trip) return;
    
    if (isLocalMode) {
      const updatedExpenses = [...trip.expenses];
      if (editingExpense) {
        const idx = updatedExpenses.findIndex(e => e.id === editingExpense.id);
        if (idx !== -1) updatedExpenses[idx] = { ...expenseData, id: editingExpense.id, date: editingExpense.date };
      } else {
        updatedExpenses.unshift({ ...expenseData, id: crypto.randomUUID(), date: Date.now() });
      }
      const updatedTrip = { ...trip, expenses: updatedExpenses };
      localStorage.setItem(`tripshare_trip_${trip.id}`, JSON.stringify(updatedTrip));
      setTrip(updatedTrip);
      setEditingExpense(null);
      setView('DASHBOARD');
      return;
    }

    if (!supabase) return;
    isInternalUpdate.current = true;
    const dbPayload = { ...expenseData, amount: expenseData.amount, exchange_rate: expenseData.exchangeRate, paid_by_id: expenseData.paidById, split_among_ids: expenseData.splitAmongIds, trip_id: trip.id };
    try {
      if (editingExpense) await supabase.from('expenses').update(dbPayload).eq('id', editingExpense.id);
      else await supabase.from('expenses').insert({ ...dbPayload, date: Date.now() });
      setEditingExpense(null);
      await fetchTrip(trip.id);
      setView('DASHBOARD');
    } catch (e) { alert("Failed to save expense."); }
    finally { setTimeout(() => { isInternalUpdate.current = false; }, 200); }
  };

  if (isLoading && !isSavingPeople) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
        <p className="text-slate-500 font-medium animate-pulse">{t.common.loading}</p>
      </div>
    );
  }

  // If no Supabase and not in local mode, show choice screen
  if (!supabase && !isLocalMode) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-center">
        <div className="max-w-md w-full space-y-8 animate-in fade-in zoom-in-95 duration-700">
          <div className="w-20 h-20 bg-indigo-500/10 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-indigo-500/20">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">Setup TripShare</h1>
          <p className="text-slate-400 leading-relaxed">Choose how you want to save your journeys.</p>
          <div className="space-y-4">
            <button onClick={() => { setIsLocalMode(true); localStorage.setItem('tripshare_mode', 'local'); }} className="w-full py-5 bg-slate-100 text-slate-950 font-black rounded-2xl shadow-xl hover:bg-white transition-all active:scale-95">Use Local Mode (No Account)</button>
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 text-left text-xs text-slate-500">
              <p className="font-bold text-slate-400 mb-2 uppercase tracking-widest">Connect to Cloud (Supabase)</p>
              To enable real-time syncing, set your <code className="text-indigo-400">VITE_SUPABASE_URL</code> in your environment variables and refresh.
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 relative overflow-x-hidden">
      <LanguageModal isOpen={isLanguageModalOpen} onClose={() => setIsLanguageModalOpen(false)} />
      {showConflictModal && (
        <div className="fixed inset-0 z-[20000] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-md">
           <div className="bg-slate-900 border border-red-500/20 p-8 rounded-[2.5rem] shadow-2xl max-w-sm w-full space-y-6">
              <div className="text-center space-y-2">
                 <h3 className="text-xl font-black text-white">{t.dashboard.conflictTitle}</h3>
                 <p className="text-slate-400 text-sm leading-relaxed">{t.dashboard.conflictSubtitle}</p>
              </div>
              <div className="space-y-3">
                 <button onClick={() => { if(pendingExpenseData) handleSaveExpense(pendingExpenseData, true); setShowConflictModal(false); }} className="w-full py-4 bg-red-600 text-white font-black rounded-2xl shadow-lg shadow-red-900/40 active:scale-95 transition-all">{t.dashboard.overwrite}</button>
                 <button onClick={() => setShowConflictModal(false)} className="w-full py-4 text-slate-500 font-bold hover:text-white transition-colors">{t.common.cancel}</button>
              </div>
           </div>
        </div>
      )}
      {isSavingPeople && (
        <div className="fixed inset-0 z-[10000] bg-slate-950/60 backdrop-blur-sm flex items-center justify-center">
           <div className="flex flex-col items-center gap-4">
              <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
              <span className="text-xs font-black uppercase tracking-[0.2em] text-indigo-400">Updating...</span>
           </div>
        </div>
      )}
      <main className="max-w-xl mx-auto px-4 py-8 md:py-12">
        {view === 'ONBOARDING' && <Onboarding onCreate={handleCreateTrip} onOpenLanguage={() => setIsLanguageModalOpen(true)} history={history} allTrips={allTrips} isLoadingTrips={isLoadingTrips} />}
        {trip && view === 'PEOPLE_SETUP' && <PeopleManager people={trip.people} onSave={handleUpdatePeople} onCancel={() => setView('DASHBOARD')} isInitial={trip.people.length === 0} />}
        {trip && view === 'DASHBOARD' && (
          <Dashboard 
            trip={trip} 
            onAddExpense={() => { triggerHaptic('light'); setEditingExpense(null); setView('ADD_EXPENSE'); }} 
            onEditExpense={(e) => { triggerHaptic('light'); setEditingExpense(e); setView('EDIT_EXPENSE'); }}
            onEditPeople={() => { triggerHaptic('light'); setView('PEOPLE_SETUP'); }}
            onOpenLanguage={() => { triggerHaptic('light'); setIsLanguageModalOpen(true); }}
            onDeleteExpense={async (id) => { 
              triggerHaptic('medium');
              if (isLocalMode) {
                const updatedExpenses = trip.expenses.filter(e => e.id !== id);
                const updatedTrip = { ...trip, expenses: updatedExpenses };
                localStorage.setItem(`tripshare_trip_${trip.id}`, JSON.stringify(updatedTrip));
                setTrip(updatedTrip);
                return;
              }
              if (!supabase) return;
              isInternalUpdate.current = true;
              await supabase.from('expenses').delete().eq('id', id); 
              await fetchTrip(trip.id); 
              setTimeout(() => { isInternalUpdate.current = false; }, 200);
            }}
            onReset={() => { triggerHaptic('heavy'); setTrip(null); window.location.hash = ''; setView('ONBOARDING'); }}
          />
        )}
        {trip && (view === 'ADD_EXPENSE' || view === 'EDIT_EXPENSE') && (
          <ExpenseForm people={trip.people} baseCurrency={trip.baseCurrency} initialExpense={editingExpense || undefined} onSubmit={handleSaveExpense} onCancel={() => { triggerHaptic('light'); setEditingExpense(null); setView('DASHBOARD'); }} />
        )}
      </main>
      {isLocalMode && (
        <div className="fixed bottom-4 left-4 right-4 max-w-xl mx-auto pointer-events-none">
          <div className="bg-amber-500/10 border border-amber-500/20 p-2 rounded-xl text-[9px] font-black uppercase tracking-widest text-amber-500/60 text-center backdrop-blur-sm pointer-events-auto shadow-xl">
            Local Mode Active • Data stays on this device
          </div>
        </div>
      )}
    </div>
  );
};

const App: React.FC = () => (
  <LanguageProvider>
    <AppContent />
  </LanguageProvider>
);

export default App;
