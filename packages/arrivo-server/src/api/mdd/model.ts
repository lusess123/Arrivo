import { ModelFieldType } from './field';
import { IRenderType } from './view';

export enum PageStyle {
  All = 'All',
  List = 'List',
  Detail = 'Detail',
  New = 'New',
  Edit = 'Edit',
  ReadOnly = 'ReadOnly',
  Search = 'Search',
}
export interface IModelField {
  name: string;
  label?: string;
  fieldType: ModelFieldType;
  pageStyle?: PageStyle[];
  relationModel?: string;
  regName?: string;
  foreignKey?: string;
  span?: number;
}

export interface IModel {
  name: string;
  displayField?: string;
  label?: string;
  fields: IModelField[];
  fieldsObject?: Record<string, IModelField>;
}

export interface IModelFieldMapperItem {
  fieldType: ModelFieldType;
  tableRenderType?: IRenderType;
  detailRenderType?: IRenderType;
  formRenderType?: IRenderType;
  searchRenderType?: IRenderType;
  formSpan?: number;
}

export type IModelFieldMapper = Partial<
  Record<ModelFieldType, IModelFieldMapperItem>
>;

export const ModelFieldMapper: IModelFieldMapper = {
  [ModelFieldType.Boolean]: {
    fieldType: ModelFieldType.Boolean,
    tableRenderType: IRenderType.BooleanDetail,
    detailRenderType: IRenderType.BooleanDetail,
    formRenderType: IRenderType.Switch,
    searchRenderType: IRenderType.BooleanSelect,
  },
  [ModelFieldType.DateTime]: {
    fieldType: ModelFieldType.DateTime,
    tableRenderType: IRenderType.DateTimeDetail,
    detailRenderType: IRenderType.DateTimeDetail,
    formRenderType: IRenderType.DataTime,
    searchRenderType: IRenderType.DataTimeRange,
  },
  [ModelFieldType.Multi]: {
    fieldType: ModelFieldType.Multi,
    tableRenderType: IRenderType.MultiDetail,
    detailRenderType: IRenderType.MultiDetail,
    formRenderType: IRenderType.MultiSelect,
    searchRenderType: IRenderType.MultiSelect,
    formSpan: 0,
  },
  [ModelFieldType.Single]: {
    fieldType: ModelFieldType.Single,
    tableRenderType: IRenderType.SingleDetail,
    detailRenderType: IRenderType.SingleDetail,
    formRenderType: IRenderType.Single,
    searchRenderType: IRenderType.MultiSelect,
    formSpan: 2,
  },
  [ModelFieldType.Number]: {
    fieldType: ModelFieldType.Number,
    tableRenderType: IRenderType.Detail,
    detailRenderType: IRenderType.Detail,
    formRenderType: IRenderType.NumberRange,
    searchRenderType: IRenderType.NumberRange,
  },
  [ModelFieldType.Text]: {
    fieldType: ModelFieldType.Text,
    tableRenderType: IRenderType.Detail,
    detailRenderType: IRenderType.Detail,
    formRenderType: IRenderType.Text,
    searchRenderType: IRenderType.Text,
  },
  [ModelFieldType.toManay]: {
    fieldType: ModelFieldType.toManay,
    tableRenderType: IRenderType.ToManyDetail,
    detailRenderType: IRenderType.Detail,
    formRenderType: IRenderType.Text,
    searchRenderType: IRenderType.Text,
    formSpan: 0,
  },
  [ModelFieldType.toOne]: {
    fieldType: ModelFieldType.toOne,
    tableRenderType: IRenderType.ToOneDetail,
    detailRenderType: IRenderType.ToOneDetail,
    formRenderType: IRenderType.ToOneEdit,
    searchRenderType: IRenderType.Text,
    formSpan: 2,
  },
  [ModelFieldType.Key]: {
    fieldType: ModelFieldType.Key,
    tableRenderType: IRenderType.Detail,
    detailRenderType: IRenderType.Detail,
    formRenderType: IRenderType.Text,
    searchRenderType: IRenderType.Text,
  },
  [ModelFieldType.HTML]: {
    fieldType: ModelFieldType.HTML,
    tableRenderType: IRenderType.Detail,
    detailRenderType: IRenderType.HTMLDetail,
    formRenderType: IRenderType.HTML,
    searchRenderType: IRenderType.Text,
    formSpan: 0,
  },
  [ModelFieldType.TextArea]: {
    fieldType: ModelFieldType.TextArea,
    formRenderType: IRenderType.TextArea,
    formSpan: 0,
  },
  [ModelFieldType.linkOne]: {
    fieldType: ModelFieldType.TextArea,
    formRenderType: IRenderType.TextArea,
    tableRenderType: IRenderType.LinkOneDetail,
    detailRenderType: IRenderType.Detail,
    formSpan: 0,
  },
  [ModelFieldType.linkManay]: {
    fieldType: ModelFieldType.TextArea,
    formRenderType: IRenderType.TextArea,
    formSpan: 0,
  },
  [ModelFieldType.Duration]: {
    fieldType: ModelFieldType.Duration,
    tableRenderType: IRenderType.DurationDetail,
    detailRenderType: IRenderType.DurationDetail,
    formSpan: 0,
  },
};
