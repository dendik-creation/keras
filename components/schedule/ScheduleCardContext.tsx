"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";

interface SwipedCardContextType {
  activeSwipedId: string | null;
  setActiveSwipedId: (id: string | null) => void;
  closeAllSwipedCards: () => void;
}

const SwipedCardContext = createContext<SwipedCardContextType>({
  activeSwipedId: null,
  setActiveSwipedId: () => {},
  closeAllSwipedCards: () => {},
});

export function SwipedCardProvider({ children }: { children: React.ReactNode }) {
  const [activeSwipedId, setActiveSwipedId] = useState<string | null>(null);

  const closeAllSwipedCards = useCallback(() => {
    setActiveSwipedId(null);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      if (activeSwipedId !== null) {
        closeAllSwipedCards();
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [activeSwipedId, closeAllSwipedCards]);

  return (
    <SwipedCardContext.Provider
      value={{ activeSwipedId, setActiveSwipedId, closeAllSwipedCards }}
    >
      {children}
    </SwipedCardContext.Provider>
  );
}

export function useSwipedCardContext() {
  return useContext(SwipedCardContext);
}
