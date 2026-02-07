
import { useEffect, useCallback, useRef } from 'react';
import { GameState, Player, Location } from './types';
import { getLeanState } from './utils';
import { supabase } from './lib/supabase';

export type GameSyncMessage = 
  | { type: 'STATE_FULL'; state: GameState }
  | { type: 'STATE_DYNAMIC'; state: Partial<GameState> }
  | { type: 'REQUEST_SYNC' }
  | { type: 'PLAYER_JOIN_REQUEST'; player: Player }
  | { type: 'PLAYER_GUESS_REQUEST'; playerId: string; guess: Location; distance: number }
  | { type: 'PLAYER_UNLOCK_REQUEST'; playerId: string }
  | { type: 'HOST_REVEAL_REQUEST' }
  | { type: 'FORCE_REVEAL' }
  | { type: 'TERMINATE_SESSION' };

export const useGameSync = (
  onStateUpdate: (state: GameState) => void, 
  onActionRequest: (action: any) => void,
  isHost: boolean, 
  gameState: GameState | null,
  roomId?: string | null
) => {
  const channelRef = useRef<any>(null);
  const questionsCache = useRef<GameState['questions'] | null>(null);

  const clearCache = useCallback(() => {
    questionsCache.current = null;
  }, []);

  const broadcast = useCallback((state: GameState, full = false) => {
    if (!channelRef.current) return;
    
    if (full) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'sync',
        payload: { type: 'STATE_FULL', state }
      });
    } else {
      const lean = getLeanState(state);
      channelRef.current.send({
        type: 'broadcast',
        event: 'sync',
        payload: { type: 'STATE_DYNAMIC', state: lean }
      });
    }
  }, []);

  const sendAction = useCallback((message: GameSyncMessage) => {
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'sync',
        payload: message
      });
    }
  }, []);

  const requestSync = useCallback(() => {
    if (channelRef.current) {
      console.log("Requesting sync from host...");
      channelRef.current.send({
        type: 'broadcast',
        event: 'sync',
        payload: { type: 'REQUEST_SYNC' }
      });
    }
  }, []);

  // Determine which ID to use for the channel
  const activeChannelId = gameState?.id || roomId;

  useEffect(() => {
    if (!activeChannelId) return;

    console.log(`Subscribing to channel: game_${activeChannelId}`);
    const channel = supabase.channel(`game_${activeChannelId}`, {
      config: {
        broadcast: { self: false }
      }
    });

    channel.on('broadcast', { event: 'sync' }, ({ payload }) => {
      const data = payload as GameSyncMessage;
      
      if (data.type === 'STATE_FULL') {
        if (!isHost) {
          console.log("Received full state from host. Status:", data.state.status);
          questionsCache.current = data.state.questions;
          onStateUpdate(data.state);
        }
      } else if (data.type === 'STATE_DYNAMIC') {
        if (!isHost && questionsCache.current) {
          console.log("Received dynamic state from host. New Status:", data.state.status);
          const reconstructedState = { 
            ...data.state, 
            questions: questionsCache.current 
          } as GameState;
          onStateUpdate(reconstructedState);
        }
      } else if (data.type === 'TERMINATE_SESSION') {
        if (!isHost) clearCache();
      } else if (data.type === 'REQUEST_SYNC') {
        if (isHost && gameState) {
          console.log("Player requested sync. Sending full state...");
          broadcast(gameState, true);
        }
      } else if (data.type === 'PLAYER_JOIN_REQUEST') {
        if (isHost) onActionRequest({ type: 'JOIN_PLAYER', payload: data.player });
      } else if (data.type === 'PLAYER_GUESS_REQUEST') {
        if (isHost) onActionRequest({ type: 'SUBMIT_GUESS', payload: { playerId: data.playerId, guess: data.guess, distance: data.distance } });
      } else if (data.type === 'PLAYER_UNLOCK_REQUEST') {
        if (isHost) onActionRequest({ type: 'UNLOCK_GUESS', payload: data.playerId });
      } else if (data.type === 'HOST_REVEAL_REQUEST') {
        if (isHost) onActionRequest({ type: 'SET_STATUS', payload: 'COUNTDOWN' });
      } else if (data.type === 'FORCE_REVEAL') {
        if (isHost) onActionRequest({ type: 'FORCE_REVEAL' });
      }
    });

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        channelRef.current = channel;
        // If we are a player looking for a game, ask for state immediately
        if (!isHost) requestSync();
      }
    });

    return () => {
      console.log(`Unsubscribing from channel: game_${activeChannelId}`);
      channel.unsubscribe();
      channelRef.current = null;
    };
    // CRITICAL: We removed gameState.status from dependencies to prevent re-subscribing 
    // when the host starts the game, which was causing dropped messages.
  }, [activeChannelId, isHost, onStateUpdate, onActionRequest, broadcast, clearCache, requestSync]);

  return { broadcast, sendAction, requestSync, clearCache };
};
