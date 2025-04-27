import { setModel } from 'src/mdd/model.store';
import { IModel, ModelFieldType } from '../api';

export const MySentencesModel: IModel = {
  name: 'MySentences',
  label: '我的句子',
  tableName: 'Sentences',
  fields: [
    { name: 'id', label: 'ID', fieldType: ModelFieldType.Key },
    // { name: 'content', label: '内容', fieldType: ModelFieldType.Text },
    // { name: 'articleId', label: '文章ID', fieldType: ModelFieldType.Text },
    {
      name: 'originalContent',
      label: '原文',
      fieldType: ModelFieldType.TextArea,
    },
    {
      name: 'translatedContent',
      label: '翻译',
      fieldType: ModelFieldType.TextArea,
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

setModel('MySentences', MySentencesModel);
