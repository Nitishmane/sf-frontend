"use client";

import {
  createContext,
  useContext,
  useTransition,
  type ReactNode,
  type TransitionStartFunction,
} from "react";

type PendingContextValue = {
  isPending: boolean;
  startTransition: TransitionStartFunction;
};

const PendingContext = createContext<PendingContextValue | null>(null);

/**
 * Shares a single transition between the toolbar (which starts it) and the
 * results below (which dim while it runs). Server-rendered children pass
 * straight through, so the table itself stays a server component.
 */
export function ContactsPendingProvider({ children }: { children: ReactNode }) {
  const [isPending, startTransition] = useTransition();
  return (
    <PendingContext.Provider value={{ isPending, startTransition }}>
      {children}
    </PendingContext.Provider>
  );
}

export function useContactsPending(): PendingContextValue | null {
  return useContext(PendingContext);
}

/**
 * Dims its children and blocks interaction while the shared transition runs.
 * `inert` (not `pointer-events-none`) is what locks the stale results: it
 * disables keyboard activation and focus as well as pointer input.
 */
export function PendingArea({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const pending = useContext(PendingContext)?.isPending ?? false;
  return (
    <div
      aria-busy={pending}
      inert={pending || undefined}
      className={`transition-opacity ${
        pending ? "opacity-60" : ""
      } ${className}`.trim()}
    >
      {children}
    </div>
  );
}
