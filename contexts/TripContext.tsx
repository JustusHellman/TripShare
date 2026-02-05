
import React, { createContext, useContext, useState, useEffect, useMemo, useRef } from 'react';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Trip, Person, Expense, AppView, TripHistoryItem } from '../types';
import { LocalStorageTripService, SupabaseTripService, ITripService } from '../services/TripService';

interface TripContextType {
  trip: Trip | null;
  view: AppView;
  editingExpense: Expense | null;
  isLoading: boolean;
  isSaving: boolean;
  isLocalMode: boolean;
  history: TripHistoryItem[];
  actions: {
    setView: (view: AppView) => void;
    setEditingExpense: (expense: Expense | null) => void;
    createTrip: (name: string, baseCurrency: string) => Promise<void>;
    fetchTrip: (id: string) => Promise<void>;
    updatePeople: (people: Person[]) => Promise<void>;
    saveExpense: (data: Omit<Expense, 'id' | 'date'>) => Promise<void>;
    deleteExpense: (id: string) => Promise<void>;
    resetTrip: () => void;
    toggleMode: (mode: 'local' | 'cloud') => void;
  };
  supabase: SupabaseClient | null;
}

const TripContext = createContext<TripContextType | undefined>(undefined);

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

const supabaseInstance: SupabaseClient | null = (SUPABASE_URL && SUPABASE_ANON_KEY) 
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) 
  : null;

export const TripProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [view, setView] = useState<AppView>('ONBOARDING');
  const [trip, setTrip] = useState<Trip | null>(null);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [history, setHistory] = useState<TripHistoryItem[]>([]);
  const [isLocalMode, setIsLocalMode] = useState(() => {
    const stored = localStorage.getItem('tripshare_mode');
    return stored === 'local' || !supabaseInstance;
  });

  const isInternalUpdate = useRef(false);

  const tripService = useMemo<ITripService>(() => {
    if (isLocalMode) return new LocalStorageTripService();
    return new SupabaseTripService(supabaseInstance!);
  }, [isLocalMode]);

  useEffect(() => {
    const savedHistory = localStorage.getItem('tripshare_history');
    if (savedHistory) setHistory(JSON.parse(savedHistory));
  }, []);

  const updateHistory = (id: string, name: string) => {
    setHistory(prev => {
      const filtered = prev.filter(item => item.id !== id);
      const updated = [{ id, name, lastVisited: Date.now() }, ...filtered].slice(0, 10);
      localStorage.setItem('tripshare_history', JSON.stringify(updated));
      return updated;
    });
  };

  const fetchTrip = async (id: string) => {
    setIsLoading(true);
    try {
      const tripData = await tripService.fetchTrip(id);
      setTrip(tripData);
      updateHistory(tripData.id, tripData.name);
      
      if (tripData.people.length < 2) {
        setView('PEOPLE_SETUP');
      } else if (view === 'ONBOARDING' || view === 'PEOPLE_SETUP') {
        setView('DASHBOARD');
      }
    } catch (e) {
      window.location.hash = '';
      setView('ONBOARDING');
    } finally {
      setIsLoading(false);
    }
  };

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
    if (!trip?.id || !supabaseInstance || isLocalMode) return;
    const channel = supabaseInstance.channel(`trip-updates-${trip.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'people', filter: `trip_id=eq.${trip.id}` }, () => {
        if (!isInternalUpdate.current) fetchTrip(trip.id);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses', filter: `trip_id=eq.${trip.id}` }, () => {
        if (!isInternalUpdate.current) fetchTrip(trip.id);
      })
      .subscribe();
    return () => { supabaseInstance.removeChannel(channel); };
  }, [trip?.id, isLocalMode]);

  const actions = {
    setView,
    setEditingExpense,
    createTrip: async (name: string, baseCurrency: string) => {
      setIsLoading(true);
      try {
        const newTrip = await tripService.createTrip(name, baseCurrency);
        updateHistory(newTrip.id, name);
        window.location.hash = `#/trip/${newTrip.id}`;
      } finally {
        setIsLoading(false);
      }
    },
    fetchTrip,
    updatePeople: async (updatedPeople: Person[]) => {
      if (!trip) return;
      setIsSaving(true);
      try {
        isInternalUpdate.current = true;
        await tripService.updatePeople(trip.id, trip.people, updatedPeople);
        await fetchTrip(trip.id);
        setView('DASHBOARD');
      } finally {
        setIsSaving(false);
        setTimeout(() => { isInternalUpdate.current = false; }, 200);
      }
    },
    saveExpense: async (expenseData: Omit<Expense, 'id' | 'date'>) => {
      if (!trip) return;
      setIsSaving(true);
      try {
        isInternalUpdate.current = true;
        await tripService.saveExpense(trip.id, expenseData, editingExpense?.id);
        setEditingExpense(null);
        await fetchTrip(trip.id);
        setView('DASHBOARD');
      } finally {
        setIsSaving(false);
        setTimeout(() => { isInternalUpdate.current = false; }, 200);
      }
    },
    deleteExpense: async (id: string) => {
      if (!trip) return;
      setIsSaving(true);
      try {
        isInternalUpdate.current = true;
        await tripService.deleteExpense(id);
        await fetchTrip(trip.id);
      } finally {
        setIsSaving(false);
        setTimeout(() => { isInternalUpdate.current = false; }, 200);
      }
    },
    resetTrip: () => {
      setTrip(null);
      window.location.hash = '';
      setView('ONBOARDING');
    },
    toggleMode: (mode: 'local' | 'cloud') => {
      localStorage.setItem('tripshare_mode', mode);
      setIsLocalMode(mode === 'local');
      window.location.hash = '';
      setView('ONBOARDING');
    }
  };

  return (
    <TripContext.Provider value={{ trip, view, editingExpense, isLoading, isSaving, isLocalMode, history, actions, supabase: supabaseInstance }}>
      {children}
    </TripContext.Provider>
  );
};

export const useTrip = () => {
  const context = useContext(TripContext);
  if (!context) throw new Error('useTrip must be used within TripProvider');
  return context;
};
