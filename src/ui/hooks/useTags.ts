/**
 * 标签数据 Hook — 封装 Tag 模块的数据获取逻辑
 * 组件通过此 Hook 消费数据，不直接接触 Tauri invoke
 */

import { useState, useEffect, useCallback } from "react";
import type { Tag, Mark } from "../../types/tag";
import { invokeListAllTags, invokeListAllMarks } from "../../lib/tauri";

export interface UseTagsReturn {
  tags: Tag[];
  marks: Mark[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useTags(): UseTagsReturn {
  const [tags, setTags] = useState<Tag[]>([]);
  const [marks, setMarks] = useState<Mark[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);

    const [tagsResult, marksResult] = await Promise.all([
      invokeListAllTags(),
      invokeListAllMarks(),
    ]);

    if (tagsResult.ok) {
      setTags(tagsResult.data);
    } else {
      setError(tagsResult.error);
    }

    if (marksResult.ok) {
      setMarks(marksResult.data);
    } else if (!error) {
      setError(marksResult.error);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { tags, marks, loading, error, refresh: fetch };
}