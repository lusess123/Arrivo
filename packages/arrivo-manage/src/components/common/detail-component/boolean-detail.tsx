import React from 'react'
import { IComponentProps } from '../component'
import { CheckOutlined, CloseOutlined } from '@ant-design/icons'

export function BooleanDetail(props: IComponentProps) {
  return (
    <div>
      { props.value ? <CheckOutlined className='text-green-600' /> : <CloseOutlined className='text-red-600' />}
    </div>
  )
}