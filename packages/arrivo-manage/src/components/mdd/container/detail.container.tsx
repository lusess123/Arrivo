import React, { useEffect, useState } from 'react';
import { IDetailDataContainer, IRenderType, ModelFieldMapper } from 'arrivo-server';
import { post } from '@/utils/util';
import { useMetaContext } from '../store';
import { BooleanDetail } from '@/components/common/detail-component/boolean-detail';
import { ToOneDetail } from '@/components/common/detail-component/toone-detail';
import { DateTimeDetail } from '@/components/common/detail-component/datetime-detail';
import { Detail } from '@/components/common/detail-component/detail';
import { Descriptions } from 'antd';
import { HTMLDetail } from '@/components/common/detail-component/html';
import DurationDetail from '@/components/common/detail-component/duration';
// import dayjs from 'dayjs';

interface IDetailContainer {
    dataContainer :  IDetailDataContainer
    parentModalClose?: ()=> void ;
    parentRefersh?: () => void;
    id?: string;
}

const renderTypeMap: any = {
    [IRenderType.BooleanDetail]: BooleanDetail,
    [IRenderType.DateTimeDetail]: DateTimeDetail,
    [IRenderType.ToOneDetail]: ToOneDetail,
    [IRenderType.HTMLDetail]: HTMLDetail,
    [IRenderType.DurationDetail]: DurationDetail,
};

const mapTableRenderType = (type?: IRenderType): any => {
  return (type && renderTypeMap[type]) || Detail;
};

export function DetailContainer (props: IDetailContainer) : JSX.Element {
   const [row, setRow] = useState<any>(null)
   const { models } = useMetaContext()
    useEffect(function () {

        (async function() {
            //------
            if(props.id) {
            const [{data}] = await post({
                url: 'mdd/querysingleaction',
                data: {
                    id: props.id,
                    model: props.dataContainer.name,
                    fields: props.dataContainer.fields.map(f => f.name)
                }
            })
            setRow(data)
        }

        })()

    } , [])

    // const [form] = Form.useForm();
    const model = models[props.dataContainer.name]!

    return <div>
        {( (props.id && row) || !props.id) &&  <Descriptions  labelStyle={{width:150}} size='small'  column={3}>
            {
                props.dataContainer.fields.map(field => {
                    const modelField = model.fieldsObject![field.name]
                    const config = ModelFieldMapper[modelField.fieldType]
                    const fSpan = modelField.span ||  config?.formSpan
                    const span = fSpan === undefined ? 1 : (fSpan || 3)
                    const Component = mapTableRenderType(field.renderType || config?.detailRenderType) ?? Detail;
                    return <Descriptions.Item  span={span} key={field.name} label={(field.label || modelField.label || '')} >
                    <Component {...field} {...modelField} value={row[field.name]}></Component>
                    </Descriptions.Item>
                })
            }
        </Descriptions>}
    </div>
};

