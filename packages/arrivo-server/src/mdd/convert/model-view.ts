import {
  IListDataContainer,
  IFormDataContainer,
  IModel,
  IView,
  ModelFieldType,
  PageStyle,
  DefaultSearFormFields,
  IDetailDataContainer,
} from '../../api';

export function modelToListView(model: IModel): IView {
  // --------
  const modelLable = model.label || model.name;

  const listDataContainer: IListDataContainer = {
    name: model.name,
    type: 'list',
    // label: modelLable,
    fields: model.fields
      .filter(
        a =>
          a.fieldType !== ModelFieldType.Key &&
          a.fieldType !== ModelFieldType.toManay &&
          (!a.pageStyle ||
            a?.pageStyle.includes(PageStyle.List) ||
            a?.pageStyle.includes(PageStyle.All) ||
            a?.pageStyle.includes(PageStyle.ReadOnly))
      )
      .map(field => {
        return {
          name: field.name,
        };
      }),
    search: {
      fields: model.fields
        .map(field => {
          if (
            !DefaultSearFormFields.includes(field.fieldType) ||
            field.fieldType === ModelFieldType.Key
          )
            return null;
          return {
            name: field.name,
          };
        })
        .filter(a => !!a),
    },
    keyField:
      model.fields.find(a => a.fieldType === ModelFieldType.Key)?.name || 'id',
    actions: [{ label: '新建', type: 'new' }],
    dataActions: [
      { label: '详情', type: 'detail' },
      { label: '编辑', type: 'edit' },
      { label: '删除', type: 'del' },
    ],
  };

  const view: IView = {
    label: modelLable,
    name: model.name,
    type: 'list',
    dataContainers: [listDataContainer],
  };
  return view;
}

export function modelToDetailView(model: IModel): IView {
  const modelLable = model.label || model.name;

  const dataContainer: IDetailDataContainer = {
    name: model.name,
    type: 'detail',
    label: modelLable,
    fields: model.fields
      .filter(a => a.fieldType !== ModelFieldType.Key && !a.relationModel)
      .map(field => {
        return {
          name: field.name,
        };
      }),
    keyField:
      model.fields.find(a => a.fieldType === ModelFieldType.Key)?.name || 'id',
  };

  const view: IView = {
    label: modelLable,
    name: model.name,
    type: 'detail',
    dataContainers: [dataContainer],
  };
  return view;
}

export function modelToNewView(model: IModel): IView {
  // --------
  const modelLable = model.label || model.name;

  const dataContainer: IFormDataContainer = {
    name: model.name,
    type: 'form',
    label: modelLable,
    fields: model.fields
      .filter(
        a =>
          a.fieldType !== ModelFieldType.Key &&
          a.fieldType !== ModelFieldType.toManay
      )
      .map(field => {
        return {
          name: field.name,
        };
      }),
    keyField:
      model.fields.find(a => a.fieldType === ModelFieldType.Key)?.name || 'id',
    actions: [{ label: '提交', type: 'submit' }],
  };

  const view: IView = {
    label: modelLable,
    name: model.name,
    type: 'new',
    dataContainers: [dataContainer],
  };
  return view;
}
