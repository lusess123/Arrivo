import {
  DefaultSearFormFields,
  type IDict,
  type IDetailDataContainer,
  type IFormDataContainer,
  type IModel,
  type IModelField,
  type IListDataContainer,
  type IView,
  ModelFieldType,
  PageStyle
} from "@arrivo/contracts";

const modelStore: Record<string, IModel> = {};
const dictStore: Record<string, IDict> = {};
const viewStore: Record<string, IView> = {};

function withFieldsObject(model: IModel): IModel {
  return {
    ...model,
    fieldsObject: model.fields.reduce(
      (acc, field) => {
        acc[field.name] = field;
        return acc;
      },
      {} as Record<string, IModelField>
    )
  };
}

export function setModel(name: string, model: IModel) {
  modelStore[name] = withFieldsObject(model);
}

export function setDict(name: string, dict: IDict) {
  Object.keys(dict).forEach((key, index) => {
    dict[key].index = index;
  });
  dictStore[name] = dict;
}

export function getDict(name: string) {
  return dictStore[name];
}

export function getModel(name: string) {
  return modelStore[name];
}

export function getModelMeta(model: IModel) {
  const fields: Record<string, ModelFieldType> = {};
  model.fields.forEach((field) => {
    fields[field.name] = field.fieldType;
  });
  return fields;
}

export function getView(name: string) {
  const [modelName, viewName] = name.split(".");
  const model = getModel(modelName);
  if (!model) return null;

  switch (viewName) {
    case "editview":
    case "newview":
      return (viewStore[name] ??= modelToNewView(model));
    case "detailview":
      return (viewStore[name] ??= modelToDetailView(model));
    case "listview":
    default:
      return (viewStore[name] ??= modelToListView(model));
  }
}

export function getListViewByModel(name: string) {
  const key = `${name}.listview`;
  if (viewStore[key]) return viewStore[key];
  const model = getModel(name);
  if (!model) return null;
  return (viewStore[key] = modelToListView(model));
}

export function getEditViewByModel(name: string, viewType: string) {
  const key = `${name}.${viewType}`;
  if (viewStore[key]) return viewStore[key];
  const model = getModel(name);
  if (!model) return null;
  if (viewType === "newview" || viewType === "editview") {
    return (viewStore[key] = modelToNewView(model));
  }
  return getListViewByModel(model.name);
}

export function modelToListView(model: IModel): IView {
  const modelLabel = model.label || model.name;
  const listDataContainer: IListDataContainer = {
    name: model.name,
    type: "list",
    fields: model.fields
      .filter(
        (field) =>
          field.fieldType !== ModelFieldType.Key &&
          field.fieldType !== ModelFieldType.toManay &&
          (!field.pageStyle ||
            field.pageStyle.includes(PageStyle.List) ||
            field.pageStyle.includes(PageStyle.All) ||
            field.pageStyle.includes(PageStyle.ReadOnly))
      )
      .map((field) => ({ name: field.name })),
    search: {
      fields: model.fields
        .map((field) => {
          if (!DefaultSearFormFields.includes(field.fieldType) || field.fieldType === ModelFieldType.Key) {
            return null;
          }
          return { name: field.name };
        })
        .filter((field): field is { name: string } => Boolean(field))
    },
    keyField: model.fields.find((field) => field.fieldType === ModelFieldType.Key)?.name || "id",
    actions: [{ label: "新建", type: "new" }],
    dataActions: [
      { label: "详情", type: "detail" },
      { label: "编辑", type: "edit" },
      { label: "删除", type: "del" }
    ]
  };

  return {
    label: modelLabel,
    name: model.name,
    type: "list",
    dataContainers: [listDataContainer]
  };
}

export function modelToDetailView(model: IModel): IView {
  const modelLabel = model.label || model.name;
  const dataContainer: IDetailDataContainer = {
    name: model.name,
    type: "detail",
    label: modelLabel,
    fields: model.fields
      .filter((field) => field.fieldType !== ModelFieldType.Key && !field.relationModel)
      .map((field) => ({ name: field.name })),
    keyField: model.fields.find((field) => field.fieldType === ModelFieldType.Key)?.name || "id"
  };

  return {
    label: modelLabel,
    name: model.name,
    type: "detail",
    dataContainers: [dataContainer]
  };
}

