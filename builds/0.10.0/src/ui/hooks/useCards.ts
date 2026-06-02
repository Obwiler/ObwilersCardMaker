import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { CardMeta, CardBundle } from '../../ports/CardRepositoryPort';

interface UseCardsReturn {
  cards: CardMeta[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  load: (id: string) => Promise<CardBundle | null>;
  save: (id: string, source: string, meta: CardMeta) => Promise<void>;
  deleteCard: (id: string) => Promise<void>;
}

export function useCards(): UseCardsReturn {
  const [cards, setCards] = useState<CardMeta[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const ids = await invoke<string[]>('list_cards');
      const metaList: CardMeta[] = [];
      for (const id of ids) {
        try {
          const bundle = await invoke<CardBundle>('load_card', { cardId: id });
          metaList.push(bundle.meta);
        } catch {
          metaList.push({ id, name: id, category: '未知', attributes: {}, version: '0.10.0' });
        }
      }
      setCards(metaList);
    } catch (e) {
      setError(typeof e === 'string' ? e : (e instanceof Error ? e.message : String(e)));
    } finally {
      setLoading(false);
    }
  }, []);

  const load = useCallback(async (id: string): Promise<CardBundle | null> => {
    try {
      return await invoke<CardBundle>('load_card', { cardId: id });
    } catch (e) {
      setError(typeof e === 'string' ? e : (e instanceof Error ? e.message : String(e)));
      return null;
    }
  }, []);

  const save = useCallback(async (id: string, source: string, meta: CardMeta): Promise<void> => {
    try {
      await invoke('save_card', { cardId: id, source, meta });
      await refresh();
    } catch (e) {
      setError(typeof e === 'string' ? e : (e instanceof Error ? e.message : String(e)));
    }
  }, [refresh]);

  const deleteCard = useCallback(async (id: string): Promise<void> => {
    try {
      await invoke('delete_card', { cardId: id });
      setCards(prev => prev.filter(c => c.id !== id));
    } catch (e) {
      setError(typeof e === 'string' ? e : (e instanceof Error ? e.message : String(e)));
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { cards, loading, error, refresh, load, save, deleteCard };
}
