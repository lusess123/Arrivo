import { Injectable } from '@nestjs/common';
import { PrismaClient } from 'vphone-db';
import { AuthService } from 'src/auth/auth.service';
import {
  IActionParam,
  IDict,
  IFormActionParam,
  IListActionParam,
  IMetaRequest,
  IMetaResponse,
  IModel,
  IModelField,
  IView,
  ModelFieldType,
} from 'src/api';
import { getModel, getModelMeta, getDict, getView } from './model.store';
import { generateUniqueId } from '../auth/db';
import { BusinessError } from '../auth/business.error';

@Injectable()
export class MddService {
  prismaClient: PrismaClient = new PrismaClient();
  constructor(protected readonly auth: AuthService) {}
  async onModuleInit() {
    // Note: this is optional
    await this.prismaClient.$connect();
    // this.prismaClient.$connect();
  }

  async getDicts(names: string[]) {
    if (this.auth.getUser()?.access !== 'root') {
      throw new BusinessError('权限不足');
    }
    return names.reduce((pre, item) => {
      return {
        ...pre,
        [item]: getDict(item),
      };
    }, {});
    // return names.map(a => {
    //   return getDict(a);
    // });
    // return await Promise.all(
    //   names.map(async name => {
    //     const dict = await getDict(name);
    //     return dict;
    //   })
    // );
  }

  async getModels(names: string[]) {
    if (this.auth.getUser()?.access !== 'root') {
      throw new BusinessError('权限不足');
    }
    return await Promise.all(
      names.map(async name => {
        const dict = await getModel(name);
        return dict;
      })
    );
  }

  async querySingle(params: IActionParam) {
    if (this.auth.getUser()?.access !== 'root') {
      throw new BusinessError('权限不足');
    }
    const model = getModel(params.model);
    if (model) {
      let data = { id: true };
      // const fieldsMap = getModelMeta(model);
      const fields = params.fields;
      fields.forEach(field => {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const fileMeta = model.fieldsObject![field];
        if (fileMeta) {
          const { relationModel } = fileMeta;
          const isLinkField =
            fileMeta.fieldType === ModelFieldType.linkOne ||
            fileMeta.fieldType === ModelFieldType.linkManay;
          if (relationModel && !isLinkField) {
            const relationmodel = getModel(relationModel);
            const displayField = relationmodel?.displayField;
            data = {
              ...data,
              [field]: {
                select: {
                  id: true,
                  ...(displayField
                    ? {
                        [displayField]: true,
                      }
                    : {}),
                },
              },
            };
          } else {
            data = { ...data, [field]: true };
          }

          // this.prismaClient.testStudent.findMany({
          //   select : {
          //     test : {
          //       select : {
          //         id : true,
          //         name : true
          //       }
          //     }
          //   }
          // })
        }
      });
      const paramsData: any = {
        select: data,
        where: { id: params.id },
      };
      console.log('查询参数： ', paramsData);
      const result =
        await this.prismaClient[params.model].findFirst(paramsData);
      return result;
    }
    return {};
  }

  async queryList(params: IListActionParam) {
    if (this.auth.getUser()?.access !== 'root') {
      throw new BusinessError('权限不足');
    }
    const model = getModel(params.model);
    const linkFields: Record<string, IModelField> = {};
    if (model) {
      let data = { id: true };
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const fieldsMap = model.fieldsObject!;
      const fields = params.fields;
      fields.forEach(field => {
        const fileMeta = fieldsMap[field];
        const { relationModel } = fileMeta;
        const isLinkField =
          fileMeta.fieldType === ModelFieldType.linkOne ||
          fileMeta.fieldType === ModelFieldType.linkManay;
        if (isLinkField) {
          linkFields[field] = fileMeta;
        }
        if (relationModel && !isLinkField) {
          const relationmodel = getModel(relationModel);
          const displayField = relationmodel?.displayField;
          data = {
            ...data,
            [field]: {
              select: {
                id: true,
                ...(displayField
                  ? {
                      [displayField]: true,
                    }
                  : {}),
              },
            },
          };
        } else {
          data = { ...data, [field]: true };
        }
      });

      // this.prismaClient.test.findMany({
      //   where: {
      //     AND: [
      //       {
      //         testTitle: '234',
      //       },
      //       {
      //         OR: [
      //           {
      //             sourceText: {
      //               contains: '123',
      //             },
      //           },
      //           {
      //             sourceText: {
      //               contains: '123222',
      //             },
      //           },
      //         ],
      //       },
      //     ],
      //   },
      // });
      const result: any = {};
      const orResult: any[] = [];
      Object.keys(params.search || {}).forEach(k => {
        const searchValue = params.search[k];
        const fieldType = model.fieldsObject?.[k].fieldType;

        switch (fieldType) {
          case ModelFieldType.DateTime:
            if (searchValue && searchValue.length > 0) {
              result[k] = {
                gte: searchValue[0],
                lte: searchValue.length > 1 ? searchValue[1] : undefined,
              };
            }

            break;
          case ModelFieldType.Single:
            result[k] =
              searchValue && searchValue.length > 0
                ? { in: searchValue }
                : undefined;
            break;
          case ModelFieldType.Multi:
            // result[k] = { contains: searchValue };
            searchValue.forEach(v => {
              orResult.push({
                [k]: { contains: v },
              });
            });

            break;
          case ModelFieldType.Text:
          case ModelFieldType.TextArea:
            if (searchValue) {
              result[k] = {
                contains: searchValue,
              };
            }

            break;
          case ModelFieldType.Boolean:
          default:
            result[k] = searchValue;
        }
      });

      const where = {
        AND: [
          {
            ...result,
            ...(params.where || {}),
          },
          {
            OR: orResult,
          },
        ],
      };

      // this.prismaClient.user.findMany({
      //   orderBy : {
      //     updatedBy: 'desc'
      //   }
      // })

      const pList = this.prismaClient[params.model].findMany({
        select: data,
        where: {
          ...where,
          ...(params.where || {}),
        },
        orderBy: {
          updatedAt: 'desc',
        },
        skip: Number(params.pageIndex) * Number(params.pageSize),
        take: Number(params.pageSize),
      });

      const pCount = this.prismaClient[params.model].count({
        where,
      });
      const [list, count] = await Promise.all([pList, pCount]);
      const modelObj: Record<string, Record<string, any>> = {};
      list.forEach(row => {
        Object.keys(linkFields).forEach(k => {
          const field = linkFields[k];
          if (row[field.name]) {
            const modelName = field.relationModel;
            if (modelName) {
              modelObj[modelName] = {
                ...(modelObj[modelName] || {}),
                [row[field.name]]: {},
              };
            }
          }
        });
      });
      const pQueryAll: any[] = [];
      Object.keys(modelObj).forEach(m => {
        const model = modelObj[m];
        const pQuery = this.prismaClient[m].findMany({
          where: {
            id: {
              in: Object.keys(model),
            },
          },
        });
        //--------
        pQueryAll.push(pQuery);
      });
      const _data: any = {};
      if (pQueryAll.length > 0) {
        const dataList = await Promise.all(pQueryAll);
        Object.keys(modelObj).forEach((m, index) => {
          _data[m] = dataList[index];
        });
        return { list, count, data: _data };
      } else {
        return { list, count };
      }
    }
    return { list: [], count: 0 };
  }