export function modelToNewView(model: IModel): IView {
  const modelLabel = model.label || model.name;
  const dataContainer: IFormDataContainer = {
    name: model.name,
    type: "form",
    label: modelLabel,
    fields: model.fields
      .filter((field) => field.fieldType !== ModelFieldType.Key && field.fieldType !== ModelFieldType.toManay)
      .map((field) => ({ name: field.name })),
    keyField: model.fields.find((field) => field.fieldType === ModelFieldType.Key)?.name || "id",
    actions: [{ label: "提交", type: "submit" }]
  };

  return {
    label: modelLabel,
    name: model.name,
    type: "new",
    dataContainers: [dataContainer]
  };
}

setModel("User", {
  name: "User",
  label: "用户",
  displayField: "nickname",
  fields: [
    { name: "id", label: "ID", fieldType: ModelFieldType.Key },
    { name: "userName", label: "用户名", fieldType: ModelFieldType.Text },
    { name: "nickname", label: "昵称", fieldType: ModelFieldType.Text },
    { name: "email", label: "邮箱", fieldType: ModelFieldType.Text },
    { name: "phoneNumber", label: "手机号", fieldType: ModelFieldType.Text },
    { name: "wechatId", label: "微信号", fieldType: ModelFieldType.Text },
    { name: "remarkInfo", label: "备注信息", fieldType: ModelFieldType.Text },
    { name: "lastLoginTime", label: "最近登录时间", fieldType: ModelFieldType.DateTime },
    { name: "lastLogoutTime", label: "最近登出时间", fieldType: ModelFieldType.DateTime },
    { name: "registrationTime", label: "注册时间", fieldType: ModelFieldType.DateTime },
    { name: "companyName", label: "公司名称", fieldType: ModelFieldType.Text },
    { name: "openId", label: "OpenId", fieldType: ModelFieldType.Text },
    { name: "headimgurl", label: "头像URL", fieldType: ModelFieldType.Text },
    { name: "newUser", label: "新用户", fieldType: ModelFieldType.Boolean },
    { name: "access", label: "访问权限", fieldType: ModelFieldType.Text },
    { name: "voice", label: "语音", fieldType: ModelFieldType.Text },
    { name: "speed", label: "速度", fieldType: ModelFieldType.Number },
    { name: "is_delayed", label: "是否延迟", fieldType: ModelFieldType.Boolean },
    { name: "is_public", label: "是否公开", fieldType: ModelFieldType.Boolean },
    { name: "deletedAt", label: "删除时间", fieldType: ModelFieldType.DateTime },
    { name: "createdAt", label: "创建时间", fieldType: ModelFieldType.DateTime },
    { name: "updatedAt", label: "更新时间", fieldType: ModelFieldType.DateTime },
    { name: "deletedBy", label: "删除人", fieldType: ModelFieldType.Text },
    { name: "createdBy", label: "创建人", fieldType: ModelFieldType.Text },
    { name: "updatedBy", label: "更新人", fieldType: ModelFieldType.Text },
    { name: "tenantId", label: "租户ID", fieldType: ModelFieldType.Text },
    { name: "teamId", label: "团队ID", fieldType: ModelFieldType.Text },
    { name: "env", label: "环境", fieldType: ModelFieldType.Text }
  ]
});

setModel("Articles", {
  name: "Articles",
  label: "文章",
  displayField: "title",
  fields: [
    { name: "id", label: "ID", fieldType: ModelFieldType.Key },
    { name: "content", label: "内容", fieldType: ModelFieldType.Text },
    { name: "title", label: "标题", fieldType: ModelFieldType.Text },
    { name: "isPublic", label: "是否公共", fieldType: ModelFieldType.Boolean },
    { name: "user", label: "用户", fieldType: ModelFieldType.toOne, relationModel: "User" },
    { name: "deletedAt", label: "删除时间", fieldType: ModelFieldType.DateTime },
    {
      name: "Sentences",
      label: "句子关联",
      fieldType: ModelFieldType.toManay,
      relationModel: "Sentences",
      foreignKey: "articleId"
    },
    { name: "createdAt", label: "创建时间", fieldType: ModelFieldType.DateTime },
    { name: "updatedAt", label: "更新时间", fieldType: ModelFieldType.DateTime },
    { name: "deletedBy", label: "删除人", fieldType: ModelFieldType.Text },
    { name: "createdBy", label: "创建人", fieldType: ModelFieldType.Text },
    { name: "updatedBy", label: "更新人", fieldType: ModelFieldType.Text },
    { name: "tenantId", label: "租户ID", fieldType: ModelFieldType.Text },
    { name: "teamId", label: "团队ID", fieldType: ModelFieldType.Text },
    { name: "env", label: "环境", fieldType: ModelFieldType.Text },
    { name: "userId", label: "用户ID", fieldType: ModelFieldType.Text }
  ]
});

