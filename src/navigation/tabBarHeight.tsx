// Настоящая высота нижнего меню. Чату она нужна, чтобы поставить поле ввода вплотную к клавиатуре.

import React, { createContext, useContext, useMemo, useState } from 'react';

const TabBarHeight = createContext<{ height: number; setHeight: (h: number) => void }>({ height: 0, setHeight: () => {} });

export function TabBarHeightProvider({ children }: { children: React.ReactNode }) {
  const [height, setHeight] = useState(0);
  const value = useMemo(() => ({ height, setHeight }), [height]);
  return <TabBarHeight.Provider value={value}>{children}</TabBarHeight.Provider>;
}

export function useTabBarHeight(): number {
  return useContext(TabBarHeight).height;
}

export function useReportTabBarHeight(): (h: number) => void {
  return useContext(TabBarHeight).setHeight;
}
