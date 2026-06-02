import { useState, useCallback } from 'react';
export function useCardEditor(_cardId: string) {
  const [data, setData] = useState<Record<string, unknown>>({});
  const update = useCallback((key: string, value: unknown) => {
    setData(prev => ({ ...prev, [key]: value }));
  }, []);
  return { data, update };
}
