"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type PwaInstallState = {
  canPrompt: boolean;
  installed: boolean;
  ios: boolean;
  install: () => Promise<void>;
};

const PwaCtx = createContext<PwaInstallState | null>(null);

function isIosDevice() {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isStandalone() {
  if (typeof window === "undefined") return false;
  const media = window.matchMedia("(display-mode: standalone)").matches;
  const safari = Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone);
  return media || safari;
}

export function PwaInstallProvider({ children }: { children: ReactNode }) {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }
    setInstalled(isStandalone());
    setIos(isIosDevice());

    const onPrompt = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setPromptEvent(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const install = useCallback(async () => {
    if (!promptEvent) return;
    await promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    if (choice.outcome === "accepted") setInstalled(true);
    setPromptEvent(null);
  }, [promptEvent]);

  const value = useMemo(
    () => ({
      canPrompt: Boolean(promptEvent) && !installed,
      installed,
      ios: ios && !installed,
      install,
    }),
    [install, installed, ios, promptEvent]
  );

  return <PwaCtx.Provider value={value}>{children}</PwaCtx.Provider>;
}

export function usePwaInstall() {
  const ctx = useContext(PwaCtx);
  if (!ctx) {
    return {
      canPrompt: false,
      installed: false,
      ios: false,
      install: async () => undefined,
    };
  }
  return ctx;
}
