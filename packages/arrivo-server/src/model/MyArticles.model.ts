import { setModel } from 'src/mdd/model.store';
import { IModel, ModelFieldType } from '../api';

export const MyArticlesModel: IModel = {
  name: 'MyArticles',
  label: '我的文章',
  tableName: 'Articles',
  dataRight: ['user'],
  fields: [
    { name: 'id', label: 'ID', fieldType: ModelFieldType.Key },
    { name: 'title', label: '标题', fieldType: ModelFieldType.Text },
    {
      name: 'Sentences',
      label: '句子关联',
      fieldType: ModelFieldType.toManay,
      relationModel: 'MySentences',
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
  ],
};

setModel('MyArticles', MyArticlesModel);
