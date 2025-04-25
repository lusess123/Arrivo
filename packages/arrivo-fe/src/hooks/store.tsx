import { createContext, useContext, useState } from "react";
import { RootStore, RootStoreType } from "../store";

const StoreContext = createContext<RootStoreType | null>(null as any);

export const useRootStore = () => {
  const store = useContext(StoreContext);
  if (!store) {
    throw new Error("useStore must be used within a StoreProvider");
  }
  return store;
};

export const RootStoreProvider = ({ children }: { children: React.ReactNode }) => {
  const [store] = useState<RootStoreType>(RootStore.create({}));
  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
};
