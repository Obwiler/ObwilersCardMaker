import { useState, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';

interface CardInstance {
  runtimeId: string;
  staticDefRef: string;
  zone: string;
  owner: string;
  hp: number;
  armor: number;
  energy: number;
  marks: Record<string, number>;
}

interface EffectLogEntry {
  turn: number;
  action: string;
  actor?: string;
  target?: string;
  result: string;
}

interface PlayerDisplayState {
  hand: CardInstance[];
  field: CardInstance[];
  life: number;
}

interface UseDuelReturn {
  players: PlayerDisplayState[];
  turn: number;
  phase: string;
  hand: CardInstance[];
  field: CardInstance[];
  log: EffectLogEntry[];
  initGame: (_deck1: string[], _deck2: string[]) => Promise<void>;
  drawCard: (_playerIndex: number) => Promise<void>;
  playCard: (playerIndex: number, handIndex: number) => Promise<void>;
  nextTurn: () => Promise<void>;
}

export function useDuel(): UseDuelReturn {
  const [players, setPlayers] = useState<PlayerDisplayState[]>([]);
  const [turn, setTurn] = useState<number>(1);
  const [phase, setPhase] = useState<string>('init');
  const [hand, setHand] = useState<CardInstance[]>([]);
  const [field, setField] = useState<CardInstance[]>([]);
  const [log, setLog] = useState<EffectLogEntry[]>([]);

  const initGame = useCallback(async (_deck1: string[], _deck2: string[]) => {
    try {
      await invoke('init_duel', { playerCount: 2 });
      setPlayers([
        { hand: [], field: [], life: 20 },
        { hand: [], field: [], life: 20 },
      ]);
      setHand([]);
      setField([]);
      setLog([]);
      setTurn(1);
      setPhase('draw');
    } catch (e) {
      console.error('initGame failed:', e);
    }
  }, []);

  const drawCard = useCallback(async (_playerIndex: number) => {
    // draw_card is currently only available through battlefield module, not as Tauri command
    // Placeholder — will be wired when BattlefieldModule exposes draw_card command
  }, []);

  const playCard = useCallback(async (_playerIndex: number, handIndex: number) => {
    try {
      const targetHand = players[_playerIndex]?.hand ?? [];
      if (handIndex >= targetHand.length) return;

      const card = targetHand[handIndex];
      await invoke('play_card', {
        playerId: `P${_playerIndex + 1}`,
        cardId: card.runtimeId,
        target: null,
      });

      const json = await invoke<string>('get_battlefield_state', { playerId: `P${_playerIndex + 1}` });
      const state: CardInstance[] = JSON.parse(json);
      if (_playerIndex === 0) {
        setHand(state.filter(c => c.zone === 'Hand'));
        setField(state.filter(c => c.zone === 'Field'));
      }
    } catch (e) {
      console.error('playCard failed:', e);
    }
  }, [players]);

  const nextTurn = useCallback(async () => {
    setTurn(prev => prev + 1);
    setPhase('draw');
  }, []);

  return { players, turn, phase, hand, field, log, initGame, drawCard, playCard, nextTurn };
}
