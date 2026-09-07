import { createContext, useContext, useLayoutEffect } from "react";
import type { Dispatch, ReactNode, SetStateAction } from "react";

type ViewSetter = Dispatch<SetStateAction<string | null>>;

const AppViewContext = createContext<ViewSetter | null>(null);

export function AppViewProvider({ children, value }: { children: ReactNode; value: ViewSetter }) {
  return <AppViewContext.Provider value={value}>{children}</AppViewContext.Provider>;
}

export function useAppView(label: string) {
  const setView = useContext(AppViewContext);

  useLayoutEffect(() => {
    if (!setView) return;
    setView(label);
    return () => setView((current) => current === label ? null : current);
  }, [label, setView]);
}
