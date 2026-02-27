import { useState, useEffect, useCallback } from "react";
import type { AnalyticsData, DashboardActivity } from "../types";
import {
  getAnalyticsData,
  getDashboardActivity,
} from "../services/analyticsService";

interface UseAnalyticsReturn {
  data: AnalyticsData | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Hook for accessing analytics data with loading/error states
 */
export const useAnalytics = (): UseAnalyticsReturn => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const analyticsData = await getAnalyticsData();
      setData(analyticsData);
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error("Failed to fetch analytics")
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
  };
};

interface UseDashboardActivityReturn {
  activity: DashboardActivity[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Hook for dashboard activity chart data
 */
export const useDashboardActivity = (): UseDashboardActivityReturn => {
  const [activity, setActivity] = useState<DashboardActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getDashboardActivity();
      setActivity(data);
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error("Failed to fetch activity")
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    activity,
    loading,
    error,
    refetch: fetchData,
  };
};
