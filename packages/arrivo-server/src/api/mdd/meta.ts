import { IModel } from './model';
import { IView } from './view';
import { IDict } from './dict';

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
