import { setModel } from 'src/mdd/model.store';
import { IModel, ModelFieldType } from '../api';

export const PhoneCodeModel: IModel = {
  name: 'PhoneCode',
  label: '手机号验证码',
  fields: [
    { name: 'id', label: 'ID', fieldType: ModelFieldType.Key },
    { name: 'code', label: '验证码', fieldType: ModelFieldType.Text },
    { name: 'userId', label: '用户ID', fieldType: ModelFieldType.Text },
    {
      name: 'expiredTime',
      label: '过期时间',
      fieldType: ModelFieldType.DateTime,
    },
    { name: 'toPhoneNumber', label: '手机号', fieldType: ModelFieldType.Text },
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

setModel('PhoneCode', PhoneCodeModel);
