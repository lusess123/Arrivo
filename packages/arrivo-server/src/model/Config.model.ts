import { setModel } from 'src/mdd/model.store';
import { IModel, ModelFieldType } from '../api';

export const ConfigModel: IModel = {
  name: 'Config',
  label: '配置',
  fields: [
    { name: 'id', label: 'ID', fieldType: ModelFieldType.Key },
    { name: 'key', label: '键', fieldType: ModelFieldType.Text },
    { name: 'value', label: '值', fieldType: ModelFieldType.Text },
    { name: 'description', label: '描述', fieldType: ModelFieldType.Text },
    { name: 'appName', label: '应用名称', fieldType: ModelFieldType.Text },
    {
      name: 'deletedAt',
      label: '删除时间',
      fieldType: ModelFieldType.DateTime,
    },
    {
      name: 'createdAt',
      label: '创建时间',
      fieldType: ModelFieldType.DateTime,
    },
    {
      name: 'updatedAt',
      label: '更新时间',
      fieldType: ModelFieldType.DateTime,
    },
    { name: 'deletedBy', label: '删除人', fieldType: ModelFieldType.Text },
    { name: 'createdBy', label: '创建人', fieldType: ModelFieldType.Text },
    { name: 'updatedBy', label: '更新人', fieldType: ModelFieldType.Text },
    { name: 'tenantId', label: '租户ID', fieldType: ModelFieldType.Text },
    { name: 'teamId', label: '团队ID', fieldType: ModelFieldType.Text },
  ],
};

setModel('Config', ConfigModel);
