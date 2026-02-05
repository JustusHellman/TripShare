
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { formatInputAmount, parseInputAmount, ALL_CURRENCIES, fetchExchangeRate } from '../utils/calculations';
import { useTranslation, Translations } from '../i18n/LanguageContext';
import { useTrip } from '../contexts/TripContext';

type CategoryKey = keyof Translations['expenseForm']['categories'];

interface CategoryOption {
  id: string;
  icon: string;
  label: CategoryKey;
}

const CATEGORIES: CategoryOption[] = [
  { id: 'Food', icon: '🍔', label: 'food' },
  { id: 'Transport', icon: '🚕', label: 'transport' },
  { id: 'Lodging', icon: '🏨', label: 'lodging' },
  { id: 'Grocery', icon: '🛒', label: 'grocery' },
  { id: 'Activity', icon: '🎢', label: 'activity' },
  { id: 'Other', icon: '🎁', label: 'other' }
];

const ExpenseForm: React.FC = () => {
  const { trip, editingExpense, actions } = useTrip();
  const { t } = useTranslation();

  if (!trip) return null;

  const people = trip.people;
  const baseCurrency = trip.baseCurrency;
  const sortedPeople = useMemo(() => [...people].sort((a, b) => a.name.localeCompare(b.name)), [people]);

  const [description, setDescription] = useState(editingExpense?.description || '');
  const [category, setCategory] = useState(editingExpense?.category || 'Other');
  const [displayAmount, setDisplayAmount] = useState(
    editingExpense ? formatInputAmount(editingExpense.amount.toString()) : ''
  );

  const [paidById, setPaidById] = useState(() => {
    if (editingExpense) return editingExpense.paidById;
    const lastPayer = localStorage.getItem('tripshare_last_payer');
    if (lastPayer && people.some(p => p.id === lastPayer)) return lastPayer;
    return '';
  });

  const [splitMode, setSplitMode] = useState<'ALL' | 'CUSTOM'>(
    editingExpense ? (editingExpense.splitAmongIds === 'ALL' ? 'ALL' : 'CUSTOM') : 'ALL'
  );
  const [selectedSplitIds, setSelectedSplitIds] = useState<string[]>(
    Array.isArray(editingExpense?.splitAmongIds) ? (editingExpense.splitAmongIds as string[]) : []
  );

  const [currency, setCurrency] = useState(editingExpense?.currency || baseCurrency);
  const [exchangeRate, setExchangeRate] = useState(editingExpense?.exchangeRate || 1.0);
  const [isCurrencySearchOpen, setIsCurrencySearchOpen] = useState(false);
  const [currencySearch, setCurrencySearch] = useState('');
  const [isLoadingRate, setIsLoadingRate] = useState(false);
  const [focusedCurrencyIndex, setFocusedCurrencyIndex] = useState(0);

  const currencyListRef = useRef<HTMLDivElement>(null);
  const currencyInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const updateRate = async () => {
      if (currency === baseCurrency) {
        setExchangeRate(1.0);
        return;
      }
      setIsLoadingRate(true);
      try {
        const rate = await fetchExchangeRate(currency, baseCurrency);
        setExchangeRate(rate);
      } catch (e) {
        console.error("Failed to fetch rate", e);
      } finally {
        setIsLoadingRate(false);
      }
    };
    if (!editingExpense || currency !== editingExpense.currency) {
      updateRate();
    }
  }, [currency, baseCurrency, editingExpense]);

  const filteredCurrencies = useMemo(() => 
    ALL_CURRENCIES.filter(c => 
      c.code.toLowerCase().includes(currencySearch.toLowerCase()) || 
      c.name.toLowerCase().includes(currencySearch.toLowerCase())
    ), [currencySearch]);

  useEffect(() => {
    if (isCurrencySearchOpen) {
      setFocusedCurrencyIndex(0);
      const handleGlobalKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') setIsCurrencySearchOpen(false);
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setFocusedCurrencyIndex(prev => (prev + 1) % filteredCurrencies.length);
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          setFocusedCurrencyIndex(prev => (prev - 1 + filteredCurrencies.length) % filteredCurrencies.length);
        }
        if (e.key === 'Enter' && focusedCurrencyIndex !== -1) {
          e.preventDefault();
          setCurrency(filteredCurrencies[focusedCurrencyIndex].code);
          setIsCurrencySearchOpen(false);
        }
      };
      window.addEventListener('keydown', handleGlobalKeyDown);
      return () => window.removeEventListener('keydown', handleGlobalKeyDown);
    }
  }, [isCurrencySearchOpen, filteredCurrencies, focusedCurrencyIndex]);

  useEffect(() => {
    if (isCurrencySearchOpen) {
      currencyInputRef.current?.focus();
    }
  }, [isCurrencySearchOpen]);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    if (/^[0-9\s.,]*$/.test(rawValue)) setDisplayAmount(formatInputAmount(rawValue));
  };

  const selectCategory = (cat: CategoryOption) => {
    setCategory(cat.id);
    if (!description.trim()) {
      setDescription(t.expenseForm.categories[cat.label]);
    }
  };

  const togglePerson = (id: string) => {
    setSelectedSplitIds(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseInputAmount(displayAmount);
    if (!description.trim() || numAmount <= 0 || !paidById) return;
    if (splitMode === 'CUSTOM' && selectedSplitIds.length === 0) return;

    localStorage.setItem('tripshare_last_payer', paidById);

    actions.saveExpense({ 
      description: description.trim(), 
      category,
      amount: numAmount, 
      currency,
      exchangeRate,
      paidById, 
      splitAmongIds: splitMode === 'ALL' ? 'ALL' : selectedSplitIds 
    });
  };

  const isFormInvalid = useMemo(() => {
    const numAmount = parseInputAmount(displayAmount);
    return (
      !description.trim() || 
      numAmount <= 0 || 
      !paidById || 
      (splitMode === 'CUSTOM' && selectedSplitIds.length === 0)
    );
  }, [description, displayAmount, paidById, splitMode, selectedSplitIds]);

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-app-primary tracking-tight">{editingExpense ? t.expenseForm.editTitle : t.expenseForm.addTitle}</h2>
        <button 
          onClick={() => actions.setView('DASHBOARD')} 
          className="p-2 text-app-muted hover:text-app-primary transition-all focus-visible:ring-2 focus-visible:ring-indigo-500 outline-none rounded-xl"
          aria-label={t.common.cancel}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <label id="label-desc" className="text-xs font-bold text-app-muted uppercase tracking-widest px-1">{t.expenseForm.description}</label>
            <input type="text" placeholder={t.expenseForm.descPlaceholder} aria-labelledby="label-desc" className="w-full px-5 py-4 rounded-2xl border border-app bg-app-card text-app-primary placeholder-app-muted focus:ring-2 focus:ring-indigo-500 outline-none text-lg transition-all shadow-app" value={description} onChange={(e) => setDescription(e.target.value)} autoFocus required />
            <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar -mx-1 px-1" role="radiogroup" aria-label="Category Selection">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  role="radio"
                  aria-checked={category === cat.id}
                  onClick={() => selectCategory(cat)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 shrink-0 focus-visible:ring-2 focus-visible:ring-indigo-500 outline-none ${category === cat.id ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg' : 'bg-app-card border-app text-app-secondary hover:border-app-muted shadow-app'}`}
                >
                  <span aria-hidden="true">{cat.icon}</span>
                  <span>{t.expenseForm.categories[cat.label]}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-12 gap-3">
            <div className="col-span-8 space-y-1">
              <label id="label-amount" className="text-xs font-bold text-app-muted uppercase tracking-widest px-1">{t.expenseForm.amount}</label>
              <input type="text" inputMode="decimal" placeholder="0" aria-labelledby="label-amount" className="w-full px-5 py-4 rounded-2xl border border-app bg-app-card text-app-primary placeholder-app-muted focus:ring-2 focus:ring-indigo-500 outline-none text-2xl font-bold shadow-app" value={displayAmount} onChange={handleAmountChange} required />
            </div>
            <div className="col-span-4 space-y-1">
              <label id="label-currency" className="text-xs font-bold text-app-muted uppercase tracking-widest px-1">{t.expenseForm.currency}</label>
              <button 
                type="button"
                onClick={() => setIsCurrencySearchOpen(true)}
                aria-labelledby="label-currency"
                className="w-full h-[66px] px-2 rounded-2xl border border-app bg-app-card text-app-primary flex flex-col items-center justify-center hover:bg-app-tertiary transition-all shadow-app focus-visible:ring-2 focus-visible:ring-indigo-500 outline-none"
              >
                <span className="text-xs opacity-60 uppercase font-black tracking-tighter" aria-hidden="true">{currency}</span>
                <span className="text-xl" aria-hidden="true">{ALL_CURRENCIES.find(c => c.code === currency)?.flag}</span>
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-app-muted uppercase tracking-widest px-1">{t.expenseForm.whoPaid}</label>
            <div className="grid grid-cols-2 gap-2" role="radiogroup">
              {sortedPeople.map(p => (
                <button 
                  key={p.id} 
                  type="button" 
                  role="radio"
                  aria-checked={paidById === p.id}
                  onClick={() => setPaidById(p.id)} 
                  className={`px-4 py-3 rounded-xl text-sm font-bold border transition-all shadow-app focus-visible:ring-2 focus-visible:ring-indigo-500 outline-none ${paidById === p.id ? 'bg-indigo-600 text-white border-indigo-400 shadow-md' : 'bg-app-card text-app-secondary border-app hover:border-app-muted'}`}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3 pt-4 border-t border-app">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-app-muted uppercase tracking-widest px-1">{t.expenseForm.splitWith}</label>
              <div className="flex p-1 bg-app-tertiary rounded-xl border border-app relative h-9 w-32 shadow-inner" role="tablist">
                <div 
                  className="absolute h-[calc(100%-8px)] w-[calc(50%-4px)] bg-indigo-600 rounded-lg transition-all duration-300 ease-out shadow-sm"
                  style={{ left: splitMode === 'ALL' ? '4px' : 'calc(50% + 4px)' }}
                />
                <button type="button" role="tab" aria-selected={splitMode === 'ALL'} onClick={() => setSplitMode('ALL')} className={`relative flex-1 text-[10px] font-black z-10 transition-colors focus-visible:text-white outline-none ${splitMode === 'ALL' ? 'text-white' : 'text-app-muted'}`}>{t.common.all.toUpperCase()}</button>
                <button type="button" role="tab" aria-selected={splitMode === 'CUSTOM'} onClick={() => setSplitMode('CUSTOM')} className={`relative flex-1 text-[10px] font-black z-10 transition-colors focus-visible:text-white outline-none ${splitMode === 'CUSTOM' ? 'text-white' : 'text-app-muted'}`}>CUSTOM</button>
              </div>
            </div>
            {splitMode === 'CUSTOM' && (
              <div className="grid grid-cols-2 gap-2 animate-zoom-in" role="group" aria-label="People to split with">
                {sortedPeople.map(p => (
                  <button 
                    key={p.id} 
                    type="button" 
                    aria-pressed={selectedSplitIds.includes(p.id)}
                    onClick={() => togglePerson(p.id)} 
                    className={`px-4 py-3 rounded-xl text-sm font-bold border transition-all flex items-center justify-between shadow-app focus-visible:ring-2 focus-visible:ring-indigo-500 outline-none ${selectedSplitIds.includes(p.id) ? 'bg-indigo-500/10 text-indigo-500 border-indigo-500/30' : 'bg-app-card text-app-secondary border-app'}`}
                  >
                    <span>{p.name}</span>
                    {selectedSplitIds.includes(p.id) && <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 animate-zoom-in" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <button 
          type="submit" 
          disabled={isFormInvalid || isLoadingRate}
          className="w-full bg-app-accent hover:opacity-90 disabled:bg-app-tertiary disabled:text-app-muted disabled:shadow-none text-app-accent-fg font-black py-5 rounded-2xl shadow-xl transition-all mt-4 focus-visible:ring-4 focus-visible:ring-indigo-500 outline-none"
        >
          {isLoadingRate ? t.common.loading : (editingExpense ? t.common.save : t.expenseForm.confirmBtn)}
        </button>
      </form>

      {isCurrencySearchOpen && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in"
          role="dialog"
          aria-modal="true"
          onClick={() => setIsCurrencySearchOpen(false)}
        >
           <div 
             className="bg-app-card border border-app rounded-3xl w-full max-w-sm flex flex-col max-h-[80vh] animate-zoom-in shadow-2xl overflow-hidden"
             onClick={(e) => e.stopPropagation()}
           >
              <div className="p-6 border-b border-app space-y-4">
                 <div className="flex items-center justify-between">
                    <h3 className="text-xl font-black text-app-primary">{t.expenseForm.currency}</h3>
                    <button 
                      onClick={() => setIsCurrencySearchOpen(false)} 
                      className="text-app-muted hover:text-app-primary transition-colors focus-visible:ring-2 focus-visible:ring-indigo-500 outline-none rounded-lg"
                      aria-label="Close currency search"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                 </div>
                 <input 
                   ref={currencyInputRef}
                   type="text" 
                   placeholder={t.expenseForm.searchCurrency} 
                   className="w-full px-4 py-3 rounded-xl border border-app bg-app-tertiary text-app-primary outline-none focus:ring-2 focus:ring-indigo-500 transition-all" 
                   value={currencySearch} 
                   onChange={(e) => setCurrencySearch(e.target.value)} 
                   aria-label="Filter currencies"
                 />
              </div>
              <div ref={currencyListRef} className="flex-1 overflow-y-auto p-2 no-scrollbar" role="listbox">
                 {filteredCurrencies.map((c, idx) => (
                   <button 
                      key={c.code} 
                      role="option"
                      aria-selected={idx === focusedCurrencyIndex}
                      onClick={() => { setCurrency(c.code); setIsCurrencySearchOpen(false); }} 
                      className={`w-full flex items-center gap-4 p-4 rounded-xl transition-all outline-none ${idx === focusedCurrencyIndex ? 'bg-indigo-600 text-white' : 'hover:bg-app-tertiary text-app-secondary'}`}
                   >
                      <span className="text-2xl" aria-hidden="true">{c.flag}</span>
                      <div className="flex flex-col items-start"><span className="font-bold">{c.code}</span><span className="text-xs opacity-60">{c.name}</span></div>
                   </button>
                 ))}
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default ExpenseForm;
