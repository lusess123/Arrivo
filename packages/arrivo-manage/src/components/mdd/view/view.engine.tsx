import { IView } from 'arrivo-server';
import { Card } from 'antd';
import { ContainerRenderComponents } from '../container';
import { IViewProps } from '../container/type';

export interface IViewEngineProps {
  view: IView;
  openWin: (params: IViewProps) => void;
  parentModalClose?: () => void;
  parentRefersh?: () => void;
  id?: string;
  where? : any;
  currentId? : string;
  onChangeCurrntRow?: (row: any) => void;
}

export function ViewEngine(props: IViewEngineProps) {
  const { view, openWin, where } = props;
  const { dataContainers } = view;
  const isSingle = dataContainers.length === 1;

  return (
    <div>
      {dataContainers.map((dataContainer) => {
        const type = dataContainer.type;
        const ContainerRender = ContainerRenderComponents[type!];
        if (!ContainerRender)
          return (
            <div key={dataContainer.key || dataContainer.name}>
              {type} 不存在
            </div>
          );
        return isSingle ? (
          <ContainerRender
            id={props.id}
            key={dataContainer.key || dataContainer.name}
            parentRefersh={props.parentRefersh}
            parentModalClose={props.parentModalClose}
            openWin={openWin}
            where={where}
            dataContainer={dataContainer}
             currentId={props.currentId}
             onChangeCurrntRow={props.onChangeCurrntRow}
          ></ContainerRender>
        ) : (
          <Card
            title={dataContainer.label}
            bordered={false}
            cover
            key={dataContainer.key || dataContainer.name}
          >
            <ContainerRender
              where={where}
              id={props.id}
              parentRefersh={props.parentRefersh}
              parentModalClose={props.parentModalClose}
              openWin={openWin}
              dataContainer={dataContainer}
              currentId={props.currentId}
              onChangeCurrntRow={props.onChangeCurrntRow}
            ></ContainerRender>
          </Card>
        );
      })}
    </div>
  );
}
