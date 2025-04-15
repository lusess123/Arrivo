export interface IDictOption {
  value: any;
  label: string;
  index?: number;
}

export type IDict = Record<string, IDictOption>;
