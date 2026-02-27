import { useState, useEffect, useCallback } from "react";
import type { Prediction } from "../types";
import {
  getPredictions,
  getActionablePredictions,
} from "../services/predictionService";

interface UsePredictionsReturn {
  predictions: Prediction[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Hook for accessing prediction data with loading/error states
 */
export const usePredictions = (): UsePredictionsReturn => {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchPredictions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getPredictions();
      setPredictions(data);
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error("Failed to fetch predictions")
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPredictions();
  }, [fetchPredictions]);

  return {
    predictions,
    loading,
    error,
    refetch: fetchPredictions,
  };
};

/**
 * Hook for actionable predictions (buy/reduce)
 */
export const useActionablePredictions = () => {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchPredictions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getActionablePredictions();
      setPredictions(data);
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error("Failed to fetch predictions")
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPredictions();
  }, [fetchPredictions]);

  return {
    predictions,
    loading,
    error,
    refetch: fetchPredictions,
  };
};

/**
 * Hook for managing predictions with local state for toggling/dismissing
 */
export const usePredictionsWithState = () => {
  const {
    predictions: initialPredictions,
    loading,
    error,
    refetch,
  } = usePredictions();
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  const dismissPrediction = useCallback((id: string) => {
    setDismissedIds((prev) => new Set(prev).add(id));
  }, []);

  const activePredictions = initialPredictions.filter(
    (p) => !dismissedIds.has(p.id)
  );

  return {
    predictions: activePredictions,
    allPredictions: initialPredictions,
    loading,
    error,
    refetch,
    dismissPrediction,
    dismissedCount: dismissedIds.size,
  };
};
