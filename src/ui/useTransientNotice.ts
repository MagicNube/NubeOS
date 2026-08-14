import { useEffect, useState } from "react";

export function useTransientNotice(duration = 3200) {
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(null), duration);
    return () => window.clearTimeout(timeout);
  }, [duration, notice]);

  return [notice, setNotice] as const;
}
