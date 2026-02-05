
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Person } from '../types';
import { useTranslation } from '../i18n/LanguageContext';
import { useTrip } from '../contexts/TripContext';

interface Props {
  isInitial: boolean;
}

const PeopleManager: React.FC<Props> = ({ isInitial }) => {
  const { trip, actions } = useTrip();
  const { t } = useTranslation();
  const mergeModalRef = useRef<HTMLDivElement>(null);

  if (!trip) return null;

  const [localPeople, setLocalPeople] = useState<Person[]>(trip.people);
  const [newName, setNewName] = useState('');
  const [mergingPersonId, setMergingPersonId] = useState<string | null>(null);

  useEffect(() => {
    if (mergingPersonId) {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') setMergingPersonId(null);
      };
      window.addEventListener('keydown', handleKeyDown);
      mergeModalRef.current?.focus();
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [mergingPersonId]);

  const sortedLocalPeople = useMemo(() => 
    [...localPeople].sort((a, b) => a.name.localeCompare(b.name)), 
    [localPeople]
  );

  const addPerson = (e: React.FormEvent) => {
    e.preventDefault();
    if (newName.trim()) {
      setLocalPeople([...localPeople, { id: crypto.randomUUID(), name: newName.trim() }]);
      setNewName('');
    }
  };

  const removePerson = (id: string) => {
    setLocalPeople(localPeople.map(p => {
      if (p.mergedWithId === id) return { ...p, mergedWithId: undefined };
      return p;
    }).filter(p => p.id !== id));
  };

  const toggleMerge = (id1: string, id2: string | undefined) => {
    if (!id2) {
      const currentPartnerId = localPeople.find(p => p.id === id1)?.mergedWithId;
      setLocalPeople(localPeople.map(p => {
        if (p.id === id1 || p.id === currentPartnerId) return { ...p, mergedWithId: undefined };
        return p;
      }));
      return;
    }

    setLocalPeople(localPeople.map(p => {
      if (p.id === id1) return { ...p, mergedWithId: id2 };
      if (p.id === id2) return { ...p, mergedWithId: id1 };
      if (p.mergedWithId === id1 || p.mergedWithId === id2) return { ...p, mergedWithId: undefined };
      return p;
    }));
    setMergingPersonId(null);
  };

  const handleSubmit = () => {
    if (localPeople.length >= 2) actions.updatePeople(localPeople);
    else alert(t.people.minPeopleAlert);
  };

  const getPartnerName = (person: Person) => {
    if (!person.mergedWithId) return null;
    return localPeople.find(p => p.id === person.mergedWithId)?.name;
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-app-primary tracking-tight">{t.people.title}</h2>
          <p className="text-app-secondary">{t.people.subtitle}</p>
        </div>
        {!isInitial && (
          <button 
            onClick={() => actions.setView('DASHBOARD')} 
            className="text-app-muted hover:text-app-primary transition-colors focus-visible:ring-2 focus-visible:ring-indigo-500 outline-none p-1 rounded"
          >
            {t.common.cancel}
          </button>
        )}
      </div>

      <form onSubmit={addPerson} className="flex gap-2">
        <input
          type="text"
          placeholder={t.people.placeholder}
          aria-label="New person name"
          className="flex-1 px-4 py-3 rounded-xl border border-app bg-app-card text-app-primary placeholder-app-muted focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-app"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          autoFocus
        />
        <button
          type="submit"
          disabled={!newName.trim()}
          className="bg-app-accent text-app-accent-fg px-6 py-3 rounded-xl font-medium hover:opacity-90 disabled:opacity-50 transition-all shadow-lg shadow-indigo-900/20 focus-visible:ring-2 focus-visible:ring-indigo-500 outline-none"
        >
          {t.people.addBtn}
        </button>
      </form>

      <div className="space-y-3" role="list" aria-label="Participant list">
        {sortedLocalPeople.map((person, idx) => {
          const partnerName = getPartnerName(person);
          return (
            <div 
              key={person.id} 
              role="listitem"
              className={`flex flex-col p-4 bg-app-card rounded-2xl border transition-all animate-slide-up shadow-app ${person.mergedWithId ? 'border-indigo-500/30 bg-indigo-500/[0.02]' : 'border-app'}`}
              style={{ animationDelay: `${idx * 0.04}s`, animationFillMode: 'both' }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border ${person.mergedWithId ? 'bg-indigo-500/20 text-indigo-500 border-indigo-500/30' : 'bg-app-tertiary text-app-secondary border-app'}`} aria-hidden="true">
                    {person.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <span className="font-bold text-app-primary">{person.name}</span>
                    {partnerName && (
                      <div className="flex items-center gap-1.5 mt-0.5 animate-zoom-in">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-indigo-500" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clipRule="evenodd" />
                        </svg>
                        <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500/60">Linked with {partnerName}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => person.mergedWithId ? toggleMerge(person.id, undefined) : setMergingPersonId(person.id)}
                    className={`p-2 rounded-lg transition-all focus-visible:ring-2 focus-visible:ring-indigo-500 outline-none ${person.mergedWithId ? 'text-indigo-500 hover:bg-indigo-500/10' : 'text-app-muted hover:text-indigo-500 hover:bg-app-tertiary'}`}
                    aria-label={person.mergedWithId ? `Unlink ${person.name} and ${partnerName}` : `Link ${person.name} with another person`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clipRule="evenodd" />
                    </svg>
                  </button>
                  <button 
                    onClick={() => removePerson(person.id)} 
                    aria-label={`Remove ${person.name}`}
                    className="p-2 text-app-muted hover:text-red-500 transition-all focus-visible:ring-2 focus-visible:ring-red-500 outline-none rounded-lg"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        {localPeople.length === 0 && (
          <div className="text-center py-10 text-app-muted border-2 border-dashed border-app rounded-xl bg-app-card/30 animate-fade-in shadow-app">
            {t.people.emptyState}
          </div>
        )}
      </div>

      <button onClick={handleSubmit} className="w-full bg-app-accent text-app-accent-fg font-bold py-4 rounded-xl shadow-lg transition-all mt-4 hover:opacity-90 focus-visible:ring-4 focus-visible:ring-indigo-500 outline-none">
        {isInitial ? t.people.continueBtn : t.common.save}
      </button>

      {mergingPersonId && (
        <div 
          className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
          role="dialog"
          aria-modal="true"
          onClick={() => setMergingPersonId(null)}
        >
          <div 
            ref={mergeModalRef}
            tabIndex={-1}
            className="bg-app-card border border-app rounded-[2.5rem] w-full max-w-sm p-6 space-y-6 shadow-2xl animate-zoom-in outline-none"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-1 text-center">
              <h3 className="text-xl font-black text-app-primary leading-tight">Link Economy</h3>
              <p className="text-app-secondary text-sm">Select someone to pool finances with {localPeople.find(p => p.id === mergingPersonId)?.name}.</p>
            </div>
            <div className="space-y-2 max-h-[40vh] overflow-y-auto no-scrollbar" role="listbox">
              {localPeople.filter(p => p.id !== mergingPersonId).map(p => (
                <button 
                  key={p.id} 
                  role="option"
                  onClick={() => toggleMerge(mergingPersonId, p.id)}
                  className="w-full flex items-center justify-between p-4 bg-app-tertiary hover:bg-indigo-600 hover:text-white rounded-2xl transition-all group shadow-app focus-visible:ring-2 focus-visible:ring-indigo-500 outline-none"
                >
                  <span className="font-bold">{p.name}</span>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
              ))}
            </div>
            <button onClick={() => setMergingPersonId(null)} className="w-full py-3 text-app-secondary font-bold hover:text-app-primary transition-colors focus-visible:ring-2 focus-visible:ring-indigo-500 outline-none rounded-xl">{t.common.cancel}</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PeopleManager;
