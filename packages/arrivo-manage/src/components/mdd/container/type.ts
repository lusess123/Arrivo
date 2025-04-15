export interface IViewProps {
    model: string;
    view: string;
    params?: any;
    where?: any;
    id?: string;
    parentModalClose?: ()=> void ;
    parentRefersh?: () => void;
    currentId?: string;
    onChangeCurrntRow?: (row: any) => void;
  }