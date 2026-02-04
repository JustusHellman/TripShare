
import React, { useState, useMemo } from 'react';
import { Person } from '../types';
import { useTranslation } from '../i18n/LanguageContext';

interface Props {
  people: Person[];
  onSave: (people: Person[]) => void;
  onCancel: () => void;
  isInitial: boolean;
}

const PeopleManager: React.FC<Props> = ({ people, onSave, onCancel, isInitial }) => {
  const { t } = useTranslation();
  const [localPeople, setLocalPeople] = useState<Person[]>(people);
  const [newName, setNewName] = useState('');
  const [mergingPersonId, setMergingPersonId] = useState<string | null>(null);

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
      // Unmerge id1 and whoever they were merged with
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
      // If either was merged with someone else, clear those old links
      if (p.mergedWithId === id1 || p.mergedWithId === id2) return { ...p, mergedWithId: undefined };
      return p;
    }));
    setMergingPersonId(null);
  };

  const handleSubmit = () => {
    if (localPeople.length >= 2) onSave(localPeople);
    else alert(t.people.minPeopleAlert);
  };

  const getPartnerName = (person: Person) => {
    if (!person.mergedWithId) return null;
    return localPeople.find(p => p.id === person.mergedWithId)?.name;
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">{t.people.title}</h2>
          <p className="text-slate-400">{t.people.subtitle}</p>
        </div>
        {!isInitial && (
          <button onClick={onCancel} className="text-slate-500 hover:text-slate-300 transition-colors">
            {t.common.cancel}
          </button>
        )}
      </div>

      <form onSubmit={addPerson} className="flex gap-2">
        <input
          type="text"
          placeholder={t.people.placeholder}
          className="flex-1 px-4 py-3 rounded-xl border border-slate-800 bg-slate-900 text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          autoFocus
        />
        <button
          type="submit"
          className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-900/20"
        >
          {t.people.addBtn}
        </button>
      </form>

      <div className="space-y-3">
        {sortedLocalPeople.map((person) => {
          const partnerName = getPartnerName(person);
          return (
            <div key={person.id} className={`flex flex-col p-4 bg-slate-900 rounded-2xl border transition-all ${person.mergedWithId ? 'border-indigo-500/30 bg-indigo-500/[0.02]' : 'border-slate-800'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border ${person.mergedWithId ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' : 'bg-slate-800 text-slate-500 border-slate-700'}`}>
                    {person.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <span className="font-bold text-slate-200">{person.name}</span>
                    {partnerName && (
                      <div className="flex items-center gap-1.5 mt-0.5">
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
                    className={`p-2 rounded-lg transition-colors ${person.mergedWithId ? 'text-indigo-400 hover:bg-indigo-500/10' : 'text-slate-600 hover:text-indigo-400 hover:bg-slate-800'}`}
                    title={person.mergedWithId ? "Unlink economy" : "Link economy"}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clipRule="evenodd" />
                    </svg>
                  </button>
                  <button onClick={() => removePerson(person.id)} className="p-2 text-slate-600 hover:text-red-500 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        {localPeople.length === 0 && (
          <div className="text-center py-10 text-slate-500 border-2 border-dashed border-slate-800 rounded-xl bg-slate-900/50">
            {t.people.emptyState}
          </div>
        )}
      </div>

      <button onClick={handleSubmit} className="w-full bg-slate-100 hover:bg-white text-slate-950 font-bold py-4 rounded-xl shadow-lg transition-all">
        {isInitial ? t.people.continueBtn : t.common.save}
      </button>

      {/* Merging Modal */}
      {mergingPersonId && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] w-full max-w-sm p-6 space-y-6 shadow-2xl">
            <div className="space-y-1">
              <h3 className="text-xl font-black text-white leading-tight">Link Economy</h3>
              <p className="text-slate-500 text-sm">Select someone to pool finances with {localPeople.find(p => p.id === mergingPersonId)?.name}.</p>
            </div>
            <div className="space-y-2 max-h-[40vh] overflow-y-auto no-scrollbar">
              {localPeople.filter(p => p.id !== mergingPersonId).map(p => (
                <button 
                  key={p.id} 
                  onClick={() => toggleMerge(mergingPersonId, p.id)}
                  className="w-full flex items-center justify-between p-4 bg-slate-800/50 hover:bg-indigo-600 hover:text-white rounded-2xl transition-all group"
                >
                  <span className="font-bold">{p.name}</span>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
              ))}
            </div>
            <button onClick={() => setMergingPersonId(null)} className="w-full py-3 text-slate-500 font-bold hover:text-white transition-colors">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PeopleManager;
