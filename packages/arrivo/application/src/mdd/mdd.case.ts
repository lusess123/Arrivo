import type {
  AuthUserDto,
  IActionParam,
  IDict,
  IFormActionParam,
  IListActionParam,
  IMetaRequest,
  IMetaResponse,
  IModelField
} from "@arrivo/contracts";
import { ModelFieldType } from "@arrivo/contracts";
import { httpError } from "@arrivo/runtime";
import { createRecordBase, getUserTenantId, softDeleteRecordBase, updateRecordBase } from "../runtime/data-scope";
import { db } from "../runtime/db";
import { getDict, getEditViewByModel, getListViewByModel, getModel, getModelMeta, getView } from "./model-store";

const prismaDelegateByModel: Record<string, string> = {
  User: "user",
  Articles: "articles",
  MyArticles: "articles",
  Sentences: "sentences",
  MySentences: "sentences",
  Config: "config",
  UserPassword: "userPassword",
  PhoneCode: "phoneCode",
  EmailCode: "emailCode"
};

type PrismaDelegate = {
  findFirst(args: unknown): Promise<unknown>;
  findMany(args: unknown): Promise<unknown[]>;
  count(args: unknown): Promise<number>;
  create(args: unknown): Promise<unknown>;
  update(args: unknown): Promise<unknown>;
};

function getDelegate(modelName: string): PrismaDelegate {
  const model = getModel(modelName);
  const tableName = model?.tableName || modelName;
  const delegateName = prismaDelegateByModel[tableName];
  const delegate = delegateName ? (db as unknown as Record<string, PrismaDelegate>)[delegateName] : undefined;
  if (!delegate) throw httpError.badRequest(`未知模型: ${modelName}`);
  return delegate;
}

const protectedMutationFields = new Set([
  "id",
  "tenantId",
  "deletedAt",
  "deletedBy",
  "createdAt",
  "createdBy",
  "updatedAt",
  "updatedBy"
]);

const userWritableModels = new Set(["MyArticles", "MySentences"]);

function canMutateModel(modelName: string, user: AuthUserDto) {
  return user.access === "root" || userWritableModels.has(modelName);
}

function getActiveBaseWhere(user: AuthUserDto, options?: { includeDeleted?: boolean }) {
  const where: Record<string, unknown> = {
    tenantId: getUserTenantId(user)
  };
  if (!options?.includeDeleted) where.deletedAt = null;
  return where;
}

function getArticleOwnerOrPublicWhere(user: AuthUserDto, options?: { includeDeleted?: boolean }) {
  return {
    ...getActiveBaseWhere(user, options),
    OR: [{ userId: user.id }, { isPublic: true }]
  };
}

function getDataRightWhere(modelName: string, user: AuthUserDto, options?: { includeDeleted?: boolean }) {
  const model = getModel(modelName);
  const dataRight = model?.dataRight || [];
  if (dataRight.includes("articleOwnerOrPublic")) {
    return getArticleOwnerOrPublicWhere(user, options);
  }
  if (dataRight.includes("sentenceArticleOwnerOrPublic")) {
    return {
      ...getActiveBaseWhere(user, options),
      article: getArticleOwnerOrPublicWhere(user, options)
    };
  }
  const where = getActiveBaseWhere(user, options);
  dataRight.forEach((item) => {
    if (item === "user") where.userId = user.id;
  });
  return where;
}

function getCreateDataScope(modelName: string, user: AuthUserDto) {
  const model = getModel(modelName);
  const dataRight = model?.dataRight || [];
  const data: Record<string, unknown> = {
    tenantId: getUserTenantId(user)
  };
  dataRight.forEach((item) => {
    if (item === "user" || item === "articleOwnerOrPublic") data.userId = user.id;
  });
  return data;
}

function getLinkedArticleId(params: IFormActionParam, row: Record<string, unknown>) {
  const articleFromWhere = params.where && typeof params.where === "object" ? (params.where as Record<string, unknown>).articleId : undefined;
  const articleFromRow = row.articleId;
  const articleRelation = row.article;
  if (articleFromWhere) return articleFromWhere;
  if (articleFromRow) return articleFromRow;
  if (typeof articleRelation === "object" && articleRelation !== null && "id" in articleRelation) {
    return (articleRelation as { id: unknown }).id;
  }
  return undefined;
}

async function assertCreateAllowed(modelName: string, user: AuthUserDto, params: IFormActionParam, row: Record<string, unknown>) {
  if (user.access === "root" || modelName === "MyArticles") return;
  if (modelName !== "MySentences") throw httpError.forbidden("权限不足");

  const articleId = getLinkedArticleId(params, row);
  if (!articleId) throw httpError.badRequest("缺少文章 ID");

  const article = await db.articles.findFirst({
    where: {
      id: String(articleId),
      ...getArticleOwnerOrPublicWhere(user)
    },
    select: {
      id: true
    }
  });
  if (!article) throw httpError.forbidden("权限不足");
}

