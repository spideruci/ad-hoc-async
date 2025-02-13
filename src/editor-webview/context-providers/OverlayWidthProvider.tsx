import React, { createContext, useContext, useState, ReactNode } from "react";

interface OverlayWidthContextProps {
  overlayWidth: number;
  setOverlayWidth: React.Dispatch<React.SetStateAction<number>>;
}

const OverlayWidthContext = createContext<OverlayWidthContextProps | undefined>(undefined);

export const OverlayWidthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [overlayWidth, setOverlayWidth] = useState<number>(300); // Initial width percentage

  return (
    <OverlayWidthContext.Provider value={{ overlayWidth, setOverlayWidth }}>
      {children}
    </OverlayWidthContext.Provider>
  );
};

export const useOverlayWidth = (): OverlayWidthContextProps => {
  const context = useContext(OverlayWidthContext);
  if (!context) {
    throw new Error("useOverlayWidth must be used within an OverlayWidthProvider");
  }
  return context;
};