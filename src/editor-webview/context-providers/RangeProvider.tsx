import type { ReactNode } from "react";
import React, { createContext, useContext, useState } from "react";

interface RangeContextProps {
  range: [number, number];
  setRange: React.Dispatch<React.SetStateAction<[number, number]>>;
}

const RangeContext = createContext<RangeContextProps | undefined>(undefined);

export const RangeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [range, setRange] = useState<[number, number]>([0, 0]);

  return (
    <RangeContext.Provider value={{ range, setRange }}>
      {children}
    </RangeContext.Provider>
  );
};

export const useRange = (): RangeContextProps => {
  const context = useContext(RangeContext);
  if (!context) {
    throw new Error("useRange must be used within a RangeProvider");
  }
  return context;
};