function compactObject(input: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined && value !== ""));
}

function getSelectForFields(modelName: string, fields: string[]) {
  const model = getModel(modelName);
  if (!model) throw httpError.badRequest(`未知模型: ${modelName}`);
  let select: Record<string, unknown> = { id: true };
  const fieldsMap = model.fieldsObject || {};

  fields.forEach((field) => {
    const fieldMeta = fieldsMap[field];
    if (!fieldMeta) return;
    const isLinkField =
      fieldMeta.fieldType === ModelFieldType.linkOne || fieldMeta.fieldType === ModelFieldType.linkManay;
    if (fieldMeta.relationModel && !isLinkField) {
      const relationModel = getModel(fieldMeta.relationModel);
      const displayField = relationModel?.displayField;
      select = {
        ...select,
        [field]: {
          select: {
            id: true,
            ...(displayField ? { [displayField]: true } : {})
          }
        }
      };
    } else {
      select = { ...select, [field]: true };
    }
  });

  return select;
}

function getLinkFields(modelName: string, fields: string[]) {
  const model = getModel(modelName);
  if (!model) return {};
  const fieldsMap = model.fieldsObject || {};
  const linkFields: Record<string, IModelField> = {};
  fields.forEach((field) => {
    const fieldMeta = fieldsMap[field];
    if (!fieldMeta) return;
    const isLinkField =
      fieldMeta.fieldType === ModelFieldType.linkOne || fieldMeta.fieldType === ModelFieldType.linkManay;
    if (isLinkField) linkFields[field] = fieldMeta;
  });
  return linkFields;
}

function buildSearchWhere(modelName: string, params: IListActionParam, user: AuthUserDto) {
  const model = getModel(modelName);
  if (!model) throw httpError.badRequest(`未知模型: ${modelName}`);
  const result: Record<string, unknown> = {};
  const orResult: Array<Record<string, unknown>> = [];

  Object.keys(params.search || {}).forEach((key) => {
    const searchValue = params.search?.[key] as string | string[] | boolean | undefined;
    const fieldType = model.fieldsObject?.[key]?.fieldType;
    switch (fieldType) {
      case ModelFieldType.DateTime:
        if (Array.isArray(searchValue) && searchValue.length > 0) {
          result[key] = {
            gte: searchValue[0],
            lte: searchValue.length > 1 ? searchValue[1] : undefined
          };
        }
        break;
      case ModelFieldType.Single:
        result[key] = Array.isArray(searchValue) && searchValue.length > 0 ? { in: searchValue } : undefined;
        break;
      case ModelFieldType.Multi:
        if (Array.isArray(searchValue)) {
          searchValue.forEach((value) => {
            orResult.push({ [key]: { contains: value } });
          });
        }
        break;
      case ModelFieldType.Text:
      case ModelFieldType.TextArea:
        if (searchValue) result[key] = { contains: searchValue };
        break;
      case ModelFieldType.Boolean:
      default:
        result[key] = searchValue;
    }
  });

  const directWhere = compactObject({
    ...result,
    ...(params.where || {}),
    ...getDataRightWhere(modelName, user)
  });
  const andWhere: unknown[] = [];
  if (Object.keys(directWhere).length > 0) andWhere.push(directWhere);
  if (orResult.length > 0) andWhere.push({ OR: orResult });
  return andWhere.length > 0 ? { AND: andWhere } : {};
}

function connectById(value: unknown) {
  if (value === null || value === undefined || value === "") return undefined;
  if (typeof value === "object" && value !== null && "id" in value) {
    return { id: (value as { id: unknown }).id };
  }
  return { id: value };
}

export function getMddDicts(names: string[]) {
  return names.reduce<Record<string, IDict | undefined>>((result, item) => {
    result[item] = getDict(item);
    return result;
  }, {});
}

export function getMddModels(names: string[]) {
  return names.map((name) => getModel(name));
}

export function getMddModel(name: string) {
  return getModel(name);
}

export function getMddListView(name: string) {
  return getListViewByModel(name);
}

export function getMddEditView(name: string, viewType: string) {
  return getEditViewByModel(name, viewType);
}

