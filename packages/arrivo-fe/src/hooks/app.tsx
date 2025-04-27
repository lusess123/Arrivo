import { useState } from "react";
import { useRootStore, RootStoreProvider } from "./store";
import { createStore } from 'hox'
import { useAuth } from './auth'


function useInternalApp() {
  const store = useRootStore();
  const auth = useAuth();


  return {
    store,
    auth,
  };
}

export const [useApp, AppProvider] = createStore(useInternalApp);

export const AppProviderParent = ({ children }: { children: React.ReactNode }) => {
    return   <RootStoreProvider>
                <AppProvider>{children}</AppProvider>
        </RootStoreProvider>;
};
