import { post } from '@/utils/util';
import { message } from 'antd';
import { IDict, IMetaResponse, IModel, IView } from 'arrivo-server';
import { createStore } from 'hox';
import { useState } from 'react';

function isNotEmptyObject(obj: any) {
  if (!obj) return true;
  for (let key in obj) {
    if (obj.hasOwnProperty(key)) {
      return true; // 只要找到一个属性就返回 true
    }
  }
  return false; // 如果没有属性，返回 false
}

export function useMetaContextInternal() {
  const [models, setModels] = useState<Record<string, IModel>>({});
  const [dicts, setDicts] = useState<Record<string, IDict>>({});
  const [views, setViews] = useState<Record<string, IView>>({});
  const [dataset, setDataSet] = useState<Record<string, any>>({});
  function getModel(dictName: string) {
    return models[dictName];
  }

  function getView(view: string) {
    return views[view];
  }

  function mergeDataSet(ds : Record<string, any[]>) {
       //---------
      const dsObj = Object.keys(ds).reduce((acc, k) => {
          return {
            ...acc,
            [k]: ds[k].reduce((acc, cur) => {
                return {
                  ...acc,
                  ...cur[k] || {},
                  [cur.id]: cur
                }
            }, {} as Record<string, any>)
          }
       }, {} as Record<string, Record<string, any>>);

       setDataSet({
        ...dataset,
        ...dsObj
       })
  }

  async function fetchMeta(
    modelnames: string[],
    dictnames: string[] = [],
    viewnames: string[] = [],
  ) {
    const modelNames = modelnames.filter((a) => !models[a]);
    const dictNames = dictnames.filter((a) => !dicts[a]);
    const viewNames = viewnames.filter((a) => !views[a]);
    const isData =
      modelNames.length > 0 || dictNames.length > 0 || viewNames.length > 0;
    //------------
    const [error, res]: [{ data: IMetaResponse }, any] = isData
      ? await post({
          url: 'mdd/meta',
          data: {
            models: modelNames,
            dicts: dictNames,
            views: viewNames,
          },
        })
      : [undefined, { data: {} }];

    if(error) {
      message.error((error as any).message)
      return;
    }

    if (res?.data) {
      if (isNotEmptyObject(res.data.models))
        setModels({ ...models, ...res.data.models });
      if (isNotEmptyObject(res.data.dicts)) setDicts({ ...dicts, ...res.data.dicts });
      if (isNotEmptyObject(res.data.views)) setViews({ ...views, ...res.data.views });
    //   alert(JSON.stringify(views))
    }
  }

  return {
    getModel,
    fetchMeta,
    models,
    dicts,
    getView,
    views,
    mergeDataSet,
    dataset
  };
}

export const [useMetaContext, MetaContextProvider] = createStore(
  useMetaContextInternal,
);

export function MetaContextProviderParent(props: any) {
  return <MetaContextProvider>{props.children}</MetaContextProvider>;
}
