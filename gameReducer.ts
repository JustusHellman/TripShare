import { GameState, Player, Location, Question } from './types';

export type GameAction = 
  | { type: 'SYNC_STATE'; payload: GameState }
  | { type: 'INIT_LOBBY'; payload: { id: string, questions: Question[], hostId: string, startingView?: { center: Location, zoom: number } } }
  | { type: 'JOIN_PLAYER'; payload: Player }
  | { type: 'KICK_PLAYER'; payload: string }
  | { type: 'SET_STATUS'; payload: GameState['status'] }
  | { type: 'SUBMIT_GUESS'; payload: { playerId: string, guess: Location, distance: number } }
  | { type: 'UNLOCK_GUESS'; payload: string }
  | { type: 'FORCE_REVEAL' }
  | { type: 'CALCULATE_SCORES' }
  | { type: 'NEXT_ROUND' }
  | { type: 'EXIT_GAME' };

export const gameReducer = (state: GameState | null, action: GameAction): GameState | null => {
  switch (action.type) {
    case 'SYNC_STATE':
      return action.payload;

    case 'INIT_LOBBY':
      return {
        id: action.payload.id,
        status: 'LOBBY',
        questions: action.payload.questions,
        currentQuestionIndex: 0,
        players: [],
        hostId: action.payload.hostId,
        startingView: action.payload.startingView,
      };

    case 'JOIN_PLAYER':
      if (!state) return null;
      if (state.players.find(p => p.id === action.payload.id)) return state;
      return { ...state, players: [...state.players, action.payload] };

    case 'KICK_PLAYER':
      if (!state) return null;
      return { ...state, players: state.players.filter(p => p.id !== action.payload) };

    case 'SET_STATUS':
      if (!state) return null;
      return { ...state, status: action.payload };

    case 'SUBMIT_GUESS':
      if (!state) return null;
      const updatedPlayers = state.players.map(p => 
        p.id === action.payload.playerId 
          ? { ...p, hasGuessed: true, lastGuess: action.payload.guess, lastDistance: action.payload.distance } 
          : p
      );
      return { ...state, players: updatedPlayers };

    case 'UNLOCK_GUESS':
      if (!state) return null;
      return { 
        ...state, 
        players: state.players.map(p => 
          p.id === action.payload 
            ? { ...p, hasGuessed: false, lastGuess: undefined, lastDistance: undefined } 
            : p
        )
      };

    case 'FORCE_REVEAL':
      if (!state) return null;
      return {
        ...state,
        status: 'COUNTDOWN',
        players: state.players.map(p => 
          !p.hasGuessed 
            ? { ...p, hasGuessed: true, lastDistance: 20000, lastGuess: undefined } // Penalty: 20,000 km away
            : p
        )
      };

    case 'CALCULATE_SCORES':
      if (!state) return null;
      const sortedByDistance = [...state.players].sort((a, b) => (a.lastDistance || Infinity) - (b.lastDistance || Infinity));
      const playersWithCalculatedScores = state.players.map(p => {
        const rank = sortedByDistance.findIndex(sp => sp.id === p.id);
        const pointsGained = (p.lastDistance !== undefined && p.lastDistance < 19000) 
          ? Math.max(0, state.players.length - rank) 
          : 0;
        return { 
          ...p, 
          lastPointsGained: pointsGained,
          score: p.score + pointsGained 
        };
      });
      const isLastRound = state.currentQuestionIndex === state.questions.length - 1;
      return { 
        ...state, 
        players: playersWithCalculatedScores, 
        status: isLastRound ? 'FINISHED' : 'SCOREBOARD' 
      };

    case 'NEXT_ROUND':
      if (!state) return null;
      const isLastQuestion = state.currentQuestionIndex === state.questions.length - 1;
      
      if (isLastQuestion) return { ...state, status: 'FINISHED' };

      const resetPlayers = state.players.map(p => ({
        ...p,
        hasGuessed: false,
        lastGuess: undefined,
        lastDistance: undefined,
        lastPointsGained: 0
      }));

      return {
        ...state,
        players: resetPlayers,
        currentQuestionIndex: state.currentQuestionIndex + 1,
        status: 'PLAYING'
      };

    case 'EXIT_GAME':
      return null;

    default:
      return state;
  }
};