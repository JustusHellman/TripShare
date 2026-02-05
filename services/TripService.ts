
import { SupabaseClient } from '@supabase/supabase-js';
import { Trip, Person, Expense } from '../types';

export interface ITripService {
  fetchTrip(id: string): Promise<Trip>;
  createTrip(name: string, baseCurrency: string): Promise<Trip>;
  updatePeople(tripId: string, currentPeople: Person[], updatedPeople: Person[]): Promise<void>;
  saveExpense(tripId: string, expenseData: Omit<Expense, 'id' | 'date'>, editingId?: string): Promise<void>;
  deleteExpense(expenseId: string): Promise<void>;
}

export class LocalStorageTripService implements ITripService {
  async fetchTrip(id: string): Promise<Trip> {
    const localData = localStorage.getItem(`tripshare_trip_${id}`);
    if (!localData) throw new Error("Trip not found");
    return JSON.parse(localData);
  }

  async createTrip(name: string, baseCurrency: string): Promise<Trip> {
    const newTrip: Trip = { id: crypto.randomUUID(), name, baseCurrency, people: [], expenses: [] };
    localStorage.setItem(`tripshare_trip_${newTrip.id}`, JSON.stringify(newTrip));
    
    const index = JSON.parse(localStorage.getItem('tripshare_local_index') || '[]');
    localStorage.setItem('tripshare_local_index', JSON.stringify([{ id: newTrip.id, name: newTrip.name }, ...index]));
    
    return newTrip;
  }

  async updatePeople(tripId: string, currentPeople: Person[], updatedPeople: Person[]): Promise<void> {
    const trip = await this.fetchTrip(tripId);
    const updatedTrip = { ...trip, people: updatedPeople };
    localStorage.setItem(`tripshare_trip_${tripId}`, JSON.stringify(updatedTrip));
  }

  async saveExpense(tripId: string, expenseData: Omit<Expense, 'id' | 'date'>, editingId?: string): Promise<void> {
    const trip = await this.fetchTrip(tripId);
    const updatedExpenses = [...trip.expenses];
    
    if (editingId) {
      const idx = updatedExpenses.findIndex(e => e.id === editingId);
      if (idx !== -1) {
        const original = updatedExpenses[idx];
        updatedExpenses[idx] = { ...expenseData, id: original.id, date: original.date };
      }
    } else {
      updatedExpenses.unshift({ ...expenseData, id: crypto.randomUUID(), date: Date.now() });
    }
    
    const updatedTrip = { ...trip, expenses: updatedExpenses };
    localStorage.setItem(`tripshare_trip_${tripId}`, JSON.stringify(updatedTrip));
  }

  async deleteExpense(expenseId: string): Promise<void> {
    // In local mode, we need the trip context. This interface assumes we might need a better way to handle global deletes
    // but for now we look through all local trips. In practice, App.tsx knows the current trip.
    const index = JSON.parse(localStorage.getItem('tripshare_local_index') || '[]');
    for (const item of index) {
      const tripData = localStorage.getItem(`tripshare_trip_${item.id}`);
      if (tripData) {
        const trip = JSON.parse(tripData) as Trip;
        const filtered = trip.expenses.filter(e => e.id !== expenseId);
        if (filtered.length !== trip.expenses.length) {
          localStorage.setItem(`tripshare_trip_${item.id}`, JSON.stringify({ ...trip, expenses: filtered }));
          break;
        }
      }
    }
  }
}

export class SupabaseTripService implements ITripService {
  constructor(private supabase: SupabaseClient) {}

  async fetchTrip(id: string): Promise<Trip> {
    const { data: tripData, error: tripError } = await this.supabase.from('trips').select('*').eq('id', id).single();
    if (tripError || !tripData) throw tripError || new Error("Trip not found");

    const { data: peopleData } = await this.supabase.from('people').select('*').eq('trip_id', id);
    const { data: expensesData } = await this.supabase.from('expenses').select('*').eq('trip_id', id).order('date', { ascending: false });

    return {
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
    };
  }

  async createTrip(name: string, baseCurrency: string): Promise<Trip> {
    const { data, error } = await this.supabase.from('trips').insert({ name, base_currency: baseCurrency }).select().single();
    if (error) throw error;
    return { id: data.id, name: data.name, baseCurrency: data.base_currency, people: [], expenses: [] };
  }

  async updatePeople(tripId: string, currentPeople: Person[], updatedPeople: Person[]): Promise<void> {
    const updatedIds = updatedPeople.map(p => p.id);
    const toRemove = currentPeople.filter(p => !updatedIds.includes(p.id)).map(p => p.id);

    if (toRemove.length > 0) {
      await this.supabase.from('people').update({ merged_with_id: null }).in('merged_with_id', toRemove);
      await this.supabase.from('people').delete().in('id', toRemove);
    }

    const upserts = updatedPeople.map(p => ({
      id: p.id, name: p.name, trip_id: tripId, merged_with_id: p.mergedWithId || null
    }));
    const { error } = await this.supabase.from('people').upsert(upserts, { onConflict: 'id' });
    if (error) throw error;
  }

  async saveExpense(tripId: string, expenseData: Omit<Expense, 'id' | 'date'>, editingId?: string): Promise<void> {
    const dbPayload = { 
      description: expenseData.description,
      category: expenseData.category,
      amount: expenseData.amount, 
      exchange_rate: expenseData.exchangeRate, 
      currency: expenseData.currency,
      paid_by_id: expenseData.paidById, 
      split_among_ids: expenseData.splitAmongIds, 
      trip_id: tripId 
    };

    if (editingId) {
      const { error } = await this.supabase.from('expenses').update(dbPayload).eq('id', editingId);
      if (error) throw error;
    } else {
      const { error } = await this.supabase.from('expenses').insert({ ...dbPayload, date: Date.now() });
      if (error) throw error;
    }
  }

  async deleteExpense(expenseId: string): Promise<void> {
    const { error } = await this.supabase.from('expenses').delete().eq('id', expenseId);
    if (error) throw error;
  }
}
