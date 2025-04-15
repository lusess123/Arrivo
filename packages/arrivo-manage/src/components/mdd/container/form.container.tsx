import React, { useEffect, useState } from 'react';
import { Button, Form, Input, message,Switch } from 'antd';
import { IFormDataContainer, IRenderType, ModelFieldMapper } from 'arrivo-server';
import { post } from '@/utils/util';
import { DateTime } from '@/components/common/detail-component/datetime';
import { HTML } from '@/components/common/detail-component/html';
import { MultiSelectEdit, SelectEdit } from '@/components/common/detail-component/select-edit';
import { useMetaContext } from '../store';
import { ToOneEdit } from '@/components/common/detail-component/toone-edit';
import { Text } from '@/components/common/detail-component/text';
// import dayjs from 'dayjs';

interface IFormContainer {
    dataContainer :  IFormDataContainer
    parentModalClose?: ()=> void ;
    parentRefersh?: () => void;
    id?: string;
}

function TextArea(props: any) {
  return <Input.TextArea {...props}  showCount allowClear autoSize={{ minRows: 5}}   />;
}

 const RenderTypeToComponentMapObj : any = {
    [IRenderType.Text]: Text,
    [IRenderType.TextArea]: TextArea,
    [IRenderType.MultiSelect]: MultiSelectEdit,
    [IRenderType.Single]: SelectEdit,
    [IRenderType.Switch]: Switch,
    [IRenderType.DataTime]: DateTime,
    [IRenderType.HTML]: HTML,
    [IRenderType.ToOneEdit]: ToOneEdit

}

export function FormContainer (props: IFormContainer) : JSX.Element {
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

    const [form] = Form.useForm();
    const model = models[props.dataContainer.name]!

    return <div>
      
        {( (props.id && row) || !props.id) &&  <Form   layout='vertical' form={form} initialValues={row}>
      {
                props.dataContainer.fields.map(field => {
                    const modelField = model.fieldsObject![field.name]
                    const Component = RenderTypeToComponentMapObj[field.renderType || ModelFieldMapper[modelField.fieldType]!.formRenderType!] ?? Text;
                    return <Form.Item  key={field.name} label={field.label || modelField.label}  name={field.name}>
                    <Component {...field} {...modelField}></Component>
                    </Form.Item>
                })
            }
        </Form>}
        <div>
            { props.dataContainer.actions.map(
                action => 
                <Button type='primary' key={action.label} onClick={
                    async () => {
                      //-------
                      const values = await form.validateFields()
                      if(values) {
                         const [{data}] = await post({
                            url:'mdd/newsingleaction',
                            data: {
                                model: props.dataContainer.name,
                                row: values,
                                id: props.id,
                                fields: props.dataContainer.fields.map(f => f.name)
                            }
                         })
                         if(data) {
                               message.success((props.id ? '编辑': '新增') + props.dataContainer.name + '成功')
                               if(props.parentModalClose) {
                                 props.parentModalClose();
                               }
                               if(props.parentRefersh) {
                                  props.parentRefersh();
                               }
                         }
                      }
                    }
                    }
                >{action.label}</Button>) }
        </div>
    </div>
};

