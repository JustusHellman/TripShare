
import React, { useState, useMemo } from 'react';
import { Trip, Expense } from '../types';
import { calculateOptimizedSettlements, calculateDetailedBalances, formatCurrency } from '../utils/calculations';
import { useTranslation } from '../i18n/LanguageContext';

interface Props {
  trip: Trip;
  onAddExpense: () => void;
  onEditExpense: (expense: Expense) => void;
  onEditPeople: () => void;
  onOpenLanguage: () => void;
  onDeleteExpense: (id: string) => void;
  onReset: () => void;
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

const Dashboard: React.FC<Props> = ({ trip, onAddExpense, onEditExpense, onEditPeople, onOpenLanguage, onDeleteExpense, onReset }) => {
  const { t, language } = useTranslation();
  const [activeTab, setActiveTab] = useState<MainTab>('expenses');
  const [expenseToDelete, setExpenseToDelete] = useState<string | null>(null);
  const [showCopied, setShowCopied] = useState(false);
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);
  
  const [sortBy, setSortBy] = useState<SortOption>('date');
  const [sortPersonId, setSortPersonId] = useState<string | null>(null);

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
  }, [trip.expenses, sortBy, sortPersonId, trip.people]);

  const copyShareLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setShowCopied(true);
    setTimeout(() => setShowCopied(false), 2000);
  };

  const handleCategoryHover = (cat: string | null) => {
    if (cat && cat !== hoveredCategory && typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(5);
    }
    setHoveredCategory(cat);
  };

  const currentFlag = language === 'en' ? '🇬🇧' : '🇸🇪';

  return (
    <div className="space-y-6 animate-in fade-in duration-500 relative pb-20">
      <div className="flex justify-between items-start mb-2">
        <div className="flex-1 min-w-0">
          <h1 className="text-3xl font-black text-white tracking-tight truncate leading-tight">{trip.name}</h1>
          <p className="text-slate-500 text-sm">{t.dashboard.totalCost} <span className="font-bold text-slate-300">{formatCurrency(totalTripCost, trip.baseCurrency)}</span></p>
        </div>
        <button 
          onClick={onOpenLanguage}
          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg hover:bg-slate-800 transition-all active:scale-95 text-xs font-bold text-slate-400"
        >
          <span>{currentFlag}</span>
        </button>
      </div>

      <div className="flex gap-2">
        <button onClick={onAddExpense} className="flex-1 flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-900/20 transition-all active:scale-95">
           <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
           {t.dashboard.addExpense}
        </button>
        <button onClick={copyShareLink} className={`px-4 rounded-xl border transition-all active:scale-95 flex items-center justify-center ${showCopied ? 'bg-green-500/10 border-green-500/50 text-green-400' : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-indigo-400'}`}>
          {showCopied ? <span className="text-[10px] font-black">{t.common.copied}</span> : <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" /></svg>}
        </button>
        <button onClick={onEditPeople} className="px-4 rounded-xl bg-slate-900 border border-slate-800 text-slate-500 hover:text-indigo-400 active:scale-95 transition-all"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" /></svg></button>
        <button onClick={onReset} className="px-4 rounded-xl bg-slate-900 border border-slate-800 text-slate-500 hover:text-red-400 active:scale-95 transition-all"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" /></svg></button>
      </div>

      <div className="flex p-1 bg-slate-900 border border-slate-800 rounded-2xl overflow-x-auto no-scrollbar">
        {(['expenses', 'balances', 'settle', 'stats'] as MainTab[]).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 min-w-[80px] py-2.5 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all ${activeTab === tab ? 'bg-slate-800 text-indigo-400 shadow-sm' : 'text-slate-600 hover:text-slate-400'}`}>
            {tab === 'expenses' ? t.dashboard.tabExpenses : tab === 'balances' ? t.dashboard.tabBalances : tab === 'settle' ? t.dashboard.tabSettle : t.dashboard.tabStats}
          </button>
        ))}
      </div>

      {activeTab === 'expenses' && (
        <div className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-300">
          <div className="flex flex-col space-y-4">
             <div className="flex items-center justify-between">
                <h3 className="font-black text-slate-600 uppercase text-[10px] tracking-[0.2em]">{t.dashboard.recentActivity}</h3>
             </div>
             <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar -mx-4 px-4">
                <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest shrink-0">{t.dashboard.sortBy}</span>
                <button 
                  onClick={() => setSortBy('date')}
                  className={`px-3 py-1.5 text-[11px] font-bold rounded-full border transition-all shrink-0 active:scale-95 ${sortBy === 'date' ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-950 border-slate-900 text-slate-600'}`}
                >
                  {t.dashboard.sortDate}
                </button>
                <div className={`flex items-center gap-1 px-3 py-1.5 rounded-full border transition-all shrink-0 ${sortBy === 'paidBy' ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-950 border-slate-900 text-slate-600'}`}>
                  <span className="text-[11px] font-bold cursor-pointer" onClick={() => { setSortBy('paidBy'); if(!sortPersonId) setSortPersonId(trip.people[0]?.id); }}>{t.dashboard.sortPayer}:</span>
                  <select 
                    className="bg-transparent border-none outline-none focus:ring-0 p-0 text-[11px] font-bold cursor-pointer"
                    value={sortBy === 'paidBy' ? (sortPersonId || '') : ''}
                    onChange={(e) => { setSortBy('paidBy'); setSortPersonId(e.target.value); }}
                  >
                    {!sortPersonId && <option value="" disabled>-</option>}
                    {trip.people.map(p => <option key={p.id} value={p.id} className="bg-slate-950 text-white">{p.name}</option>)}
                  </select>
                </div>
             </div>
          </div>

          <div className="space-y-3">
            {sortedExpenses.map((expense) => {
              const valueInBase = expense.amount * (expense.exchangeRate || 1);
              const isDifferentCurrency = expense.currency !== trip.baseCurrency;
              
              return (
                <div key={expense.id} className="group p-4 bg-slate-900/60 border border-slate-800 rounded-2xl shadow-sm hover:border-slate-700 transition-all">
                  <div className="flex justify-between items-start">
                    <div className="min-w-0 pr-4">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded bg-slate-800 text-slate-500 border border-slate-700">{expense.category || 'Other'}</span>
                        <h4 className="font-bold text-slate-100 truncate">{expense.description}</h4>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">{t.dashboard.paidBy} <span className="text-indigo-400 font-bold">{getPersonName(expense.paidById)}</span></p>
                      <div className="mt-3 flex gap-2 items-center">
                        <span className="text-[9px] uppercase font-black tracking-widest text-slate-600 shrink-0">{t.dashboard.splittingWith}</span>
                        <div className="flex -space-x-1.5">
                          {expense.splitAmongIds === 'ALL' ? <div className="px-1.5 py-0.5 bg-slate-800 rounded text-[9px] text-slate-400 font-black uppercase border border-slate-700">{t.common.all}</div> : expense.splitAmongIds.slice(0, 3).map(id => <div key={id} className="w-5 h-5 rounded-full border border-slate-900 bg-indigo-500/20 flex items-center justify-center text-[9px] text-indigo-400 font-black">{getPersonName(id).charAt(0).toUpperCase()}</div>)}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end shrink-0">
                      <span className="text-lg font-black text-white">{formatCurrency(expense.amount, expense.currency)}</span>
                      {isDifferentCurrency && <span className="text-[10px] text-slate-600 font-bold">≈ {formatCurrency(valueInBase, trip.baseCurrency)}</span>}
                      <div className="flex gap-2.5 mt-2.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => onEditExpense(expense)} className="text-slate-600 hover:text-indigo-400 active:scale-95 transition-all"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg></button>
                        <button onClick={() => setExpenseToDelete(expense.id)} className="text-slate-600 hover:text-red-500 active:scale-95 transition-all"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg></button>
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
        <div className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-300">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-[2rem] text-white shadow-xl flex items-center justify-between"><div><h3 className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">{t.dashboard.financialOverview} ({trip.baseCurrency})</h3><p className="text-sm font-light leading-snug text-slate-400">{t.dashboard.balanceSubtitle}</p></div><div className="text-3xl grayscale opacity-30">📊</div></div>
          <div className="grid gap-3">
            {Object.entries(detailedBalances).sort((a,b) => b[1].netBalance - a[1].netBalance).map(([key, stats]) => (
              <div key={key} className={`p-5 bg-slate-900/60 border rounded-2xl shadow-sm ${stats.isMerged ? 'border-indigo-500/30 bg-indigo-500/[0.02]' : 'border-slate-800'}`}>
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-xs ${stats.isMerged ? 'bg-indigo-600 text-white' : 'bg-slate-950 border border-slate-800 text-slate-300'}`}>{getGroupName(key).charAt(0).toUpperCase()}</div>
                    <span className="font-bold text-slate-100">{getGroupName(key)}</span>
                  </div>
                  <div className={`text-sm font-black px-3 py-1 rounded-lg border ${stats.netBalance >= 0 ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>{stats.netBalance >= 0 ? '+' : ''}{formatCurrency(stats.netBalance, trip.baseCurrency)}</div>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-800/50"><div><span className="block text-[9px] text-slate-600 uppercase font-black tracking-widest mb-1">{t.dashboard.totalPaid}</span><span className="text-sm font-bold text-slate-300">{formatCurrency(stats.totalPaid, trip.baseCurrency)}</span></div><div className="text-right"><span className="block text-[9px] text-slate-600 uppercase font-black tracking-widest mb-1">{t.dashboard.portion}</span><span className="text-sm font-bold text-slate-300">{formatCurrency(stats.share, trip.baseCurrency)}</span></div></div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'settle' && (
        <div className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-300">
          <div className="bg-indigo-600/10 border border-indigo-500/20 p-6 rounded-[2rem] text-white shadow-lg flex items-center justify-between"><div><h3 className="text-indigo-400 text-[10px] font-black uppercase tracking-widest mb-1">{t.dashboard.optimizedPayments} ({trip.baseCurrency})</h3><p className="text-sm font-light text-slate-400 leading-snug">{t.dashboard.settleSubtitle}</p></div><div className="text-3xl">✨</div></div>
          <div className="space-y-3">
            {optimizedSettlements.map((s, idx) => (
              <div key={idx} className="p-5 bg-slate-900 border border-slate-800 rounded-[2rem] shadow-sm flex items-center gap-4">
                <div className="flex-1 text-center"><p className="font-bold text-slate-100 text-xs truncate">{getGroupName(s.from)}</p><p className="text-[9px] font-black uppercase text-slate-600">{t.dashboard.pays}</p></div>
                <div className="flex flex-col items-center"><div className="text-lg font-black text-indigo-400">{formatCurrency(s.amount, trip.baseCurrency)}</div><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-indigo-500/50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg></div>
                <div className="flex-1 text-center"><p className="font-bold text-slate-100 text-xs truncate">{getGroupName(s.to)}</p><p className="text-[9px] font-black uppercase text-slate-600">{t.dashboard.to}</p></div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'stats' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-2 duration-300">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-[2rem] flex items-center justify-between">
            <div><h3 className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">{t.dashboard.statsTitle}</h3><p className="text-sm font-light text-slate-400">{t.dashboard.statsSubtitle}</p></div>
          </div>
          
          <div className="flex flex-col items-center py-6 bg-slate-900/30 border border-slate-800 rounded-[3rem]">
            <div className="relative w-56 h-56 mb-8 flex items-center justify-center">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
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
                        onMouseEnter={() => handleCategoryHover(cat)}
                        onMouseLeave={() => handleCategoryHover(null)}
                        onTouchStart={() => handleCategoryHover(cat)}
                      />
                    );
                  });
                })()}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-6">
                <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest transition-all duration-300">
                  {hoveredCategory ? hoveredCategory : 'Total'}
                </span>
                <span className="text-xl font-black text-white transition-all duration-300">
                  {hoveredCategory 
                    ? formatCurrency(categoryData.find(d => d[0] === hoveredCategory)?.[1] || 0, trip.baseCurrency)
                    : formatCurrency(totalTripCost, trip.baseCurrency)
                  }
                </span>
                {hoveredCategory && (
                  <span className="text-[10px] font-black text-indigo-400/80 animate-in fade-in zoom-in-75 duration-200">
                    {Math.round(((categoryData.find(d => d[0] === hoveredCategory)?.[1] || 0) / totalTripCost) * 100)}%
                  </span>
                )}
              </div>
            </div>

            <div className="w-full px-6 grid grid-cols-2 gap-3">
              {categoryData.map(([cat, amount]) => {
                const isHovered = hoveredCategory === cat;
                return (
                  <div 
                    key={cat} 
                    onMouseEnter={() => handleCategoryHover(cat)}
                    onMouseLeave={() => handleCategoryHover(null)}
                    className={`flex items-center gap-2 p-3 rounded-2xl border transition-all duration-300 cursor-pointer ${
                      isHovered 
                        ? 'bg-slate-800 border-indigo-500/50 scale-[1.02] shadow-lg shadow-indigo-900/10' 
                        : 'bg-slate-900 border-slate-800 opacity-80'
                    }`}
                  >
                    <div 
                      className="w-3 h-3 rounded-full shrink-0 transition-transform duration-300" 
                      style={{ 
                        backgroundColor: CATEGORY_COLORS[cat] || '#64748b',
                        transform: isHovered ? 'scale(1.2)' : 'scale(1)'
                      }} 
                    />
                    <div className="min-w-0">
                        <p className={`text-[10px] font-black uppercase truncate transition-colors ${isHovered ? 'text-indigo-400' : 'text-slate-500'}`}>{cat}</p>
                        <p className="text-xs font-bold text-slate-100">{formatCurrency(amount, trip.baseCurrency)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {expenseToDelete && (
        <div className="fixed inset-0 z-[11000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-[2.5rem] shadow-2xl max-w-sm w-full animate-in zoom-in-95 duration-200">
            <h3 className="text-2xl font-black text-white mb-2">{t.dashboard.removeTitle}</h3>
            <p className="text-slate-400 mb-8 leading-relaxed">{t.dashboard.removeSubtitle}</p>
            <div className="flex gap-4">
              <button onClick={() => setExpenseToDelete(null)} className="flex-1 py-4 px-4 rounded-2xl border border-slate-800 text-slate-500 font-bold hover:bg-slate-800 active:scale-95 transition-all">{t.common.cancel}</button>
              <button onClick={() => { onDeleteExpense(expenseToDelete); setExpenseToDelete(null); }} className="flex-1 py-4 px-4 rounded-2xl bg-red-600 text-white font-black hover:bg-red-700 active:scale-95 transition-all shadow-lg shadow-red-900/20">{t.common.delete}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
