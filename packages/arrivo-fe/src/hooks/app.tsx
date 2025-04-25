import { useState } from "react";
import { useRootStore, RootStoreProvider } from "./store";
import { createStore } from 'hox'


function useInternalApp() {
  const store = useRootStore();
  return store;
}

export const [useApp, AppProvider] = createStore(useInternalApp);

export const AppProviderParent = ({ children }: { children: React.ReactNode }) => {
    return   <RootStoreProvider>
                <AppProvider>{children}</AppProvider>
        </RootStoreProvider>;
};
