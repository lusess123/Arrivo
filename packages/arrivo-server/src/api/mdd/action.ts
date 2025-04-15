export type IFormActionParam = IActionParam;

export interface IListActionParam extends IActionParam {
  pageIndex: number;
  pageSize: number;
  where?: any;
  search?: any;
}

export interface IFormActionResult {
  model: string;
  row: any;
}

export interface IActionParam {
  model: string;
  id: string;
  row: any;
  fields: string[];
}
