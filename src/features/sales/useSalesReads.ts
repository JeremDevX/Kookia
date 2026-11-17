import { useCallback, useEffect, useState } from "react";
import { getLatestService, getSaleItems, getSales, type SaleItem } from "../../services/salesService";

type Result<T> = { data: T; error?: never } | { error: string; data?: never };

export function useSalesRead<T>(read: () => Promise<T>, refreshToken = 0) {
  const [revision, setRevision] = useState(0);
  const [response, setResponse] = useState<{ read: () => Promise<T>; revision: number; refreshToken: number; result: Result<T> }>();
  const result = response?.read === read ? response.result : undefined;
  const loading = response?.read !== read || response.revision !== revision || response.refreshToken !== refreshToken;

  useEffect(() => {
    let active = true;
    read().then(
      (data) => { if (active) setResponse({ read, revision, refreshToken, result: { data } }); },
      (cause: unknown) => { if (active) setResponse({ read, revision, refreshToken, result: { error: cause instanceof Error ? cause.message : "Réessayez." } }); },
    );
    return () => { active = false; };
  }, [read, revision, refreshToken]);

  return { data: result?.data, error: loading ? undefined : result?.error, loading,
    reload: () => setRevision((value) => value + 1) };
}

export function useSalesReads(from: string, to: string) {
  const loadHistory = useCallback(() => getSales(from, to), [from, to]);
  const history = useSalesRead(loadHistory);
  const latest = useSalesRead(getLatestService);
  const catalog = useSalesRead(getSaleItems);
  const [createdItems, setCreatedItems] = useState<SaleItem[]>([]);

  // Local creations can finish while a catalogue request is already in flight.
  const items = [...new Map([...(catalog.data ?? []), ...createdItems].map((item) => [item.id, item])).values()]
    .sort((a, b) => a.name.localeCompare(b.name, "fr"));
  const rememberItems = (next: SaleItem[]) => {
    setCreatedItems((current) => [...new Map([...current, ...next].map((item) => [item.id, item])).values()]);
  };
  return { history, latest, catalog, items, rememberItems };
}
