import SearchForm, {
  ISearchFormItem,
  ISearchFormItemType,
} from '@/components/common/search.form';
import { post } from '@/utils/util';
import { IListDataContainer, IRenderType, ModelFieldMapper } from 'arrivo-server';
import { Button, Card, message, Pagination, Table } from 'antd';
import { ColumnsType } from 'antd/es/table';
import { useEffect, useState } from 'react';
import { IViewProps } from './type';
import ButtonGroup from '@/components/common/button.group';
import { BooleanDetail } from '@/components/common/detail-component/boolean-detail';
import { DateTimeDetail } from '@/components/common/detail-component/datetime-detail';
import { Detail } from '@/components/common/detail-component/detail';
import { useMetaContext } from '../store';
import { ToOneDetail } from '@/components/common/detail-component/toone-detail';
import { CheckCircleOutlined } from '@ant-design/icons';
import { LinkOneDetail } from '@/components/common/detail-component/linkone-detail';
import DurationDetail from '@/components/common/detail-component/duration';

interface IListContainerProps {
  dataContainer: IListDataContainer;
  openWin: (param: IViewProps) => void;
  parentModalClose?: ()=> void ;
  parentRefersh?: () => void;
  where: any;
  id?: string;
  onRow:(row: any) => void ;
  currentId?: string;
  onChangeCurrntRow?: (row: any) => void ;
}

const mapRenderType = (type?: IRenderType): ISearchFormItemType => {
  switch (type) {
    case IRenderType.MultiSelect:
      return 'Multi';
    case IRenderType.NumberRange:
    case IRenderType.DataTimeRange:
      return 'DateTimeRangePicker';
    case IRenderType.BooleanSelect:
       return 'BooleanSelect';
    default:
      return 'Input';
  }
};

