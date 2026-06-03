"use client";

import { useCallback, useEffect, useState } from "react";

import type { ActionResult } from "@/lib/data/league-data";

export function useActionData<T>(loadData: () => Promise<ActionResult<T>>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const response = await loadData();
    setData(response.data);
    setError(response.error);
    setLoading(false);
  }, [loadData]);

  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  return { data, loading, error, reload: load };
}
