import { setModel, setDict } from 'src/mdd/model.store';
import { IModel, IDict, ModelFieldType } from '../api';

export const UserModel: IModel = {
  name: 'User',
  label: '用户',
  displayField: 'nickname',
  fields: [
    { name: 'id', label: 'ID', fieldType: ModelFieldType.Key },
    { name: 'userName', label: '用户名', fieldType: ModelFieldType.Text },
    { name: 'nickname', label: '昵称', fieldType: ModelFieldType.Text },
    { name: 'email', label: '邮箱', fieldType: ModelFieldType.Text },
    { name: 'phoneNumber', label: '手机号', fieldType: ModelFieldType.Text },
    { name: 'wechatId', label: '微信号', fieldType: ModelFieldType.Text },
    { name: 'remarkInfo', label: '备注信息', fieldType: ModelFieldType.Text },
    {
      name: 'lastLoginTime',
      label: '最近登录时间',
      fieldType: ModelFieldType.DateTime,
    },
    {
      name: 'lastLogoutTime',
      label: '最近登出时间',
      fieldType: ModelFieldType.DateTime,
    },
    {
      name: 'registrationTime',
      label: '注册时间',
      fieldType: ModelFieldType.DateTime,
    },
    { name: 'companyName', label: '公司名称', fieldType: ModelFieldType.Text },
    { name: 'openId', label: 'OpenId', fieldType: ModelFieldType.Text },
    { name: 'headimgurl', label: '头像URL', fieldType: ModelFieldType.Text },
    { name: 'newUser', label: '新用户', fieldType: ModelFieldType.Boolean },
    { name: 'access', label: '访问权限', fieldType: ModelFieldType.Text },
    { name: 'voice', label: '语音', fieldType: ModelFieldType.Text },
    { name: 'speed', label: '速度', fieldType: ModelFieldType.Number },
    {
      name: 'is_delayed',
      label: '是否延迟',
      fieldType: ModelFieldType.Boolean,
    },
    { name: 'is_public', label: '是否公开', fieldType: ModelFieldType.Boolean },
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
    { name: 'env', label: '环境', fieldType: ModelFieldType.Text },
  ],
};

setModel('User', UserModel);
