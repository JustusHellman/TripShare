
import React, { useState, useEffect, useMemo } from 'react';
import { Person, Expense } from '../types';
import { formatInputAmount, parseInputAmount, ALL_CURRENCIES, fetchExchangeRate } from '../utils/calculations';
import { useTranslation } from '../i18n/LanguageContext';

interface Props {
  people: Person[];
  baseCurrency: string;
  initialExpense?: Expense;
  onSubmit: (expense: Omit<Expense, 'id' | 'date'>) => void;
  onCancel: () => void;
}

const CATEGORIES = [
  { id: 'Food', icon: '🍔', label: 'food' },
  { id: 'Transport', icon: '🚕', label: 'transport' },
  { id: 'Lodging', icon: '🏨', label: 'lodging' },
  { id: 'Grocery', icon: '🛒', label: 'grocery' },
  { id: 'Activity', icon: '🎢', label: 'activity' },
  { id: 'Other', icon: '🎁', label: 'other' }
];

const ExpenseForm: React.FC<Props> = ({ people, baseCurrency, initialExpense, onSubmit, onCancel }) => {
  const { t } = useTranslation();
  const sortedPeople = useMemo(() => [...people].sort((a, b) => a.name.localeCompare(b.name)), [people]);

  const [description, setDescription] = useState(initialExpense?.description || '');
  const [category, setCategory] = useState(initialExpense?.category || 'Other');
  const [displayAmount, setDisplayAmount] = useState(
    initialExpense ? formatInputAmount(initialExpense.amount.toString()) : ''
  );

  const [paidById, setPaidById] = useState(() => {
    if (initialExpense) return initialExpense.paidById;
    const lastPayer = localStorage.getItem('tripshare_last_payer');
    if (lastPayer && people.some(p => p.id === lastPayer)) return lastPayer;
    return '';
  });

  const [splitMode, setSplitMode] = useState<'ALL' | 'CUSTOM'>(
    initialExpense ? (initialExpense.splitAmongIds === 'ALL' ? 'ALL' : 'CUSTOM') : 'ALL'
  );
  const [selectedSplitIds, setSelectedSplitIds] = useState<string[]>(
    Array.isArray(initialExpense?.splitAmongIds) ? initialExpense!.splitAmongIds : []
  );

  const [currency, setCurrency] = useState(initialExpense?.currency || baseCurrency);
  const [exchangeRate, setExchangeRate] = useState(initialExpense?.exchangeRate || 1.0);
  const [isCurrencySearchOpen, setIsCurrencySearchOpen] = useState(false);
  const [currencySearch, setCurrencySearch] = useState('');
  const [isLoadingRate, setIsLoadingRate] = useState(false);

  useEffect(() => {
    const updateRate = async () => {
      if (currency === baseCurrency) {
        setExchangeRate(1.0);
        return;
      }
      setIsLoadingRate(true);
      const rate = await fetchExchangeRate(currency, baseCurrency);
      setExchangeRate(rate);
      setIsLoadingRate(false);
    };
    if (!initialExpense || currency !== initialExpense.currency) {
      updateRate();
    }
  }, [currency, baseCurrency]);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    if (/^[0-9\s.,]*$/.test(rawValue)) setDisplayAmount(formatInputAmount(rawValue));
  };

  const selectCategory = (cat: typeof CATEGORIES[0]) => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10);
    setCategory(cat.id);
    if (!description.trim()) {
      setDescription((t.expenseForm.categories as any)[cat.label]);
    }
  };

  const togglePerson = (id: string) => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10);
    setSelectedSplitIds(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseInputAmount(displayAmount);
    if (!description.trim() || numAmount <= 0 || !paidById) return;
    if (splitMode === 'CUSTOM' && selectedSplitIds.length === 0) return;

    localStorage.setItem('tripshare_last_payer', paidById);

    onSubmit({ 
      description: description.trim(), 
      category,
      amount: numAmount, 
      currency,
      exchangeRate,
      paidById, 
      splitAmongIds: splitMode === 'ALL' ? 'ALL' : selectedSplitIds 
    });
  };

  const filteredCurrencies = ALL_CURRENCIES.filter(c => 
    c.code.toLowerCase().includes(currencySearch.toLowerCase()) || 
    c.name.toLowerCase().includes(currencySearch.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">{initialExpense ? t.expenseForm.editTitle : t.expenseForm.addTitle}</h2>
        <button onClick={onCancel} className="p-2 text-slate-500 hover:text-slate-300 transition-colors active:scale-90"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">{t.expenseForm.description}</label>
            <input type="text" placeholder={t.expenseForm.descPlaceholder} className="w-full px-5 py-4 rounded-2xl border border-slate-800 bg-slate-900 text-white placeholder-slate-600 focus:ring-2 focus:ring-indigo-500 outline-none text-lg transition-all" value={description} onChange={(e) => setDescription(e.target.value)} autoFocus required />
            <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar -mx-1 px-1">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => selectCategory(cat)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 shrink-0 active:scale-95 ${category === cat.id ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-700'}`}
                >
                  <span>{cat.icon}</span>
                  <span>{(t.expenseForm.categories as any)[cat.label]}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-12 gap-3">
            <div className="col-span-8 space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">{t.expenseForm.amount}</label>
              <input type="text" inputMode="decimal" placeholder="0" className="w-full px-5 py-4 rounded-2xl border border-slate-800 bg-slate-900 text-white placeholder-slate-600 focus:ring-2 focus:ring-indigo-500 outline-none text-2xl" value={displayAmount} onChange={handleAmountChange} required />
            </div>
            <div className="col-span-4 space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">{t.expenseForm.currency}</label>
              <button 
                type="button"
                onClick={() => setIsCurrencySearchOpen(true)}
                className="w-full h-[66px] px-2 rounded-2xl border border-slate-800 bg-slate-900 text-white flex flex-col items-center justify-center active:scale-95 transition-all"
              >
                <span className="text-xs opacity-60 uppercase font-black tracking-tighter">{currency}</span>
                <span className="text-xl">{ALL_CURRENCIES.find(c => c.code === currency)?.flag}</span>
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">{t.expenseForm.whoPaid}</label>
            <div className="grid grid-cols-2 gap-2">
              {sortedPeople.map(p => (
                <button key={p.id} type="button" onClick={() => { if(navigator.vibrate) navigator.vibrate(10); setPaidById(p.id); }} className={`px-4 py-3 rounded-xl text-sm font-bold border transition-all active:scale-95 ${paidById === p.id ? 'bg-indigo-600 text-white border-indigo-400' : 'bg-slate-900 text-slate-400 border-slate-800'}`}>{p.name}</button>
              ))}
            </div>
          </div>

          <div className="space-y-3 pt-4 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">{t.expenseForm.splitWith}</label>
              <div className="flex p-1 bg-slate-800 rounded-xl border border-slate-700">
                <button type="button" onClick={() => setSplitMode('ALL')} className={`px-4 py-1.5 text-[10px] font-black rounded-lg transition-all ${splitMode === 'ALL' ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}>{t.common.all.toUpperCase()}</button>
                <button type="button" onClick={() => setSplitMode('CUSTOM')} className={`px-4 py-1.5 text-[10px] font-black rounded-lg transition-all ${splitMode === 'CUSTOM' ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}>CUSTOM</button>
              </div>
            </div>
            {splitMode === 'CUSTOM' && (
              <div className="grid grid-cols-2 gap-2">
                {sortedPeople.map(p => (
                  <button key={p.id} type="button" onClick={() => togglePerson(p.id)} className={`px-4 py-3 rounded-xl text-sm font-bold border transition-all flex items-center justify-between active:scale-95 ${selectedSplitIds.includes(p.id) ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30' : 'bg-slate-900 text-slate-400 border-slate-800'}`}>
                    <span>{p.name}</span>
                    {selectedSplitIds.includes(p.id) && <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <button 
          type="submit" 
          className="w-full bg-white hover:bg-slate-100 disabled:bg-slate-800 disabled:text-slate-600 text-slate-950 font-black py-5 rounded-2xl shadow-xl transition-all active:scale-95 mt-4"
        >
          {initialExpense ? t.common.save : t.expenseForm.confirmBtn}
        </button>
      </form>

      {isCurrencySearchOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-200">
           <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-sm flex flex-col max-h-[80vh] animate-in zoom-in-95 shadow-2xl">
              <div className="p-6 border-b border-slate-800 space-y-4">
                 <div className="flex items-center justify-between">
                    <h3 className="text-xl font-black text-white">{t.expenseForm.currency}</h3>
                    <button onClick={() => setIsCurrencySearchOpen(false)} className="text-slate-500 hover:text-white transition-colors"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                 </div>
                 <input type="text" placeholder={t.expenseForm.searchCurrency} className="w-full px-4 py-3 rounded-xl border border-slate-800 bg-slate-800/50 text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all" value={currencySearch} onChange={(e) => setCurrencySearch(e.target.value)} autoFocus />
              </div>
              <div className="flex-1 overflow-y-auto p-2 no-scrollbar">
                 {filteredCurrencies.map(c => (
                   <button key={c.code} onClick={() => { setCurrency(c.code); setIsCurrencySearchOpen(false); }} className={`w-full flex items-center gap-4 p-4 rounded-xl transition-all active:scale-95 ${currency === c.code ? 'bg-indigo-600 text-white' : 'hover:bg-slate-800 text-slate-400'}`}>
                      <span className="text-2xl">{c.flag}</span>
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
