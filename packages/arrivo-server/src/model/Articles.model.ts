import { setModel } from 'src/mdd/model.store';
import { IModel, ModelFieldType } from '../api';

export const ArticlesModel: IModel = {
  name: 'Articles',
  label: '文章',
  fields: [
    { name: 'id', label: 'ID', fieldType: ModelFieldType.Key },
    { name: 'content', label: '内容', fieldType: ModelFieldType.Text },
    { name: 'title', label: '标题', fieldType: ModelFieldType.Text },
    {
      name: 'User',
      label: '用户',
      fieldType: ModelFieldType.toOne,
      relationModel: 'User',
    },
    {
      name: 'deletedAt',
      label: '删除时间',
      fieldType: ModelFieldType.DateTime,
    },
    {
      name: 'Sentences',
      label: '句子关联',
      fieldType: ModelFieldType.toManay,
      relationModel: 'Sentences',
      foreignKey: 'articleId',
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
    { name: 'userId', label: '用户ID', fieldType: ModelFieldType.Text },
  ],
};

setModel('Articles', ArticlesModel);