  async delSingleRecord(params: IActionParam) {
    if (this.auth.getUser()?.access !== 'root') {
      throw new BusinessError('权限不足');
    }
    const model = getModel(params.model);

    if (model && params.id) {
      return await this.prismaClient[params.model].delete({
        where: {
          id: params.id,
        },
      });
    }
  }

  async submitSingleRecord(params: IFormActionParam) {
    if (this.auth.getUser()?.access !== 'root') {
      throw new BusinessError('权限不足');
    }

    // this.prismaClient.user.create({
    //   data: {
    //     updatedAt: new Date(),
    //     updatedBy: this.auth.getUserId(),
    //     createdAt: new Date(),
    //     createdBy: this.auth.getUserId(),
    //   },
    // });

    const model = getModel(params.model);

    // this.prismaClient.test.update({
    //   data: {
    //     User: {
    //       connect,
    //     },
    //   },
    // });

    if (model) {
      let data: any = {
        id: generateUniqueId(),
        updatedAt: new Date(),
        updatedBy: this.auth.getUserId(),
        createdAt: new Date(),
        createdBy: this.auth.getUserId(),
      };
      const fieldsMap = getModelMeta(model);
      const fields = params.fields;
      fields.forEach(field => {
        const fileMeta = fieldsMap[field];

        // if(fieldsMap)
        if (fileMeta && fileMeta !== ModelFieldType.toManay) {
          if (fileMeta === ModelFieldType.toOne) {
            // const newDate = {
            //   connect: params.row[field],
            // };
            data = {
              ...data,
              [field]:
                params.row[field] === null
                  ? undefined
                  : {
                      connect: params.row[field],
                    },
            };
          } else {
            data = {
              ...data,
              [field]:
                params.row[field] === null ? undefined : params.row[field],
            };
          }
        }
      });
      //-----------
      console.log('data: ', data);
      console.log('params.id: ', params.id);
      if (!params.id) {
        const result = await this.prismaClient[params.model].create({
          data,
        });
        return result;
      } else {
        // this.prismaClient.exam.update
        const result = await this.prismaClient[params.model].update({
          data: {
            ...data,
            updatedAt: new Date(),
            updatedBy: this.auth.getUserId(),
            id: undefined,
          },
          where: {
            id: params.id,
          },
        });
        return result;
      }
    }
    return null;
  }

  getMeta(metaRequest: IMetaRequest): IMetaResponse {
    if (this.auth.getUser()?.access !== 'root') {
      throw new BusinessError('权限不足');
    }

    const models: Record<string, IModel> = {};
    const dicts: Record<string, IDict> = {};
    const views: Record<string, IView> = {};

    function fetchModel(modelName) {
      if (!models[modelName]) {
        const model = getModel(modelName);
        if (model) {
          models[modelName] = model;
          //字典
          //看一下关联模型
          model.fields.forEach(field => {
            if (field.relationModel && !models[field.relationModel]) {
              fetchModel(field.relationModel);
            }
            if (field.regName && !dicts[field.regName]) {
              const dict = getDict(field.regName);
              if (dict) {
                dicts[field.regName] = dict;
              }
            }
          });
        }
      }
    }

    if (metaRequest.models && metaRequest.models.length > 0) {
      metaRequest.models.forEach(modelName => {
        fetchModel(modelName);
      });
    }
    if (metaRequest.dicts && metaRequest.dicts.length > 0) {
      metaRequest.dicts.forEach(dictName => {
        if (!dicts[dictName]) {
          const dict = getDict(dictName);
          if (dict) {
            dicts[dictName] = dict;
          }
        }
      });
    }
    if (metaRequest.views && metaRequest.views.length > 0) {
      metaRequest.views.forEach(viewName => {
        if (!views[viewName]) {
          views[viewName] = getView(viewName);
        }
      });
    }
    return {
      models,
      dicts,
      views,
    };
  }
}