const mapTableRenderType = (type?: IRenderType): any => {
  switch (type) {
    case IRenderType.BooleanDetail:
      return BooleanDetail;
    case IRenderType.DateTimeDetail:
      return DateTimeDetail;
    case IRenderType.ToOneDetail: 
      return ToOneDetail;
    case IRenderType.LinkOneDetail: 
      return LinkOneDetail;
    case IRenderType.DurationDetail:
       return DurationDetail;
    // case IRenderType.MultiDetail:
    //   return 'Multi';
    // case IRenderType.SingleDetail:
    //   return 'Single';
    default:
      return Detail;
  }
}
export function ListContainer(props: IListContainerProps) {
  const { models, mergeDataSet } = useMetaContext()
  const [list, setList] = useState<any>([]);
  const [page, setPage] = useState<any>({count: 0 ,  pageIndex: 0,
    pageSize: 15});
  const [update, setUpdate] = useState(+new Date())
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState({});
  useEffect(() => {
    //-----------
    (async function () {
      setLoading(true)
      const [{ data }] = await post({
        url: 'mdd/querylistaction',
        data: {
          pageIndex: page.pageIndex,
          pageSize: page.pageSize,
          model: props.dataContainer.name,
          fields: props.dataContainer.fields.map((a) => a.name),
          where: props.where,
          search
        },
      });
      setLoading(false)
      setList(data.list);
      if(data.data) mergeDataSet(data.data)
      setPage({ ...page , count: data.count})
    })();
  }, [update, page.pageIndex, page.pageSize, search]);

  const dataContainer = props.dataContainer;
  const model = models[dataContainer.name]!
  const items: ISearchFormItem[] = model ? dataContainer.search.fields.map((field) => {
    const modelField = model.fieldsObject![field.name]
    return {
      name: field.name,
      type: mapRenderType(field.renderType || ModelFieldMapper[modelField.fieldType]?.searchRenderType),
      label: field.label || modelField.label,
      regName: field.regName || modelField.regName!,
    };
  }): [];
  
  let colums: ColumnsType = [{
    title: '序号',
    dataIndex: 'id',
    fixed: 'left',
    render: (text: any, row: any , index : number) => 
    <div>
      {index + 1 + page.pageSize * page.pageIndex} {
        row.id === props.currentId && <CheckCircleOutlined />
      }
    </div>,
  }];
  colums = colums.concat(model ?dataContainer.fields.map((field) => {
    const modelField = model.fieldsObject![field.name]
    return {
      title: field.label || modelField.label,
      dataIndex: field.name,
      render: (text: any) => {
        const TableRenderType : any = mapTableRenderType(field.renderType || ModelFieldMapper[modelField.fieldType]?.tableRenderType) ?? Detail;
        return <TableRenderType value={text} {...modelField} {...field}  />;
      },
    };
  }): [])

  if (dataContainer?.dataActions.length > 0) {
    colums.push({
      title: '操作',
      dataIndex: 'action',
      fixed: 'right',
      render: (text: any, record: any) => {
        const relationModelActions = model.fields.filter(a=>a.fieldType === "toManay").map(
          field => {
           return {
             label: field.label! ,
             key: field.name,
             confirm: undefined,
             onClick: () => {
               if(field.foreignKey) {
                 props.openWin({
                   model:field.relationModel!,
                   view: 'listview',
                   where : {
                     [field.foreignKey!] : record.id,
                   }
                 });
               } else {
                 message.error('foreignKey不能为空')
               }
               return false;
             }
           }
          }
       )

       const dataActions = dataContainer.dataActions.map((action) => {
        return {
          key : action.type + action.label,
          label: action.label,
          confirm: action.type === 'del' ? {
              title: '是否删除呢',
              async onConfirm() {
                  const [{ data }] = await post({
                      url: 'mdd/delsingleaction',
                      data: {
                        id: record.id,
                        model: props.dataContainer.name,
                        fields: props.dataContainer.fields.map((a) => a.name),
                      },
                    });
                    if(data) {
                       message.success('删除成功');
                       setUpdate(+new Date())
                      //  if(props.parentModalClose) {
                      //     props.parentModalClose();
                      //   }
                      //   if(props.parentRefersh) {
                      //      props.parentRefersh();
                      //   }
                    }
                    return false;
              },
          } : undefined,
          onClick: (event?:any) => {
            if(event)
            event.stopPropagation();
            if(action.type === 'edit') {
              props.openWin({
                  model: dataContainer.name,
                  view: 'editview',
                  params: record,
                  id: record.id
                });
               
            } else {
              if(action.type === 'detail') {
                props.openWin({
                    model: dataContainer.name,
                    view: 'detailview',
                    params: record,
                    id: record.id
                  });
              }
            }
            return false;
          }
        }
    })
        return <div>
          <ButtonGroup count={4}  items={relationModelActions.concat(dataActions as any)}></ButtonGroup>
        </div>
      },
    });
  }

  if(!model) return null;

  return (
    <Card title={  dataContainer.label ||  (model && model.label) || dataContainer.name}>
      <SearchForm Items={items} onValuesChange={(values: any) => {
       setSearch({ ...search , ...values })
      }}></SearchForm>
      <div className='flex flex-row pb-4 gap-4'>
      {dataContainer.actions.map((action) => {
        return (
          <Button
            size="small"
            onClick={() => {
              if (action.type === 'new') {
                props.openWin({
                  model: dataContainer.name,
                  view: 'newview',
                });
              }
            }}
            key={action.type + action.label}
            type="primary"
          >
            {action.label}
          </Button>
        );
      })}</div>
      <Table
        size='small'
        loading={loading}
        dataSource={list}
        rowClassName={(row:any) => {
          return row.id === props.currentId ? ' transition duration-300 ease-in-out bg-green-100  cursor-pointer' : ''
        }}
        pagination={{
          current: page.pageIndex+ 1,
          pageSize: page.pageSize,
          total: page.total,
        }}
        onRow={(record: any) => {
          return {
            onClick: () => {
              if (props.onChangeCurrntRow) {
                props.onChangeCurrntRow(record);
              }
            },
          };
        }}
        rowKey="id"
        columns={colums}
        scroll={{ x: 'max-content' }}
      ></Table>
       <Pagination
                        total={page.count}
                        pageSizeOptions={[5, 15, 20, 50]}
                        pageSize={page.pageSize}
                        current={page.pageIndex + 1}
                        onChange={(c, s) =>
                            setPage({
                              ...page,
                                pageIndex: c - 1,
                                pageSize: s,
                            })
                        }
                        onShowSizeChange={(c, s) =>
                          setPage({
                            ...page,
                                pageIndex: c - 1,
                                pageSize: s,
                            })
                        }
                        showSizeChanger
                        showQuickJumper
                        showTotal={(total) => `总共 ${total} 条数据`}
                    />
    </Card>
  );
}