setModel("MyArticles", {
  name: "MyArticles",
  label: "我的文章",
  tableName: "Articles",
  dataRight: ["articleOwnerOrPublic"],
  fields: [
    { name: "id", label: "ID", fieldType: ModelFieldType.Key },
    { name: "title", label: "标题", fieldType: ModelFieldType.Text },
    { name: "isPublic", label: "是否公共", fieldType: ModelFieldType.Boolean },
    {
      name: "Sentences",
      label: "句子关联",
      fieldType: ModelFieldType.toManay,
      relationModel: "MySentences",
      foreignKey: "articleId"
    },
    { name: "createdAt", label: "创建时间", fieldType: ModelFieldType.DateTime },
    { name: "updatedAt", label: "更新时间", fieldType: ModelFieldType.DateTime }
  ]
});

setModel("Sentences", {
  name: "Sentences",
  label: "句子",
  fields: [
    { name: "id", label: "ID", fieldType: ModelFieldType.Key },
    { name: "article", label: "文章", fieldType: ModelFieldType.toOne, relationModel: "Articles" },
    { name: "originalContent", label: "原文", fieldType: ModelFieldType.TextArea },
    { name: "translatedContent", label: "翻译", fieldType: ModelFieldType.TextArea },
    { name: "deletedAt", label: "删除时间", fieldType: ModelFieldType.DateTime },
    { name: "createdAt", label: "创建时间", fieldType: ModelFieldType.DateTime },
    { name: "updatedAt", label: "更新时间", fieldType: ModelFieldType.DateTime },
    { name: "deletedBy", label: "删除人", fieldType: ModelFieldType.Text },
    { name: "createdBy", label: "创建人", fieldType: ModelFieldType.Text },
    { name: "updatedBy", label: "更新人", fieldType: ModelFieldType.Text },
    { name: "tenantId", label: "租户ID", fieldType: ModelFieldType.Text },
    { name: "teamId", label: "团队ID", fieldType: ModelFieldType.Text },
    { name: "env", label: "环境", fieldType: ModelFieldType.Text }
  ]
});

setModel("MySentences", {
  name: "MySentences",
  label: "我的句子",
  tableName: "Sentences",
  dataRight: ["sentenceArticleOwnerOrPublic"],
  fields: [
    { name: "id", label: "ID", fieldType: ModelFieldType.Key },
    { name: "originalContent", label: "原文", fieldType: ModelFieldType.TextArea },
    { name: "translatedContent", label: "翻译", fieldType: ModelFieldType.TextArea },
    { name: "createdAt", label: "创建时间", fieldType: ModelFieldType.DateTime },
    { name: "updatedAt", label: "更新时间", fieldType: ModelFieldType.DateTime }
  ]
});

setModel("Config", {
  name: "Config",
  label: "配置",
  fields: [
    { name: "id", label: "ID", fieldType: ModelFieldType.Key },
    { name: "key", label: "键", fieldType: ModelFieldType.Text },
    { name: "value", label: "值", fieldType: ModelFieldType.Text },
    { name: "description", label: "描述", fieldType: ModelFieldType.Text },
    { name: "appName", label: "应用名称", fieldType: ModelFieldType.Text },
    { name: "deletedAt", label: "删除时间", fieldType: ModelFieldType.DateTime },
    { name: "createdAt", label: "创建时间", fieldType: ModelFieldType.DateTime },
    { name: "updatedAt", label: "更新时间", fieldType: ModelFieldType.DateTime },
    { name: "deletedBy", label: "删除人", fieldType: ModelFieldType.Text },
    { name: "createdBy", label: "创建人", fieldType: ModelFieldType.Text },
    { name: "updatedBy", label: "更新人", fieldType: ModelFieldType.Text },
    { name: "tenantId", label: "租户ID", fieldType: ModelFieldType.Text },
    { name: "teamId", label: "团队ID", fieldType: ModelFieldType.Text },
    { name: "env", label: "环境", fieldType: ModelFieldType.Text }
  ]
});

