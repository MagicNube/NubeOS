import { useEffect, useState } from "react";

const coverChangedEvent = "nubeos:cover-changed";

export function notifyCoverChanged(id: string) {
  window.dispatchEvent(new CustomEvent<string>(coverChangedEvent, { detail: id }));
}

export function useCoverRevision(id: string) {
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    function refresh(event: Event) {
      if ((event as CustomEvent<string>).detail === id) {
        setRevision((current) => current + 1);
      }
    }

    window.addEventListener(coverChangedEvent, refresh);
    return () => window.removeEventListener(coverChangedEvent, refresh);
  }, [id]);

  return revision;
}
