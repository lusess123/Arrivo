import { createContext, useContext } from 'react';
import { IViewProps } from '../container/type';

export interface IViewContext {
  openWin?: (params: IViewProps) => void;
  closeModel?: () => void;
  refresh?:  () => void;
  setData? : (ds: any) => void ;
}
export const ViewContext = createContext<IViewContext>({});
export const ViewProvider = ViewContext.Provider;

export function ViewContextProvider (props: any) {
    return <ViewProvider value={props.value}>{props.children}</ViewProvider>;
  }

  export function useViewContext()
  {
    return useContext(ViewContext);
  }