setModel("PhoneCode", {
  name: "PhoneCode",
  label: "手机号验证码",
  fields: [
    { name: "id", label: "ID", fieldType: ModelFieldType.Key },
    { name: "code", label: "验证码", fieldType: ModelFieldType.Text },
    { name: "userId", label: "用户ID", fieldType: ModelFieldType.Text },
    { name: "expiredTime", label: "过期时间", fieldType: ModelFieldType.DateTime },
    { name: "toPhoneNumber", label: "手机号", fieldType: ModelFieldType.Text },
    { name: "deletedAt", label: "删除时间", fieldType: ModelFieldType.DateTime },
    { name: "createdAt", label: "创建时间", fieldType: ModelFieldType.DateTime },
    { name: "updatedAt", label: "更新时间", fieldType: ModelFieldType.DateTime },
    { name: "deletedBy", label: "删除人", fieldType: ModelFieldType.Text },
    { name: "createdBy", label: "创建人", fieldType: ModelFieldType.Text },
    { name: "updatedBy", label: "更新人", fieldType: ModelFieldType.Text },
    { name: "tenantId", label: "租户ID", fieldType: ModelFieldType.Text },
    { name: "teamId", label: "团队ID", fieldType: ModelFieldType.Text },
    { name: "env", label: "环境", fieldType: ModelFieldType.Text }
  ]
});

setModel("EmailCode", {
  name: "EmailCode",
  label: "邮箱验证码",
  fields: [
    { name: "id", label: "ID", fieldType: ModelFieldType.Key },
    { name: "code", label: "验证码", fieldType: ModelFieldType.Text },
    { name: "purpose", label: "用途", fieldType: ModelFieldType.Text },
    { name: "userId", label: "用户ID", fieldType: ModelFieldType.Text },
    { name: "expiredTime", label: "过期时间", fieldType: ModelFieldType.DateTime },
    { name: "toEmail", label: "邮箱", fieldType: ModelFieldType.Text },
    { name: "usedAt", label: "使用时间", fieldType: ModelFieldType.DateTime },
    { name: "deletedAt", label: "删除时间", fieldType: ModelFieldType.DateTime },
    { name: "createdAt", label: "创建时间", fieldType: ModelFieldType.DateTime },
    { name: "updatedAt", label: "更新时间", fieldType: ModelFieldType.DateTime },
    { name: "deletedBy", label: "删除人", fieldType: ModelFieldType.Text },
    { name: "createdBy", label: "创建人", fieldType: ModelFieldType.Text },
    { name: "updatedBy", label: "更新人", fieldType: ModelFieldType.Text },
    { name: "tenantId", label: "租户ID", fieldType: ModelFieldType.Text },
    { name: "teamId", label: "团队ID", fieldType: ModelFieldType.Text },
    { name: "env", label: "环境", fieldType: ModelFieldType.Text }
  ]
});

setModel("UserPassword", {
  name: "UserPassword",
  label: "用户密码",
  fields: [
    { name: "id", label: "ID", fieldType: ModelFieldType.Key },
    { name: "password", label: "密码", fieldType: ModelFieldType.Text },
    { name: "deletedAt", label: "删除时间", fieldType: ModelFieldType.DateTime },
    { name: "createdAt", label: "创建时间", fieldType: ModelFieldType.DateTime },
    { name: "updatedAt", label: "更新时间", fieldType: ModelFieldType.DateTime },
    { name: "deletedBy", label: "删除人", fieldType: ModelFieldType.Text },
    { name: "createdBy", label: "创建人", fieldType: ModelFieldType.Text },
    { name: "updatedBy", label: "更新人", fieldType: ModelFieldType.Text },
    { name: "tenantId", label: "租户ID", fieldType: ModelFieldType.Text },
    { name: "teamId", label: "团队ID", fieldType: ModelFieldType.Text },
    { name: "env", label: "环境", fieldType: ModelFieldType.Text }
  ]
});
