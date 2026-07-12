import { z } from "zod";

export enum ModelFieldType {
  Key = "Key",
  Text = "Text",
  TextArea = "TextArea",
  HTML = "HTML",
  Number = "Number",
  DateTime = "DateTime",
  Boolean = "Boolean",
  Single = "Single",
  Multi = "Multi",
  toOne = "toOne",
  toManay = "toManay",
  linkOne = "linkOne",
  linkManay = "linkManay",
  Duration = "Duration"
}

export enum PageStyle {
  All = "All",
  List = "List",
  Detail = "Detail",
  New = "New",
  Edit = "Edit",
  ReadOnly = "ReadOnly",
  Search = "Search"
}

export enum IRenderType {
  Detail = "Detail",
  Text = "Text",
  Switch = "Switch",
  TextArea = "TextArea",
  Single = "Single",
  DataTime = "DataTime",
  DateTimeDetail = "DateTimeDetail",
  BooleanDetail = "BooleanDetail",
  SingleDetail = "SingleDetail",
  MultiDetail = "MultiDetail",
  MultiSelect = "MultiSelect",
  DataTimeRange = "DataTimeRange",
  NumberRange = "NumberRange",
  HTML = "HTML",
  HTMLDetail = "HTMLDetail",
  ToOneDetail = "ToOneDetail",
  ToManyDetail = "ToManyDetail",
  ToOneEdit = "ToOneEdit",
  LinkOneDetail = "LinkOneDetail",
  BooleanSelect = "BooleanSelect",
  DurationDetail = "DurationDetail"
}

export interface IDictOption {
  value: unknown;
  label: string;
  index?: number;
}

export type IDict = Record<string, IDictOption>;

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
  tableName?: string;
  displayField?: string;
  label?: string;
  fields: IModelField[];
  fieldsObject?: Record<string, IModelField>;
  dataRight?: string[];
}

interface IBaseField {
  name: string;
  label?: string;
  regName?: string;
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
  type: "new" | "edit" | "detail" | "submit" | "del";
}

export interface IDataContainer {
  name: string;
  label?: string;
  fields: IListField[];
  keyField: string;
  key?: string;
  type: string;
}

export interface IListDataContainer extends IDataContainer {
  search: ISearchConfig;
  type: "list";
  actions: IAction[];
  dataActions: IAction[];
}

export interface IFormDataContainer extends IDataContainer {
  type: "form";
  actions: IAction[];
}

export interface IDetailDataContainer extends IDataContainer {
  type: "detail";
}

export interface ITableFormDataContainer extends IDataContainer {
  type: "tableForm";
}

export interface IView {
  type: string;
  label?: string;
  name: string;
  dataContainers: IDataContainer[];
}

export interface IModelFieldMapperItem {
  fieldType: ModelFieldType;
  tableRenderType?: IRenderType;
  detailRenderType?: IRenderType;
  formRenderType?: IRenderType;
  searchRenderType?: IRenderType;
  formSpan?: number;
}

export type IModelFieldMapper = Partial<Record<ModelFieldType, IModelFieldMapperItem>>;

