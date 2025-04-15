import React, { useState } from 'react'
// import { IComponentProps } from '../component'
import { useMetaContext } from '@/components/mdd/store';
import { Button, message, Modal } from 'antd'
import { useViewContext } from '@/components/mdd/view/view.content';
import {  SearchOutlined } from '@ant-design/icons';
import { View } from '@/components/mdd';
// import { MetaContextProviderParent } from '@/components/mdd/store';

export function ToManyEdit(props: any) {
  const { models } = useMetaContext()
  const { openWin  } = useViewContext()
  const { value, relationModel } = props
  const [val , setVal] = useState(()=>{
     return value;
  })
  const model = models[relationModel]
  const displayField = model?.displayField
  const [open, setOpen] = useState(false)


  return (
    <div className='flex flex-row items-center '>
        <Modal title={<div>当前选择的数据 : {val[displayField || 'id']}</div>} open={!!open} width={'85%'} onCancel={()=> setOpen(false)}>
            <View model={relationModel}  onChangeCurrntRow={(row)=>{
                   if(row.id !== val.id) {
                    message.success('选择成功,切换为 ' + row[displayField || 'id'])
                    setVal(row)
                    setOpen(false)
                   }
                  
                  
            }}  view='listview' currentId={val.id} ></View>
        </Modal>
        <Button type='link' onClick={() => {
            if(openWin) {
                openWin({
                    model: relationModel,
                    view: 'detailview',
                    id: val.id
                })
            }

        }}>{val[displayField || 'id']}</Button>
        <Button size='small' type='primary' icon={<SearchOutlined />}
        onClick={() => {
            setOpen(true)
        }}
        ></Button>

      
    </div>
  )
}
