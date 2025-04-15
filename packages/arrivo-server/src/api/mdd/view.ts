// import { ModelFieldType } from './model';

import { ModelFieldType } from './field';

interface IBaseField {
  name: string;
  label?: string;
  regName?: string;
}
export interface IDataContainer {
  name: string;
  label?: string;
  fields: IListField[];
  keyField: string;
  key?: string;
  type: string;
}

export enum IRenderType {
  Detail = 'Detail',
  Text = 'Text',
  Switch = 'Switch',
  TextArea = 'TextArea',
  Single = 'Single',
  DataTime = 'DataTime',
  DateTimeDetail = 'DateTimeDetail',
  BooleanDetail = 'BooleanDetail',
  SingleDetail = 'SingleDetail',
  MultiDetail = 'MultiDetail',
  MultiSelect = 'MultiSelect',
  DataTimeRange = 'DataTimeRange',
  NumberRange = 'NumberRange',
  HTML = 'HTML',
  HTMLDetail = 'HTMLDetail',
  ToOneDetail = 'ToOneDetail',
  ToManyDetail = 'ToManyDetail',
  ToOneEdit = 'ToOneEdit',
  LinkOneDetail = 'LinkOneDetail',
  BooleanSelect = 'BooleanSelect',
  DurationDetail = 'DurationDetail',
}

export interface IListField extends IBaseField {
  renderType?: IRenderType;
}

export interface ISearchField extends IBaseField {
  renderType?: IRenderType;
}

export interface ISearchConfig {
  fields: ISearchField[];
}

export interface IAction {
  label: string;
  type: 'new' | 'edit' | 'detail' | 'submit' | 'del';
}

export interface IListDataContainer extends IDataContainer {
  search: ISearchConfig;
  type: 'list';
  actions: IAction[];
  dataActions: IAction[];
}

export interface IFormDataContainer extends IDataContainer {
  type: 'form';
  actions: IAction[];
}

export interface IDetailDataContainer extends IDataContainer {
  type: 'detail';
}
export interface ITableFormDataContainer extends IDataContainer {
  type: 'tableForm';
}

export interface IView {
  type: string;
  label?: string;
  name: string;
  dataContainers: IDataContainer[];
}

// export type IListView = IView;
// alert(JSON.stringify(ModelFieldType.Boolean))
export const DefaultSearFormFields = [
  ModelFieldType.Boolean,
  ModelFieldType.DateTime,
  ModelFieldType.Single,
  ModelFieldType.Multi,
  ModelFieldType.Text,
];
