import React from 'react'
import { Input, InputNumber } from 'antd'
import { ModelFieldType } from 'arrivo-server';

export function Text(props: any) {
    const { fieldType } = props
    if(fieldType === ModelFieldType.Number)
        return <div><InputNumber {...props} /></div>
  return  <Input {...props} />
}
