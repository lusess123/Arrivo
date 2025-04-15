import { IModel, ModelFieldType, IDict, IView, IModelField } from '../api';
import { modelToDetailView, modelToListView, modelToNewView } from './convert';

const ModelStore: Record<string, IModel> = {};
const DictStore: Record<string, IDict> = {};
const ViewStore: Record<string, IView> = {};

export const getView = (name: string) => {
  const [modelName, viewName] = name.split('.');
  switch (viewName) {
    case 'editview':
    case 'newview':
      return (ViewStore[name] ??= modelToNewView(ModelStore[modelName]));
    case 'detailview':
      return (ViewStore[name] ??= modelToDetailView(ModelStore[modelName]));
    case 'listview':
    default:
      return (ViewStore[name] ??= modelToListView(ModelStore[modelName]));
  }
};

export const setView = (name: string, view: IView) => {
  ViewStore[name] = view;
};

export const getDict = (name: string) => {
  return DictStore[name];
};
export const getModel = (name: string) => {
  return ModelStore[name];
};
export const setModel = (name: string, model: IModel) => {
  model.fieldsObject = model.fields.reduce(
    (acc, cur) => {
      acc[cur.name] = cur;
      return acc;
    },
    {} as Record<string, IModelField>
  );
  ModelStore[name] = model;
};

export const setDict = (name: string, dict: IDict) => {
  Object.keys(dict).forEach((key, index) => {
    dict[key].index = index;
  });
  DictStore[name] = dict;
};

export const getListViewByModel = (name: string) => {
  if (ViewStore[name + '.listview']) return ViewStore[name + '.listview'];
  const model = getModel(name);
  if (!model) {
    return null;
  }
  const view = modelToListView(model);
  ViewStore[name + '.listview'] = view;
  return view;
};

export function getEditViewByModel(name: string, viewType: string) {
  const key = name + '.' + viewType;
  if (ViewStore[key]) return ViewStore[key];
  const model = getModel(name);
  if (!model) {
    return null;
  }
  if (viewType === 'newview' || viewType === 'editview') {
    return (ViewStore[key] ??= modelToNewView(model));
  } else {
    return getListViewByModel(model.name);
  }
}

export function getModelMeta(model: IModel) {
  const fields: Record<string, ModelFieldType> = {};
  model.fields.forEach(field => {
    fields[field.name] = field.fieldType;
  });
  return fields;
}
