
import React, { useState, useEffect, useReducer, useCallback, useRef } from 'react';
import { GameState, Player, Question, Location, User, AppView, Trail } from './types';
import { generateId, calculateDistance } from './utils';
import { strings } from './i18n';
import { gameReducer } from './gameReducer';
import { useGameSync } from './useGameSync';
import { useTrails } from './hooks/useTrails';
import QuizCreator from './components/QuizCreator';
import Lobby from './components/Lobby';
import GameBoard from './components/GameBoard';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import Home from './components/Home';
import JoinGame from './components/JoinGame';
import { PermissionModal } from './components/PermissionGate';

const App: React.FC = () => {
  const [view, setView] = useState<AppView>('HOME');
  const [user, setUser] = useState<User | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [editingTrail, setEditingTrail] = useState<Trail | null>(null);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState<string | null>(null); 
  const [isJoining, setIsJoining] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const joinTimeoutRef = useRef<number | null>(null);

  const prevStatusRef = useRef<GameState['status'] | null>(null);
  const prevIndexRef = useRef<number>(-1);

  const { trails, saveTrail, deleteTrail, isLoading: isTrailsLoading } = useTrails(user);
  const [gameState, dispatch] = useReducer(gameReducer, null);

  const { broadcast, sendAction, requestSync, clearCache } = useGameSync(
    useCallback((state) => dispatch({ type: 'SYNC_STATE', payload: state }), []),
    useCallback((action) => dispatch(action), []),
    isHost,
    gameState,
    joinCode
  );

  // Deep Link Handling
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const codeFromUrl = params.get('join');
    if (codeFromUrl) {
      const cleanCode = codeFromUrl.trim().toUpperCase();
      setJoinCode(cleanCode);
      setView('JOIN');
      // Clean up URL after grabbing code
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Host: Broadcast changes
  useEffect(() => {
    if (isHost && gameState) {
      localStorage.setItem('locateit_active_host_state', JSON.stringify(gameState));
      const isStatusChange = gameState.status !== prevStatusRef.current;
      const isIndexChange = gameState.currentQuestionIndex !== prevIndexRef.current;
      const isNewGame = prevStatusRef.current === null;
      const needsFullSync = isStatusChange || isIndexChange || isNewGame;
      
      broadcast(gameState, needsFullSync);
      
      prevStatusRef.current = gameState.status;
      prevIndexRef.current = gameState.currentQuestionIndex;
    }
  }, [gameState, isHost, broadcast]);

  // Player: Sync loop when waiting for game data
  useEffect(() => {
    if ((view === 'JOIN' || view === 'LOBBY') && !isHost && joinCode) {
      const interval = setInterval(requestSync, 3000);
      return () => clearInterval(interval);
    }
  }, [view, isHost, requestSync, joinCode]);

  // View Transition Watchdog
  useEffect(() => {
    if (gameState && (isHost || currentPlayer)) {
      const inGameStatus = ['PLAYING', 'COUNTDOWN', 'RESULTS', 'SCOREBOARD', 'FINISHED'];
      
      if (inGameStatus.includes(gameState.status) && view !== 'PLAYING') {
        setView('PLAYING');
      }

      if (currentPlayer && !isHost && !isJoining) {
        const isPresent = gameState.players.some(p => p.id === currentPlayer.id);
        if (!isPresent && (view === 'LOBBY' || view === 'PLAYING')) {
           alert(strings.lobby.kickedDesc);
           handleExitGame();
        }
      }
    }
  }, [gameState?.status, currentPlayer, isHost, view, isJoining, gameState?.players]);

  useEffect(() => {
    const savedUser = localStorage.getItem('locateit_user');
    if (savedUser) setUser(JSON.parse(savedUser));
  }, []);

  const handleCompleteTrail = async (questions: Question[], name: string, startingView?: { center: Location, zoom: number }) => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const result = await saveTrail(questions, name, startingView, editingTrail?.id);
      if (result.success) {
        setEditingTrail(null);
        setView('DASHBOARD');
      } else {
        alert(`Save Failed: ${result.error}.`);
      }
    } catch (e: any) {
      alert(`Unexpected Error: ${e.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleHostTrail = (trail: Trail) => {
    if (!user) return;
    setIsHost(true);
    setCurrentPlayer(null); 
    const newGameId = generateId();
    dispatch({ type: 'INIT_LOBBY', payload: { id: newGameId, questions: trail.questions, hostId: user.id, startingView: trail.startingView } });
    setJoinCode(newGameId);
    setView('LOBBY');
  };

  const handleResumeHost = () => {
    const saved = localStorage.getItem('locateit_active_host_state');
    if (saved) {
      const state = JSON.parse(saved) as GameState;
      setIsHost(true);
      setCurrentPlayer(null);
      setJoinCode(state.id);
      dispatch({ type: 'SYNC_STATE', payload: state });
      setView(state.status === 'LOBBY' ? 'LOBBY' : 'PLAYING');
    }
  };

  const handleJoinGame = (gameCode: string, name: string, color: string) => {
    setJoinError(null);
    const code = gameCode.trim().toUpperCase();
    
    if (!gameState || gameState.id !== code) {
      setJoinError(`Searching for Expedition ${code}... Ensure the host has started the lobby.`);
      requestSync();
      return;
    }

    const savedId = localStorage.getItem('locateit_last_player_id');
    const existingById = gameState.players.find(p => p.id === savedId);
    if (existingById) {
      setCurrentPlayer(existingById);
      setIsHost(false);
      setView(gameState.status === 'LOBBY' ? 'LOBBY' : 'PLAYING');
      return;
    }

    const newPlayer: Player = { id: generateId(), name, color, score: 0, hasGuessed: false };
    setCurrentPlayer(newPlayer);
    setIsHost(false);
    setIsJoining(true);
    if (joinTimeoutRef.current) clearTimeout(joinTimeoutRef.current);
    joinTimeoutRef.current = window.setTimeout(() => setIsJoining(false), 5000);
    localStorage.setItem('locateit_last_player_id', newPlayer.id);
    sendAction({ type: 'PLAYER_JOIN_REQUEST', player: newPlayer });
    setView('LOBBY');
  };

  const handleExitGame = () => {
    if (isHost) {
      localStorage.removeItem('locateit_active_host_state');
      sendAction({ type: 'TERMINATE_SESSION' });
    }
    clearCache();
    dispatch({ type: 'EXIT_GAME' });
    setCurrentPlayer(null);
    setJoinCode(null);
    setView(isHost ? 'DASHBOARD' : 'HOME');
  };

  return (
    <>
      {showPermissionModal && <PermissionModal onClose={() => setShowPermissionModal(false)} />}
      {view === 'HOME' && <Home onJoin={() => setView('JOIN')} onDesign={() => user ? setView('DASHBOARD') : setView('AUTH')} />}
      {view === 'JOIN' && <JoinGame prefilledCode={joinCode || ''} onBack={() => setView('HOME')} onJoin={handleJoinGame} onCodeChange={setJoinCode} isSearching={!gameState && !!joinCode} error={joinError} />}
      {view === 'AUTH' && <Auth onAuthSuccess={(u) => { setUser(u); setView('DASHBOARD'); }} onBack={() => setView('HOME')} />}
      {view === 'DASHBOARD' && user && (
        <Dashboard 
          user={user} 
          trails={trails}
          isLoading={isTrailsLoading}
          onNewTrail={() => { setEditingTrail(null); setView('CREATE'); }} 
          onEditTrail={(t) => { setEditingTrail(t); setView('CREATE'); }} 
          onHostTrail={handleHostTrail} 
          onDeleteTrail={deleteTrail}
          onLogout={() => { localStorage.removeItem('locateit_user'); setUser(null); setView('HOME'); }}
          onResumeHost={localStorage.getItem('locateit_active_host_state') ? handleResumeHost : undefined}
        />
      )}
      {view === 'CREATE' && (
        <QuizCreator 
          initialTrail={editingTrail || undefined} 
          onComplete={handleCompleteTrail} 
          onCancel={() => setView('DASHBOARD')} 
          onRequestPermissions={() => setShowPermissionModal(true)}
          isSaving={isSaving}
        />
      )}
      {view === 'LOBBY' && gameState && (
        <Lobby 
          gameState={gameState} 
          isHost={isHost} 
          onStart={() => dispatch({ type: 'SET_STATUS', payload: 'PLAYING' })} 
          currentPlayer={currentPlayer} 
          onBack={handleExitGame} 
          onKick={(id) => dispatch({ type: 'KICK_PLAYER', payload: id })} 
        />
      )}
      {view === 'PLAYING' && gameState && (
        <GameBoard 
          gameState={gameState} 
          isHost={isHost} 
          currentPlayer={currentPlayer} 
          onGuess={(guess) => {
            if (!currentPlayer) return;
            const currentQ = gameState.questions[gameState.currentQuestionIndex];
            const dist = calculateDistance(guess, currentQ.location);
            sendAction({ type: 'PLAYER_GUESS_REQUEST', playerId: currentPlayer.id, guess, distance: dist });
            if (isHost) dispatch({ type: 'SUBMIT_GUESS', payload: { playerId: currentPlayer.id, guess, distance: dist } });
          }} 
          onUnlock={() => {
            if (!currentPlayer) return;
            sendAction({ type: 'PLAYER_UNLOCK_REQUEST', playerId: currentPlayer.id });
            if (isHost) dispatch({ type: 'UNLOCK_GUESS', payload: currentPlayer.id });
          }}
          onReveal={() => {
            if (!isHost) return;
            dispatch({ type: 'SET_STATUS', payload: 'COUNTDOWN' });
            sendAction({ type: 'HOST_REVEAL_REQUEST' });
          }}
          onForceReveal={() => {
            if (!isHost) return;
            dispatch({ type: 'FORCE_REVEAL' });
            sendAction({ type: 'FORCE_REVEAL' });
          }}
          onCountdownFinish={() => isHost && dispatch({ type: 'SET_STATUS', payload: 'RESULTS' })}
          onShowScoreboard={() => isHost && dispatch({ type: 'CALCULATE_SCORES' })}
          onNext={() => isHost && dispatch({ type: 'NEXT_ROUND' })} 
          onExit={handleExitGame}
        />
      )}
    </>
  );
};

export default App;
