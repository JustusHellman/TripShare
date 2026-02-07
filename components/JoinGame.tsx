
import React, { useState, useEffect } from 'react';
import { strings } from '../i18n';

interface JoinGameProps {
  onBack: () => void;
  onJoin: (code: string, name: string, color: string) => void;
  onCodeChange?: (code: string) => void;
  isSearching: boolean;
  error: string | null;
  prefilledCode?: string;
}

const availableColors = ['#6366f1', '#0d9488', '#10b981', '#f59e0b', '#06b6d4', '#d946ef', '#8b5cf6', '#f97316'];

const JoinGame: React.FC<JoinGameProps> = ({ onBack, onJoin, onCodeChange, isSearching, error, prefilledCode }) => {
  const [code, setCode] = useState(prefilledCode || '');
  const [name, setName] = useState('');
  const [selectedColor, setSelectedColor] = useState(availableColors[0]);

  useEffect(() => {
    if (prefilledCode) {
      setCode(prefilledCode);
    }
  }, [prefilledCode]);

  useEffect(() => {
    if (onCodeChange) {
      const trimmed = code.trim().toUpperCase();
      if (trimmed.length >= 4) {
        onCodeChange(trimmed);
      }
    }
  }, [code, onCodeChange]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#f9fbfa]">
      <div className="max-w-md w-full">
        <button onClick={onBack} className="mb-8 text-[#0f1a16]/40 hover:text-[#0f1a16] flex items-center font-bold text-xs uppercase tracking-widest transition-all">
           <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
           {strings.join.back}
        </button>
        <div className="bg-white rounded-[3rem] p-12 border border-black/5 shadow-[0_40px_80px_-15px_rgba(15,26,22,0.1)]">
          <h2 className="text-3xl font-black text-[#0f1a16] mb-10 text-center tracking-tight uppercase">{strings.join.title}</h2>
          <div className="space-y-6">
            <div className="relative">
              <input 
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder={strings.join.gameCode} 
                className="w-full px-8 py-5 bg-[#f9fbfa] border-0 rounded-2xl outline-none focus:ring-2 focus:ring-[#0f1a16]/5 uppercase font-bold text-center tracking-[0.3em] text-xl text-[#0f1a16] placeholder:opacity-20 transition-all" 
              />
              {isSearching && (
                <div className="absolute top-1/2 -translate-y-1/2 right-6">
                  <div className="w-2 h-2 rounded-full bg-[#8c6b4f] animate-ping"></div>
                </div>
              )}
            </div>
            <input 
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={strings.join.yourName} 
              className="w-full px-8 py-5 bg-[#f9fbfa] border-0 rounded-2xl outline-none focus:ring-2 focus:ring-[#0f1a16]/5 text-[#0f1a16] font-bold placeholder:opacity-20 transition-all" 
            />
            
            {error && (
              <p className="text-[#7c2d12] text-[10px] font-black uppercase text-center tracking-widest animate-in fade-in zoom-in duration-300">
                {error}
              </p>
            )}

            <div className="space-y-4 pt-2">
              <label className="text-[10px] font-bold text-[#0f1a16]/30 uppercase tracking-[0.4em] ml-2">{strings.lobby.chooseColor}</label>
              <div className="flex flex-wrap gap-4 justify-center">
                {availableColors.map(color => (
                  <button 
                    key={color} 
                    onClick={() => setSelectedColor(color)} 
                    className={`w-10 h-10 rounded-full transition-all active:scale-90 ${selectedColor === color ? 'ring-4 ring-black/10 scale-110 shadow-lg border-2 border-white' : 'opacity-40 hover:opacity-100'}`} 
                    style={{ backgroundColor: color }} 
                  />
                ))}
              </div>
            </div>
            <button 
              onClick={() => onJoin(code, name, selectedColor)} 
              className="w-full py-5 btn-sleek btn-sleek-pine text-base mt-6"
            >
              {strings.join.joinLobby}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JoinGame;
