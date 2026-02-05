
import React, { useState, useMemo } from 'react';
import { Expense } from '../types';
import { calculateOptimizedSettlements, calculateDetailedBalances, formatCurrency } from '../utils/calculations';
import { useTranslation } from '../i18n/LanguageContext';
import { useTheme } from './ThemeContext';
import { useTrip } from '../contexts/TripContext';

interface Props {
  onOpenLanguage: () => void;
}

type MainTab = 'expenses' | 'balances' | 'settle' | 'stats';
type SortOption = 'date' | 'paidBy' | 'splitWith';

const CATEGORY_COLORS: Record<string, string> = {
  'Food': '#6366f1',      // Indigo
  'Transport': '#8b5cf6', // Violet
  'Lodging': '#ec4899',   // Pink
  'Grocery': '#10b981',   // Emerald
  'Activity': '#f59e0b',  // Amber
  'Other': '#64748b'      // Slate
};

const Dashboard: React.FC<Props> = ({ onOpenLanguage }) => {
  const { trip, actions } = useTrip();
  const { t, language } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<MainTab>('expenses');
  const [expenseToDelete, setExpenseToDelete] = useState<string | null>(null);
  const [showCopied, setShowCopied] = useState(false);
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);
  
  const [sortBy, setSortBy] = useState<SortOption>('date');
  const [sortPersonId, setSortPersonId] = useState<string | null>(null);

  if (!trip) return null;

  const tabs: MainTab[] = ['expenses', 'balances', 'settle', 'stats'];
  const activeTabIndex = tabs.indexOf(activeTab);

  const optimizedSettlements = calculateOptimizedSettlements(trip);
  const detailedBalances = calculateDetailedBalances(trip);
  
  const totalTripCost = trip.expenses.reduce((acc, curr) => acc + (curr.amount * (curr.exchangeRate || 1)), 0);
  
  const getPersonName = (id: string) => trip.people.find(p => p.id === id)?.name || 'Unknown';

  const getGroupName = (key: string) => {
    if (!key.includes('|')) return getPersonName(key);
    return key.split('|').map(id => getPersonName(id)).join(' & ');
  };

  const categoryData = useMemo(() => {
    const data: Record<string, number> = {};
    trip.expenses.forEach(e => {
      const cat = e.category || 'Other';
      const value = e.amount * (e.exchangeRate || 1);
      data[cat] = (data[cat] || 0) + value;
    });
    return Object.entries(data).sort((a, b) => b[1] - a[1]);
  }, [trip.expenses]);

  const sortedExpenses = useMemo(() => {
    const list = [...trip.expenses];
    list.sort((a, b) => {
      if (sortBy === 'paidBy' && sortPersonId) {
        const isA = a.paidById === sortPersonId;
        const isB = b.paidById === sortPersonId;
        if (isA && !isB) return -1;
        if (!isA && isB) return 1;
        return b.date - a.date;
      }
      if (sortBy === 'splitWith' && sortPersonId) {
        const affectsA = a.splitAmongIds === 'ALL' || (Array.isArray(a.splitAmongIds) && a.splitAmongIds.includes(sortPersonId));
        const affectsB = b.splitAmongIds === 'ALL' || (Array.isArray(b.splitAmongIds) && b.splitAmongIds.includes(sortPersonId));
        if (affectsA && !affectsB) return -1;
        if (!affectsA && affectsB) return 1;
        return b.date - a.date;
      }
      return b.date - a.date;
    });
    return list;
  }, [trip.expenses, sortBy, sortPersonId]);

  const copyShareLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setShowCopied(true);
    setTimeout(() => setShowCopied(false), 2000);
  };

  const currentFlag = language === 'en' ? '🇬🇧' : '🇸🇪';

  return (
    <div className="space-y-6 relative pb-20">
      <div className="flex justify-between items-start mb-2">
        <div className="flex-1 min-w-0">
          <h1 className="text-3xl font-black text-app-primary tracking-tight truncate leading-tight">{trip.name}</h1>
          <p className="text-app-secondary text-sm">{t.dashboard.totalCost} <span className="font-bold text-app-primary">{formatCurrency(totalTripCost, trip.baseCurrency)}</span></p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={toggleTheme}
            aria-label={t.common.theme}
            className="flex items-center justify-center w-10 h-10 bg-app-card border border-app rounded-xl hover:bg-app-tertiary transition-all active:scale-95 text-app-secondary focus-visible:ring-2 focus-visible:ring-indigo-500 outline-none"
          >
            {theme === 'dark' ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 animate-zoom-in" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 animate-zoom-in" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
            )}
          </button>
          <button 
            onClick={onOpenLanguage}
            aria-label={t.common.language}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-app-card border border-app rounded-lg hover:bg-app-tertiary transition-all text-xs font-bold text-app-secondary focus-visible:ring-2 focus-visible:ring-indigo-500 outline-none"
          >
            <span>{currentFlag}</span>
          </button>
        </div>
      </div>

      <div className="flex gap-2">
        <button onClick={() => { actions.setEditingExpense(null); actions.setView('ADD_EXPENSE'); }} className="flex-1 flex items-center justify-center gap-2 py-3 bg-app-accent hover:opacity-90 text-app-accent-fg rounded-xl font-bold shadow-lg shadow-indigo-900/20 transition-all focus-visible:ring-2 focus-visible:ring-indigo-500 outline-none">
           <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
           {t.dashboard.addExpense}
        </button>
        <button 
          onClick={copyShareLink} 
          aria-label="Copy share link"
          className={`px-4 rounded-xl border transition-all flex items-center justify-center focus-visible:ring-2 focus-visible:ring-indigo-500 outline-none ${showCopied ? 'bg-green-500/10 border-green-500/50 text-green-500' : 'bg-app-card border-app text-app-secondary hover:text-indigo-500'}`}
        >
          {showCopied ? <span className="text-[10px] font-black">{t.common.copied}</span> : <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" /></svg>}
        </button>
        <button 
          onClick={() => actions.setView('PEOPLE_SETUP')} 
          aria-label="Manage people"
          className="px-4 rounded-xl bg-app-card border border-app text-app-secondary hover:text-indigo-500 transition-all shadow-app focus-visible:ring-2 focus-visible:ring-indigo-500 outline-none"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" /></svg>
        </button>
        <button 
          onClick={() => actions.resetTrip()} 
          aria-label="Reset trip"
          className="px-4 rounded-xl bg-app-card border border-app text-app-secondary hover:text-red-500 transition-all shadow-app focus-visible:ring-2 focus-visible:ring-red-500 outline-none"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" /></svg>
        </button>
      </div>

      <nav className="relative p-1 bg-app-card border border-app rounded-2xl flex items-center h-12 shadow-app" aria-label="Dashboard tabs">
        <div 
          className="absolute h-[calc(100%-8px)] rounded-xl bg-app-tertiary shadow-sm transition-all duration-300 ease-out z-0"
          style={{ 
            width: 'calc(25% - 4px)',
            left: `calc(${activeTabIndex * 25}% + 4px)` 
          }}
        />
        {tabs.map(tab => (
          <button 
            key={tab} 
            onClick={() => setActiveTab(tab)} 
            aria-selected={activeTab === tab}
            className={`relative flex-1 py-2 text-[10px] font-black uppercase tracking-wider transition-colors duration-200 z-10 focus-visible:text-indigo-500 outline-none ${activeTab === tab ? 'text-indigo-500' : 'text-app-secondary hover:text-app-primary'}`}
          >
            {tab === 'expenses' ? t.dashboard.tabExpenses : tab === 'balances' ? t.dashboard.tabBalances : tab === 'settle' ? t.dashboard.tabSettle : t.dashboard.tabStats}
          </button>
        ))}
      </nav>

      <div key={activeTab} className="animate-slide-right">
        {activeTab === 'expenses' && (
          <div className="space-y-4">
            <div className="flex flex-col space-y-4">
               <div className="flex items-center justify-between">
                  <h3 className="font-black text-app-secondary uppercase text-[10px] tracking-[0.2em]">{t.dashboard.recentActivity}</h3>
               </div>
               <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar -mx-4 px-4">
                  <span className="text-[10px] font-black text-app-muted uppercase tracking-widest shrink-0">{t.dashboard.sortBy}</span>
                  <button 
                    onClick={() => setSortBy('date')}
                    className={`px-3 py-1.5 text-[11px] font-bold rounded-full border transition-all shrink-0 focus-visible:ring-2 focus-visible:ring-indigo-500 outline-none ${sortBy === 'date' ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-app-card border-app text-app-secondary'}`}
                  >
                    {t.dashboard.sortDate}
                  </button>
                  <div className={`flex items-center gap-1 px-3 py-1.5 rounded-full border transition-all shrink-0 ${sortBy === 'paidBy' ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-app-card border-app text-app-secondary'}`}>
                    <span className="text-[11px] font-bold cursor-pointer" onClick={() => { setSortBy('paidBy'); if(!sortPersonId) setSortPersonId(trip.people[0]?.id); }}>{t.dashboard.sortPayer}:</span>
                    <select 
                      aria-label="Select payer to sort by"
                      className="bg-transparent border-none outline-none focus:ring-0 p-0 text-[11px] font-bold cursor-pointer"
                      value={sortBy === 'paidBy' ? (sortPersonId || '') : ''}
                      onChange={(e) => { setSortBy('paidBy'); setSortPersonId(e.target.value); }}
                    >
                      {!sortPersonId && <option value="" disabled>-</option>}
                      {trip.people.map(p => <option key={p.id} value={p.id} className="bg-app-card text-app-primary">{p.name}</option>)}
                    </select>
                  </div>
                  <div className={`flex items-center gap-1 px-3 py-1.5 rounded-full border transition-all shrink-0 ${sortBy === 'splitWith' ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-app-card border-app text-app-secondary'}`}>
                    <span className="text-[11px] font-bold cursor-pointer" onClick={() => { setSortBy('splitWith'); if(!sortPersonId) setSortPersonId(trip.people[0]?.id); }}>{t.dashboard.sortAffects}:</span>
                    <select 
                      aria-label="Select person to filter effects"
                      className="bg-transparent border-none outline-none focus:ring-0 p-0 text-[11px] font-bold cursor-pointer"
                      value={sortBy === 'splitWith' ? (sortPersonId || '') : ''}
                      onChange={(e) => { setSortBy('splitWith'); setSortPersonId(e.target.value); }}
                    >
                      {!sortPersonId && <option value="" disabled>-</option>}
                      {trip.people.map(p => <option key={p.id} value={p.id} className="bg-app-card text-app-primary">{p.name}</option>)}
                    </select>
                  </div>
               </div>
            </div>

            <div className="space-y-3" role="list">
              {sortedExpenses.map((expense, idx) => {
                const valueInBase = expense.amount * (expense.exchangeRate || 1);
                const isDifferentCurrency = expense.currency !== trip.baseCurrency;
                
                return (
                  <div 
                    key={expense.id} 
                    role="listitem"
                    className="group p-4 bg-app-card border border-app rounded-2xl shadow-app hover:border-indigo-500/40 transition-all animate-slide-up"
                    style={{ animationDelay: `${idx * 0.05}s`, animationFillMode: 'both' }}
                  >
                    <div className="flex justify-between items-start">
                      <div className="min-w-0 pr-4">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded bg-app-tertiary text-app-secondary border border-app">{expense.category || 'Other'}</span>
                          <h4 className="font-bold text-app-primary truncate">{expense.description}</h4>
                        </div>
                        <p className="text-[11px] text-app-secondary mt-1">{t.dashboard.paidBy} <span className="text-indigo-500 font-bold">{getPersonName(expense.paidById)}</span></p>
                        <div className="mt-3 flex gap-2 items-center">
                          <span className="text-[9px] uppercase font-black tracking-widest text-app-muted shrink-0">{t.dashboard.splittingWith}</span>
                          <div className="flex -space-x-1.5" aria-hidden="true">
                            {expense.splitAmongIds === 'ALL' ? <div className="px-1.5 py-0.5 bg-app-tertiary rounded text-[9px] text-app-secondary font-black uppercase border border-app">{t.common.all}</div> : expense.splitAmongIds.slice(0, 3).map(id => <div key={id} className="w-5 h-5 rounded-full border border-app bg-indigo-500/20 flex items-center justify-center text-[9px] text-indigo-500 font-black">{getPersonName(id).charAt(0).toUpperCase()}</div>)}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end shrink-0">
                        <span className="text-lg font-black text-app-primary">{formatCurrency(expense.amount, expense.currency)}</span>
                        {isDifferentCurrency && <span className="text-[10px] text-app-muted font-bold">≈ {formatCurrency(valueInBase, trip.baseCurrency)}</span>}
                        <div className="flex gap-2.5 mt-2.5 sm:opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-200">
                          <button 
                            onClick={() => { actions.setEditingExpense(expense); actions.setView('EDIT_EXPENSE'); }} 
                            aria-label={`Edit ${expense.description}`}
                            className="text-app-muted hover:text-indigo-500 transition-all focus-visible:ring-2 focus-visible:ring-indigo-500 rounded outline-none"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg>
                          </button>
                          <button 
                            onClick={() => setExpenseToDelete(expense.id)} 
                            aria-label={`Delete ${expense.description}`}
                            className="text-app-muted hover:text-red-500 transition-all focus-visible:ring-2 focus-visible:ring-red-500 rounded outline-none"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'balances' && (
          <div className="space-y-4">
            <div className="bg-app-card border border-app p-6 rounded-[2rem] text-app-primary shadow-app flex items-center justify-between animate-zoom-in"><div><h3 className="text-app-secondary text-[10px] font-black uppercase tracking-widest mb-1">{t.dashboard.financialOverview} ({trip.baseCurrency})</h3><p className="text-sm font-light leading-snug text-app-secondary">{t.dashboard.balanceSubtitle}</p></div><div className="text-3xl grayscale opacity-30" aria-hidden="true">📊</div></div>
            <div className="grid gap-3">
              {Object.entries(detailedBalances).sort((a,b) => b[1].netBalance - a[1].netBalance).map(([key, stats], idx) => (
                <div key={key} className={`p-5 bg-app-card border rounded-2xl shadow-app transition-all animate-slide-up ${stats.isMerged ? 'border-indigo-500/30 bg-indigo-500/[0.02]' : 'border-app'}`} style={{ animationDelay: `${idx * 0.05}s`, animationFillMode: 'both' }}>
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-xs ${stats.isMerged ? 'bg-indigo-600 text-white' : 'bg-app-tertiary border border-app text-app-primary'}`} aria-hidden="true">{getGroupName(key).charAt(0).toUpperCase()}</div>
                      <span className="font-bold text-app-primary">{getGroupName(key)}</span>
                    </div>
                    <div className={`text-sm font-black px-3 py-1 rounded-lg border ${stats.netBalance >= 0 ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>{stats.netBalance >= 0 ? '+' : ''}{formatCurrency(stats.netBalance, trip.baseCurrency)}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-app"><div><span className="block text-[9px] text-app-secondary uppercase font-black tracking-widest mb-1">{t.dashboard.totalPaid}</span><span className="text-sm font-bold text-app-primary">{formatCurrency(stats.totalPaid, trip.baseCurrency)}</span></div><div className="text-right"><span className="block text-[9px] text-app-secondary uppercase font-black tracking-widest mb-1">{t.dashboard.portion}</span><span className="text-sm font-bold text-app-primary">{formatCurrency(stats.share, trip.baseCurrency)}</span></div></div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'settle' && (
          <div className="space-y-4">
            <div className="bg-indigo-600/10 border border-indigo-500/20 p-6 rounded-[2rem] text-app-primary shadow-lg flex items-center justify-between animate-zoom-in"><div><h3 className="text-indigo-500 text-[10px] font-black uppercase tracking-widest mb-1">{t.dashboard.optimizedPayments} ({trip.baseCurrency})</h3><p className="text-sm font-light text-app-secondary leading-snug">{t.dashboard.settleSubtitle}</p></div><div className="text-3xl" aria-hidden="true">✨</div></div>
            <div className="space-y-3">
              {optimizedSettlements.length > 0 ? optimizedSettlements.map((s, idx) => (
                <div key={idx} className="p-5 bg-app-card border border-app rounded-[2rem] shadow-app flex items-center gap-4 animate-slide-up" style={{ animationDelay: `${idx * 0.08}s`, animationFillMode: 'both' }}>
                  <div className="flex-1 text-center"><p className="font-bold text-app-primary text-xs truncate">{getGroupName(s.from)}</p><p className="text-[9px] font-black uppercase text-app-muted">{t.dashboard.pays}</p></div>
                  <div className="flex flex-col items-center" aria-hidden="true"><div className="text-lg font-black text-indigo-500">{formatCurrency(s.amount, trip.baseCurrency)}</div><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-indigo-500/50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg></div>
                  <div className="flex-1 text-center"><p className="font-bold text-app-primary text-xs truncate">{getGroupName(s.to)}</p><p className="text-[9px] font-black uppercase text-app-muted">{t.dashboard.to}</p></div>
                </div>
              )) : (
                <div className="py-20 text-center space-y-4 bg-app-card border-2 border-dashed border-app rounded-[3rem] animate-fade-in shadow-app">
                   <span className="text-4xl opacity-20 block" aria-hidden="true">🤝</span>
                   <p className="text-app-secondary font-black text-xs uppercase tracking-widest">{t.dashboard.everyoneSquare}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'stats' && (
          <div className="space-y-6 animate-zoom-in">
            <div className="bg-app-card border border-app p-6 rounded-[2rem] shadow-app flex items-center justify-between">
              <div><h3 className="text-app-secondary text-[10px] font-black uppercase tracking-widest mb-1">{t.dashboard.statsTitle}</h3><p className="text-sm font-light text-app-secondary">{t.dashboard.statsSubtitle}</p></div>
            </div>
            
            <div className="flex flex-col items-center py-6 bg-app-card/50 border border-app rounded-[3rem] shadow-app">
              <div className="relative w-56 h-56 mb-8 flex items-center justify-center">
                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90" aria-label="Expenses chart">
                  {(() => {
                    let currentAngle = 0;
                    return categoryData.map(([cat, amount], i) => {
                      const percent = amount / totalTripCost;
                      const segmentValue = percent * 100;
                      const strokeDash = `${segmentValue} ${100 - segmentValue}`;
                      const dashOffset = -currentAngle;
                      currentAngle += segmentValue;
                      
                      const isHovered = hoveredCategory === cat;
                      const anyHovered = hoveredCategory !== null;

                      return (
                        <circle 
                          key={cat} 
                          cx="50" cy="50" r="40" 
                          fill="transparent" 
                          stroke={CATEGORY_COLORS[cat] || '#64748b'} 
                          strokeWidth={isHovered ? "14" : "10"} 
                          strokeDasharray={strokeDash} 
                          strokeDashoffset={dashOffset} 
                          pathLength="100"
                          strokeLinecap="butt"
                          pointerEvents="visibleStroke"
                          className="transition-all duration-300 cursor-pointer origin-center"
                          style={{ 
                            opacity: anyHovered && !isHovered ? 0.3 : 1,
                            filter: isHovered ? `drop-shadow(0 0 6px ${CATEGORY_COLORS[cat]})` : 'none',
                            zIndex: isHovered ? 10 : 1
                          }}
                          onMouseEnter={() => setHoveredCategory(cat)}
                          onMouseLeave={() => setHoveredCategory(null)}
                        />
                      );
                    });
                  })()}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-6" aria-live="polite">
                  <span className="text-[10px] font-black text-app-muted uppercase tracking-widest transition-all duration-300">
                    {hoveredCategory ? hoveredCategory : 'Total'}
                  </span>
                  <span className="text-xl font-black text-app-primary transition-all duration-300">
                    {hoveredCategory 
                      ? formatCurrency(categoryData.find(d => d[0] === hoveredCategory)?.[1] || 0, trip.baseCurrency)
                      : formatCurrency(totalTripCost, trip.baseCurrency)
                    }
                  </span>
                  {hoveredCategory && (
                    <span className="text-[10px] font-black text-indigo-500/80 animate-zoom-in">
                      {Math.round(((categoryData.find(d => d[0] === hoveredCategory)?.[1] || 0) / totalTripCost) * 100)}%
                    </span>
                  )}
                </div>
              </div>

              <div className="w-full px-6 grid grid-cols-2 gap-3" role="list">
                {categoryData.map(([cat, amount]) => {
                  const isHovered = hoveredCategory === cat;
                  return (
                    <div 
                      key={cat} 
                      role="listitem"
                      tabIndex={0}
                      onMouseEnter={() => setHoveredCategory(cat)}
                      onMouseLeave={() => setHoveredCategory(null)}
                      onFocus={() => setHoveredCategory(cat)}
                      onBlur={() => setHoveredCategory(null)}
                      className={`flex items-center gap-2 p-3 rounded-2xl border transition-all duration-300 cursor-pointer shadow-app focus-visible:ring-2 focus-visible:ring-indigo-500 outline-none ${
                        isHovered 
                          ? 'bg-app-tertiary border-indigo-500/50 scale-[1.02] shadow-lg' 
                          : 'bg-app-card border-app'
                      }`}
                    >
                      <div 
                        className="w-3 h-3 rounded-full shrink-0 transition-transform duration-300" 
                        aria-hidden="true"
                        style={{ 
                          backgroundColor: CATEGORY_COLORS[cat] || '#64748b',
                          transform: isHovered ? 'scale(1.2)' : 'scale(1)'
                        }} 
                      />
                      <div className="min-w-0">
                          <p className={`text-[10px] font-black uppercase truncate transition-colors ${isHovered ? 'text-indigo-500' : 'text-app-secondary'}`}>{cat}</p>
                          <p className="text-xs font-bold text-app-primary">{formatCurrency(amount, trip.baseCurrency)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {expenseToDelete && (
        <div 
          className="fixed inset-0 z-[11000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
          role="dialog"
          aria-modal="true"
          onClick={() => setExpenseToDelete(null)}
        >
          <div 
            className="bg-app-card border border-app p-8 rounded-[2.5rem] shadow-2xl max-w-sm w-full animate-zoom-in"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-2xl font-black text-app-primary mb-2">{t.dashboard.removeTitle}</h3>
            <p className="text-app-secondary mb-8 leading-relaxed">{t.dashboard.removeSubtitle}</p>
            <div className="flex gap-4">
              <button onClick={() => setExpenseToDelete(null)} className="flex-1 py-4 px-4 rounded-2xl border border-app text-app-secondary font-bold hover:bg-app-tertiary transition-all focus-visible:ring-2 focus-visible:ring-indigo-500 outline-none">{t.common.cancel}</button>
              <button onClick={() => { actions.deleteExpense(expenseToDelete); setExpenseToDelete(null); }} className="flex-1 py-4 px-4 rounded-2xl bg-red-600 text-white font-black hover:bg-red-700 transition-all shadow-lg shadow-red-900/20 focus-visible:ring-2 focus-visible:ring-red-400 outline-none">{t.common.delete}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
