import React, { useState, useEffect, useMemo } from 'react';
import { GameState, Player, Location } from '../types';
import { strings } from '../i18n';
import HostBoard from './HostBoard';
import PlayerBoard from './PlayerBoard';

interface GameBoardProps {
  gameState: GameState;
  isHost: boolean;
  currentPlayer: Player | null;
  onGuess: (loc: Location) => void;
  onUnlock: () => void;
  onReveal?: () => void;
  onForceReveal?: () => void;
  onCountdownFinish: () => void;
  onShowScoreboard: () => void;
  onNext: () => void;
  onExit: () => void;
}

const isValidLoc = (loc?: Location): boolean => 
  !!loc && typeof loc.lat === 'number' && !isNaN(loc.lat) && typeof loc.lng === 'number' && !isNaN(loc.lng);

const GameBoard: React.FC<GameBoardProps> = ({ 
  gameState, 
  isHost, 
  currentPlayer, 
  onGuess, 
  onUnlock,
  onReveal,
  onForceReveal,
  onCountdownFinish, 
  onShowScoreboard,
  onNext, 
  onExit 
}) => {
  const [canProceed, setCanProceed] = useState(false);
  const [countdownValue, setCountdownValue] = useState(3);
  
  const currentQ = gameState.questions[gameState.currentQuestionIndex];
  const isCountingDown = gameState.status === 'COUNTDOWN';
  const isRoundFinished = gameState.status === 'RESULTS';
  const isScoreboard = gameState.status === 'SCOREBOARD';
  const isGameFinished = gameState.status === 'FINISHED';
  const isLastRound = gameState.currentQuestionIndex === gameState.questions.length - 1;

  const playerMapConfig = useMemo(() => {
    // Explicit user-defined view
    if (gameState.startingView && isValidLoc(gameState.startingView.center)) return gameState.startingView;
    
    // Auto-calculate view based on markers
    const validQuestions = gameState.questions.filter(q => isValidLoc(q.location));
    if (validQuestions.length === 0) return { center: { lat: 59.3293, lng: 18.0686 }, zoom: 12 };

    const lats = validQuestions.map(q => q.location.lat);
    const lngs = validQuestions.map(q => q.location.lng);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    const center = { lat: (minLat + maxLat) / 2, lng: (minLng + maxLng) / 2 };
    
    // Improved dynamic zoom calculation
    const latDiff = maxLat - minLat;
    const lngDiff = maxLng - minLng;
    const maxDiff = Math.max(latDiff, lngDiff);
    
    let zoom = 12;
    if (maxDiff > 0) {
      // Basic log-based zoom calculation to fit the extent
      zoom = Math.floor(Math.log2(360 / maxDiff)) - 1;
      // Clamp between sensible limits
      zoom = Math.max(2, Math.min(zoom, 14));
    } else {
      zoom = 14;
    }

    return { center, zoom };
  }, [gameState.startingView, gameState.questions]);

  useEffect(() => {
    if (isCountingDown) {
      if (countdownValue > 0) {
        const timer = window.setTimeout(() => setCountdownValue(v => v - 1), 1000);
        return () => clearTimeout(timer);
      } else {
        onCountdownFinish();
      }
    }
  }, [isCountingDown, countdownValue, onCountdownFinish]);

  useEffect(() => {
    setCountdownValue(3);
    setCanProceed(false);
  }, [gameState.currentQuestionIndex]);

  if (isGameFinished) {
    return (
      <div className="min-h-screen bg-[#f9fbfa] p-6 flex flex-col items-center justify-center text-[#0f1a16]">
        <h1 className="text-4xl font-black mb-12 uppercase tracking-tight text-[#0f1a16]">{strings.game.expeditionComplete}</h1>
        <div className="bg-white rounded-[3.5rem] p-10 shadow-[0_60px_100px_-20px_rgba(45,66,57,0.15)] w-full max-w-md border border-[#2d4239]/10">
          <div className="space-y-6">
            {[...gameState.players].sort((a,b) => b.score - a.score).map((p, idx) => (
              <div key={p.id} className={`flex items-center justify-between p-5 rounded-[2rem] transition-all border ${idx === 0 ? 'bg-[#ca8a04]/5 border-[#ca8a04]/20 shadow-lg scale-105' : 'bg-[#f9fbfa] border-black/5'}`}>
                <div className="flex items-center space-x-5">
                  <div className={`text-2xl font-black ${idx === 0 ? 'text-[#ca8a04]' : 'opacity-10'}`}>#{idx + 1}</div>
                  <div className="w-12 h-12 rounded-[1.25rem] flex items-center justify-center font-black text-white shadow-md border-2 border-white/20" style={{ backgroundColor: p.color }}>{p.name.charAt(0)}</div>
                  <div className="font-black uppercase tracking-tight text-sm text-[#0f1a16]">{p.name}</div>
                </div>
                <div className="text-lg font-black text-[#2d4239] tracking-tight">{strings.game.points(p.score)}</div>
              </div>
            ))}
          </div>
          <button onClick={onExit} className="w-full mt-12 btn-sleek btn-sleek-pine !bg-[#2d4239] !py-6">{strings.game.playAgain}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#f9fbfa] overflow-hidden">
      {isCountingDown && (
        <div className="fixed inset-0 z-[2500] bg-[#0f1a16]/95 backdrop-blur-3xl flex flex-col items-center justify-center text-white animate-in fade-in duration-500">
           <p className="text-white/40 font-black uppercase tracking-[1em] text-[10px] mb-8">{strings.game.countdownTitle}</p>
           <div className="text-[12rem] font-black animate-bounce tracking-tighter">{countdownValue}</div>
        </div>
      )}

      {isHost ? (
        <HostBoard 
          gameState={gameState} 
          currentQ={currentQ} 
          isRoundFinished={isRoundFinished} 
          isScoreboard={isScoreboard} 
          isLastRound={isLastRound}
          canProceed={canProceed}
          onReveal={onReveal}
          onForceReveal={onForceReveal}
          onShowScoreboard={onShowScoreboard}
          onNext={onNext}
          onSetCanProceed={setCanProceed}
        />
      ) : (
        <PlayerBoard 
          gameState={gameState} 
          currentPlayer={currentPlayer} 
          currentQ={currentQ} 
          isRoundFinished={isRoundFinished} 
          isScoreboard={isScoreboard} 
          isLastRound={isLastRound}
          playerMapConfig={playerMapConfig}
          onGuess={onGuess}
          onUnlock={onUnlock}
        />
      )}
      <style>{` .leaflet-control-container { display: ${isCountingDown ? 'none' : 'block'} !important; z-index: 500; } `}</style>
    </div>
  );
};

export default GameBoard;