export const ModelFieldMapper: IModelFieldMapper = {
  [ModelFieldType.Boolean]: {
    fieldType: ModelFieldType.Boolean,
    tableRenderType: IRenderType.BooleanDetail,
    detailRenderType: IRenderType.BooleanDetail,
    formRenderType: IRenderType.Switch,
    searchRenderType: IRenderType.BooleanSelect
  },
  [ModelFieldType.DateTime]: {
    fieldType: ModelFieldType.DateTime,
    tableRenderType: IRenderType.DateTimeDetail,
    detailRenderType: IRenderType.DateTimeDetail,
    formRenderType: IRenderType.DataTime,
    searchRenderType: IRenderType.DataTimeRange
  },
  [ModelFieldType.Multi]: {
    fieldType: ModelFieldType.Multi,
    tableRenderType: IRenderType.MultiDetail,
    detailRenderType: IRenderType.MultiDetail,
    formRenderType: IRenderType.MultiSelect,
    searchRenderType: IRenderType.MultiSelect,
    formSpan: 0
  },
  [ModelFieldType.Single]: {
    fieldType: ModelFieldType.Single,
    tableRenderType: IRenderType.SingleDetail,
    detailRenderType: IRenderType.SingleDetail,
    formRenderType: IRenderType.Single,
    searchRenderType: IRenderType.MultiSelect,
    formSpan: 2
  },
  [ModelFieldType.Number]: {
    fieldType: ModelFieldType.Number,
    tableRenderType: IRenderType.Detail,
    detailRenderType: IRenderType.Detail,
    formRenderType: IRenderType.NumberRange,
    searchRenderType: IRenderType.NumberRange
  },
  [ModelFieldType.Text]: {
    fieldType: ModelFieldType.Text,
    tableRenderType: IRenderType.Detail,
    detailRenderType: IRenderType.Detail,
    formRenderType: IRenderType.Text,
    searchRenderType: IRenderType.Text
  },
  [ModelFieldType.toManay]: {
    fieldType: ModelFieldType.toManay,
    tableRenderType: IRenderType.ToManyDetail,
    detailRenderType: IRenderType.Detail,
    formRenderType: IRenderType.Text,
    searchRenderType: IRenderType.Text,
    formSpan: 0
  },
  [ModelFieldType.toOne]: {
    fieldType: ModelFieldType.toOne,
    tableRenderType: IRenderType.ToOneDetail,
    detailRenderType: IRenderType.ToOneDetail,
    formRenderType: IRenderType.ToOneEdit,
    searchRenderType: IRenderType.Text,
    formSpan: 2
  },
  [ModelFieldType.Key]: {
    fieldType: ModelFieldType.Key,
    tableRenderType: IRenderType.Detail,
    detailRenderType: IRenderType.Detail,
    formRenderType: IRenderType.Text,
    searchRenderType: IRenderType.Text
  },
  [ModelFieldType.HTML]: {
    fieldType: ModelFieldType.HTML,
    tableRenderType: IRenderType.Detail,
    detailRenderType: IRenderType.HTMLDetail,
    formRenderType: IRenderType.HTML,
    searchRenderType: IRenderType.Text,
    formSpan: 0
  },
  [ModelFieldType.TextArea]: {
    fieldType: ModelFieldType.TextArea,
    formRenderType: IRenderType.TextArea,
    formSpan: 0
  },
  [ModelFieldType.linkOne]: {
    fieldType: ModelFieldType.TextArea,
    formRenderType: IRenderType.TextArea,
    tableRenderType: IRenderType.LinkOneDetail,
    detailRenderType: IRenderType.Detail,
    formSpan: 0
  },
  [ModelFieldType.linkManay]: {
    fieldType: ModelFieldType.TextArea,
    formRenderType: IRenderType.TextArea,
    formSpan: 0
  },
  [ModelFieldType.Duration]: {
    fieldType: ModelFieldType.Duration,
    tableRenderType: IRenderType.DurationDetail,
    detailRenderType: IRenderType.DurationDetail,
    formSpan: 0
  }
};

export const DefaultSearFormFields = [
  ModelFieldType.Boolean,
  ModelFieldType.DateTime,
  ModelFieldType.Single,
  ModelFieldType.Multi,
  ModelFieldType.Text
];

export interface IActionParam {
  model: string;
  id?: string;
  row?: unknown;
  fields: string[];
  where?: Record<string, unknown>;
}

export type IFormActionParam = IActionParam;

export interface IListActionParam extends IActionParam {
  pageIndex: number;
  pageSize: number;
  search?: Record<string, unknown>;
}

export interface IMetaRequest {
  models?: string[];
  views?: string[];
  dicts?: string[];
  hasModels?: string[];
  hasCiews?: string[];
  hasDicts?: string[];
}

export interface IMetaResponse {
  models: Record<string, IModel>;
  views: Record<string, IView>;
  dicts: Record<string, IDict>;
}

const unknownRecordSchema = z.record(z.string(), z.unknown());

export const mddNameQuerySchema = z.object({
  name: z.string().min(1)
});

export const mddViewQuerySchema = z.object({
  name: z.string().min(1),
  viewtype: z.string().min(1)
});

export const mddNamesBodySchema = z.object({
  names: z.array(z.string()).default([])
});

export const mddActionParamSchema = z.object({
  model: z.string().min(1),
  id: z.string().optional(),
  row: z.unknown().optional(),
  fields: z.array(z.string()).default([]),
  where: unknownRecordSchema.optional()
});

export const mddListActionParamSchema = mddActionParamSchema.extend({
  pageIndex: z.coerce.number().int().min(0).default(0),
  pageSize: z.coerce.number().int().min(1).max(100).default(15),
  search: unknownRecordSchema.optional()
});

export const mddMetaRequestSchema = z.object({
  models: z.array(z.string()).optional(),
  views: z.array(z.string()).optional(),
  dicts: z.array(z.string()).optional(),
  hasModels: z.array(z.string()).optional(),
  hasCiews: z.array(z.string()).optional(),
  hasDicts: z.array(z.string()).optional()
});