export function getMddMeta(metaRequest: IMetaRequest): IMetaResponse {
  const models: IMetaResponse["models"] = {};
  const dicts: IMetaResponse["dicts"] = {};
  const views: IMetaResponse["views"] = {};

  function fetchModel(modelName: string) {
    if (models[modelName]) return;
    const model = getModel(modelName);
    if (!model) return;
    models[modelName] = model;
    model.fields.forEach((field) => {
      if (field.relationModel && !models[field.relationModel]) fetchModel(field.relationModel);
      if (field.regName && !dicts[field.regName]) {
        const dict = getDict(field.regName);
        if (dict) dicts[field.regName] = dict;
      }
    });
  }

  metaRequest.models?.forEach(fetchModel);
  metaRequest.dicts?.forEach((dictName) => {
    const dict = getDict(dictName);
    if (dict) dicts[dictName] = dict;
  });
  metaRequest.views?.forEach((viewName) => {
    const view = getView(viewName);
    if (view) views[viewName] = view;
  });

  return { models, dicts, views };
}

export async function queryMddSingle({ user, params }: { user: AuthUserDto; params: IActionParam }) {
  const model = getModel(params.model);
  if (!model) return {};
  const result = await getDelegate(params.model).findFirst({
    select: getSelectForFields(params.model, params.fields),
    where: {
      ...(params.where || {}),
      id: params.id,
      ...getDataRightWhere(params.model, user)
    }
  });
  return result ?? {};
}

export async function queryMddList({ user, params }: { user: AuthUserDto; params: IListActionParam }) {
  const model = getModel(params.model);
  if (!model) return { list: [], count: 0 };
  const delegate = getDelegate(params.model);
  const where = buildSearchWhere(params.model, params, user);
  const [list, count] = await Promise.all([
    delegate.findMany({
      select: getSelectForFields(params.model, params.fields),
      where,
      orderBy: {
        updatedAt: "desc"
      },
      skip: params.pageIndex * params.pageSize,
      take: params.pageSize
    }),
    delegate.count({ where })
  ]);

  const linkFields = getLinkFields(params.model, params.fields);
  const modelObj: Record<string, Record<string, unknown>> = {};
  list.forEach((row) => {
    Object.keys(linkFields).forEach((key) => {
      const field = linkFields[key];
      const relationId = (row as Record<string, unknown>)[field.name];
      if (relationId && field.relationModel) {
        modelObj[field.relationModel] = {
          ...(modelObj[field.relationModel] || {}),
          [String(relationId)]: {}
        };
      }
    });
  });

  const dataEntries = await Promise.all(
    Object.keys(modelObj).map(async (modelName) => {
      const relatedRows = await getDelegate(modelName).findMany({
        where: {
          id: {
            in: Object.keys(modelObj[modelName])
          },
          ...getDataRightWhere(modelName, user)
        }
      });
      return [modelName, relatedRows] as const;
    })
  );

  const data = Object.fromEntries(dataEntries);
  return Object.keys(data).length > 0 ? { list, count, data } : { list, count };
}

export async function deleteMddSingle({ user, params }: { user: AuthUserDto; params: IActionParam }) {
  if (!params.id) throw httpError.badRequest("缺少记录 ID");
  if (!canMutateModel(params.model, user)) throw httpError.forbidden("权限不足");
  const model = getModel(params.model);
  if (!model) return undefined;
  return getDelegate(params.model).update({
    where: {
      id: params.id,
      ...getDataRightWhere(params.model, user)
    },
    data: softDeleteRecordBase({ userId: user.id })
  });
}

export async function submitMddSingle({ user, params }: { user: AuthUserDto; params: IFormActionParam }) {
  if (!canMutateModel(params.model, user)) throw httpError.forbidden("权限不足");
  const model = getModel(params.model);
  if (!model) return null;
  const row = (params.row || {}) as Record<string, unknown>;
  const now = new Date();
  const dataRightWhere = getDataRightWhere(params.model, user);
  const data: Record<string, unknown> = {
    ...createRecordBase({ userId: user.id, tenantId: getUserTenantId(user), now }),
    ...(params.where || {}),
    ...getCreateDataScope(params.model, user)
  };
  const fieldTypes = getModelMeta(model);

  params.fields.forEach((field) => {
    if (protectedMutationFields.has(field)) return;
    const fieldType = fieldTypes[field];
    if (!fieldType || fieldType === ModelFieldType.toManay) return;
    if (fieldType === ModelFieldType.toOne) {
      const connect = connectById(row[field]);
      if (connect) data[field] = { connect };
      return;
    }
    data[field] = row[field] === null ? undefined : row[field];
  });

  const delegate = getDelegate(params.model);
  if (!params.id) {
    await assertCreateAllowed(params.model, user, params, row);
    return delegate.create({ data });
  }

  return delegate.update({
    data: {
      ...data,
      id: undefined,
      tenantId: undefined,
      deletedAt: undefined,
      deletedBy: undefined,
      createdAt: undefined,
      createdBy: undefined,
      ...updateRecordBase({ userId: user.id, now })
    },
    where: {
      id: params.id,
      ...dataRightWhere
    }
  });
}
