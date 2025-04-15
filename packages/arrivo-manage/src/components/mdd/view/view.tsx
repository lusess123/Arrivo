
import { Modal } from 'antd';
import { useEffect, useState } from 'react';
import { IViewProps } from '../container/type';
import { ViewEngine } from './view.engine';
import { useMetaContext } from '../store';
import { ViewContextProvider } from './view.content';

const TitleMap = {
  detailview: '查看',
  editview: '编辑',
  newview: '新建',
};

export function View(props: IViewProps) {
  const [viewData, setViewData] = useState<any>();
  const { model, view, where } = props;
  const [openModal, setOpenModal] = useState(false);
  const [winObj, setwinObj] = useState<any>();
  const [update, setUpdate] = useState(+new Date());
  const { fetchMeta, getView, views } = useMetaContext()
  function openWin(params: IViewProps) {
    setwinObj(params);
    setOpenModal(true);
  }

  function closeModel() {
    setOpenModal(false)
  }

  function refresh() {
    setUpdate(+new Date())
  }

  useEffect(function () {
    (async function () {
      await fetchMeta([model], [], [model + '.' + view])
    
    })();
  }, []);

  useEffect(function () {
    (async function () {
      setViewData(getView(model + '.' + view))
    })();
  }, [views[model + '.' + view]]);

  if (!viewData) return null;

  return (
    <ViewContextProvider value={{
      openWin,
      closeModel,
      refresh
    }}>
      {openModal && (
        <Modal
          footer={null}
          width={'85%'}
          open={openModal}
          title={(TitleMap[(winObj.view) as 'detailview']  || '查看') + "数据"}
          onCancel={() => {
            setOpenModal(false);
          }}
        >
          <View  id={winObj.id}  where={winObj.where}  parentModalClose={closeModel}  parentRefersh={refresh} model={winObj.model} view={winObj.view}></View>
        </Modal>
      )}
      <ViewEngine  onChangeCurrntRow={props.onChangeCurrntRow} currentId={props.currentId}  where={where} id={props.id} key={update} parentModalClose={props.parentModalClose} parentRefersh={props.parentRefersh} openWin={openWin} view={viewData}></ViewEngine>
    </ViewContextProvider>
  );
}
