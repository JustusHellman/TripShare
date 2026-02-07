import React, { useState } from 'react';
import { GameState, Question } from '../types';
import { formatDistance } from '../utils';
import { strings } from '../i18n';
import Map from './Map';
import Scoreboard from './Scoreboard';
import ImageOverlay from './ImageOverlay';

interface HostBoardProps {
  gameState: GameState;
  currentQ: Question;
  isRoundFinished: boolean;
  isScoreboard: boolean;
  isLastRound: boolean;
  canProceed: boolean;
  onReveal?: () => void;
  onForceReveal?: () => void;
  onShowScoreboard: () => void;
  onNext: () => void;
  onSetCanProceed: (can: boolean) => void;
}

const HostBoard: React.FC<HostBoardProps> = ({ 
  gameState, 
  currentQ, 
  isRoundFinished, 
  isScoreboard, 
  isLastRound,
  canProceed,
  onReveal, 
  onForceReveal, 
  onShowScoreboard, 
  onNext,
  onSetCanProceed
}) => {
  const [isFullscreenImage, setIsFullscreenImage] = useState(false);
  const [showForceConfirm, setShowForceConfirm] = useState(false);

  const markers = [
    { position: currentQ.location, label: strings.game.actualLocation, icon: 'target' as const },
    ...gameState.players.filter(p => p.hasGuessed && p.lastGuess).map(p => ({
      position: p.lastGuess!,
      label: p.name,
      color: p.color,
      icon: 'user' as const
    }))
  ];

  const lines = gameState.players.filter(p => p.lastGuess).map(p => ({ 
    from: p.lastGuess!, 
    to: currentQ.location, 
    color: p.color 
  }));

  const nonGuessedNames = gameState.players.filter(p => !p.hasGuessed).map(p => p.name).join(', ');

  return (
    <div className="h-screen flex flex-col md:flex-row bg-[#f9fbfa] overflow-hidden">
      {showForceConfirm && (
        <div className="fixed inset-0 z-[3000] bg-[#0f1a16]/40 backdrop-blur-md flex items-center justify-center p-6 text-center">
          <div className="bg-white p-10 rounded-[3rem] w-full max-w-sm shadow-2xl border border-black/5 animate-in zoom-in duration-300">
            <h3 className="text-xl font-black mb-4 uppercase tracking-tight">Reveal Results?</h3>
            <p className="text-[#0f1a16]/60 text-sm mb-8 font-medium">
              {nonGuessedNames} haven't locked in yet. They will receive 0 points if you proceed.
            </p>
            <div className="flex gap-4">
              <button onClick={() => setShowForceConfirm(false)} className="flex-1 py-4 bg-[#f9fbfa] rounded-2xl font-bold text-xs uppercase tracking-widest transition-all hover:bg-black/5">Wait</button>
              <button onClick={() => { setShowForceConfirm(false); onForceReveal?.(); }} className="flex-1 py-4 bg-[#7c2d12] text-white rounded-2xl font-bold text-xs uppercase tracking-widest transition-all hover:opacity-90">Reveal Now</button>
            </div>
          </div>
        </div>
      )}

      <div className="w-full md:w-80 h-1/2 md:h-full bg-white border-r border-[#2d4239]/5 p-8 flex flex-col overflow-y-auto z-20">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black uppercase tracking-[0.5em] text-[#8c6b4f]">
              {strings.lobby.host} <span className="opacity-30 ml-2 tracking-widest">#{gameState.id}</span>
            </span>
          </div>
          <h2 className="text-2xl font-black uppercase tracking-tight">{isRoundFinished ? strings.game.roundResults : isScoreboard ? "Standings" : "In Progress"}</h2>
        </div>

        <div className="space-y-4 flex-1">
          <label className="text-[9px] font-black uppercase tracking-widest text-[#0f1a16]/40">{strings.lobby.playersJoined(gameState.players.length)}</label>
          {gameState.players.map(p => (
            <div key={p.id} className="p-4 bg-[#f9fbfa] rounded-2xl border border-black/5 flex items-center justify-between space-x-4">
              <div className="flex items-center space-x-3 overflow-hidden flex-1">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-white text-xs shrink-0" style={{ backgroundColor: p.color }}>{p.name.charAt(0)}</div>
                <div className="flex items-center space-x-2 truncate">
                  <span className="font-black text-xs uppercase tracking-tight truncate">{p.name}</span>
                  {p.hasGuessed && p.lastDistance !== undefined && !isScoreboard && (
                    <span className="text-[10px] font-black text-[#8c6b4f] whitespace-nowrap">
                      {formatDistance(p.lastDistance)}
                    </span>
                  )}
                </div>
              </div>
              <div className="shrink-0">
                {p.hasGuessed ? (
                  <div className="w-5 h-5 bg-[#10b981] rounded-full flex items-center justify-center text-white">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" /></svg>
                  </div>
                ) : (
                  <div className="w-5 h-5 border-2 border-dashed border-[#0f1a16]/10 rounded-full"></div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="pt-8 border-t border-black/5 mt-auto space-y-3 pb-6">
          {(!isRoundFinished && !isScoreboard) ? (
            <button 
              onClick={() => {
                const nonGuessed = gameState.players.filter(p => !p.hasGuessed);
                if (nonGuessed.length > 0) setShowForceConfirm(true); else onReveal?.();
              }}
              disabled={gameState.players.length === 0}
              className={`w-full py-5 btn-sleek !text-sm ${gameState.players.length > 0 ? 'btn-sleek-pine !bg-[#2d4239]' : 'bg-[#f9fbfa] text-[#0f1a16]/10 shadow-none cursor-not-allowed'}`}
            >
              {strings.game.revealResults}
            </button>
          ) : isRoundFinished ? (
            <button 
              onClick={onShowScoreboard} 
              className="w-full py-5 btn-sleek btn-sleek-pine !text-sm"
            >
              {isLastRound ? "Reveal Final Standing" : "View Standings"}
            </button>
          ) : (
            <button 
              disabled={!canProceed}
              onClick={onNext} 
              className={`w-full py-5 btn-sleek !text-sm ${canProceed ? 'btn-sleek-pine !bg-[#2d4239]' : 'bg-[#f9fbfa] text-[#0f1a16]/10 shadow-none'}`}
            >
              {isLastRound ? "Finish Expedition" : "Start Next Location"}
            </button>
          )}
        </div>

        <div className="mt-2 p-3 bg-[#f9fbfa] rounded-[2rem] border border-black/5 shadow-inner shrink-0">
          <button onClick={() => setIsFullscreenImage(true)} className="w-full relative group">
            <img src={currentQ.imageUrl} className="w-full aspect-square object-cover rounded-[1.5rem] border border-black/5 shadow-sm" />
            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity rounded-[1.5rem] flex items-center justify-center backdrop-blur-[2px]">
              <span className="bg-white text-[#0f1a16] px-4 py-2 rounded-full font-black text-[9px] uppercase tracking-widest">{strings.common.expand}</span>
            </div>
          </button>
          <p className="mt-3 text-[10px] font-black uppercase tracking-[0.4em] text-[#8c6b4f] text-center">{strings.game.locationCounter(gameState.currentQuestionIndex + 1, gameState.questions.length)}</p>
        </div>
      </div>

      <div className="flex-1 relative bg-[#f9fbfa] p-8">
        {isScoreboard ? (
          <Scoreboard players={gameState.players} isLastRound={isLastRound} isHost onAnimationComplete={() => onSetCanProceed(true)} />
        ) : (
          <Map center={currentQ.location} zoom={14} markers={markers} lines={lines} roundIndex={gameState.currentQuestionIndex} />
        )}
      </div>

      {isFullscreenImage && (
        <ImageOverlay imageUrl={currentQ.imageUrl} onClose={() => setIsFullscreenImage(false)} />
      )}
    </div>
  );
};

export default HostBoard;