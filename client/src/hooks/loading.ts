import { useEffect, useState } from "react";

type LoaderFunction = () => Promise<void>;
export type LoadingState = "pending" | "loading" | "loaded" | "error";

type LoadingHook = {
  loading: LoadingState;
  error: Error | null;
};

export function useLoadingEffect(initialState: LoadingState, loader: LoaderFunction): LoadingHook {
  const [loading, setLoading] = useState<LoadingState>(initialState);
  const [error, setError] = useState<Error | null>(null);
  useEffect(() => {
    if (loading === "pending") {
      setLoading("loading");
      setError(null);
      loader()
        .then(() => {
          setLoading("loaded");
        })
        .catch((e) => {
          setError(e);
          setLoading("error");
        });
    }
  }, [loading]);

  return {
    loading,
    error,
  };
}
